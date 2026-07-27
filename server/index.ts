import 'dotenv/config'
import { createReadStream } from 'node:fs'
import { access, readFile, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { z } from 'zod'

const GenerateRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(5000),
})

const UpstreamResponseSchema = z.object({
  data: z.array(z.object({
    b64_json: z.string().optional(),
    url: z.string().url().optional(),
  })).optional(),
  error: z.object({ message: z.string().optional() }).optional(),
}).passthrough()

const UpstreamCompletedEventSchema = z.object({
  type: z.literal('image_generation.completed'),
  b64_json: z.string().min(1),
}).passthrough()

const port = Number.parseInt(process.env.PORT || '8787', 10)
const distDirectory = path.resolve(process.cwd(), 'dist')

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function getApiConfiguration(): { apiKey: string; endpoint: string } | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const baseUrl = process.env.OPENAI_BASE_URL?.trim()
  if (!apiKey || !baseUrl) return null

  const parsedUrl = new URL(baseUrl)
  const isLocal = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
  if (parsedUrl.protocol !== 'https:' && !isLocal) {
    throw new Error('OPENAI_BASE_URL 必须使用 HTTPS')
  }

  const normalized = baseUrl.replace(/\/+$/, '')
  const endpoint = `${normalized.endsWith('/v1') ? normalized : `${normalized}/v1`}/images/generations`
  return { apiKey, endpoint }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let length = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += buffer.length
    if (length > 1_000_000) throw new Error('请求内容过大')
    chunks.push(buffer)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function readStreamedImage(upstream: Response): Promise<string | null> {
  if (!upstream.body) return null

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer = `${buffer}${decoder.decode(value, { stream: !done })}`.replace(/\r\n/g, '\n')
    if (done && buffer) buffer += '\n\n'

    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const data = block
        .split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
        .join('\n')

      if (data && data !== '[DONE]') {
        try {
          const event = UpstreamCompletedEventSchema.safeParse(JSON.parse(data))
          if (event.success) return event.data.b64_json
        }
        catch {
          return null
        }
      }

      boundary = buffer.indexOf('\n\n')
    }

    if (done) return null
  }
}

async function generateImage(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const configuration = getApiConfiguration()
  if (!configuration) {
    sendJson(response, 503, { error: '服务端尚未配置 OPENAI_BASE_URL 和 OPENAI_API_KEY' })
    return
  }

  const parsedRequest = GenerateRequestSchema.safeParse(await readJsonBody(request))
  if (!parsedRequest.success) {
    sendJson(response, 400, { error: '生图参数无效' })
    return
  }

  const upstream = await fetch(configuration.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${configuration.apiKey}`,
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: parsedRequest.data.prompt,
      n: 1,
      stream: true,
      partial_images: 1,
    }),
  })

  if (upstream.ok && upstream.headers.get('content-type')?.includes('text/event-stream')) {
    const imageBase64 = await readStreamedImage(upstream)
    if (!imageBase64) {
      sendJson(response, 502, { error: '上游流式响应中没有最终图片数据' })
      return
    }

    sendJson(response, 200, { imageUrl: `data:image/png;base64,${imageBase64}`, model: 'gpt-image-2' })
    return
  }

  const upstreamText = await upstream.text()
  let upstreamBody: unknown
  try {
    upstreamBody = JSON.parse(upstreamText)
  }
  catch {
    sendJson(response, 502, { error: `上游接口返回异常：${upstream.status}` })
    return
  }

  const parsedUpstream = UpstreamResponseSchema.safeParse(upstreamBody)
  if (!upstream.ok || !parsedUpstream.success) {
    const message = parsedUpstream.success ? parsedUpstream.data.error?.message : undefined
    sendJson(response, upstream.status || 502, { error: message || `上游生图失败：${upstream.status}` })
    return
  }

  const image = parsedUpstream.data.data?.[0]
  const imageUrl = image?.b64_json ? `data:image/png;base64,${image.b64_json}` : image?.url
  if (!imageUrl) {
    sendJson(response, 502, { error: '上游响应中没有图片数据' })
    return
  }

  sendJson(response, 200, { imageUrl, model: 'gpt-image-2' })
}

const contentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

async function serveApp(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname)
  const requestedPath = path.resolve(distDirectory, `.${pathname}`)
  const safePath = requestedPath.startsWith(distDirectory) ? requestedPath : path.join(distDirectory, 'index.html')

  let filePath = safePath
  try {
    if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath, 'index.html')
    await access(filePath)
  }
  catch {
    filePath = path.join(distDirectory, 'index.html')
  }

  try {
    const extension = path.extname(filePath)
    response.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' })
    createReadStream(filePath).pipe(response)
  }
  catch {
    const html = await readFile(path.join(distDirectory, 'index.html'))
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(html)
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost')

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { configured: Boolean(getApiConfiguration()), model: 'gpt-image-2' })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/images/generate') {
      await generateImage(request, response)
      return
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: '接口不存在' })
      return
    }

    await serveApp(request, response)
  }
  catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : '服务器错误' })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Lumora API: http://127.0.0.1:${port}`)
})
