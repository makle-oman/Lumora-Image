<script setup lang="ts">
import { ref } from 'vue'
import { Check, Copy, Download, Sparkles, X } from 'lucide-vue-next'

export interface DetailImageItem {
  id: string
  url: string
  prompt: string
  model?: string
  createdAt?: string
  size?: string
  aspectRatio?: string
  author?: string
}

const props = defineProps<{
  item: DetailImageItem | null
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  reuse: [prompt: string]
}>()

const isCopied = ref(false)

async function copyPrompt(): Promise<void> {
  if (!props.item?.prompt) return
  try {
    await navigator.clipboard.writeText(props.item.prompt)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 1800)
  } catch {
    isCopied.value = false
  }
}

function handleMakeSimilar(): void {
  if (!props.item?.prompt) return
  emit('reuse', props.item.prompt)
  emit('close')
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '2026-07-27 10:30'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}`
  } catch {
    return dateStr
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open && item" class="detail-overlay" @click.self="emit('close')">
        <div class="detail-container">
          <!-- Left Large Image Display Area -->
          <div class="detail-image-wrapper">
            <img :src="item.url" :alt="item.prompt" class="detail-img" />
          </div>

          <!-- Right Dark Side Panel Container -->
          <div class="detail-side-panel">
            <!-- Close Button positioned on outer top-right corner of side panel container -->
            <button class="close-btn" type="button" aria-label="关闭" @click="emit('close')">
              <X :size="16" />
            </button>

            <!-- Dark Prompt Card Box (contains PROMPT title, Copy button on top-right, & prompt text) -->
            <div class="prompt-card-box">
              <div class="prompt-box-header">
                <span class="prompt-label">PROMPT</span>
                <button class="copy-btn" type="button" @click="copyPrompt">
                  <Check v-if="isCopied" :size="13" />
                  <Copy v-else :size="13" />
                  <span>{{ isCopied ? '已复制' : 'Copy' }}</span>
                </button>
              </div>
              <p class="prompt-text">{{ item.prompt }}</p>
            </div>

            <!-- Model Info & Time -->
            <div class="model-info-meta">
              <Sparkles :size="13" class="model-star-icon" />
              <span class="model-name">{{ item.model || 'gpt-image-2' }}</span>
              <span class="meta-dot">·</span>
              <span class="meta-date">{{ formatDate(item.createdAt) }}</span>
            </div>

            <!-- Modal Action Buttons Row -->
            <div class="modal-actions-row">
              <a
                class="save-action-btn"
                :href="item.url"
                :download="`lumora-${item.id}.png`"
                target="_blank"
              >
                <Download :size="15" />
                <span>保存</span>
              </a>

              <button class="similar-action-btn" type="button" @click="handleMakeSimilar">
                <Sparkles :size="15" />
                <span>做同款</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(10, 10, 14, 0.82);
  backdrop-filter: blur(16px);
}

.detail-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  width: min(1080px, 92vw);
  max-height: 88vh;
}

.detail-image-wrapper {
  flex: 1.4;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 82vh;
  border-radius: 20px;
  overflow: hidden;
}

.detail-img {
  max-width: 100%;
  max-height: 82vh;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}

.detail-side-panel {
  position: relative;
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 22px 20px 20px;
  color: #ffffff;
  background: #1c1c1f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
}

/* Close button placed at outer top-right corner of container */
.close-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  z-index: 10;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #9a9a9e;
  cursor: pointer;
  background: #2c2c30;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  transition: all 150ms ease;
}

.close-btn:hover {
  color: #ffffff;
  background: #3a3a40;
  transform: scale(1.05);
}

/* Dark Prompt Card Box containing PROMPT title and Copy button on top-right */
.prompt-card-box {
  padding: 14px 16px;
  margin-bottom: 16px;
  max-height: 220px;
  overflow-y: auto;
  background: #28282c;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  scrollbar-width: thin;
}

.prompt-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.prompt-label {
  color: #8e8e93;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  color: #b0b0b8;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  border: 0;
  border-radius: 6px;
  transition: all 150ms ease;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.prompt-text {
  margin: 0;
  color: #f2f2f7;
  font-size: 13.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.model-info-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  color: #8e8e93;
  font-size: 12px;
  font-weight: 500;
}

.model-star-icon {
  color: #a855f7;
}

.meta-dot {
  color: #55555d;
}

.modal-actions-row {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.save-action-btn {
  flex: 1;
  display: inline-flex;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  background: #2d2d32;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition: background 150ms ease;
}

.save-action-btn:hover {
  background: #3a3a40;
}

.similar-action-btn {
  flex: 1.3;
  display: inline-flex;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  background: linear-gradient(135deg, #7c3aed, #9333ea);
  border: 0;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.similar-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(124, 58, 237, 0.55);
}

@media (max-width: 820px) {
  .detail-container {
    flex-direction: column;
    max-height: 92vh;
    overflow-y: auto;
  }
  .detail-side-panel {
    width: 100%;
  }
  .detail-image-wrapper {
    max-height: 50vh;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 220ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
