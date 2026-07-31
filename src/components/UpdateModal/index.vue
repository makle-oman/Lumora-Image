<script setup lang="ts">
import { computed } from 'vue'
import {
  Download,
  Rocket,
  Sparkles,
  X,
} from 'lucide-vue-next'
import { useDesktopStore } from '../../stores/desktop'

const desktopStore = useDesktopStore()

const isOpen = computed(() => desktopStore.isUpdateModalOpen)
const isDownloading = computed(() => desktopStore.isDownloadingUpdate)
const progress = computed(() => desktopStore.downloadProgress)
const updateInfo = computed(() => desktopStore.updateData)
const updateError = computed(() => desktopStore.updateError)

function handleClose() {
  desktopStore.closeUpdateModal()
}

function handleStartUpdate() {
  desktopStore.startUpdateDownload()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="update-modal">
      <div v-if="isOpen" class="update-backdrop" @click.self="handleClose">
        <div class="update-modal">
          
          <!-- Top Close Button -->
          <button 
            v-if="!isDownloading" 
            class="close-btn" 
            type="button" 
            @click="handleClose" 
            aria-label="关闭"
          >
            <X :size="18" />
          </button>

          <!-- Modal Header Icon & Badge -->
          <div class="modal-header-visual">
            <div class="rocket-aura">
              <Rocket :size="28" class="rocket-icon" />
            </div>
            <div class="new-tag-pill">
              <Sparkles :size="12" class="sparkle-icon" />
              <span>发现新版本 AVAILABLE</span>
            </div>
          </div>

          <!-- Version Info Title -->
          <h2 class="update-title">
            Lumora Image Studio <span class="version-highlight">v{{ updateInfo.version }}</span>
          </h2>

          <div class="meta-info-row">
            <span class="meta-item">发布日期: {{ updateInfo.releaseDate }}</span>
            <span class="meta-dot">•</span>
            <span class="meta-item">文件大小: {{ updateInfo.size }}</span>
          </div>

          <!-- Changelog Release Notes Box -->
          <div class="changelog-container">
            <div class="changelog-scroll">
              <div 
                v-for="(group, idx) in updateInfo.notes" 
                :key="idx" 
                class="note-group"
              >
                <div class="group-title">
                  <span>{{ group.title }}</span>
                </div>
                <ul class="group-list">
                  <li v-for="(item, itemIdx) in group.items" :key="itemIdx">
                    <span class="bullet-dot" />
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p v-if="updateError" class="update-error">更新失败：{{ updateError }}</p>

          <!-- Progress Bar View (When downloading) -->
          <div v-if="isDownloading" class="progress-section">
            <div class="progress-info-row">
              <span class="progress-label">
                {{ progress < 100 ? '正在下载更新资源包...' : '更新完成，准备重新启动...' }}
              </span>
              <span class="progress-val">{{ progress }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progress}%` }" />
            </div>
          </div>

          <!-- Modal Action Buttons -->
          <div v-else class="action-footer">
            <button 
              class="primary-update-btn" 
              type="button" 
              @click="handleStartUpdate"
            >
              <Download :size="16" />
              <span>立即更新安装</span>
            </button>

            <button 
              class="secondary-cancel-btn" 
              type="button" 
              @click="handleClose"
            >
              <span>稍后再说</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.update-backdrop {
  position: fixed;
  inset: 0;
  z-index: 250;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.update-modal {
  position: relative;
  width: min(440px, 100%);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 28px;
  padding: 36px 30px 32px;
  box-shadow: 
    0 30px 60px -12px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  text-align: center;
}

.close-btn {
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

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #0f172a;
  transform: rotate(90deg);
}

.modal-header-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.rocket-aura {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%);
  color: #7c3aed;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.18);
  position: relative;
}

.rocket-aura::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px dashed rgba(124, 58, 237, 0.3);
  animation: spin 18s linear infinite;
}

.rocket-icon {
  animation: floatRocket 3s ease-in-out infinite;
}

@keyframes floatRocket {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-4px) rotate(4deg); }
}

.new-tag-pill {
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

.sparkle-icon {
  animation: spin 6s linear infinite;
}

.update-title {
  font-size: 21px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.version-highlight {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.meta-info-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 22px;
}

.meta-dot {
  color: #cbd5e1;
}

/* Changelog Scroll Box */
.changelog-container {
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 18px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: left;
}

.changelog-scroll {
  max-height: 180px;
  overflow-y: auto;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.group-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  color: #475569;
  line-height: 1.5;
}

.bullet-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7c3aed;
  margin-top: 7px;
  flex-shrink: 0;
}

/* Progress Bar Section */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.update-error {
  margin: -10px 0 18px;
  color: #dc2626;
  font-size: 12.5px;
  line-height: 1.5;
}

.progress-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
}

.progress-val {
  color: #7c3aed;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed 0%, #ec4899 100%);
  border-radius: 10px;
  transition: width 0.15s ease;
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.5);
}

/* Action Footer Buttons */
.action-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.primary-update-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 650;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.3);
  transition: all 0.25s ease;
}

.primary-update-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4);
}

.secondary-cancel-btn {
  width: 100%;
  height: 38px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.secondary-cancel-btn:hover {
  color: #0f172a;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Modal Animation */
.update-modal-enter-active,
.update-modal-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.update-modal-enter-from,
.update-modal-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(10px);
}
</style>
