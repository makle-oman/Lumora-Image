<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CircleAlert,
  ChevronDown,
  Grid2X2,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  X,
  Zap,
} from 'lucide-vue-next'
import {
  type ApiStatus,
  type GenerateImageRequest,
} from '../../types/generation'

const props = withDefaults(defineProps<{
  loading: boolean
  apiStatus: ApiStatus
  errorMessage: string
  showBatchEdit?: boolean
}>(), {
  showBatchEdit: false,
})

const emit = defineEmits<{
  generate: [request: GenerateImageRequest]
}>()

const prompt = defineModel<string>({ default: '' })
const selectedCount = ref(1)
const referenceInput = ref<HTMLInputElement | null>(null)
const references = ref<Array<{ id: string; file: File; url: string }>>([])
const batchEdit = ref(false)
const promptHeight = ref(88)
const minPromptHeight = 88
const maxPromptHeight = 360
let resizeStartY = 0
let resizeStartHeight = 0
let isResizing = false

// Parameter Popover State
const isParamPopoverOpen = ref(false)
const messageText = ref('')
const showApiStatus = ref(false)
let messageTimeout: ReturnType<typeof setTimeout> | null = null

const countOptions = [
  { count: 1, cost: '1 积分' },
  { count: 2, cost: '2 积分' },
  { count: 3, cost: '3 积分' },
  { count: 4, cost: '4 积分' },
]

function resetDefaults(): void {
  selectedCount.value = 1
}

function handleClickOutside(event: MouseEvent): void {
  const target = event.target as HTMLElement
  if (isParamPopoverOpen.value && !target.closest('.param-trigger-wrapper')) {
    isParamPopoverOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearMessage()
  for (const reference of references.value) URL.revokeObjectURL(reference.url)
})

const canGenerate = computed(() => (
  prompt.value.trim().length > 0
  && !props.loading
))

const statusText = computed(() => {
  if (props.errorMessage) return props.errorMessage
  if (props.apiStatus === 'unauthenticated') return '登录后即可生成图片'
  if (props.apiStatus === 'missing') return '服务端 API 未配置'
  if (props.apiStatus === 'unreachable') return '无法连接本地 API 服务'
  if (props.apiStatus === 'checking') return '服务正在连接，请稍后重试'
  return ''
})

const visibleStatusText = computed(() => (
  props.errorMessage || showApiStatus.value ? statusText.value : ''
))

function clearMessage(): void {
  if (messageTimeout) {
    clearTimeout(messageTimeout)
    messageTimeout = null
  }
  messageText.value = ''
}

function showMessage(message: string): void {
  clearMessage()
  messageText.value = message
  messageTimeout = setTimeout(() => {
    messageText.value = ''
    messageTimeout = null
  }, 4500)
}

function submit(): void {
  if (!canGenerate.value) return
  if (props.apiStatus !== 'ready') {
    showApiStatus.value = true
    return
  }
  const request: GenerateImageRequest = {
    prompt: prompt.value.trim(),
    n: selectedCount.value as 1 | 2 | 3 | 4,
    isPublic: true,
    images: references.value.map(item => item.file),
    batch: batchEdit.value,
  }
  showApiStatus.value = false
  clearMessage()
  emit('generate', request)
  prompt.value = ''
}

function selectReferenceImages(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const available = 4 - references.value.length
  const valid = files
    .filter(file => ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= 50 * 1024 * 1024)
    .slice(0, available)
  if (valid.length !== files.length) showMessage('最多上传 4 张 PNG、JPEG 或 WebP 图片，每张不超过 50MB')
  references.value.push(...valid.map(file => ({
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    url: URL.createObjectURL(file),
  })))
}

function removeReference(id: string): void {
  const reference = references.value.find(item => item.id === id)
  if (reference) URL.revokeObjectURL(reference.url)
  references.value = references.value.filter(item => item.id !== id)
  if (!references.value.length) batchEdit.value = false
}

function handleEnter(event: KeyboardEvent): void {
  if (event.shiftKey) return
  event.preventDefault()
  submit()
}

function setPromptHeight(height: number): void {
  promptHeight.value = Math.min(maxPromptHeight, Math.max(minPromptHeight, height))
}

function startPromptResize(event: PointerEvent): void {
  if (event.button !== 0) return
  isResizing = true
  resizeStartY = event.clientY
  resizeStartHeight = promptHeight.value
  event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId)
}

function resizePrompt(event: PointerEvent): void {
  if (!isResizing) return
  setPromptHeight(resizeStartHeight + resizeStartY - event.clientY)
}

function stopPromptResize(event: PointerEvent): void {
  isResizing = false
  if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
}
</script>

<template>
  <form class="composer" :class="{ 'has-batch': showBatchEdit }" @submit.prevent="submit">
    <Teleport to="body">
      <Transition name="message-fade">
        <div v-if="messageText" class="system-message" role="alert">
          <CircleAlert class="system-message-icon" :size="18" :stroke-width="2" aria-hidden="true" />
          <span class="system-message-text">{{ messageText }}</span>
          <button
            class="system-message-close"
            type="button"
            title="关闭提示"
            aria-label="关闭提示"
            @click="clearMessage"
          >
            <X :size="15" :stroke-width="2" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- iOS Style Drag Handle Bar at Top Border -->
    <button
      class="resize-handle"
      type="button"
      title="拖动调整输入框高度"
      aria-label="调整输入框高度"
      @pointerdown.prevent="startPromptResize"
      @pointermove="resizePrompt"
      @pointerup="stopPromptResize"
      @pointercancel="stopPromptResize"
      @keydown.up.prevent="setPromptHeight(promptHeight + 24)"
      @keydown.down.prevent="setPromptHeight(promptHeight - 24)"
    >
      <div class="ios-drag-pill" />
    </button>

    <div class="prompt-row">
      <button class="add-button" type="button" title="添加参考图" aria-label="添加参考图" @click="referenceInput?.click()">
        <Plus :size="20" :stroke-width="1.7" />
      </button>
      <input
        ref="referenceInput"
        class="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        @change="selectReferenceImages"
      />
      <label class="sr-only" for="image-prompt">请输入你的创意</label>
      <textarea
        id="image-prompt"
        v-model="prompt"
        :style="{ height: `${promptHeight}px` }"
        rows="3"
        maxlength="5000"
        placeholder="请输入你的创意（按 Enter 发送，Shift+Enter 换行）"
        @keydown.enter="handleEnter"
      />
    </div>

    <div v-if="references.length" class="reference-strip">
      <div v-for="reference in references" :key="reference.id" class="reference-item">
        <img :src="reference.url" :alt="reference.file.name" />
        <button type="button" :title="`移除 ${reference.file.name}`" @click="removeReference(reference.id)">
          <X :size="12" />
        </button>
      </div>
    </div>

    <div class="composer-controls">
      <div class="model-options">
        <button class="model-button is-active" type="button">
          <Sparkles :size="12" :stroke-width="2.2" />
          GPT-IMAGE-2
        </button>
      </div>

      <div class="generation-options">
        <!-- Next-Gen Glassmorphic Parameter Controller -->
        <div class="param-trigger-wrapper">
          <button
            class="size-control-btn"
            type="button"
            :class="{ 'is-open': isParamPopoverOpen }"
            @click.stop="isParamPopoverOpen = !isParamPopoverOpen"
          >
            <div class="btn-left">
              <Grid2X2 :size="13" :stroke-width="2" class="param-icon" />
              <span>{{ selectedCount }} 张</span>
            </div>
            <ChevronDown
              :size="12"
              :stroke-width="2"
              class="chevron-icon"
              :class="{ 'is-flipped': isParamPopoverOpen }"
            />
          </button>

          <!-- Ultra-Premium Glassmorphic Parameter Popover -->
          <Transition name="popover-fade">
            <div v-if="isParamPopoverOpen" class="param-popover" @click.stop>
              <!-- Popover Header -->
              <div class="popover-header">
                <div class="header-title">
                  <Grid2X2 :size="14" class="purple-icon" />
                  <span>生成张数</span>
                </div>
                <button
                  class="reset-link-btn"
                  type="button"
                  title="重置参数"
                  @click="resetDefaults"
                >
                  重置
                </button>
              </div>

              <!-- Section 1: Aspect Ratio Selection -->

              <!-- Section 2: Generation Batch Count -->
              <div class="popover-section">
                <div class="section-label-row">
                  <span class="section-label">并发生成张数</span>
                  <span class="section-hint"><Zap :size="11" class="amber-icon" /> 按量消耗积分</span>
                </div>

                <div class="count-segments">
                  <button
                    v-for="item in countOptions"
                    :key="item.count"
                    type="button"
                    class="count-segment-btn"
                    :class="{ active: selectedCount === item.count }"
                    @click="selectedCount = item.count"
                  >
                    <span class="count-num">{{ item.count }} 张</span>
                    <span class="cost-tag">{{ item.cost }}</span>
                  </button>
                </div>
              </div>

              <!-- Popover Footer Action -->
              <div class="popover-footer">
                <span class="footer-tip">已选 <strong>{{ selectedCount }}</strong> 张输出</span>
                <button
                  class="done-btn"
                  type="button"
                  @click="isParamPopoverOpen = false"
                >
                  应用设置
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <button
          v-if="showBatchEdit"
          class="batch-button"
          :class="{ active: batchEdit }"
          type="button"
          :disabled="!references.length"
          @click="batchEdit = !batchEdit"
        >
          <Layers3 :size="14" :stroke-width="1.8" />
          批量编辑
        </button>
      </div>

      <!-- Generate Button with Ultra-smooth 60fps Glowing Pulse during Loading -->
      <button
        class="generate-button"
        :class="{ 'is-loading': loading }"
        type="submit"
        :disabled="!canGenerate"
        :title="visibleStatusText || '生成图片'"
      >
        <span class="btn-inner">
          <LoaderCircle v-if="loading" class="spinner" :size="15" aria-hidden="true" />
          <span>{{ loading ? '生成中' : '生成' }}</span>
        </span>
      </button>
    </div>

    <p v-if="visibleStatusText" class="composer-status" role="alert">{{ visibleStatusText }}</p>
    <p class="sr-only" aria-live="polite">{{ visibleStatusText }}</p>
  </form>
</template>

<style scoped>
.composer {
  position: relative;
  width: 100%;
  overflow: visible;
  background: #fcfcfc;
  border: 1px solid #e3e3e3;
  border-radius: 24px;
  box-shadow: 0 10px 40px 5px rgb(194 194 194 / 25%);
}

.prompt-row {
  display: flex;
  min-height: 114px;
  gap: 12px;
  padding: 18px 20px 8px;
}

.reference-strip {
  display: flex;
  gap: 8px;
  padding: 0 20px 12px 76px;
  overflow-x: auto;
}

.reference-item {
  position: relative;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
}

.reference-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 1px solid #dddddd;
  border-radius: 8px;
}

.reference-item button {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  padding: 0;
  color: #ffffff;
  cursor: pointer;
  background: #18181b;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

/* iOS Style Drag Handle Bar at Top Border (GPU accelerated 60fps) */
.resize-handle {
  position: absolute;
  top: -7px;
  left: 50%;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 14px;
  padding: 0;
  cursor: ns-resize;
  touch-action: none;
  background: transparent;
  border: 0;
  transform: translateX(-50%);
}

.ios-drag-pill {
  width: 32px;
  height: 4px;
  background: #cbd5e1;
  border-radius: 2px;
  will-change: width, background-color;
  transition: width 150ms ease, background-color 150ms ease;
}

.resize-handle:hover .ios-drag-pill,
.resize-handle:focus-visible .ios-drag-pill {
  width: 40px;
  background: #7c3aed;
}

.add-button {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  color: #bbbbbb;
  cursor: pointer;
  background: #f5f5f5;
  border: 1px dashed #dddddd;
  border-radius: 12px;
}

textarea {
  display: block;
  width: 100%;
  height: 88px;
  min-width: 0;
  padding: 8px 0;
  color: #1a1a1a;
  font-size: 15px;
  line-height: 1.55;
  resize: none;
  background: transparent;
  border: 0;
  outline: 0;
}

textarea::placeholder {
  color: #999999;
}

.composer-controls {
  position: relative;
  display: flex;
  min-height: 60px;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-top: 1px solid #ececec;
}

.model-options,
.generation-options {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-button,
.size-control-btn,
.batch-button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  color: #666666;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  background: #f5f5f5;
  border: 1px solid transparent;
  border-radius: 16px;
  transition: all 180ms ease;
}

.model-button {
  cursor: pointer;
}

.model-button.is-active {
  color: #ffffff;
  background: #1a1a1a;
}

.model-button:disabled {
  cursor: default;
  opacity: 0.78;
}

/* Stable Width Parameter Pill Trigger Button */
.param-trigger-wrapper {
  position: relative;
  width: 132px;
  flex-shrink: 0;
}

.size-control-btn {
  width: 100%;
  box-sizing: border-box;
  justify-content: space-between;
  padding: 0 12px;
  color: #334155;
  font-weight: 550;
  cursor: pointer;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.btn-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.param-icon {
  color: #7c3aed;
}

.divider {
  color: #cbd5e1;
  font-size: 10px;
}

.size-control-btn:hover,
.size-control-btn.is-open {
  color: #0f172a;
  background: #ffffff;
  border-color: #7c3aed;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.12);
}

.chevron-icon {
  margin-left: 4px;
  transition: transform 180ms ease;
}

.chevron-icon.is-flipped {
  transform: rotate(180deg);
}

/* Next-Gen Ultra-Premium Parameter Popover */
.param-popover {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  width: 356px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14), 0 6px 20px rgba(124, 58, 237, 0.06);
  backdrop-filter: blur(28px);
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 650;
}

.purple-icon {
  color: #7c3aed;
}

.reset-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: color 150ms ease;
}

.reset-link-btn:hover {
  color: #7c3aed;
}

.popover-section {
  display: flex;
  flex-direction: column;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-label {
  color: #475569;
  font-size: 12px;
  font-weight: 650;
}

.section-hint {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #94a3b8;
  font-size: 11px;
}

.amber-icon {
  color: #f59e0b;
}

/* Aspect Ratio 6-Grid Tactile Cards */
.ratio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ratio-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  color: #475569;
  cursor: pointer;
  background: #f8fafc;
  border: 1.5px solid #f1f5f9;
  border-radius: 14px;
  box-sizing: border-box;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.ratio-card:hover {
  color: #0f172a;
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.ratio-card.active {
  color: #0f172a;
  background: #ffffff;
  border-color: #7c3aed;
  box-shadow: 0 0 0 0.5px #7c3aed, 0 4px 16px rgba(124, 58, 237, 0.15);
}

.ratio-preview-box {
  display: grid;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  place-items: center;
}

.ratio-shape-inner {
  background: transparent;
  border: 1.5px solid currentColor;
  border-radius: 3px;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.ratio-card.active .ratio-shape-inner {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.12);
}

.ratio-text-group {
  display: flex;
  flex-direction: column;
  text-align: left;
  min-width: 0;
}

.ratio-main-label {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
}

.ratio-sub-label {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 500;
  transition: color 160ms ease;
}

.ratio-card.active .ratio-sub-label {
  color: #7c3aed;
}

.check-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  width: 15px;
  height: 15px;
  place-items: center;
  color: #ffffff;
  background: #7c3aed;
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 160ms ease, transform 160ms ease;
}

.check-badge.show {
  opacity: 1;
  transform: scale(1);
}

/* Count Segmented Controller */
.count-segments {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.count-segment-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 44px;
  color: #475569;
  cursor: pointer;
  background: #f8fafc;
  border: 1.5px solid #f1f5f9;
  border-radius: 12px;
  box-sizing: border-box;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.count-segment-btn:hover {
  color: #0f172a;
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.count-segment-btn.active {
  color: #0f172a;
  background: #ffffff;
  border-color: #7c3aed;
  box-shadow: 0 0 0 0.5px #7c3aed, 0 4px 16px rgba(124, 58, 237, 0.15);
}

.count-num {
  font-size: 12px;
  font-weight: 700;
}

.count-segment-btn.active .count-num {
  color: #7c3aed;
}

.cost-tag {
  color: #94a3b8;
  font-size: 9px;
}

/* Footer Action */
.popover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  margin-top: 18px;
  border-top: 1px solid #f1f5f9;
}

.footer-tip {
  color: #64748b;
  font-size: 11px;
}

.footer-tip strong {
  color: #0f172a;
}

.done-btn {
  padding: 6px 14px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: #0f172a;
  border: 0;
  border-radius: 10px;
  transition: background 150ms ease;
}

.done-btn:hover {
  background: #7c3aed;
}

.batch-button {
  cursor: pointer;
}

.batch-button.active {
  color: #ffffff;
  background: #18181b;
}

.batch-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.generate-button {
  position: relative;
  display: inline-flex;
  min-width: 86px;
  width: auto;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  background: #0f172a;
  border: 1px solid transparent;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 180ms ease;
}

.btn-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.generate-button:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
}

.generate-button:disabled:not(.is-loading) {
  cursor: not-allowed;
  background: #cbd5e1;
  color: #94a3b8;
  box-shadow: none;
}

/* Lightweight 60fps Purple Glow Pulse Animation during Loading (Zero GPU lag) */
.generate-button.is-loading {
  background: #0f172a;
  border-color: rgba(192, 132, 252, 0.8);
  box-shadow: 0 0 14px rgba(168, 85, 247, 0.35);
  animation: pulseBorderGlow 1.6s ease-in-out infinite;
  will-change: border-color, box-shadow;
  cursor: wait;
}

@keyframes pulseBorderGlow {
  0%, 100% {
    border-color: rgba(192, 132, 252, 0.5);
    box-shadow: 0 0 8px rgba(124, 58, 237, 0.2);
  }
  50% {
    border-color: rgba(168, 85, 247, 0.95);
    box-shadow: 0 0 18px rgba(168, 85, 247, 0.5);
  }
}

.composer-status {
  margin: -2px 20px 12px;
  padding: 8px 12px;
  color: #b42318;
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  background: #fef3f2;
  border: 1px solid #fecdca;
  border-radius: 10px;
}

.system-message {
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 200;
  display: flex;
  width: min(460px, calc(100vw - 32px));
  min-height: 44px;
  box-sizing: border-box;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 14px;
  color: #7f1d1d;
  background: rgb(255 250 250 / 96%);
  border: 1px solid #fecaca;
  border-radius: 14px;
  box-shadow: 0 16px 36px rgb(124 58 237 / 12%), 0 4px 12px rgb(15 23 42 / 8%);
  backdrop-filter: blur(16px);
  transform: translateX(-50%);
}

.system-message-icon {
  flex: 0 0 auto;
  color: #e05a75;
}

.system-message-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.system-message-close {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  color: #9f1239;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.system-message-close:hover {
  background: rgb(225 29 72 / 8%);
}

.message-fade-enter-active,
.message-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

.spinner {
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Popover Transition */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px) scale(0.96);
}

@media (max-width: 720px) {
  .composer {
    border-radius: 18px;
  }

  .prompt-row {
    min-height: 111px;
    padding: 16px 14px 7px;
  }

  .reference-strip {
    padding-right: 14px;
    padding-left: 70px;
  }

  .system-message {
    top: 14px;
  }

  textarea {
    height: 88px;
    padding-top: 8px;
    font-size: 14px;
  }

  .composer-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 7px 8px;
    padding: 9px 13px 12px;
  }

  .model-options {
    grid-column: 1 / 4;
  }

  .generation-options {
    min-width: 0;
  }

  .param-popover {
    width: 310px;
    left: 50%;
  }

  .ratio-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
