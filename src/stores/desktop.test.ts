import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { checkForUpdate, download, install, invoke, isTauriMock, open, relaunch } = vi.hoisted(() => ({
  checkForUpdate: vi.fn(),
  download: vi.fn(),
  install: vi.fn(),
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

  it('opens the active image directory', async () => {
    invoke.mockResolvedValue(null)
    const store = useDesktopStore()

    await store.openImageDirectory()

    expect(invoke).toHaveBeenCalledWith('open_image_directory')
  })

  it('opens the update modal with release data', async () => {
    checkForUpdate.mockResolvedValue({
      version: '1.0.7',
      date: '2026-07-29T10:00:00Z',
      body: '- 修复桌面更新流程',
      download,
      install,
    })
    const store = useDesktopStore()

    await expect(store.checkForUpdates()).resolves.toBe(true)

    expect(store.isUpdateModalOpen).toBe(true)
    expect(store.updateData.version).toBe('1.0.7')
    expect(store.updateData.notes[0]?.items).toEqual(['修复桌面更新流程'])
  })

  it('downloads, installs, and relaunches an update', async () => {
    download.mockImplementation(async (onEvent: (event: unknown) => void) => {
      onEvent({ event: 'Started', data: { contentLength: 100 } })
      onEvent({ event: 'Progress', data: { chunkLength: 50 } })
      onEvent({ event: 'Finished' })
    })
    checkForUpdate.mockResolvedValue({
      version: '1.0.7',
      date: '2026-07-29T10:00:00Z',
      body: '',
      download,
      install,
    })
    relaunch.mockResolvedValue(undefined)
    const store = useDesktopStore()
    await store.checkForUpdates()

    await store.startUpdateDownload()

    expect(store.downloadProgress).toBe(100)
    expect(download).toHaveBeenCalledOnce()
    expect(install).toHaveBeenCalledOnce()
    expect(relaunch).toHaveBeenCalledOnce()
  })

  it('downloads pending images locally and confirms server cleanup', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 0,
        message: 'success',
        data: { id: 'img-0123456789abcdef0123456789abcdef', storage: 'local', isPublic: true },
        timestamp: 1,
      })))
    vi.stubGlobal('fetch', fetchMock)
    invoke.mockImplementation((command: string) => {
      if (command === 'save_local_image') {
        return Promise.resolve('https://lumora-local.localhost/img-0123456789abcdef0123456789abcdef.png')
      }
      return Promise.resolve(null)
    })
    const store = useDesktopStore()

    const images = await store.prepareLocalImages([{
      id: 'img-0123456789abcdef0123456789abcdef',
      url: '/api/images/img-0123456789abcdef0123456789abcdef/file',
      prompt: 'test',
      size: '1024x1024',
      model: 'gpt-image-2',
      createdAt: '2026-07-30T00:00:00Z',
      source: 'generated',
      format: 'png',
      isPublic: true,
      category: '其他',
      storage: 'pending',
    }])

    expect(images[0]).toMatchObject({ storage: 'local', isPublic: true })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/images/img-0123456789abcdef0123456789abcdef/file', {
      cache: 'no-store',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://makle.cloud/api/images/img-0123456789abcdef0123456789abcdef/local', expect.objectContaining({
      method: 'POST',
    }))
  })
})
