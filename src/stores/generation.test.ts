import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({
  clearFailedGenerationTasks: vi.fn(),
  deleteAllImages: vi.fn(),
  deleteFailedGenerationTask: vi.fn(),
  deleteImage: vi.fn(),
  generateImage: vi.fn(),
  getActiveGenerationTasks: vi.fn(),
  getGenerationTasks: vi.fn(),
  getHealth: vi.fn(),
  getImages: vi.fn(),
  publishLocalImage: vi.fn(),
  retryGenerationTask: vi.fn(),
  updateImageVisibility: vi.fn(),
}))
const prepareLocalImages = vi.hoisted(() => vi.fn(async items => items))

vi.mock('../services/imageApi', () => api)
vi.mock('./desktop', () => ({
  useDesktopStore: () => ({ prepareLocalImages, deleteLocalImage: vi.fn() }),
}))
vi.mock('./gallery', () => ({
  useGalleryStore: () => ({ refresh: vi.fn(), loadStats: vi.fn() }),
}))
vi.mock('./message', () => ({
  useMessageStore: () => ({ show: vi.fn() }),
}))
vi.mock('./user', () => ({
  useUserStore: () => ({
    isLoggedIn: true,
    expireSession: vi.fn(),
    toggleAuthModal: vi.fn(),
    refreshProfile: vi.fn(),
    refreshUsage: vi.fn(),
  }),
}))

import { useGenerationStore } from './generation'

const queuedTask = {
  id: 'task-1',
  status: 'queued' as const,
  kind: 'generation' as const,
  prompt: 'test prompt',
  size: '1024x1024' as const,
  isPublic: false,
  imageId: null,
  error: null,
  referenceImages: [],
  createdAt: '2026-07-27T12:00:00Z',
  updatedAt: '2026-07-27T12:00:00Z',
}

const image = {
  id: 'image-1',
  url: '/image-1',
  thumbnailUrl: '/image-1-thumb',
  prompt: 'test prompt',
  size: '1024x1024' as const,
  model: 'gpt-image-2' as const,
  createdAt: '2026-07-27T12:01:00Z',
  source: 'generated' as const,
  format: 'png' as const,
  isPublic: false,
  isFavorited: false,
  category: '其他',
  storage: 'server' as const,
  referenceImages: [],
}

describe('generation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves a retried failure back into the same active queue item', async () => {
    const failedTask = { ...queuedTask, status: 'error' as const, error: 'upstream failed' }
    api.getActiveGenerationTasks.mockResolvedValue([failedTask])
    api.retryGenerationTask.mockResolvedValue([queuedTask])
    const store = useGenerationStore()

    await store.resumeTasks()
    await store.retryTask(failedTask.id)

    expect(store.failedTasks).toEqual([])
    expect(store.activeTasks).toEqual([queuedTask])
    expect(api.retryGenerationTask).toHaveBeenCalledWith(failedTask.id)
    store.reset()
  })

  it('keeps the generating placeholder until the completed image is loaded', async () => {
    let resolveImages: ((value: unknown) => void) | undefined
    const imagesResponse = new Promise(resolve => { resolveImages = resolve })
    api.getActiveGenerationTasks.mockResolvedValue([queuedTask])
    api.getGenerationTasks.mockResolvedValue([{
      ...queuedTask,
      status: 'success',
      imageId: image.id,
    }])
    api.getImages.mockReturnValue(imagesResponse)
    const store = useGenerationStore()

    await store.resumeTasks()
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.getImages).toHaveBeenCalledOnce()
    expect(store.activeTasks).toEqual([queuedTask])

    resolveImages?.({
      items: [image],
      total: 1,
      allTotal: 1,
      publicTotal: 0,
      privateTotal: 1,
      page: 1,
      pageSize: 30,
    })
    await vi.runAllTicks()
    await Promise.resolve()
    await Promise.resolve()

    expect(store.activeTasks).toEqual([])
    expect(store.images).toEqual([image])
  })
})
