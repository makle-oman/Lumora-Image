import { z } from 'zod'
import type { GenerateImageRequest } from '../types/generation'

const HealthResponseSchema = z.object({
  configured: z.boolean(),
  model: z.literal('gpt-image-2'),
})

const GenerateResponseSchema = z.object({
  imageUrl: z.string().min(1),
  model: z.literal('gpt-image-2'),
})

const ErrorResponseSchema = z.object({
  error: z.string().min(1),
})

export async function getApiStatus(): Promise<boolean> {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error(`API health check failed: ${response.status}`)
  }

  return HealthResponseSchema.parse(await response.json()).configured
}

export async function generateImage(request: GenerateImageRequest): Promise<string> {
  const response = await fetch('/api/images/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const body: unknown = await response.json()
  if (!response.ok) {
    const error = ErrorResponseSchema.safeParse(body)
    throw new Error(error.success ? error.data.error : `图片生成失败：${response.status}`)
  }

  return GenerateResponseSchema.parse(body).imageUrl
}
