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

  async function loadStats(): Promise<void> {
    try {
      stats.value = await getPublicStats()
    }
    catch {
      stats.value = emptyStats
    }
  }

  async function search(query = '', category = '全部', showError = true): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      items.value = (await getPublicGallery({ query, category })).items
    }
    catch (cause) {
      if (showError) error.value = cause instanceof Error ? cause.message : '公共画廊加载失败'
    }
    finally {
      loading.value = false
    }
  }

  return { items, stats, loading, error, loadStats, search }
})
