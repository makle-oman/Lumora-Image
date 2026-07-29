import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { invoke, open, relaunch } = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  relaunch: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke, isTauri: () => true }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch }))

import { useDesktopStore } from './desktop'

describe('desktop store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
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

    await store.chooseImageDirectory()

    expect(invoke).toHaveBeenCalledWith('set_image_directory', { path: 'D:\\Lumora' })
    expect(relaunch).toHaveBeenCalledOnce()
  })
})
