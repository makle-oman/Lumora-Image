<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  CircleAlert,
  Copy,
  Download,
  Edit3,
  Globe2,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import PromptComposer from '../../components/PromptComposer/index.vue'
import { useDesktopStore } from '../../stores/desktop'
import { useGenerationStore } from '../../stores/generation'
import { useMessageStore } from '../../stores/message'
import type { GeneratedImage } from '../../types/generation'

const route = useRoute()
const desktopStore = useDesktopStore()
const generationStore = useGenerationStore()
const messageStore = useMessageStore()
const {
  images,
  activeTasks,
  failedTasks,
  failedTasksUpdating,
  isLoading,
  imagesLoading,
  hasMoreImages,
  errorMessage,
  apiStatus,
} = storeToRefs(generationStore)

const prompt = ref('')
const selectedPreview = ref<{ url: string; alt: string; downloadName?: string } | null>(null)
const copiedId = ref<string | null>(null)
const visibilityUpdatingId = ref<string | null>(null)
const loadMoreTrigger = ref<HTMLElement | null>(null)
let loadMoreObserver: IntersectionObserver | null = null

// Newest generated images first
const sortedImages = computed(() => {
  return [...images.value]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
})

// Dynamic loading step messages
const loadingSteps = [
  '🎨 正在调配完美的色彩...',
  '✨ 正在解析灵感提示词...',
  '🖌️ 正在构筑细节与纹理...',
  '⚡ 正在进行超清画面渲染...',
]
const currentTime = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

// Quick prompt suggestions for empty state
const samplePrompts = [
  '帮我随机生成一张2k的图片',
  '一张小红书风格的护肤成分党知识科普长图，竖版9:16比例（适合长图笔记封面）。整体科普严谨感：米白背景+深绿主色+数据强调红色。顶部大字标题“成分党 / 烟酰胺真的能美白吗？”',
  '3D 抽象流体水晶雕塑，极简主义，绚丽光谱折射',
  '一只在咖啡杯旁打盹的橘猫，柔和自然光，写实风格',
]

onMounted(() => {
  if (route.query.prompt) {
    prompt.value = String(route.query.prompt)
  }
  const resume = generationStore.isLoading
    ? Promise.resolve()
    : generationStore.resumeTasks(false)
  void Promise.all([resume, generationStore.loadImages(false)])
  loadMoreObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) void generationStore.loadMoreImages()
  }, {
    root: document.getElementById('main-content'),
    rootMargin: '600px 0px',
  })
  if (loadMoreTrigger.value) loadMoreObserver.observe(loadMoreTrigger.value)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  loadMoreObserver?.disconnect()
})

watch(() => route.query.prompt, (newVal) => {
  if (newVal) {
    prompt.value = String(newVal)
  }
})

watch(() => activeTasks.value.length, (count) => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = count
    ? setInterval(() => { currentTime.value = Date.now() }, 1000)
    : null
}, { immediate: true })

watch(isLoading, (loading) => {
  if (loading) document.getElementById('main-content')?.scrollTo({ top: 0 })
})

function elapsedSeconds(createdAt: string): string {
  return Math.floor(Math.max(0, currentTime.value - Date.parse(createdAt)) / 1000).toString()
}

function loadingStepIndex(createdAt: string): number {
  return Math.floor(Math.max(0, currentTime.value - Date.parse(createdAt)) / 1200) % loadingSteps.length
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '17:57'
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  } catch {
    return '17:57'
  }
}

function handleReEdit(imgPrompt: string): void {
  prompt.value = imgPrompt
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

async function handleRegenerate(img: GeneratedImage): Promise<void> {
  prompt.value = img.prompt
  await generationStore.generate({
    prompt: img.prompt,
  })
}

async function handleRetryTask(id: string): Promise<void> {
  await generationStore.retryTask(id)
}

async function handleDeleteFailedTask(id: string): Promise<void> {
  if (window.confirm('确认删除这条失败记录？')) await generationStore.removeFailedTask(id)
}

async function handleClearFailedTasks(): Promise<void> {
  if (window.confirm('确认清除所有失败记录？')) await generationStore.clearFailedTasks()
}

async function handleVisibilityChange(img: GeneratedImage, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  visibilityUpdatingId.value = img.id
  const updated = await generationStore.setImageVisibility(img.id, input.checked)
  if (!updated) input.checked = img.isPublic
  visibilityUpdatingId.value = null
}

async function copyPromptText(id: string, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    messageStore.show('提示词已复制', 'success')
    setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch {
    // fallback
    messageStore.show('提示词复制失败', 'error')
  }
}

function openPureImage(img: GeneratedImage): void {
  selectedPreview.value = {
    url: img.url,
    alt: img.prompt,
    downloadName: `lumora-${img.id}.png`,
  }
}

function openReferenceImage(url: string, promptText: string): void {
  selectedPreview.value = { url, alt: `参考图：${promptText}` }
}

function useSamplePrompt(p: string): void {
  prompt.value = p
}

</script>

<template>
  <section class="create-studio-view">
    <!-- Creation Vertical Stream (One per row, newest first) -->
    <div class="creation-vertical-stream">
      <!-- 1. Generating Row Item (Appears at top when generating) -->
      <div
        v-for="task in activeTasks"
        :key="task.id"
        class="stream-row-item generating-row-item"
      >
        <!-- Dynamic Loading Status Pill -->
        <div class="generating-status-pill">
          <span class="color-wheel-icon">🎨</span>
          <span>{{ loadingSteps[loadingStepIndex(task.createdAt)] }}</span>
        </div>

        <!-- Glassmorphic Prompt Bubble Container -->
        <div class="prompt-bubble">
          <span class="prompt-text">{{ task.prompt || '正在为你描绘创意...' }}</span>
          <span class="timestamp">{{ formatTime(task.createdAt) }}</span>
        </div>

        <div v-if="task.referenceImages.length" class="reference-image-row">
          <span class="reference-image-label">参考图</span>
          <button
            v-for="(referenceUrl, index) in task.referenceImages"
            :key="referenceUrl"
            class="reference-image-button"
            type="button"
            :title="`查看参考图 ${index + 1}`"
            @click="openReferenceImage(referenceUrl, task.prompt)"
          >
            <img :src="referenceUrl" :alt="`参考图 ${index + 1}`" />
          </button>
        </div>

        <!-- Model Tag -->
        <div class="meta-tag-row">
          <span class="model-badge">
            <Sparkles :size="11" />
            ✦ GPT-IMAGE-2
          </span>
        </div>

        <!-- Skeleton Canvas Stage -->
        <div class="skeleton-canvas-stage">
          <div class="live-timer-badge">
            <LoaderCircle :size="11" class="mini-spin" />
            <span>{{ task.status === 'queued' ? '排队中' : '生成中' }}.. {{ elapsedSeconds(task.createdAt) }}s</span>
          </div>
          <div class="canvas-shimmer-wave" />
        </div>

        <!-- Disabled Action Bar -->
      </div>

      <div v-if="failedTasks.length" class="failed-list-header">
        <span>{{ failedTasks.length }} 条失败记录</span>
        <button
          class="clear-failed-button"
          type="button"
          :disabled="failedTasksUpdating"
          @click="handleClearFailedTasks"
        >
          <Trash2 :size="13" />
          <span>清除全部失败</span>
        </button>
      </div>

      <div
        v-for="task in failedTasks"
        :key="task.id"
        class="stream-row-item failed-row-item"
      >
        <div class="failed-status-pill">
          <CircleAlert :size="14" />
          <span>生成失败</span>
        </div>

        <div class="prompt-bubble">
          <span class="prompt-text">{{ task.prompt }}</span>
          <span class="timestamp">{{ formatTime(task.updatedAt) }}</span>
        </div>

        <div v-if="task.referenceImages.length" class="reference-image-row">
          <span class="reference-image-label">参考图</span>
          <button
            v-for="(referenceUrl, index) in task.referenceImages"
            :key="referenceUrl"
            class="reference-image-button"
            type="button"
            :title="`查看参考图 ${index + 1}`"
            @click="openReferenceImage(referenceUrl, task.prompt)"
          >
            <img :src="referenceUrl" :alt="`参考图 ${index + 1}`" />
          </button>
        </div>

        <div class="failed-error-panel">{{ task.error || '上游未返回图片，请重新生成' }}</div>

        <div class="card-action-bar">
          <button
            class="action-pill-btn"
            type="button"
            title="编辑提示词"
            @click="handleReEdit(task.prompt)"
          >
            <Pencil :size="12" />
            <span>编辑提示词</span>
          </button>
          <button
            class="action-pill-btn"
            type="button"
            title="复制提示词"
            @click="copyPromptText(task.id, task.prompt)"
          >
            <Copy :size="12" />
            <span>{{ copiedId === task.id ? '已复制' : '复制提示词' }}</span>
          </button>
          <button
            class="action-pill-btn retry-action-btn"
            type="button"
            title="按原参数重新生成"
            :disabled="isLoading || failedTasksUpdating"
            @click="handleRetryTask(task.id)"
          >
            <RotateCcw :size="12" />
            <span>重新生成</span>
          </button>
          <button
            class="action-pill-btn delete-failed-action-btn"
            type="button"
            title="删除失败记录"
            :disabled="failedTasksUpdating"
            @click="handleDeleteFailedTask(task.id)"
          >
            <Trash2 :size="12" />
            <span>删除</span>
          </button>
        </div>
      </div>

      <!-- 2. Generated Images List (Stacked Vertically One Per Row, Newest First) -->
      <div
        v-for="img in sortedImages"
        :key="img.id"
        class="stream-row-item history-row-item"
      >
        <!-- Glassmorphic Prompt Bubble Container (Fit text content, soft purple glow on hover) -->
        <div class="prompt-bubble">
          <span class="prompt-text">{{ img.prompt }}</span>
          <span class="timestamp">{{ formatTime(img.createdAt) }}</span>

          <!-- Quick Action Buttons (Fade in smoothly when hovering over prompt bubble) -->
          <div class="bubble-hover-actions">
            <button
              class="hover-action-btn use-prompt-btn"
              type="button"
              title="使用此提示词"
              @click="handleReEdit(img.prompt)"
            >
              <Pencil :size="12" />
              <span>使用提示词</span>
            </button>

            <button
              class="hover-action-btn copy-prompt-btn"
              type="button"
              title="复制提示词"
              @click="copyPromptText(img.id, img.prompt)"
            >
              <Copy :size="12" />
              <span>{{ copiedId === img.id ? '已复制' : '复制' }}</span>
            </button>
          </div>
        </div>

        <div v-if="img.referenceImages?.length" class="reference-image-row">
          <span class="reference-image-label">参考图</span>
          <button
            v-for="(referenceUrl, index) in img.referenceImages"
            :key="referenceUrl"
            class="reference-image-button"
            type="button"
            :title="`查看参考图 ${index + 1}`"
            @click="openReferenceImage(referenceUrl, img.prompt)"
          >
            <img :src="referenceUrl" :alt="`参考图 ${index + 1}`" />
          </button>
        </div>

        <!-- Model Tag (✦ GPT-IMAGE-2) -->
        <div class="meta-tag-row">
          <span class="model-badge">
            <Sparkles :size="11" />
            ✦ {{ (img.model || 'GPT-IMAGE-2').toUpperCase() }}
          </span>
        </div>

        <!-- Direct Pure Image Thumbnail -->
        <div class="image-stage" @click="openPureImage(img)">
          <img
            :src="img.thumbnailUrl"
            :alt="img.prompt"
            class="generated-img"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
          />
          <div class="hover-view-overlay">
            <Sparkles :size="18" />
            <span>全屏大图</span>
          </div>
        </div>

        <!-- Action Pill Buttons Row below Image -->
        <div class="card-action-bar">
          <button
            class="action-pill-btn"
            type="button"
            title="重新编辑"
            @click="handleReEdit(img.prompt)"
          >
            <Pencil :size="12" />
            <span>重新编辑</span>
          </button>

          <button
            class="action-pill-btn"
            type="button"
            title="再次生成"
            @click="handleRegenerate(img)"
          >
            <RotateCcw :size="12" />
            <span>再次生成</span>
          </button>

          <label
            class="image-visibility-control"
            :class="{ 'is-public': img.isPublic, 'is-updating': visibilityUpdatingId === img.id }"
            :title="img.isPublic ? '取消公开' : '公开到首页和画廊'"
          >
            <input
              type="checkbox"
              :checked="img.isPublic"
              :disabled="visibilityUpdatingId === img.id"
              @change="handleVisibilityChange(img, $event)"
            />
            <LoaderCircle v-if="visibilityUpdatingId === img.id" :size="12" class="mini-spin" />
            <Globe2 v-else :size="12" />
            <span>{{ img.isPublic ? '已公开' : '公开' }}</span>
            <span class="image-visibility-switch" aria-hidden="true" />
          </label>

          <a
            v-if="!desktopStore.available"
            class="action-pill-btn save-btn"
            :href="img.url"
            :download="`lumora-${img.id}.png`"
            target="_blank"
            title="保存图片"
          >
            <Download :size="12" />
            <span>保存</span>
          </a>
        </div>
      </div>

      <div ref="loadMoreTrigger" class="load-more-trigger">
        <button
          v-if="hasMoreImages"
          class="load-more-button"
          type="button"
          :disabled="imagesLoading"
          @click="generationStore.loadMoreImages"
        >
          <LoaderCircle v-if="imagesLoading" :size="13" class="mini-spin" />
          <span>{{ imagesLoading ? '加载中' : '加载更多' }}</span>
        </button>
      </div>
    </div>

    <!-- Empty State if no images created yet -->
    <div v-if="!images.length && !isLoading" class="empty-studio-state">
      <div class="sparkle-icon-circle">
        <Sparkles :size="32" />
      </div>
      <h2>准备好开启你的创意了吗？</h2>
      <p>在下方输入框描述你的构想，或者尝试以下热门创意：</p>

      <div class="sample-pills-grid">
        <button
          v-for="(p, idx) in samplePrompts"
          :key="idx"
          class="sample-prompt-pill"
          type="button"
          @click="useSamplePrompt(p)"
        >
          <Edit3 :size="13" />
          <span>{{ p }}</span>
        </button>
      </div>
    </div>

    <!-- Fixed Floating Bottom Composer Dock -->
    <div class="composer-dock">
      <PromptComposer
        v-model="prompt"
        :loading="isLoading"
        :api-status="apiStatus"
        :error-message="errorMessage"
        show-batch-edit
        @generate="generationStore.generate"
      />
    </div>

    <!-- Pure Large Image Lightbox Overlay -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedPreview"
          class="pure-lightbox-overlay"
          @click.self="selectedPreview = null"
        >
          <button
            class="lightbox-close-btn"
            type="button"
            aria-label="关闭大图"
            @click="selectedPreview = null"
          >
            <X :size="22" />
          </button>

          <div class="pure-lightbox-content">
            <img
              :src="selectedPreview.url"
              :alt="selectedPreview.alt"
              class="pure-lightbox-img"
            />

            <div v-if="!desktopStore.available && selectedPreview.downloadName" class="lightbox-bottom-bar">
              <a
                class="lightbox-download-btn"
                :href="selectedPreview.url"
                :download="selectedPreview.downloadName"
                target="_blank"
              >
                <Download :size="15" />
                <span>下载高清原图</span>
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.create-studio-view {
  position: relative;
  width: 100%;
  min-height: 100dvh;
  padding-top: 36px;
  padding-bottom: 300px;
}

/* Vertical Creation Stream Container (Stacked One per Row) */
.creation-vertical-stream {
  display: flex;
  flex-direction: column;
  gap: 36px;
  width: min(1080px, calc(100% - 64px));
  margin: 0 auto;
}

/* Single Stream Row Item */
.stream-row-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  animation: fadeInRow 400ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeInRow {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Top Dynamic Loading Status Pill ("🎨 正在调配完美的色彩...") */
.generating-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  margin-bottom: 14px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 600;
  background: rgba(243, 232, 255, 0.95);
  border: 1px solid rgba(216, 180, 254, 0.8);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.12);
  backdrop-filter: blur(10px);
}

.history-row-item {
  content-visibility: auto;
  contain-intrinsic-size: 360px;
}

.load-more-trigger {
  display: flex;
  min-height: 36px;
  justify-content: center;
}

.load-more-button {
  align-self: center;
  min-height: 36px;
  padding: 0 18px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.load-more-button:hover {
  color: #0f172a;
  border-color: #cbd5e1;
}

.failed-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  margin-bottom: 12px;
  color: #b42318;
  font-size: 12px;
  font-weight: 650;
  background: #fef3f2;
  border: 1px solid #fecdca;
  border-radius: 16px;
}

.failed-list-header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: #912018;
  font-size: 12px;
  font-weight: 650;
}

.clear-failed-button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  color: #b42318;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  background: #fff7f6;
  border: 1px solid #fecdca;
  border-radius: 6px;
}

.clear-failed-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.failed-error-panel {
  width: min(720px, 100%);
  box-sizing: border-box;
  padding: 10px 12px;
  margin-bottom: 12px;
  color: #912018;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  background: #fff7f6;
  border-left: 3px solid #f97066;
  border-radius: 6px;
}

.retry-action-btn {
  color: #7c2d12;
  border-color: #fed7aa;
}

.delete-failed-action-btn {
  color: #b42318;
  border-color: #fecdca;
}

.action-pill-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  transform: none;
}

.color-wheel-icon {
  display: inline-block;
  animation: spinWheel 2.5s linear infinite;
}

@keyframes spinWheel {
  to { transform: rotate(360deg); }
}

/* Sleek Glassmorphic Prompt Bubble Container */
.prompt-bubble {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  max-width: min(860px, 100%);
  padding: 8px 16px;
  margin-bottom: 10px;
  color: #1e293b;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.6;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.025);
  backdrop-filter: blur(12px);
  transition: all 180ms ease;
}

.prompt-bubble:hover {
  border-color: rgba(192, 132, 252, 0.45);
  box-shadow: 0 6px 18px rgba(124, 58, 237, 0.06);
}

.prompt-text {
  color: #0f172a;
  word-break: break-word;
}

.timestamp {
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 11.5px;
}

.reference-image-row {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.reference-image-label {
  margin-right: 2px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.reference-image-button {
  display: block;
  width: 52px;
  height: 52px;
  padding: 0;
  overflow: hidden;
  cursor: zoom-in;
  background: #e2e8f0;
  border: 1px solid #d8dee8;
  border-radius: 8px;
}

.reference-image-button img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Hover Action Buttons inside Prompt Bubble */
.bubble-hover-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.prompt-bubble:hover .bubble-hover-actions {
  opacity: 1;
  pointer-events: auto;
}

.hover-action-btn {
  display: inline-flex;
  height: 25px;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  font-size: 11.5px;
  font-weight: 550;
  cursor: pointer;
  border: none;
  border-radius: 10px;
  transition: all 150ms ease;
}

.use-prompt-btn {
  color: #7c3aed;
  background: rgba(238, 230, 255, 0.9);
}

.use-prompt-btn:hover {
  background: #ddd6fe;
  transform: translateY(-1px);
}

.copy-prompt-btn {
  color: #7c3aed;
  background: rgba(243, 238, 255, 0.9);
}

.copy-prompt-btn:hover {
  background: #ede9fe;
  transform: translateY(-1px);
}

/* Model Tag Row (✦ GPT-IMAGE-2) */
.meta-tag-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.model-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  color: #6b21a8;
  font-size: 11.5px;
  font-weight: 600;
  background: rgba(243, 232, 255, 0.9);
  border: 1px solid rgba(216, 180, 254, 0.6);
  border-radius: 14px;
}

/* Pure Image Stage Box (240px x 240px) */
.image-stage {
  position: relative;
  width: 240px;
  height: 240px;
  margin-bottom: 12px;
  overflow: hidden;
  cursor: pointer;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.image-stage:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.14);
}

.generated-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
}

.hover-view-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 200ms ease;
}

.image-stage:hover .hover-view-overlay {
  opacity: 1;
}

/* Skeleton Canvas Stage for Loading Item */
.skeleton-canvas-stage {
  position: relative;
  width: 240px;
  height: 240px;
  margin-bottom: 12px;
  overflow: hidden;
  border-radius: 20px;
  background: #f5f3ff;
  background-image: radial-gradient(#c084fc 16%, transparent 16%);
  background-size: 18px 18px;
  border: 1px solid rgba(216, 180, 254, 0.6);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.1);
}

.live-timer-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
}

.mini-spin {
  animation: spin 900ms linear infinite;
}

.canvas-shimmer-wave {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 20%,
    rgba(255, 255, 255, 0.65) 50%,
    transparent 80%
  );
  transform: translateX(-100%);
  animation: canvasScan 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes canvasScan {
  100% {
    transform: translateX(100%);
  }
}

/* Action pill buttons underneath image */
.card-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-pill-btn {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 5px;
  padding: 0 14px;
  color: #475569;
  font-size: 12px;
  font-weight: 550;
  text-decoration: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  transition: all 150ms ease;
}

.action-pill-btn:hover {
  color: #0f172a;
  background: #ffffff;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.image-visibility-control {
  position: relative;
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 5px;
  padding: 0 9px 0 12px;
  color: #475569;
  font-size: 12px;
  font-weight: 550;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
}

.image-visibility-control:hover {
  color: #0f172a;
  background: #ffffff;
  border-color: #cbd5e1;
}

.image-visibility-control.is-public {
  color: #6d28d9;
  border-color: #c4b5fd;
}

.image-visibility-control.is-updating {
  cursor: wait;
  opacity: 0.65;
}

.image-visibility-control input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.image-visibility-switch {
  position: relative;
  width: 28px;
  height: 16px;
  margin-left: 2px;
  background: #cbd5e1;
  border-radius: 8px;
  transition: background-color 150ms ease;
}

.image-visibility-switch::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  content: '';
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(15 23 42 / 20%);
  transition: transform 150ms ease;
}

.image-visibility-control input:checked ~ .image-visibility-switch {
  background: #7c3aed;
}

.image-visibility-control input:checked ~ .image-visibility-switch::after {
  transform: translateX(12px);
}

.image-visibility-control input:focus-visible ~ .image-visibility-switch {
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
}

.disabled-btn {
  opacity: 0.55;
  cursor: not-allowed !important;
}

/* Pure Large Image Lightbox Overlay */
.pure-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 160;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(8, 8, 12, 0.92);
  backdrop-filter: blur(20px);
}

.lightbox-close-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: #ffffff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  backdrop-filter: blur(12px);
  transition: all 180ms ease;
}

.lightbox-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.08);
}

.pure-lightbox-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 90vw;
  max-height: 88vh;
}

.pure-lightbox-img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.8);
}

.lightbox-bottom-bar {
  margin-top: 18px;
}

.lightbox-download-btn {
  display: inline-flex;
  height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 20px;
  backdrop-filter: blur(12px);
  transition: all 160ms ease;
}

.lightbox-download-btn:hover {
  background: rgba(255, 255, 255, 0.26);
  transform: translateY(-1px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty Studio State */
.empty-studio-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
}

.sparkle-icon-circle {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  margin-bottom: 18px;
  color: #7c3aed;
  background: #f3e8ff;
  border-radius: 50%;
}

.empty-studio-state h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
}

.empty-studio-state p {
  margin: 0 0 24px;
  color: #64748b;
  font-size: 14px;
}

.sample-pills-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 680px;
}

.sample-prompt-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  transition: all 160ms ease;
}

.sample-prompt-pill:hover {
  color: #7c3aed;
  border-color: #c084fc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
}

/* Fixed Floating Bottom Composer Dock */
.composer-dock {
  position: fixed;
  bottom: 20px;
  left: calc(50% + 44px);
  z-index: 30;
  width: min(920px, calc(100% - 130px));
  transform: translateX(-50%);
}

.composer-dock::before {
  position: absolute;
  inset: -20px -100vw -20px;
  z-index: -1;
  content: '';
  background: linear-gradient(to top, rgba(255, 255, 255, 0.96) 60%, transparent);
  backdrop-filter: blur(16px);
  pointer-events: none;
}

@media (max-width: 720px) {
  .create-studio-view {
    padding-bottom: 140px;
  }

  .creation-vertical-stream {
    width: calc(100% - 32px);
  }

  .composer-dock {
    left: 50%;
    bottom: 12px;
    width: calc(100% - 32px);
  }

  .composer-dock::before {
    inset: -20px -100vw -12px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 220ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
