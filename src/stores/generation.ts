import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  deleteAllImages,
  deleteImage,
  generateImage,
  getActiveGenerationTasks,
  getGenerationTasks,
  getHealth,
  getImages,
  publishLocalImage,
  updateImageVisibility,
  type GenerationTask,
} from '../services/imageApi'
import { ApiError } from '../services/http'
import { useDesktopStore } from './desktop'
import { useGalleryStore } from './gallery'
import { useUserStore } from './user'
import type {
  ApiStatus,
  GeneratedImage,
  GenerateImageRequest,
  GenerationRequestState,
} from '../types/generation'

export const useGenerationStore = defineStore('generation', () => {
  const images = ref<ReadonlyArray<GeneratedImage>>([])
  const activeTasks = ref<GenerationTask[]>([])
  const requestState = ref<GenerationRequestState>({ status: 'idle' })
  const apiStatus = ref<ApiStatus>('checking')
  const isSubmitting = ref(false)
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollInFlight = false

  const activePrompt = computed(() => activeTasks.value[0]?.prompt ?? '')
  const isLoading = computed(() => isSubmitting.value || activeTasks.value.length > 0)
  const errorMessage = computed(() => requestState.value.status === 'error' ? requestState.value.message : '')

  async function checkConfiguration(): Promise<void> {
    apiStatus.value = 'checking'
    try {
      const health = await getHealth()
      if (!health.authenticated && useUserStore().isLoggedIn) useUserStore().expireSession()
      apiStatus.value = !health.authenticated
        ? 'unauthenticated'
        : health.providerConfigured ? 'ready' : 'missing'
    }
    catch {
      apiStatus.value = 'unreachable'
    }
  }

  async function loadImages(showError = true): Promise<void> {
    try {
      images.value = await useDesktopStore().prepareLocalImages(await getImages())
    }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        useUserStore().expireSession()
        apiStatus.value = 'unauthenticated'
      }
      if (showError) {
        requestState.value = {
          status: 'error',
          message: error instanceof Error ? error.message : '图片列表加载失败',
        }
      }
    }
  }

  async function generate(request: GenerateImageRequest): Promise<void> {
    if (isLoading.value) return

    isSubmitting.value = true
    requestState.value = { status: 'loading' }
    try {
      const tasks = await generateImage(request)
      await applyTaskUpdates(tasks)
      apiStatus.value = 'ready'
      schedulePolling(500)
    }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        useUserStore().expireSession()
        useUserStore().toggleAuthModal(true)
        apiStatus.value = 'unauthenticated'
      }
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '图片生成失败',
      }
    }
    finally {
      isSubmitting.value = false
    }
  }

  async function resumeTasks(showError = true): Promise<void> {
    stopPolling()
    try {
      activeTasks.value = (await getActiveGenerationTasks())
        .filter(task => task.status === 'queued' || task.status === 'running')
      if (activeTasks.value.length) {
        requestState.value = { status: 'loading' }
        schedulePolling(250)
      }
    }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        useUserStore().expireSession()
        apiStatus.value = 'unauthenticated'
      }
      else if (showError) {
        requestState.value = {
          status: 'error',
          message: error instanceof Error ? error.message : '生成任务恢复失败',
        }
      }
    }
  }

  async function applyTaskUpdates(tasks: GenerationTask[]): Promise<void> {
    const pending = tasks.filter(task => task.status === 'queued' || task.status === 'running')
    const finished = tasks.filter(task => task.status === 'success' || task.status === 'error')
    activeTasks.value = pending
    if (!finished.length) {
      if (pending.length) requestState.value = { status: 'loading' }
      return
    }

    const successes = finished.filter(task => task.status === 'success')
    const failures = finished.filter(task => task.status === 'error')
    if (successes.length) await loadImages()
    await Promise.all([
      useUserStore().refreshProfile(),
      useUserStore().refreshUsage(),
    ])
    if (failures.length) {
      requestState.value = {
        status: 'error',
        message: failures.map(task => task.error || '图片生成失败').join('；'),
      }
    }
    else if (!pending.length) {
      requestState.value = {
        status: 'success',
        imageIds: successes
          .map(task => task.imageId)
          .filter((id): id is string => Boolean(id)),
      }
    }
  }

  async function pollTasks(): Promise<void> {
    if (pollInFlight || !activeTasks.value.length) return
    pollInFlight = true
    try {
      await applyTaskUpdates(await getGenerationTasks(activeTasks.value.map(task => task.id)))
    }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        useUserStore().expireSession()
        apiStatus.value = 'unauthenticated'
        activeTasks.value = []
      }
      else {
        requestState.value = {
          status: 'error',
          message: error instanceof Error ? error.message : '生成任务状态加载失败',
        }
      }
    }
    finally {
      pollInFlight = false
      schedulePolling()
    }
  }

  function schedulePolling(delay = 1000): void {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
    if (!activeTasks.value.length) return
    pollTimer = setTimeout(() => void pollTasks(), delay)
  }

  function stopPolling(): void {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
  }

  async function removeImage(id: string): Promise<void> {
    try {
      const image = images.value.find(item => item.id === id)
      await deleteImage(id)
      if (image) await useDesktopStore().deleteLocalImage(image)
      images.value = images.value.filter(image => image.id !== id)
      if (image?.isPublic) {
        await Promise.all([useGalleryStore().refresh(false), useGalleryStore().loadStats()])
      }
    }
    catch (error) {
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '图片删除失败',
      }
    }
  }

  async function setImageVisibility(id: string, isPublic: boolean): Promise<boolean> {
    try {
      const image = images.value.find(item => item.id === id)
      let updated: { id: string; isPublic: boolean }
      if (isPublic && image?.storage === 'local') {
        const response = await fetch(image.url, { cache: 'no-store' })
        if (!response.ok) throw new Error(`本地图片读取失败: ${response.status}`)
        const blob = await response.blob()
        const contentType = blob.type || (image.format === 'jpeg' ? 'image/jpeg' : `image/${image.format}`)
        updated = await publishLocalImage(
          id,
          new File([blob], `${id}.${image.format}`, { type: contentType }),
        )
      }
      else {
        updated = await updateImageVisibility(id, isPublic)
      }
      images.value = images.value.map(image => (
        image.id === updated.id ? { ...image, isPublic: updated.isPublic } : image
      ))
      await Promise.all([useGalleryStore().refresh(false), useGalleryStore().loadStats()])
      return true
    }
    catch (error) {
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '图片公开状态更新失败',
      }
      return false
    }
  }

  async function clearGallery(): Promise<void> {
    try {
      const currentImages = images.value
      await deleteAllImages()
      await Promise.all(currentImages.map(image => useDesktopStore().deleteLocalImage(image)))
      images.value = []
      await Promise.all([useGalleryStore().refresh(false), useGalleryStore().loadStats()])
    }
    catch (error) {
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '画廊清空失败',
      }
    }
  }

  function reset(): void {
    stopPolling()
    images.value = []
    activeTasks.value = []
    isSubmitting.value = false
    requestState.value = { status: 'idle' }
    apiStatus.value = 'unauthenticated'
  }

  return {
    images,
    activeTasks,
    activePrompt,
    requestState,
    apiStatus,
    isLoading,
    errorMessage,
    checkConfiguration,
    loadImages,
    resumeTasks,
    generate,
    setImageVisibility,
    removeImage,
    clearGallery,
    reset,
  }
})
