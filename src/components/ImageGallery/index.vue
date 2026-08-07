<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Check,
  Copy,
  Heart,
  Image as ImageIcon,
  Trash2,
  User,
} from 'lucide-vue-next'
import ImageDetailModal from '../ImageDetailModal/index.vue'
import type { GeneratedImage } from '../../types/generation'

export interface PromptItem extends GeneratedImage {
  title?: string
  aspectRatio?: string
  seed?: number
}

const props = withDefaults(defineProps<{
  items: ReadonlyArray<GeneratedImage>
  loading?: boolean
  mode?: 'showcase' | 'library' | 'explore'
  selectedCategory?: string
  showFavoriteAction?: boolean
  favoriteUpdatingIds?: ReadonlyArray<string>
}>(), {
  loading: false,
  mode: 'explore',
  selectedCategory: '全部',
  showFavoriteAction: false,
  favoriteUpdatingIds: () => [],
})

const emit = defineEmits<{
  remove: [id: string]
  reuse: [prompt: string]
  toggleFavorite: [item: GeneratedImage]
}>()

const router = useRouter()
const copiedId = ref('')
const selectedDetailItem = ref<PromptItem | null>(null)
const galleryRoot = ref<HTMLElement | null>(null)
let resizeFrame = 0

// Track image load state for grayscale to full-color smooth transition
const loadedImageIds = ref<Set<string>>(new Set())

function triggerAllTransitions(): void {
  // Clear any existing loaded IDs to re-trigger the grayscale wave
  loadedImageIds.value.clear()
  
  displayItems.value.forEach((item, index) => {
    // Hold grayscale & grid state for 700ms, then wave transition each card into color every 180ms
    setTimeout(() => {
      loadedImageIds.value.add(item.id)
    }, 700 + index * 180)
  })
}

function updateShowcaseCard(card: HTMLElement): void {
  const image = card.querySelector<HTMLImageElement>('.image-thumb')
  if (!image?.complete || !image.naturalWidth) return
  const span = Math.ceil((image.offsetHeight + 16) / 24)
  card.style.gridRowEnd = `span ${span}`
}

function updateAllShowcaseCards(): void {
  if (props.mode !== 'showcase') return
  galleryRoot.value?.querySelectorAll<HTMLElement>('.prompt-card').forEach(updateShowcaseCard)
}

function handleImageLoad(event: Event, id: string): void {
  loadedImageIds.value.add(id)
  if (props.mode !== 'showcase') return
  const card = (event.currentTarget as HTMLImageElement).closest<HTMLElement>('.prompt-card')
  if (card) updateShowcaseCard(card)
}

function handleResize(): void {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(updateAllShowcaseCards)
}

onMounted(() => {
  triggerAllTransitions()
  window.addEventListener('resize', handleResize)
  void nextTick(updateAllShowcaseCards)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(resizeFrame)
})

watch(() => props.selectedCategory, () => {
  void nextTick(updateAllShowcaseCards)
})

watch(() => props.items, () => {
  void nextTick(updateAllShowcaseCards)
})

// Rich curated prompts collection matching rova.chat showcase style
const displayItems = computed<PromptItem[]>(() => {
  let list = [...props.items] as PromptItem[]
  // combine user generated items with community prompt library

  if (props.selectedCategory && props.selectedCategory !== '全部') {
    list = list.filter(item => {
      if (!item.category) return true
      return item.category.includes(props.selectedCategory) || props.selectedCategory.includes(item.category)
    })
  }

  return list
})

async function copyPrompt(prompt: string, id: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(prompt)
    copiedId.value = id
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = ''
    }, 1600)
  }
  catch {
    copiedId.value = ''
  }
}

function handleRemix(prompt: string): void {
  emit('reuse', prompt)
  selectedDetailItem.value = null
  router.push({ path: '/create', query: { prompt } })
}

function openDetail(item: PromptItem): void {
  selectedDetailItem.value = item
}

function removeImage(id: string): void {
  if (window.confirm('确认删除这张图片？')) emit('remove', id)
}
</script>

<template>
  <div v-if="displayItems.length || loading" ref="galleryRoot" class="gallery-wrapper">
    <div class="prompts-grid" :class="{ 'is-showcase': mode === 'showcase' }">
      <article
        v-for="(item, idx) in displayItems"
        :key="item.id"
        class="prompt-card"
        :class="{ 'is-showcase': mode === 'showcase' }"
        :style="{ animationDelay: `${0.05 + Math.min(idx, 7) * 0.05}s` }"
        @click="openDetail(item)"
      >
        <!-- Card Image Thumbnail with Grid Overlay fading out on color load -->
        <div class="image-wrapper">
          <img
            :src="item.thumbnailUrl"
            :alt="item.prompt"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            class="image-thumb"
            :class="{ 'is-loaded': loadedImageIds.has(item.id) }"
            @load="handleImageLoad($event, item.id)"
          />
          <div
            class="grid-overlay"
            :class="{ 'is-hidden': loadedImageIds.has(item.id) }"
          />
          <button
            v-if="showFavoriteAction"
            class="favorite-button"
            :class="{ 'is-favorited': item.isFavorited }"
            type="button"
            :disabled="favoriteUpdatingIds.includes(item.id)"
            :title="item.isFavorited ? '取消收藏' : '收藏作品'"
            :aria-label="item.isFavorited ? '取消收藏' : '收藏作品'"
            @click.stop="emit('toggleFavorite', item)"
          >
            <Heart :size="16" :fill="item.isFavorited ? 'currentColor' : 'none'" />
          </button>
          <div v-if="mode !== 'showcase' && item.author" class="author-badge">
            <User :size="12" />
            <span>{{ item.author }}</span>
          </div>
        </div>

        <!-- Card Content -->
        <div v-if="mode !== 'showcase'" class="card-content">
          <h3 class="card-title">{{ item.title || '创意提示词' }}</h3>

          <div class="tag-row">
            <span class="category-tag">{{ item.category || '其他' }}</span>
            <span v-if="item.model" class="model-tag">{{ item.model }}</span>
          </div>

          <p class="prompt-snippet">{{ item.prompt }}</p>

          <!-- Card Footer Action Row -->
          <div class="card-footer" @click.stop>
            <button
              v-if="mode === 'library'"
              class="delete-btn"
              type="button"
              title="删除图片"
              @click="removeImage(item.id)"
            >
              <Trash2 :size="14" />
            </button>
            <button
              class="copy-btn"
              type="button"
              @click="copyPrompt(item.prompt, item.id)"
            >
              <Check v-if="copiedId === item.id" :size="14" />
              <Copy v-else :size="14" />
              <span>{{ copiedId === item.id ? '已复制' : '复制提示词' }}</span>
            </button>

            <button
              class="generate-btn"
              type="button"
              @click="handleRemix(item.prompt)"
            >
              <span>去生成</span>
              <ArrowRight :size="14" />
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Detail Lightbox Modal matching reference mockup -->
    <ImageDetailModal
      :item="selectedDetailItem"
      :open="!!selectedDetailItem"
      @close="selectedDetailItem = null"
      @reuse="handleRemix"
    />
  </div>

  <div v-else class="empty-state">
    <ImageIcon :size="36" />
    <h2>{{ mode === 'showcase' ? '暂无展厅作品' : '暂无相关提示词作品' }}</h2>
    <p>{{ mode === 'showcase' ? '新的创作将在这里展示' : '尝试切换筛选分类或搜索其他关键词' }}</p>
  </div>
</template>

<style scoped>
.gallery-wrapper {
  width: 100%;
}

.prompts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.prompts-grid.is-showcase {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-flow: dense;
  grid-auto-rows: 8px;
  column-gap: 16px;
  row-gap: 16px;
}

.prompt-card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  padding: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  animation: cardFadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.prompt-card.is-showcase {
  display: block;
  width: 100%;
  padding: 0;
  margin-bottom: 0;
  overflow: hidden;
  background: transparent;
  border: 0;
  border-radius: 12px;
  box-shadow: none;
}

.prompt-card.is-showcase:hover {
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1);
}

.prompt-card.is-showcase .image-wrapper {
  aspect-ratio: auto;
  border-radius: 12px;
}

.prompt-card.is-showcase .image-thumb {
  height: auto;
  object-fit: contain;
}

.prompt-card.is-showcase:hover .image-thumb.is-loaded {
  transform: scale(1);
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.prompt-card:hover {
  transform: translateY(-4px);
  border-color: #cbd5e1;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

/* Skeleton background with grid pattern matching reference */
.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background-color: #e2e8f0;
  border-radius: 14px;
}

/* Grid overlay present during black & white phase only */
.grid-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.22) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.75;
  z-index: 1;
  transition: opacity 250ms ease;
}

.grid-overlay.is-hidden {
  opacity: 0;
}

/* Grayscale to full vibrant color smooth transition */
.image-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%) brightness(0.85) contrast(0.95);
  opacity: 0.7;
  transform: scale(0.97);
  transition: filter 250ms ease,
              opacity 250ms ease,
              transform 250ms ease;
}

.image-thumb.is-loaded {
  filter: grayscale(0%) brightness(1) contrast(1);
  opacity: 1;
  transform: scale(1);
}

.prompt-card:hover .image-thumb.is-loaded {
  transform: scale(1.04);
}

.author-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  color: #334155;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.favorite-button {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 3;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  padding: 0;
  color: #334155;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(10px);
  transition: color 150ms ease, transform 150ms ease, opacity 150ms ease;
}

.prompt-card.is-showcase .favorite-button {
  opacity: 0;
  transform: translateY(-4px);
}

.prompt-card.is-showcase:hover .favorite-button,
.prompt-card.is-showcase:focus-within .favorite-button {
  opacity: 1;
  transform: translateY(0);
}

.favorite-button:hover,
.favorite-button.is-favorited {
  color: #e11d48;
}

.favorite-button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding-top: 14px;
}

.card-title {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 650;
}

.tag-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.category-tag {
  padding: 2px 8px;
  color: #ec4899;
  font-size: 11px;
  font-weight: 550;
  background: #fce7f3;
  border-radius: 6px;
}

.model-tag {
  padding: 2px 8px;
  color: #64748b;
  font-size: 11px;
  background: #f1f5f9;
  border-radius: 6px;
}

.prompt-snippet {
  display: -webkit-box;
  margin: 0 0 16px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f8fafc;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: color 150ms ease;
}

.delete-btn {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  padding: 0;
  color: #dc2626;
  cursor: pointer;
  background: #fef2f2;
  border: 0;
  border-radius: 50%;
}

.copy-btn:hover {
  color: #1e293b;
}

.generate-btn {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: #0f172a;
  border: 0;
  border-radius: 16px;
  transition: background-color 150ms ease;
}

.generate-btn:hover {
  background: #334155;
}

/* Detail Lightbox Modal */
.detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
}

.detail-modal {
  position: relative;
  display: flex;
  width: min(1000px, 100%);
  max-height: 85vh;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.close-modal-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #64748b;
  cursor: pointer;
  background: #f1f5f9;
  border: 0;
  border-radius: 50%;
}

.modal-left {
  flex: 1.3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}

.modal-left img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}

.modal-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 32px 28px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.model-badge {
  padding: 4px 10px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 600;
  background: #f3e8ff;
  border-radius: 6px;
}

.category-badge {
  padding: 4px 10px;
  color: #0284c7;
  font-size: 12px;
  font-weight: 600;
  background: #e0f2fe;
  border-radius: 6px;
}

.modal-right h3 {
  margin: 16px 0 8px;
  color: #1e293b;
  font-size: 14px;
  font-weight: 600;
}

.prompt-box {
  position: relative;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.prompt-box p {
  margin: 0 0 12px;
  color: #334155;
  font-size: 14px;
  line-height: 1.5;
}

.copy-prompt-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  color: #475569;
  font-size: 12px;
  font-weight: 550;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.param-item {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
}

.p-label {
  color: #94a3b8;
  font-size: 11px;
}

.p-val {
  margin-top: 2px;
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
}

.modal-bottom-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 24px;
}

.remix-big-btn {
  flex: 1;
  display: flex;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #18181b;
  border: 0;
  border-radius: 12px;
}

.download-btn {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: #334155;
  background: #f1f5f9;
  border-radius: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  color: #94a3b8;
}

@media (max-width: 1200px) {
  .prompts-grid { grid-template-columns: repeat(3, 1fr); }
  .prompts-grid.is-showcase { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 860px) {
  .prompts-grid { grid-template-columns: repeat(2, 1fr); }
  .prompts-grid.is-showcase { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 580px) {
  .prompts-grid { grid-template-columns: 1fr; }
  .prompts-grid.is-showcase { grid-template-columns: 1fr; }
  .prompt-card.is-showcase .favorite-button { opacity: 1; transform: none; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
