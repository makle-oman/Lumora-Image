<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useMessageStore } from '../../stores/message'

const messageStore = useMessageStore()
const { current } = storeToRefs(messageStore)
</script>

<template>
  <Teleport to="body">
    <Transition name="app-message">
      <div
        v-if="current"
        :key="current.id"
        class="app-message"
        :class="`is-${current.type}`"
        :role="current.type === 'error' ? 'alert' : 'status'"
      >
        <CircleCheck v-if="current.type === 'success'" :size="18" aria-hidden="true" />
        <CircleAlert v-else-if="current.type === 'error'" :size="18" aria-hidden="true" />
        <Info v-else :size="18" aria-hidden="true" />
        <span>{{ current.text }}</span>
        <button type="button" title="关闭提示" aria-label="关闭提示" @click="messageStore.close">
          <X :size="15" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-message {
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 300;
  display: flex;
  width: min(460px, calc(100vw - 32px));
  min-height: 44px;
  box-sizing: border-box;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 14px;
  color: #334155;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #dbe2ea;
  border-radius: 14px;
  box-shadow: 0 16px 36px rgb(124 58 237 / 12%), 0 4px 12px rgb(15 23 42 / 8%);
  backdrop-filter: blur(16px);
  transform: translateX(-50%);
}

.app-message > svg {
  flex: 0 0 auto;
}

.app-message > span {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.app-message button {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  color: currentColor;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.app-message button:hover {
  background: rgb(15 23 42 / 6%);
}

.app-message.is-success {
  color: #166534;
  background: rgb(248 255 250 / 96%);
  border-color: #bbf7d0;
}

.app-message.is-error {
  color: #9f1239;
  background: rgb(255 250 250 / 96%);
  border-color: #fecaca;
}

.app-message.is-info {
  color: #5b21b6;
  background: rgb(250 248 255 / 96%);
  border-color: #ddd6fe;
}

.app-message-enter-active,
.app-message-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.app-message-enter-from,
.app-message-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
