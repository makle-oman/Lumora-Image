<script setup lang="ts">
import { ref } from 'vue'
import {
  AlertCircle,
  Check,
  Copy,
  FolderCheck,
  FolderOpen,
  FolderSync,
  HardDrive,
  Info,
  ShieldCheck,
  X,
} from 'lucide-vue-next'
import { useDesktopStore } from '../../stores/desktop'

const desktopStore = useDesktopStore()
const isCopied = ref(false)

async function copyPath() {
  if (!desktopStore.imageDirectory) return
  try {
    await navigator.clipboard.writeText(desktopStore.imageDirectory)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 1800)
  } catch (err) {
    console.error('Failed to copy path:', err)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="desktopStore.isStorageModalOpen"
        class="storage-backdrop"
        @click.self="desktopStore.closeStorageModal"
      >
        <section class="storage-modal" aria-labelledby="storage-title">

          <!-- Close Button -->
          <button
            class="close-button"
            type="button"
            aria-label="关闭"
            :disabled="desktopStore.isSelecting"
            @click="desktopStore.closeStorageModal"
          >
            <X :size="18" />
          </button>

          <!-- Top Visual Aura -->
          <div class="storage-visual-header">
            <div class="folder-aura">
              <FolderCheck :size="28" class="folder-icon" />
            </div>
            <div class="badge-pill">
              <HardDrive :size="12" />
              <span>STORAGE & MEDIA LOCATION</span>
            </div>
          </div>

          <!-- Modal Title & Subtitle -->
          <h2 id="storage-title" class="modal-title">本地图片存放位置</h2>
          <p class="modal-subtitle">
            管理 AI 生成的高清原图与工程缓存文件的磁盘保存路径
          </p>

          <!-- Path Box with Copy Action -->
          <div class="path-card">
            <div class="path-icon-box">
              <FolderOpen :size="18" />
            </div>

            <div class="path-text-wrapper" title="当前存放目录">
              <span class="path-label">当前绝对路径</span>
              <span class="path-value">{{ desktopStore.imageDirectory || '正在获取存储目录...' }}</span>
            </div>

            <button
              class="copy-btn"
              type="button"
              :title="isCopied ? '已复制路径' : '复制路径到剪贴板'"
              @click="copyPath"
            >
              <Check v-if="isCopied" :size="15" class="icon-green" />
              <Copy v-else :size="15" />
            </button>
          </div>

          <!-- Storage Features & Metrics Row -->
          <div class="metrics-row">
            <div class="metric-tag green">
              <ShieldCheck :size="13" />
              <span>正常读写准许</span>
            </div>
            <div class="metric-tag purple">
              <FolderSync :size="13" />
              <span>自动增量迁移</span>
            </div>
          </div>

          <!-- Error Alert Banner if any -->
          <Transition name="fade">
            <div v-if="desktopStore.error" class="error-banner">
              <AlertCircle :size="16" class="error-icon" />
              <span>{{ desktopStore.error }}</span>
            </div>
          </Transition>

          <!-- Instructions Card -->
          <div class="info-card">
            <Info :size="14" class="info-icon" />
            <p>更改路径后应用将自动重新启动，旧目录中的所有生成图片与工程缓存将无缝迁移至新位置。</p>
          </div>

          <!-- Action Buttons -->
          <div class="action-bar">
            <button
              class="open-dir-btn"
              type="button"
              :disabled="desktopStore.isSelecting"
              @click="desktopStore.openImageDirectory"
            >
              <FolderOpen :size="16" />
              <span>打开存放位置</span>
            </button>
            <button
              class="change-dir-btn"
              type="button"
              :disabled="desktopStore.isSelecting"
              @click="desktopStore.chooseImageDirectory"
            >
              <FolderSync :size="16" :class="{ 'spin-icon': desktopStore.isSelecting }" />
              <span>{{ desktopStore.isSelecting ? '正在迁移并重启...' : '更改存储目录' }}</span>
            </button>
          </div>

          <!-- Footer Metadata -->
          <div class="modal-footer-meta">
            <span>Lumora Storage Engine</span>
            <span class="version-tag">v{{ desktopStore.version }}</span>
          </div>

        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.storage-backdrop {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.storage-modal {
  position: relative;
  display: flex;
  width: min(460px, 100%);
  flex-direction: column;
  align-items: center;
  padding: 36px 30px 28px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 28px;
  box-shadow:
    0 30px 60px -12px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  text-align: center;
}

.close-button {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
  color: #0f172a;
  transform: rotate(90deg);
}

.close-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.storage-visual-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.folder-aura {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%);
  color: #7c3aed;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.18);
  position: relative;
}

.folder-aura::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px dashed rgba(124, 58, 237, 0.3);
  animation: spin 18s linear infinite;
}

.folder-icon {
  animation: pulseGlow 3s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  color: #7c3aed;
  letter-spacing: 0.5px;
}

.modal-title {
  font-size: 21px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.modal-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 22px;
  line-height: 1.5;
  max-width: 360px;
}

/* Path Display Card */
.path-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
  margin-bottom: 14px;
  text-align: left;
}

.path-icon-box {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 10px;
  flex-shrink: 0;
}

.path-text-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.path-label {
  font-size: 10px;
  font-weight: 650;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.path-value {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
}

.copy-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #0f172a;
}

.icon-green {
  color: #10b981;
}

/* Metrics Row */
.metrics-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 18px;
}

.metric-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 650;
}

.metric-tag.green {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #059669;
}

.metric-tag.purple {
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.2);
  color: #7c3aed;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 14px;
  text-align: left;
}

.error-icon {
  flex-shrink: 0;
}

/* Info Card */
.info-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  margin-bottom: 22px;
  text-align: left;
}

.info-icon {
  color: #64748b;
  margin-top: 2px;
  flex-shrink: 0;
}

.info-card p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.55;
}

/* Action Bar */
.action-bar {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 10px;
  width: 100%;
  margin-bottom: 20px;
}

.open-dir-btn,
.change-dir-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  font-size: 14px;
  font-weight: 650;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.open-dir-btn {
  color: #334155;
  background: #f1f5f9;
}

.open-dir-btn:hover:not(:disabled) {
  color: #0f172a;
  background: #e2e8f0;
  transform: translateY(-2px);
}

.change-dir-btn {
  color: #ffffff;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.3);
}

.change-dir-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4);
}

.open-dir-btn:disabled,
.change-dir-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

/* Footer Metadata */
.modal-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 12px;
  color: #94a3b8;
}

.version-tag {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  font-weight: 600;
  color: #475569;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transition Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 160ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
