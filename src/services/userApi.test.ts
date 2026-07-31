import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticate, sendRegistrationCode, updateProfile } from './userApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('user service', () => {
  it('sends a registration code to the requested email', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      message: 'success',
      data: null,
      timestamp: 1,
    })))
    vi.stubGlobal('fetch', fetchMock)

    await sendRegistrationCode('user@example.test')

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/email-code', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.test' }),
    }))
  })

  it('includes the verification code when registering', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      message: 'success',
      data: {
        id: 'user-1',
        name: 'User',
        email: 'user@example.test',
        avatar: '',
        plan: 'Free',
        credits: 3000,
        creditsReserved: 0,
      },
      timestamp: 1,
    })))
    vi.stubGlobal('fetch', fetchMock)

    await authenticate('register', 'user@example.test', 'password123', '123456')

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      body: JSON.stringify({
        email: 'user@example.test',
        password: 'password123',
        verificationCode: '123456',
      }),
    }))
  })

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
