import { z } from 'zod'
import { isTauri } from '@tauri-apps/api/core'

const deviceIdKey = 'lumora:device-id'
const defaultRemoteServiceOrigin = normalizeServiceOrigin(import.meta.env.VITE_LUMORA_SERVICE_ORIGIN) ?? 'https://makle.cloud'

const ApiResponseSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown(),
  timestamp: z.number().int().nonnegative(),
})

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function isDesktopClient(): boolean {
  return isTauri() || new URLSearchParams(globalThis.location?.search).get('lumora-desktop') === '1'
}

function normalizeServiceOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    if ((!localHttp && url.protocol !== 'https:') || url.pathname !== '/' || url.search || url.hash) return null
    return url.origin
  }
  catch {
    return null
  }
}

export function resolveServiceUrl(path: string): string {
  if (!isDesktopClient() || !/^\/(?:api|public|v1)(?:\/|$)/.test(path)) return path
  return `${defaultRemoteServiceOrigin}${path}`
}

export async function readJson(response: Response): Promise<unknown> {
  let body: unknown
  try {
    body = await response.json()
  }
  catch {
    throw new ApiError('服务端响应无效', response.status)
  }
  const parsed = ApiResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError('服务端响应格式无效', response.status)
  }
  if (!response.ok || parsed.data.code !== 0) {
    throw new ApiError(parsed.data.message || `请求失败: ${response.status}`, response.status)
  }
  return parsed.data.data
}

export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return crypto.randomUUID()
  const current = localStorage.getItem(deviceIdKey)
  if (current) return current
  const created = crypto.randomUUID()
  localStorage.setItem(deviceIdKey, created)
  return created
}

export async function requestJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (typeof localStorage !== 'undefined' && typeof navigator !== 'undefined') {
    headers.set('X-Lumora-Device-Id', getDeviceId())
    headers.set('X-Lumora-Platform', navigator.platform || 'web')
    headers.set('X-Lumora-App-Version', __APP_VERSION__)
    if (isDesktopClient()) {
      headers.set('X-Lumora-Client', 'desktop')
    }
  }
  const response = await fetch(resolveServiceUrl(path), { ...init, credentials: 'include', headers })
  const parsed = schema.safeParse(await readJson(response))
  if (!parsed.success) throw new ApiError('服务端响应格式无效', response.status)
  return parsed.data
}
