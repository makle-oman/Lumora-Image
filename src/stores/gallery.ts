import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getPublicGallery, getPublicStats } from '../services/imageApi'
import type { GeneratedImage, PublicStats } from '../types/generation'

const emptyStats: PublicStats = { todayGenerations: 0, publicImages: 0, categories: [] }

export const useGalleryStore = defineStore('gallery', () => {
  const items = ref<ReadonlyArray<GeneratedImage>>([])
  const stats = ref<PublicStats>(emptyStats)
  const total = ref(0)
  const page = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref('')
  let latestSearchId = 0
  let lastQuery = ''
  let lastCategory = '全部'
  let lastPageSize = 24
  const hasMore = computed(() => items.value.length < total.value)

  async function loadStats(): Promise<void> {
    try {
      stats.value = await getPublicStats()
    }
    catch {
      stats.value = emptyStats
    }
  }

  async function search(query = '', category = '全部', showError = true, pageSize = 24): Promise<void> {
    lastQuery = query
    lastCategory = category
    lastPageSize = pageSize
    const searchId = ++latestSearchId
    loading.value = true
    loadingMore.value = false
    error.value = ''
    try {
      const result = await getPublicGallery({ query, category, page: 1, pageSize })
      if (searchId === latestSearchId) {
        items.value = result.items
        total.value = result.total
        page.value = result.page
      }
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

  async function loadMore(showError = true): Promise<void> {
    if (loading.value || loadingMore.value || !hasMore.value) return
    const searchId = latestSearchId
    loadingMore.value = true
    error.value = ''
    try {
      const result = await getPublicGallery({
        query: lastQuery,
        category: lastCategory,
        page: page.value + 1,
        pageSize: lastPageSize,
      })
      if (searchId === latestSearchId) {
        const byId = new Map(items.value.map(item => [item.id, item]))
        for (const item of result.items) byId.set(item.id, item)
        items.value = [...byId.values()]
        total.value = result.total
        page.value = result.page
      }
    }
    catch (cause) {
      if (showError && searchId === latestSearchId) {
        error.value = cause instanceof Error ? cause.message : '更多作品加载失败'
      }
    }
    finally {
      if (searchId === latestSearchId) loadingMore.value = false
    }
  }

  async function refresh(showError = false): Promise<void> {
    await search(lastQuery, lastCategory, showError, lastPageSize)
  }

  return { items, stats, loading, loadingMore, error, hasMore, loadStats, search, loadMore, refresh }
})
