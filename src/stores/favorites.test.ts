import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { addFavorite, getFavoriteImages, removeFavorite } = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  getFavoriteImages: vi.fn(),
  removeFavorite: vi.fn(),
}))

vi.mock('../services/imageApi', () => ({ addFavorite, getFavoriteImages, removeFavorite }))

import { useFavoritesStore } from './favorites'
import type { GeneratedImage } from '../types/generation'

const image = {
  id: 'image-1',
  url: '/image-1',
  thumbnailUrl: '/image-1-thumb',
  prompt: 'test',
  size: '1024x1024',
  model: 'gpt-image-2',
  createdAt: '2026-07-27T12:00:00Z',
  source: 'generated',
  format: 'png',
  isPublic: true,
  isFavorited: true,
  category: '其他',
  storage: 'server',
} satisfies GeneratedImage

describe('favorites store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads, removes and restores favorites', async () => {
    getFavoriteImages
      .mockResolvedValueOnce({ items: [image], total: 1, page: 1, pageSize: 30 })
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 30 })
      .mockResolvedValueOnce({ items: [image], total: 1, page: 1, pageSize: 30 })
    removeFavorite.mockResolvedValue({ id: image.id, isFavorited: false })
    addFavorite.mockResolvedValue({ id: image.id, isFavorited: true })
    const store = useFavoritesStore()

    await store.load()
    await store.setFavorite(image, false)
    await store.setFavorite(image, true)

    expect(store.items).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(getFavoriteImages).toHaveBeenCalledTimes(3)
    expect(removeFavorite).toHaveBeenCalledWith(image.id)
    expect(addFavorite).toHaveBeenCalledWith(image.id)
  })

  it('keeps the current state when an update fails', async () => {
    getFavoriteImages.mockResolvedValue({ items: [image], total: 1, page: 1, pageSize: 30 })
    removeFavorite.mockRejectedValue(new Error('更新失败'))
    const store = useFavoritesStore()

    await store.load()
    await store.setFavorite(image, false)

    expect(store.items).toEqual([image])
    expect(store.error).toBe('更新失败')
  })
})
