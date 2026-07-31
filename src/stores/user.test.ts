import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({
  activateProvider: vi.fn(),
  authenticate: vi.fn(),
  createApiKey: vi.fn(),
  createProvider: vi.fn(),
  deleteProvider: vi.fn(),
  endSession: vi.fn(),
  getAnnouncements: vi.fn(),
  getApiKeys: vi.fn(),
  getProviders: vi.fn(),
  getPublicConfig: vi.fn(),
  getSession: vi.fn(),
  getUsage: vi.fn(),
  reportHeartbeat: vi.fn(),
  revokeApiKey: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('../services/userApi', () => api)

import { useUserStore } from './user'

describe('user store refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    })
  })

  it('replaces stale announcements', async () => {
    api.getAnnouncements.mockResolvedValue([{
      id: 'announcement-2',
      title: 'New',
      content: 'Updated',
      date: '2026-07-31',
      type: 'update',
      isNew: true,
    }])
    const store = useUserStore()
    store.announcements = [{
      id: 'announcement-1',
      title: 'Old',
      content: 'Deleted',
      date: '2026-07-30',
      type: 'system',
      isNew: false,
    }]

    await store.refreshAnnouncements()

    expect(store.announcements.map(item => item.id)).toEqual(['announcement-2'])
  })

  it('refreshes the active profile', async () => {
    api.getSession.mockResolvedValue({
      id: 'user-1',
      name: 'Updated name',
      email: 'user@example.com',
      avatar: '',
      plan: 'Free',
      credits: 10,
      creditsReserved: 0,
    })
    const store = useUserStore()

    await store.refreshProfile()

    expect(store.user.name).toBe('Updated name')
  })
})
