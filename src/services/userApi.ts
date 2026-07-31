import { z } from 'zod'
import { requestJson } from './http'

const UserProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  avatar: z.string(),
  plan: z.string().min(1),
  credits: z.number().int().nonnegative(),
  creditsReserved: z.number().int().nonnegative(),
})

const ApiKeySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  maskedKey: z.string().min(1),
  createdAt: z.string().min(1),
  lastUsed: z.string().min(1),
  status: z.enum(['active', 'revoked']),
  scope: z.enum(['full', 'read', 'generate']),
  needsRotation: z.boolean(),
})

const CreatedApiKeySchema = z.object({ item: ApiKeySchema, secret: z.string().min(1) })

const ProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.url(),
  maskedApiKey: z.string().min(1),
  model: z.literal('gpt-image-2'),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  needsRotation: z.boolean(),
})

const AnnouncementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  date: z.string().min(1),
  type: z.enum(['feature', 'system', 'update']),
  isNew: z.boolean(),
})

const UsageItemSchema = z.object({
  id: z.string().min(1),
  endpoint: z.string().min(1),
  model: z.literal('gpt-image-2'),
  status: z.enum(['success', 'error']),
  durationMs: z.number().int().nonnegative(),
  creditsUsed: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
})

const UsageSchema = z.object({
  todayCalls: z.number().int().nonnegative(),
  dailyLimit: z.number().int().positive(),
  averageLatencyMs: z.number().int().nonnegative(),
  items: z.array(UsageItemSchema),
})

const PublicConfigSchema = z.object({
  supportEmail: z.string().nullable(),
  supportWechat: z.string().nullable(),
})
const ApiKeyListSchema = z.object({ items: z.array(ApiKeySchema) })
const ProviderListSchema = z.object({ items: z.array(ProviderSchema) })
const AnnouncementListSchema = z.object({ items: z.array(AnnouncementSchema) })

export type UserProfile = z.infer<typeof UserProfileSchema>
export type ApiKeyItem = z.infer<typeof ApiKeySchema>
export type CreatedApiKey = z.infer<typeof CreatedApiKeySchema>
export type ProviderItem = z.infer<typeof ProviderSchema>
export type AnnouncementItem = z.infer<typeof AnnouncementSchema>
export type UsageSummary = z.infer<typeof UsageSchema>
export type PublicConfig = z.infer<typeof PublicConfigSchema>

export async function getSession(): Promise<UserProfile | null> {
  return requestJson('/api/session', UserProfileSchema.nullable())
}

export async function sendRegistrationCode(email: string): Promise<void> {
  await requestJson('/api/auth/email-code', z.null(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function authenticate(
  mode: 'login' | 'register',
  email: string,
  password: string,
  verificationCode?: string,
): Promise<UserProfile> {
  return requestJson(`/api/auth/${mode}`, UserProfileSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mode === 'register' ? { email, password, verificationCode } : { email, password }),
  })
}

export async function updateProfile(data: {
  email?: string
  name?: string
  password?: string
  avatar?: string
}): Promise<UserProfile> {
  return requestJson('/api/account/profile', UserProfileSchema, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function endSession(): Promise<void> {
  await requestJson('/api/auth/logout', z.null(), { method: 'POST' })
}

export async function getPublicConfig(): Promise<PublicConfig> {
  return requestJson('/api/config/public', PublicConfigSchema)
}

export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  return (await requestJson('/api/announcements', AnnouncementListSchema)).items
}

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  return (await requestJson('/api/api-keys', ApiKeyListSchema)).items
}

export async function createApiKey(name: string, scope: ApiKeyItem['scope']): Promise<CreatedApiKey> {
  return requestJson('/api/api-keys', CreatedApiKeySchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, scope }),
  })
}

export async function revokeApiKey(id: string): Promise<void> {
  await requestJson(`/api/api-keys/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE' })
}

export async function getProviders(): Promise<ProviderItem[]> {
  return (await requestJson('/api/providers', ProviderListSchema)).items
}

export async function createProvider(input: { name: string; baseUrl: string; apiKey: string }): Promise<ProviderItem> {
  return requestJson('/api/providers', ProviderSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function activateProvider(id: string): Promise<void> {
  await requestJson(`/api/providers/${encodeURIComponent(id)}/activate`, z.null(), { method: 'PUT' })
}

export async function deleteProvider(id: string): Promise<void> {
  await requestJson(`/api/providers/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE' })
}

export async function getUsage(): Promise<UsageSummary> {
  return requestJson('/api/usage', UsageSchema)
}

export async function reportHeartbeat(input: {
  deviceId: string
  platform: string
  appVersion: string
}): Promise<void> {
  await requestJson('/api/activity/heartbeat', z.null(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
