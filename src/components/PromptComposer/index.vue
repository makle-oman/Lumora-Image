<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Grid2X2, Layers3, LoaderCircle, Plus, Sparkles } from 'lucide-vue-next'
import {
  imageSizes,
  type ApiStatus,
  type GenerateImageRequest,
  type ImageSize,
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
const size = ref<ImageSize>('2048x2048')
const isPublic = ref(false)

const canGenerate = computed(() => (
  prompt.value.trim().length > 0
  && !props.loading
  && props.apiStatus === 'ready'
))

const statusText = computed(() => {
  if (props.apiStatus === 'missing') return '服务端 API 未配置'
  if (props.apiStatus === 'unreachable') return '无法连接本地 API 服务'
  return props.errorMessage
})

function submit(): void {
  if (!canGenerate.value) return
  emit('generate', {
    prompt: prompt.value.trim(),
    size: size.value,
    quality: 'high',
  })
}

function handleEnter(event: KeyboardEvent): void {
  if (event.shiftKey) return
  event.preventDefault()
  submit()
}
</script>

<template>
  <form class="composer" :class="{ 'has-batch': showBatchEdit }" @submit.prevent="submit">
    <div class="prompt-row">
      <button class="add-button" type="button" title="添加参考图" aria-label="添加参考图">
        <Plus :size="20" :stroke-width="1.7" />
      </button>
      <label class="sr-only" for="image-prompt">请输入你的创意</label>
      <textarea
        id="image-prompt"
        v-model="prompt"
        rows="3"
        maxlength="5000"
        placeholder="请输入你的创意（按 Enter 发送，Shift+Enter 换行）"
        @keydown.enter="handleEnter"
      />
    </div>

    <div class="composer-controls">
      <div class="model-options">
        <button class="model-button is-active" type="button">
          <Sparkles :size="12" :stroke-width="2.2" />
          GPT-IMAGE-2
        </button>
        <button class="model-button" type="button" disabled>
          <Sparkles :size="12" :stroke-width="2.2" />
          Banana2
        </button>
      </div>

      <div class="generation-options">
        <label class="size-control">
          <Grid2X2 :size="13" :stroke-width="1.8" />
          <span class="sr-only">图片尺寸</span>
          <select v-model="size" aria-label="图片尺寸">
            <option v-for="item in imageSizes" :key="item.value" :value="item.value">
              {{ item.label.replace(' 标准', '').replace(' 2K', '') }} | 1张
            </option>
          </select>
          <ChevronDown :size="12" :stroke-width="1.8" aria-hidden="true" />
        </label>

        <button v-if="showBatchEdit" class="batch-button" type="button">
          <Layers3 :size="14" :stroke-width="1.8" />
          批量编辑
        </button>
      </div>

      <label class="privacy-control">
        <span>公开</span>
        <input v-model="isPublic" type="checkbox" />
        <span class="toggle" aria-hidden="true" />
      </label>

      <button
        class="generate-button"
        type="submit"
        :disabled="!canGenerate"
        :title="statusText || '生成图片'"
      >
        <LoaderCircle v-if="loading" class="spinner" :size="16" aria-hidden="true" />
        {{ loading ? '生成中' : '生成' }}
      </button>
    </div>

    <p class="sr-only" aria-live="polite">{{ statusText }}</p>
  </form>
</template>

<style scoped>
.composer {
  width: 100%;
  overflow: hidden;
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
.size-control,
.batch-button {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  color: #888888;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  background: #f5f5f5;
  border: 0;
  border-radius: 16px;
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

.size-control {
  position: relative;
  padding-right: 9px;
}

.size-control select {
  max-width: 104px;
  height: 28px;
  padding: 0;
  color: #666666;
  font-size: 12px;
  cursor: pointer;
  appearance: none;
  background: transparent;
  border: 0;
  outline: 0;
}

.batch-button {
  cursor: pointer;
}

.privacy-control {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  color: #555555;
  font-size: 12px;
  cursor: pointer;
}

.privacy-control input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.toggle {
  position: relative;
  width: 34px;
  height: 18px;
  background: #dddddd;
  border-radius: 10px;
  transition: background-color 180ms ease;
}

.toggle::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  content: '';
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgb(0 0 0 / 12%);
  transition: transform 180ms ease;
}

.privacy-control input:checked + .toggle {
  background: #1a1a1a;
}

.privacy-control input:checked + .toggle::after {
  transform: translateX(16px);
}

.privacy-control input:focus-visible + .toggle {
  outline: 2px solid #1a1a1a;
  outline-offset: 2px;
}

.generate-button {
  display: inline-flex;
  width: 72px;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 14px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: #1a1a1a;
  border: 0;
  border-radius: 20px;
  transition: opacity 180ms ease, background-color 180ms ease;
}

.generate-button:disabled {
  cursor: not-allowed;
  background: #bdbdbd;
}

.spinner {
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .composer {
    border-radius: 18px;
  }

  .prompt-row {
    min-height: 111px;
    padding: 16px 14px 7px;
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

  .model-button,
  .size-control,
  .batch-button {
    min-height: 29px;
    padding-inline: 10px;
  }

  .privacy-control {
    margin: 0;
  }

  .generate-button {
    min-height: 38px;
  }

  .composer.has-batch .composer-controls {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .composer.has-batch .model-options {
    grid-column: 1 / 3;
  }

  .composer.has-batch .generation-options {
    grid-column: 1 / 2;
  }

  .composer.has-batch .privacy-control {
    grid-column: 2 / 3;
    justify-self: end;
  }

  .composer.has-batch .generate-button {
    grid-column: 1 / 2;
    justify-self: start;
  }
}
</style>
