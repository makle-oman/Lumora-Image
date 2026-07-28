export type ImageSize = 'auto' | `${number}x${number}`

export type GenerateImageRequest = Readonly<{
  prompt: string
  n?: 1 | 2 | 3 | 4
  isPublic?: boolean
  images?: ReadonlyArray<File>
  batch?: boolean
}>

export type GeneratedImage = Readonly<{
  id: string
  url: string
  prompt: string
  size: ImageSize
  model: 'gpt-image-2'
  createdAt: string
  source: 'sample' | 'generated'
  format: 'png' | 'jpeg' | 'webp'
  isPublic: boolean
  category: string
  author?: string
}>

export type GenerationRequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; imageIds: ReadonlyArray<string> }
  | { status: 'error'; message: string }

export type ApiStatus = 'checking' | 'ready' | 'missing' | 'unreachable' | 'unauthenticated'

export type HealthStatus = Readonly<{
  server: 'ready'
  authenticated: boolean
  providerConfigured: boolean
  model: 'gpt-image-2'
}>

export type PublicStats = Readonly<{
  todayGenerations: number
  publicImages: number
  categories: ReadonlyArray<Readonly<{ name: string; count: number }>>
}>
