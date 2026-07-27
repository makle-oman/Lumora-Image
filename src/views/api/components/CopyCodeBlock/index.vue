<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'

const props = defineProps<{
  code: string
}>()

const copied = ref(false)
let resetTimer: number | undefined

async function copyCode(): Promise<void> {
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  window.clearTimeout(resetTimer)
  resetTimer = window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

onBeforeUnmount(() => window.clearTimeout(resetTimer))
</script>

<template>
  <div class="copy-code-block">
    <button type="button" :aria-label="copied ? '已复制代码' : '复制代码'" @click="copyCode">
      <Check v-if="copied" :size="13" />
      <Copy v-else :size="13" />
      <span>{{ copied ? 'Copied' : 'Copy' }}</span>
    </button>
    <pre><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.copy-code-block {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background: #0f172a;
  border-radius: 12px;
}

button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  transition: color 150ms ease, background-color 150ms ease;
}

button:hover {
  color: #ffffff;
  background: #334155;
}

pre {
  padding: 20px;
  margin: 0;
  overflow-x: auto;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre;
}

@media (max-width: 720px) {
  pre {
    padding: 52px 16px 16px;
    font-size: 11px;
  }
}
</style>
