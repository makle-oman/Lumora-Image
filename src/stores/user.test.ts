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
  sendRegistrationCode: vi.fn(),
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

  it('returns true and refreshes providers after activation', async () => {
    api.getProviders.mockResolvedValue([{
      id: 'provider-1',
      name: 'Primary',
      baseUrl: 'https://api.openai.com',
      maskedApiKey: 'sk-***',
      model: 'gpt-image-2',
      isActive: true,
      createdAt: '2026-08-05T00:00:00+00:00',
      needsRotation: false,
    }])
    const store = useUserStore()

    await expect(store.activateProvider('provider-1')).resolves.toBe(true)
    expect(api.activateProvider).toHaveBeenCalledWith('provider-1')
    expect(store.providers[0]?.isActive).toBe(true)
  })

  it('returns false when a provider cannot be activated', async () => {
    api.activateProvider.mockRejectedValue(new Error('调用方不可用'))
    const store = useUserStore()

    await expect(store.activateProvider('provider-1')).resolves.toBe(false)
    expect(store.operationError).toBe('调用方不可用')
  })
})
