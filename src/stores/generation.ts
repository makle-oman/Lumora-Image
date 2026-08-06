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
  retryGenerationTask,
  updateImageVisibility,
  type GenerationTask,
} from '../services/imageApi'
import { ApiError } from '../services/http'
import { useDesktopStore } from './desktop'
import { useGalleryStore } from './gallery'
import { useMessageStore } from './message'
import { useUserStore } from './user'
import type {
  ApiStatus,
  GeneratedImage,
  GenerateImageRequest,
  GenerationRequestState,
} from '../types/generation'

export const useGenerationStore = defineStore('generation', () => {
  const messageStore = useMessageStore()
  const images = ref<ReadonlyArray<GeneratedImage>>([])
  const imageTotal = ref(0)
  const imagePage = ref(0)
  const imagesLoading = ref(false)
  const activeTasks = ref<GenerationTask[]>([])
  const failedTasks = ref<GenerationTask[]>([])
  const requestState = ref<GenerationRequestState>({ status: 'idle' })
  const apiStatus = ref<ApiStatus>('checking')
  const isSubmitting = ref(false)
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollInFlight = false
  let pollAttempt = 0
  const pollingDelays = [1000, 2000, 3000, 5000] as const

  const activePrompt = computed(() => activeTasks.value[0]?.prompt ?? '')
  const isLoading = computed(() => isSubmitting.value || activeTasks.value.length > 0)
  const hasMoreImages = computed(() => images.value.length < imageTotal.value)
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
    if (imagesLoading.value) return
    imagesLoading.value = true
    try {
      const result = await getImages({ page: 1, pageSize: 30 })
      images.value = await useDesktopStore().prepareLocalImages(result.items)
      imageTotal.value = result.total
      imagePage.value = result.page
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
    finally {
      imagesLoading.value = false
    }
  }

  async function loadMoreImages(): Promise<void> {
    if (imagesLoading.value || !hasMoreImages.value) return
    imagesLoading.value = true
    try {
      const result = await getImages({ page: imagePage.value + 1, pageSize: 30 })
      const nextItems = await useDesktopStore().prepareLocalImages(result.items)
      const byId = new Map(images.value.map(image => [image.id, image]))
      for (const image of nextItems) byId.set(image.id, image)
      images.value = [...byId.values()]
      imageTotal.value = result.total
      imagePage.value = result.page
    }
    catch (error) {
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '更多图片加载失败',
      }
    }
    finally {
      imagesLoading.value = false
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
      messageStore.show('生成请求已提交', 'info')
      startPolling()
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
      messageStore.show(requestState.value.message, 'error')
    }
    finally {
      isSubmitting.value = false
    }
  }

  async function resumeTasks(showError = true): Promise<void> {
    stopPolling()
    try {
      const tasks = await getActiveGenerationTasks()
      activeTasks.value = tasks.filter(task => task.status === 'queued' || task.status === 'running')
      failedTasks.value = tasks.filter(task => task.status === 'error')
      if (activeTasks.value.length) {
        requestState.value = { status: 'loading' }
        startPolling()
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
    if (failures.length) {
      const byId = new Map(failedTasks.value.map(task => [task.id, task]))
      for (const task of failures) byId.set(task.id, task)
      failedTasks.value = [...byId.values()]
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    }
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
      messageStore.show(requestState.value.message, 'error')
    }
    else if (!pending.length) {
      requestState.value = {
        status: 'success',
        imageIds: successes
          .map(task => task.imageId)
          .filter((id): id is string => Boolean(id)),
      }
      messageStore.show('图片生成完成', 'success')
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

  function startPolling(): void {
    pollAttempt = 0
    schedulePolling()
  }

  async function retryTask(id: string): Promise<void> {
    if (isLoading.value) return
    isSubmitting.value = true
    requestState.value = { status: 'loading' }
    try {
      await applyTaskUpdates(await retryGenerationTask(id))
      messageStore.show('已重新提交生成任务', 'info')
      startPolling()
    }
    catch (error) {
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '重新生成失败',
      }
      messageStore.show(requestState.value.message, 'error')
    }
    finally {
      isSubmitting.value = false
    }
  }

  function schedulePolling(delay?: number): void {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
    if (!activeTasks.value.length) return
    const nextDelay = delay ?? pollingDelays[Math.min(pollAttempt, pollingDelays.length - 1)]
    pollAttempt += 1
    pollTimer = setTimeout(() => void pollTasks(), nextDelay)
  }

  function stopPolling(): void {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
    pollAttempt = 0
  }

  async function removeImage(id: string): Promise<void> {
    try {
      const image = images.value.find(item => item.id === id)
      await deleteImage(id)
      if (image) await useDesktopStore().deleteLocalImage(image)
      images.value = images.value.filter(image => image.id !== id)
      imageTotal.value = Math.max(0, imageTotal.value - 1)
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
      messageStore.show(updated.isPublic ? '图片已公开' : '已取消公开', 'success')
      return true
    }
    catch (error) {
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '图片公开状态更新失败',
      }
      messageStore.show(requestState.value.message, 'error')
      return false
    }
  }

  async function clearGallery(): Promise<void> {
    try {
      const currentImages = images.value
      await deleteAllImages()
      await Promise.all(currentImages.map(image => useDesktopStore().deleteLocalImage(image)))
      images.value = []
      imageTotal.value = 0
      imagePage.value = 0
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
    imageTotal.value = 0
    imagePage.value = 0
    imagesLoading.value = false
    activeTasks.value = []
    failedTasks.value = []
    isSubmitting.value = false
    requestState.value = { status: 'idle' }
    apiStatus.value = 'unauthenticated'
  }

  return {
    images,
    activeTasks,
    failedTasks,
    activePrompt,
    requestState,
    apiStatus,
    isLoading,
    imagesLoading,
    hasMoreImages,
    errorMessage,
    checkConfiguration,
    loadImages,
    loadMoreImages,
    resumeTasks,
    generate,
    retryTask,
    setImageVisibility,
    removeImage,
    clearGallery,
    reset,
  }
})
