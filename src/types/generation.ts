export const imageSizes = [
  { value: '1024x1024', label: '1:1 标准' },
  { value: '2048x2048', label: '1:1 2K' },
  { value: '2048x1152', label: '16:9 2K' },
  { value: '1152x2048', label: '9:16 2K' },
] as const

export const imageQualities = ['low', 'medium', 'high'] as const

export type ImageSize = (typeof imageSizes)[number]['value']
export type ImageQuality = (typeof imageQualities)[number]

export type GenerateImageRequest = Readonly<{
  prompt: string
  size: ImageSize
  quality: ImageQuality
}>

export type GeneratedImage = Readonly<{
  id: string
  url: string
  prompt: string
  size: ImageSize
  model: 'gpt-image-2'
  createdAt: string
  source: 'sample' | 'generated'
}>

export type GenerationRequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; imageId: string }
  | { status: 'error'; message: string }

export type ApiStatus = 'checking' | 'ready' | 'missing' | 'unreachable'
