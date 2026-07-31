import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmImageLocalized,
  generateImage,
  getActiveGenerationTasks,
  getGenerationTasks,
  getHealth,
  getImages,
  getPublicGallery,
  updateImageVisibility,
} from './imageApi'

const image = {
  id: 'image-1',
  url: '/api/images/image-1/file',
  prompt: 'test prompt',
  size: '1024x1024',
  model: 'gpt-image-2',
  createdAt: '2026-07-27T12:00:00Z',
  source: 'generated',
  format: 'png',
  isPublic: false,
  category: '其他',
  storage: 'server',
  referenceImages: ['/api/images/image-1/references/0'],
}

const task = {
  id: 'task-1',
  status: 'queued',
  prompt: 'test prompt',
  imageId: null,
  error: null,
  referenceImages: ['/api/image-tasks/task-1/references/0'],
  createdAt: '2026-07-27T12:00:00Z',
  updatedAt: '2026-07-27T12:00:00Z',
}

function apiResponse(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, message: 'success', data, timestamp: 1 }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('image service', () => {
  it('creates and reloads persistent generation tasks', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({
        server: 'ready',
        authenticated: true,
        providerConfigured: true,
        model: 'gpt-image-2',
      }))
      .mockResolvedValueOnce(apiResponse({ items: [task, { ...task, id: 'task-2' }] }))
      .mockResolvedValueOnce(apiResponse({ items: [task] }))
      .mockResolvedValueOnce(apiResponse({ items: [{ ...task, status: 'running' }] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getHealth()).resolves.toMatchObject({ providerConfigured: true })
    const result = await generateImage({
      prompt: 'test prompt',
      n: 2,
      isPublic: false,
    })
    expect(result).toHaveLength(2)
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as Record<string, unknown>
    expect(body).toEqual({ prompt: 'test prompt', size: '1024x1024', n: 2 })
    await expect(getActiveGenerationTasks()).resolves.toHaveLength(1)
    await expect(getGenerationTasks(['task-1'])).resolves.toMatchObject([{ status: 'running' }])
  })

  it('sends reference edits as multipart and builds gallery queries', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({ items: [task] }))
      .mockResolvedValueOnce(apiResponse({ items: [image], total: 1, page: 1, pageSize: 100 }))
    vi.stubGlobal('fetch', fetchMock)

    const reference = new File([new Uint8Array([1, 2, 3])], 'reference.png', { type: 'image/png' })
    await generateImage({
      prompt: 'edit prompt',
      images: [reference],
      batch: true,
    })
    const form = fetchMock.mock.calls[0]?.[1]?.body as FormData
    expect(form.getAll('image')).toHaveLength(1)
    expect(form.get('size')).toBe('1024x1024')
    expect(form.get('batch')).toBe('true')

    await getPublicGallery({ query: 'poster', category: '海报插画' })
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('q=poster')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(encodeURIComponent('海报插画'))
  })

  it('accepts flexible GPT Image 2 sizes in creation history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse({
      items: [{ ...image, size: '1536x1024' }],
    })))

    await expect(getImages()).resolves.toMatchObject([{
      size: '1536x1024',
      referenceImages: ['/api/images/image-1/references/0'],
    }])
  })

  it('updates image visibility', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({ id: image.id, isPublic: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateImageVisibility(image.id, true)).resolves.toEqual({ id: image.id, isPublic: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/images/image-1/visibility', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ isPublic: true }),
    }))
  })

  it('confirms that a desktop image was saved locally', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({
      id: image.id,
      storage: 'local',
      isPublic: false,
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(confirmImageLocalized(image.id)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/images/image-1/local', expect.objectContaining({
      method: 'POST',
    }))
  })
})
