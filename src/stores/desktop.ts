import { invoke, isTauri } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDesktopStore = defineStore('desktop', () => {
  const available = isTauri()
  const imageDirectory = ref('')
  const isStorageModalOpen = ref(false)
  const error = ref('')
  const isSelecting = ref(false)

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

  async function chooseImageDirectory(): Promise<void> {
    if (!available || isSelecting.value) return
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择图片存放位置',
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
    imageDirectory,
    isStorageModalOpen,
    error,
    isSelecting,
    initialize,
    openStorageModal,
    closeStorageModal,
    chooseImageDirectory,
  }
})
