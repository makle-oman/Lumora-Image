import { invoke, isTauri } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

export interface ReleaseNoteItem {
  category: 'release'
  title: string
  items: string[]
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  size: string
  notes: ReleaseNoteItem[]
}

export const useDesktopStore = defineStore('desktop', () => {
  const available = isTauri() || new URLSearchParams(globalThis.location?.search).get('lumora-desktop') === '1'
  const version = __APP_VERSION__
  const imageDirectory = ref('')
  const isStorageModalOpen = ref(false)
  const error = ref('')
  const isSelecting = ref(false)

  // Update Modal States
  const isUpdateModalOpen = ref(false)
  const isCheckingUpdate = ref(false)
  const isDownloadingUpdate = ref(false)
  const downloadProgress = ref(0)
  const updateError = ref('')
  const pendingUpdate = shallowRef<Update | null>(null)

  const updateData = ref<UpdateInfo>({
    version: '',
    releaseDate: '',
    size: '下载时获取',
    notes: [],
  })

  async function initialize(): Promise<void> {
    if (!available) return
    try {
      const directory = await invoke<unknown>('image_directory')
      imageDirectory.value = typeof directory === 'string' ? directory : ''
      const migrationError = await invoke<unknown>('take_migration_error')
      if (typeof migrationError === 'string' && migrationError) {
        error.value = `目录迁移失败：${migrationError}`
        isStorageModalOpen.value = true
      }
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '桌面设置加载失败'
    }
  }

  function openStorageModal(): void {
    error.value = ''
    isStorageModalOpen.value = true
  }

  function closeStorageModal(): void {
    if (!isSelecting.value) isStorageModalOpen.value = false
  }

  function openUpdateModal(): void {
    isUpdateModalOpen.value = true
  }

  function closeUpdateModal(): void {
    if (!isDownloadingUpdate.value) {
      isUpdateModalOpen.value = false
    }
  }

  async function checkForUpdates(): Promise<boolean> {
    if (!available || isCheckingUpdate.value || isDownloadingUpdate.value) return false
    isCheckingUpdate.value = true
    updateError.value = ''
    try {
      const update = await check({ timeout: 30_000 })
      pendingUpdate.value = update
      if (!update) return false

      const releaseNotes = update.body
        ?.split(/\r?\n/)
        .map((line) => line.replace(/^[#*\-\s]+/, '').trim())
        .filter(Boolean)

      updateData.value = {
        version: update.version,
        releaseDate: update.date?.slice(0, 10) || '未提供',
        size: '下载时获取',
        notes: [{
          category: 'release',
          title: '版本说明',
          items: releaseNotes?.length ? releaseNotes : ['本次更新暂无说明。'],
        }],
      }
      downloadProgress.value = 0
      isUpdateModalOpen.value = true
      return true
    }
    catch (cause) {
      updateError.value = cause instanceof Error ? cause.message : String(cause)
      return false
    }
    finally {
      isCheckingUpdate.value = false
    }
  }

  async function startUpdateDownload(): Promise<void> {
    const update = pendingUpdate.value
    if (!update || isDownloadingUpdate.value) return
    isDownloadingUpdate.value = true
    downloadProgress.value = 0
    updateError.value = ''

    // Simulate update download progress
    // The updater events now provide the real downloaded byte count.
    let downloadedBytes = 0
    let totalBytes = 0

    // Complete update & auto relaunch if Tauri environment
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength || 0
          if (totalBytes > 0) {
            const megabytes = totalBytes / 1024 / 1024
            updateData.value = {
              ...updateData.value,
              size: megabytes >= 1 ? `${megabytes.toFixed(1)} MB` : `${Math.ceil(totalBytes / 1024)} KB`,
            }
          }
          return
        }
        if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength
          downloadProgress.value = totalBytes > 0
            ? Math.min(99, Math.round(downloadedBytes / totalBytes * 100))
            : Math.min(95, downloadProgress.value + 1)
          return
        }
        downloadProgress.value = 100
      })
      await relaunch()
    }
    catch (cause) {
      updateError.value = cause instanceof Error ? cause.message : String(cause)
      isDownloadingUpdate.value = false
    }
  }

  async function chooseImageDirectory(): Promise<void> {
    if (!available || isSelecting.value) return
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择图片存放位置',
      defaultPath: imageDirectory.value || undefined,
    })
    if (!selected || Array.isArray(selected)) return

    isSelecting.value = true
    error.value = ''
    try {
      await invoke('set_image_directory', { path: selected })
      await relaunch()
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      isSelecting.value = false
    }
  }

  return {
    available,
    version,
    imageDirectory,
    isStorageModalOpen,
    isUpdateModalOpen,
    isCheckingUpdate,
    isDownloadingUpdate,
    downloadProgress,
    updateData,
    updateError,
    error,
    isSelecting,
    initialize,
    openStorageModal,
    closeStorageModal,
    openUpdateModal,
    closeUpdateModal,
    checkForUpdates,
    startUpdateDownload,
    chooseImageDirectory,
  }
})
