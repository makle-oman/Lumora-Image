import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getPublicGallery, getPublicStats } from '../services/imageApi'
import type { GeneratedImage, PublicStats } from '../types/generation'

const emptyStats: PublicStats = { todayGenerations: 0, publicImages: 0, categories: [] }

export const useGalleryStore = defineStore('gallery', () => {
  const items = ref<ReadonlyArray<GeneratedImage>>([])
  const stats = ref<PublicStats>(emptyStats)
  const loading = ref(false)
  const error = ref('')
  let latestSearchId = 0
  let lastQuery = ''
  let lastCategory = '全部'

  async function loadStats(): Promise<void> {
    try {
      stats.value = await getPublicStats()
    }
    catch {
      stats.value = emptyStats
    }
  }

  async function search(query = '', category = '全部', showError = true): Promise<void> {
    lastQuery = query
    lastCategory = category
    const searchId = ++latestSearchId
    loading.value = true
    error.value = ''
    try {
      const result = await getPublicGallery({ query, category })
      if (searchId === latestSearchId) items.value = result.items
    }
    catch (cause) {
      if (showError && searchId === latestSearchId) {
        error.value = cause instanceof Error ? cause.message : '公共画廊加载失败'
      }
    }
    finally {
      if (searchId === latestSearchId) loading.value = false
    }
  }

  async function refresh(showError = false): Promise<void> {
    await search(lastQuery, lastCategory, showError)
  }

  return { items, stats, loading, error, loadStats, search, refresh }
})
