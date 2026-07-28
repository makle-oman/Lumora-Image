import { z } from 'zod'

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

export async function requestJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const parsed = schema.safeParse(await readJson(response))
  if (!parsed.success) throw new ApiError('服务端响应格式无效', response.status)
  return parsed.data
}
