import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, requestJson } from './http'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API response envelope', () => {
  it('returns validated data from a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      message: 'success',
      data: { value: 1 },
      timestamp: 1,
    }))))
    await expect(requestJson('/test', z.object({ value: z.number() }))).resolves.toEqual({ value: 1 })
  })

  it('uses the envelope message for business errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 409,
      message: '邮箱已被使用',
      data: null,
      timestamp: 1,
    }), { status: 409 })))
    await expect(requestJson('/test', z.null())).rejects.toEqual(new ApiError('邮箱已被使用', 409))
  })

  it('rejects responses without the standard envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: 1 }))))
    await expect(requestJson('/test', z.unknown())).rejects.toEqual(new ApiError('服务端响应格式无效', 200))
  })
})
