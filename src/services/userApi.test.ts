import { afterEach, describe, expect, it, vi } from 'vitest'
import { updateProfile } from './userApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('user service', () => {
  it('reads the updated profile from envelope data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      message: 'success',
      data: {
        id: 'user-1',
        name: 'Updated',
        email: 'updated@example.test',
        avatar: '',
        plan: 'Free',
        credits: 10,
        creditsReserved: 0,
      },
      timestamp: 1,
    }))))

    await expect(updateProfile({ name: 'Updated' })).resolves.toMatchObject({ name: 'Updated' })
  })
})
