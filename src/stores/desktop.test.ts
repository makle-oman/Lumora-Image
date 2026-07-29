import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { checkForUpdate, downloadAndInstall, invoke, isTauriMock, open, relaunch } = vi.hoisted(() => ({
  checkForUpdate: vi.fn(),
  downloadAndInstall: vi.fn(),
  invoke: vi.fn(),
  isTauriMock: vi.fn(),
  open: vi.fn(),
  relaunch: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke, isTauri: isTauriMock }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch }))
vi.mock('@tauri-apps/plugin-updater', () => ({ check: checkForUpdate }))

import { useDesktopStore } from './desktop'

describe('desktop store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    isTauriMock.mockReturnValue(true)
    vi.unstubAllGlobals()
  })

  it('detects the explicit desktop window marker', () => {
    isTauriMock.mockReturnValue(false)
    vi.stubGlobal('location', { search: '?lumora-desktop=1' })

    const store = useDesktopStore()

    expect(store.available).toBe(true)
  })

  it('loads the active image directory', async () => {
    invoke.mockImplementation((command: string) => {
      if (command === 'image_directory') return Promise.resolve('C:\\Pictures\\Lumora')
      return Promise.resolve(null)
    })
    const store = useDesktopStore()

    await store.initialize()

    expect(store.imageDirectory).toBe('C:\\Pictures\\Lumora')
  })

  it('persists a selected directory and relaunches', async () => {
    open.mockResolvedValue('D:\\Lumora')
    invoke.mockResolvedValue(null)
    relaunch.mockResolvedValue(undefined)
    const store = useDesktopStore()
    store.imageDirectory = 'C:\\Pictures\\Lumora'

    await store.chooseImageDirectory()

    expect(open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: '选择图片存放位置',
      defaultPath: 'C:\\Pictures\\Lumora',
    })
    expect(invoke).toHaveBeenCalledWith('set_image_directory', { path: 'D:\\Lumora' })
    expect(relaunch).toHaveBeenCalledOnce()
  })

  it('opens the update modal with release data', async () => {
    checkForUpdate.mockResolvedValue({
      version: '1.0.7',
      date: '2026-07-29T10:00:00Z',
      body: '- 修复桌面更新流程',
      downloadAndInstall,
    })
    const store = useDesktopStore()

    await expect(store.checkForUpdates()).resolves.toBe(true)

    expect(store.isUpdateModalOpen).toBe(true)
    expect(store.updateData.version).toBe('1.0.7')
    expect(store.updateData.notes[0]?.items).toEqual(['修复桌面更新流程'])
  })

  it('downloads, installs, and relaunches an update', async () => {
    downloadAndInstall.mockImplementation(async (onEvent: (event: unknown) => void) => {
      onEvent({ event: 'Started', data: { contentLength: 100 } })
      onEvent({ event: 'Progress', data: { chunkLength: 50 } })
      onEvent({ event: 'Finished' })
    })
    checkForUpdate.mockResolvedValue({
      version: '1.0.7',
      date: '2026-07-29T10:00:00Z',
      body: '',
      downloadAndInstall,
    })
    relaunch.mockResolvedValue(undefined)
    const store = useDesktopStore()
    await store.checkForUpdates()

    await store.startUpdateDownload()

    expect(store.downloadProgress).toBe(100)
    expect(downloadAndInstall).toHaveBeenCalledOnce()
    expect(relaunch).toHaveBeenCalledOnce()
  })
})
