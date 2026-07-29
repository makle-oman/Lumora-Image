<script setup lang="ts">
import { FolderOpen, X } from 'lucide-vue-next'
import { useDesktopStore } from '../../stores/desktop'

const desktopStore = useDesktopStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="desktopStore.isStorageModalOpen"
        class="storage-backdrop"
        @click.self="desktopStore.closeStorageModal"
      >
        <section class="storage-modal" aria-labelledby="storage-title">
          <button
            class="close-button"
            type="button"
            aria-label="关闭"
            :disabled="desktopStore.isSelecting"
            @click="desktopStore.closeStorageModal"
          >
            <X :size="18" />
          </button>

          <FolderOpen :size="28" />
          <h2 id="storage-title">图片存放位置</h2>
          <p class="directory-path">{{ desktopStore.imageDirectory }}</p>
          <p v-if="desktopStore.error" class="error-message">{{ desktopStore.error }}</p>

          <button
            class="select-button"
            type="button"
            :disabled="desktopStore.isSelecting"
            @click="desktopStore.chooseImageDirectory"
          >
            <FolderOpen :size="17" />
            <span>{{ desktopStore.isSelecting ? '正在切换...' : '选择文件夹' }}</span>
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.storage-backdrop {
  position: fixed;
  inset: 0;
  z-index: 180;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(15 23 42 / 48%);
  backdrop-filter: blur(10px);
}

.storage-modal {
  position: relative;
  display: flex;
  width: min(460px, 100%);
  flex-direction: column;
  align-items: center;
  padding: 32px 28px 28px;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  box-shadow: 0 24px 60px rgb(15 23 42 / 18%);
}

.storage-modal > svg {
  color: #7c3aed;
}

.storage-modal h2 {
  margin: 12px 0 16px;
  font-size: 19px;
  font-weight: 650;
  letter-spacing: 0;
}

.close-button {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #52525b;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 50%;
}

.close-button:hover {
  background: #f4f4f5;
}

.directory-path {
  width: 100%;
  min-height: 42px;
  padding: 11px 12px;
  margin: 0 0 18px;
  overflow-wrap: anywhere;
  color: #52525b;
  font-size: 12px;
  line-height: 1.55;
  text-align: left;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
}

.error-message {
  width: 100%;
  margin: -8px 0 14px;
  color: #dc2626;
  font-size: 12px;
}

.select-button {
  display: inline-flex;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #18181b;
  border: 0;
  border-radius: 6px;
}

.select-button:disabled,
.close-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
