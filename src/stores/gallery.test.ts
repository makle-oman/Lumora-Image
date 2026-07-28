import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getPublicStats, getPublicGallery } = vi.hoisted(() => ({
  getPublicStats: vi.fn(),
  getPublicGallery: vi.fn(),
}))

vi.mock('../services/imageApi', () => ({ getPublicStats, getPublicGallery }))

import { useGalleryStore } from './gallery'

describe('gallery store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads real statistics and search results', async () => {
    getPublicStats.mockResolvedValue({
      todayGenerations: 3,
      publicImages: 1,
      categories: [{ name: '其他', count: 1 }],
    })
    getPublicGallery.mockResolvedValue({
      items: [{ id: 'image-1' }],
      total: 1,
      page: 1,
      pageSize: 100,
    })
    const store = useGalleryStore()

    await store.loadStats()
    await store.search('test', '其他')

    expect(store.stats.publicImages).toBe(1)
    expect(store.items).toEqual([{ id: 'image-1' }])
    expect(getPublicGallery).toHaveBeenCalledWith({ query: 'test', category: '其他' })
  })

  it('keeps initialization failures silent', async () => {
    getPublicStats.mockRejectedValue(new Error('统计服务不可用'))
    getPublicGallery.mockRejectedValue(new Error('画廊服务不可用'))
    const store = useGalleryStore()

    await store.loadStats()
    await store.search('', '全部', false)

    expect(store.error).toBe('')
  })

  it('shows search failures after a user action', async () => {
    getPublicGallery.mockRejectedValue(new Error('搜索失败'))
    const store = useGalleryStore()

    await store.search('test')

    expect(store.error).toBe('搜索失败')
  })
})
