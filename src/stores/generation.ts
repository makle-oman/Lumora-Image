import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { generateImage, getApiStatus } from '../services/imageApi'
import type {
  ApiStatus,
  GeneratedImage,
  GenerateImageRequest,
  GenerationRequestState,
} from '../types/generation'

const sampleImages: ReadonlyArray<GeneratedImage> = [
  {
    id: 'sample-cat',
    url: '/showcase/orange-cat-coffee.png',
    prompt: '一只在咖啡杯旁边打盹的橘猫，柔和自然光，写实风格',
    size: '2048x2048',
    model: 'gpt-image-2',
    createdAt: new Date('2026-07-24T10:00:00+08:00').toISOString(),
    source: 'sample',
  },
  {
    id: 'sample-diorama',
    url: '/showcase/luxeveil-diorama.png',
    prompt: '奢华护肤品微缩施工现场，商业产品摄影，超写实 CGI',
    size: '2048x1152',
    model: 'gpt-image-2',
    createdAt: new Date('2026-07-24T10:10:00+08:00').toISOString(),
    source: 'sample',
  },
]

export const useGenerationStore = defineStore('generation', () => {
  const images = ref<ReadonlyArray<GeneratedImage>>(sampleImages)
  const requestState = ref<GenerationRequestState>({ status: 'idle' })
  const apiStatus = ref<ApiStatus>('checking')
  const activePrompt = ref('')

  const isLoading = computed(() => requestState.value.status === 'loading')
  const errorMessage = computed(() => requestState.value.status === 'error' ? requestState.value.message : '')

  async function checkConfiguration(): Promise<void> {
    apiStatus.value = 'checking'
    try {
      apiStatus.value = await getApiStatus() ? 'ready' : 'missing'
    }
    catch {
      apiStatus.value = 'unreachable'
    }
  }

  async function generate(request: GenerateImageRequest): Promise<void> {
    if (requestState.value.status === 'loading') return

    activePrompt.value = request.prompt
    requestState.value = { status: 'loading' }
    try {
      const imageUrl = await generateImage(request)
      const image: GeneratedImage = {
        id: crypto.randomUUID(),
        url: imageUrl,
        prompt: request.prompt,
        size: request.size,
        model: 'gpt-image-2',
        createdAt: new Date().toISOString(),
        source: 'generated',
      }
      images.value = [image, ...images.value]
      requestState.value = { status: 'success', imageId: image.id }
      apiStatus.value = 'ready'
    }
    catch (error) {
      requestState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : '图片生成失败',
      }
    }
  }

  function removeImage(id: string): void {
    images.value = images.value.filter(image => image.id !== id)
  }

  function clearGallery(): void {
    images.value = []
  }

  return {
    images,
    activePrompt,
    requestState,
    apiStatus,
    isLoading,
    errorMessage,
    checkConfiguration,
    generate,
    removeImage,
    clearGallery,
  }
})
