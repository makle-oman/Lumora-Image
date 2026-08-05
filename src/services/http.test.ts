import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, requestJson, resolveServiceUrl } from './http'

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    setItem: (key: string, value: string): void => { storage.set(key, value) },
    removeItem: (key: string): void => { storage.delete(key) },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API response envelope', () => {
  it('uses the remote service for desktop requests', async () => {
    vi.stubGlobal('location', { search: '?lumora-desktop=1' })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      message: 'success',
      data: { value: 1 },
      timestamp: 1,
    })))
    vi.stubGlobal('fetch', fetchMock)

    expect(resolveServiceUrl('/public/images/image-1')).toBe('https://makle.cloud/public/images/image-1')
    await requestJson('/api/test', z.object({ value: z.number() }))

    expect(fetchMock).toHaveBeenCalledWith('https://makle.cloud/api/test', expect.objectContaining({
      credentials: 'include',
    }))
  })

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
