import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  addFavorite,
  getFavoriteImages,
  removeFavorite,
} from '../services/imageApi'
import type { GeneratedImage } from '../types/generation'
import { useMessageStore } from './message'

export const useFavoritesStore = defineStore('favorites', () => {
  const messageStore = useMessageStore()
  const items = ref<ReadonlyArray<GeneratedImage>>([])
  const total = ref(0)
  const page = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref('')
  const updatingIds = ref<ReadonlyArray<string>>([])
  let initialized = false
  let currentQuery = ''
  let loadId = 0

  const hasMore = computed(() => items.value.length < total.value)

  async function load(showError = true, query?: string): Promise<void> {
    if (query !== undefined) currentQuery = query.trim()
    const currentLoadId = ++loadId
    loading.value = true
    error.value = ''
    try {
      const result = await getFavoriteImages({ query: currentQuery, page: 1, pageSize: 30 })
      if (currentLoadId !== loadId) return
      items.value = result.items
      total.value = result.total
      page.value = result.page
      initialized = true
    }
    catch (cause) {
      if (currentLoadId !== loadId) return
      if (showError) error.value = cause instanceof Error ? cause.message : '收藏加载失败'
    }
    finally {
      if (currentLoadId === loadId) loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    error.value = ''
    const currentLoadId = loadId
    try {
      const result = await getFavoriteImages({
        query: currentQuery,
        page: page.value + 1,
        pageSize: 30,
      })
      if (currentLoadId !== loadId) return
      const byId = new Map(items.value.map(item => [item.id, item]))
      for (const item of result.items) byId.set(item.id, item)
      items.value = [...byId.values()]
      total.value = result.total
      page.value = result.page
    }
    catch (cause) {
      if (currentLoadId !== loadId) return
      error.value = cause instanceof Error ? cause.message : '更多收藏加载失败'
    }
    finally {
      loadingMore.value = false
    }
  }

  async function setFavorite(item: GeneratedImage, isFavorited: boolean): Promise<boolean | null> {
    if (updatingIds.value.includes(item.id)) return null
    updatingIds.value = [...updatingIds.value, item.id]
    error.value = ''
    try {
      const result = isFavorited
        ? await addFavorite(item.id)
        : await removeFavorite(item.id)
      if (initialized) await load(false)
      messageStore.show(result.isFavorited ? '已收藏' : '已取消收藏', 'success')
      return result.isFavorited
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '收藏状态更新失败'
      messageStore.show(error.value, 'error')
      return null
    }
    finally {
      updatingIds.value = updatingIds.value.filter(id => id !== item.id)
    }
  }

  function reset(): void {
    items.value = []
    total.value = 0
    page.value = 0
    loading.value = false
    loadingMore.value = false
    error.value = ''
    updatingIds.value = []
    initialized = false
    currentQuery = ''
    loadId += 1
  }

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    updatingIds,
    hasMore,
    load,
    loadMore,
    setFavorite,
    reset,
  }
})
