import { z } from 'zod'
import {
  type GeneratedImage,
  type GenerateImageRequest,
  type HealthStatus,
  type ImageSize,
  type PublicStats,
} from '../types/generation'
import { requestJson } from './http'

const ImageSizeSchema = z.string().min(1).max(32)
  .refine(value => value === 'auto' || /^\d+x\d+$/.test(value))
  .transform(value => value as ImageSize)

const GeneratedImageSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  prompt: z.string(),
  size: ImageSizeSchema,
  model: z.literal('gpt-image-2'),
  createdAt: z.string().datetime({ offset: true }),
  source: z.literal('generated'),
  format: z.enum(['png', 'jpeg', 'webp']),
  isPublic: z.boolean(),
  category: z.string(),
  author: z.string().optional(),
})

const HealthResponseSchema = z.object({
  server: z.literal('ready'),
  authenticated: z.boolean(),
  providerConfigured: z.boolean(),
  model: z.literal('gpt-image-2'),
})

const GenerationTaskSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['queued', 'running', 'success', 'error']),
  prompt: z.string(),
  imageId: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})
const TaskListResponseSchema = z.object({ items: z.array(GenerationTaskSchema) })

const ImageListResponseSchema = z.object({ items: z.array(GeneratedImageSchema) })
const GalleryResponseSchema = z.object({
  items: z.array(GeneratedImageSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})
const PublicStatsSchema = z.object({
  todayGenerations: z.number().int().nonnegative(),
  publicImages: z.number().int().nonnegative(),
  categories: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative() })),
})

export async function getHealth(): Promise<HealthStatus> {
  return requestJson('/api/health', HealthResponseSchema)
}

export async function getImages(): Promise<ReadonlyArray<GeneratedImage>> {
  return (await requestJson('/api/images', ImageListResponseSchema)).items
}

export type GenerationTask = z.infer<typeof GenerationTaskSchema>

export async function generateImage(request: GenerateImageRequest): Promise<GenerationTask[]> {
  const parsed = z.object({
    prompt: z.string().trim().min(1).max(32_000),
    n: z.number().int().min(1).max(4),
    isPublic: z.boolean(),
    batch: z.boolean(),
  }).parse({
    ...request,
    n: request.n ?? 1,
    isPublic: request.isPublic ?? false,
    batch: request.batch ?? false,
  })

  if (!request.images?.length) {
    return (await requestJson('/api/images/generate/async', TaskListResponseSchema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: parsed.prompt,
        n: parsed.n,
        ...(parsed.isPublic ? { isPublic: true } : {}),
      }),
    })).items
  }

  const form = new FormData()
  form.set('prompt', parsed.prompt)
  form.set('n', String(parsed.n))
  form.set('isPublic', String(parsed.isPublic))
  form.set('batch', String(parsed.batch))
  for (const image of request.images) form.append('image', image, image.name)
  return (await requestJson('/api/images/edit/async', TaskListResponseSchema, {
    method: 'POST',
    body: form,
  })).items
}

export async function getActiveGenerationTasks(): Promise<GenerationTask[]> {
  return (await requestJson('/api/image-tasks', TaskListResponseSchema)).items
}

export async function getGenerationTasks(ids: ReadonlyArray<string>): Promise<GenerationTask[]> {
  if (!ids.length) return []
  return (await requestJson(`/api/image-tasks/${ids.map(encodeURIComponent).join(',')}`, TaskListResponseSchema)).items
}

export async function getPublicGallery(input: {
  query?: string
  category?: string
  page?: number
  pageSize?: number
} = {}): Promise<{ items: GeneratedImage[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams()
  if (input.query?.trim()) params.set('q', input.query.trim())
  if (input.category && input.category !== '全部') params.set('category', input.category)
  params.set('page', String(input.page ?? 1))
  params.set('pageSize', String(input.pageSize ?? 100))
  return requestJson(`/api/gallery?${params}`, GalleryResponseSchema)
}

export async function getPublicStats(): Promise<PublicStats> {
  return requestJson('/api/stats', PublicStatsSchema)
}

export async function deleteImage(id: string): Promise<void> {
  await requestJson(`/api/images/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE' })
}

export async function deleteAllImages(): Promise<void> {
  await requestJson('/api/images', z.null(), { method: 'DELETE' })
}
