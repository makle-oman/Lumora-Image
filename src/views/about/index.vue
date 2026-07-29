<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CheckCircle2,
  CircleAlert,
  Cpu,
  Heart,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
  X,
} from 'lucide-vue-next'
import { useUserStore } from '../../stores/user'
import { useDesktopStore } from '../../stores/desktop'
import wxPayImg from './image/wx_pay.png'
import aliPayImg from './image/ali_pay.png'

const userStore = useUserStore()
const desktopStore = useDesktopStore()

// Version & Environment Info
const appVersion = computed(() => desktopStore.version || '1.0.8')
const platformType = computed(() => desktopStore.available ? 'Desktop App (Tauri)' : 'Web Application')

// Update Checking State
const isCheckingUpdate = computed(() => desktopStore.isCheckingUpdate)
const updateStatus = ref<'idle' | 'success' | 'error'>('idle')
const updateMessage = ref('')

async function checkUpdate(): Promise<void> {
  if (isCheckingUpdate.value) return
  updateStatus.value = 'idle'
  updateMessage.value = ''
  const hasUpdate = await desktopStore.checkForUpdates()
  if (hasUpdate) return

  updateStatus.value = desktopStore.updateError ? 'error' : 'success'
  updateMessage.value = desktopStore.updateError
    ? `检查更新失败：${desktopStore.updateError}`
    : '当前已是最新稳定版本！'
}

// Sponsor Modal & Zoom States
const isSponsorModalOpen = ref(false)
const sponsorTab = ref<'wechat' | 'alipay'>('wechat')
const isQrZoomed = ref(false)
</script>

<template>
  <div class="about-page">
    <div class="about-wrapper">
      
      <!-- Top Hero Section -->
      <section class="about-hero">
        <div class="hero-badge">
          <Sparkles :size="14" class="sparkle-icon" />
          <span>LUMORA IMAGE STUDIO v{{ appVersion }}</span>
        </div>
        
        <h1 class="hero-title">
          重塑创意的视界<br />
          <span class="gradient-text">让灵感即刻显现</span>
        </h1>
        
        <p class="hero-subtitle">
          专为追求极致的创作者打造的轻量级 AI 图像创作与编辑工作流工具。
        </p>

        <!-- Version & Update Action Pill Bar -->
        <div class="version-action-bar">
          <div class="version-pill">
            <span class="pulse-dot" />
            <span class="version-text">v{{ appVersion }} ({{ platformType }})</span>
          </div>

          <button 
            v-if="desktopStore.available"
            class="update-btn" 
            :class="{ 'is-loading': isCheckingUpdate }"
            type="button" 
            :disabled="isCheckingUpdate"
            @click="checkUpdate"
          >
            <RefreshCw :size="14" :class="{ 'spin': isCheckingUpdate }" />
            <span>{{ isCheckingUpdate ? '检查更新中...' : '检查新版本' }}</span>
          </button>
        </div>

        <Transition name="fade">
          <div v-if="updateStatus !== 'idle'" class="update-toast" :class="{ error: updateStatus === 'error' }">
            <CircleAlert v-if="updateStatus === 'error'" :size="15" />
            <CheckCircle2 v-else :size="15" class="icon-green" />
            <span>{{ updateMessage }}</span>
          </div>
        </Transition>
      </section>

      <!-- Bento Grid Layout -->
      <div class="bento-grid">

        <!-- Bento Card 1: Core System Architecture & Features -->
        <div class="bento-card tech-card">
          <div class="card-head">
            <div class="icon-box purple">
              <Cpu :size="20" />
            </div>
            <div>
              <h2 class="card-title">系统架构与性能特性</h2>
              <p class="card-sub">基于 Tauri v2 + Vue 3.5 的下一代轻量级原生引擎</p>
            </div>
          </div>

          <!-- Feature Highlights Grid -->
          <div class="tech-metrics-grid">
            <div class="metric-box">
              <Zap :size="18" class="metric-icon gold" />
              <div class="metric-content">
                <span class="metric-val">GPU 加速</span>
                <span class="metric-label">本地 WebGL / Direct3D 硬件渲染</span>
              </div>
            </div>

            <div class="metric-box">
              <ShieldCheck :size="18" class="metric-icon cyan" />
              <div class="metric-content">
                <span class="metric-val">隐私保护</span>
                <span class="metric-label">API 密钥本地加密与数据独立隔离</span>
              </div>
            </div>

            <div class="metric-box">
              <Layers :size="18" class="metric-icon purple" />
              <div class="metric-content">
                <span class="metric-val">极速流转</span>
                <span class="metric-label">OpenAI 标准图像生成及多图管线</span>
              </div>
            </div>

            <div class="metric-box">
              <Lock :size="18" class="metric-icon emerald" />
              <div class="metric-content">
                <span class="metric-val">离线就绪</span>
                <span class="metric-label">核心参数与历史纪录全本地持久化</span>
              </div>
            </div>
          </div>

          <!-- Technology Badges -->
          <div class="tech-tags-wrapper">
            <span class="tag-item">Vue 3.5</span>
            <span class="tag-item">Vite 8</span>
            <span class="tag-item">Tauri v2</span>
            <span class="tag-item">Pinia</span>
            <span class="tag-item">Three.js</span>
            <span class="tag-item">TypeScript 5</span>
            <span class="tag-item">Lucide Icons</span>
          </div>
        </div>

        <!-- Bento Card 2: Creator Profile Card -->
        <div class="bento-card author-card">
          <div class="card-head">
            <div class="author-avatar-ring">
              <div class="avatar-inner">MK</div>
            </div>
            <div>
              <div class="author-title-row">
                <h2 class="card-title">MAKLE</h2>
                <span class="role-badge">独立开发者</span>
              </div>
              <p class="card-sub">Lumora Image Studio 主理人</p>
            </div>
          </div>

          <p class="author-bio">
            秉承“极简、极致与高效”的设计哲学。专注于打磨符合直觉的 AI 创作与视觉工程体验，致力于赋予每一位独立创作者无限的想象表达力。
          </p>

          <!-- Support Contact Links if enabled -->
          <div v-if="userStore.publicConfig.supportEmail || userStore.publicConfig.supportWechat" class="contact-pills">
            <div v-if="userStore.publicConfig.supportWechat" class="contact-pill">
              <MessageSquare :size="14" class="icon-green" />
              <div class="contact-info">
                <span class="c-type">微信客服</span>
                <span class="c-detail">{{ userStore.publicConfig.supportWechat }}</span>
              </div>
            </div>

            <div v-if="userStore.publicConfig.supportEmail" class="contact-pill">
              <Mail :size="14" class="icon-purple" />
              <div class="contact-info">
                <span class="c-type">技术支持</span>
                <span class="c-detail">{{ userStore.publicConfig.supportEmail }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bento Card 3: Sponsorship & Support Card -->
        <div class="bento-card sponsor-banner-card">
          <div class="banner-content">
            <div class="icon-box red-gradient">
              <Heart :size="22" class="heart-pulse" />
            </div>
            
            <div class="banner-text">
              <h2>赞助与支持</h2>
              <p>Lumora 的每一次迭代更新都离不开创作者们的认可。您的支持将被直接用于服务器维护、API 算力支持以及新功能的研发。</p>
            </div>
          </div>

          <button 
            class="sponsor-trigger-btn"
            type="button"
            @click="isSponsorModalOpen = true"
          >
            <Heart :size="16" class="heart-pulse" />
            <span>赞助支持作者</span>
          </button>
        </div>

      </div>

      <!-- Footer Section -->
      <footer class="about-footer">
        <p>© 2026 Lumora Image Studio. All rights reserved.</p>
        <p class="made-by">Made with <Heart :size="13" class="heart-pulse icon-red" /> by <strong>MAKLE</strong></p>
      </footer>

    </div>
  </div>

  <!-- Luxury Sponsor Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isSponsorModalOpen" class="sponsor-backdrop" @click.self="isSponsorModalOpen = false">
        <div class="sponsor-modal">
          
          <!-- Close Button -->
          <button class="modal-close-btn" type="button" @click="isSponsorModalOpen = false" aria-label="关闭">
            <X :size="18" />
          </button>

          <div class="modal-icon-header">
            <div class="heart-aura">
              <Heart :size="26" class="heart-pulse" />
            </div>
          </div>

          <h3 class="modal-title">赞助与支持</h3>
          <p class="modal-sub">感谢您对 Lumora 的肯定！支持独立开发者的持续创作</p>

          <!-- WeChat & Alipay Segmented Tabs -->
          <div class="segmented-tabs">
            <button 
              type="button"
              class="segment-btn" 
              :class="{ active: sponsorTab === 'wechat' }"
              @click="sponsorTab = 'wechat'"
            >
              <span class="dot green" />
              <span>微信支付</span>
            </button>
            
            <button 
              type="button"
              class="segment-btn" 
              :class="{ active: sponsorTab === 'alipay' }"
              @click="sponsorTab = 'alipay'"
            >
              <span class="dot blue" />
              <span>支付宝</span>
            </button>
          </div>

          <!-- QR Code Container -->
          <div class="qr-display-box">
            <div 
              class="qr-frame" 
              :class="sponsorTab"
              @click="isQrZoomed = true" 
              style="cursor: zoom-in;"
            >
              <!-- Neon Scanning Laser Line -->
              <div class="laser-scanner" />
              
              <img 
                v-if="sponsorTab === 'wechat'" 
                :src="wxPayImg" 
                class="qr-code-img" 
                alt="微信支付收款码" 
              />
              <img 
                v-else 
                :src="aliPayImg" 
                class="qr-code-img" 
                alt="支付宝收款码" 
              />
            </div>
          </div>

          <p class="sponsor-thank-msg">您的心意是对我们最大的肯定！</p>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Fullscreen QR Code Zoom Overlay -->
  <Teleport to="body">
    <Transition name="zoom">
      <div v-if="isQrZoomed" class="qr-zoom-backdrop" @click="isQrZoomed = false">
        <div class="zoom-card">
          <img 
            :src="sponsorTab === 'wechat' ? wxPayImg : aliPayImg" 
            class="zoom-img" 
            :alt="sponsorTab === 'wechat' ? '微信支付收款码放大' : '支付宝收款码放大'" 
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Main View Container */
.about-page {
  min-height: 100%;
  padding: 60px 24px 80px;
  background: transparent;
}

.about-wrapper {
  max-width: 960px;
  margin: 0 auto;
}

/* Top Hero Section */
.about-hero {
  text-align: center;
  margin-bottom: 52px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 30px;
  font-size: 12px;
  font-weight: 650;
  color: #7c3aed;
  margin-bottom: 24px;
}

.sparkle-icon {
  color: #8b5cf6;
  animation: spin 8s linear infinite;
}

.hero-title {
  font-size: 40px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
  letter-spacing: -1px;
  margin: 0 0 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #7c3aed 0%, #c084fc 45%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0 auto 28px;
  max-width: 580px;
  line-height: 1.6;
}

/* Version Pill & Action Bar */
.version-action-bar {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  padding: 6px 6px 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.version-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  animation: pulseDot 2s infinite;
}

@keyframes pulseDot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.update-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  background: #0f172a;
  color: #ffffff;
  border: 0;
  border-radius: 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.update-btn:hover:not(.is-loading) {
  background: #1e293b;
  transform: translateY(-1px);
}

.update-toast {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: #10b981;
}

.update-toast.error {
  color: #dc2626;
}

/* Bento Grid */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.bento-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 30px;
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-card:hover {
  transform: translateY(-3px);
  box-shadow: 
    0 18px 40px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-color: rgba(124, 58, 237, 0.2);
}

/* Bento Item Spanning */
.tech-card {
  grid-column: span 12;
}

.author-card {
  grid-column: span 7;
}

.sponsor-banner-card {
  grid-column: span 5;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(243, 232, 255, 0.5));
}

@media (max-width: 860px) {
  .author-card,
  .sponsor-banner-card {
    grid-column: span 12;
  }
}

/* Card Header */
.card-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.icon-box {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 14px;
}

.icon-box.purple {
  background: #f3e8ff;
  color: #7c3aed;
}

.icon-box.red-gradient {
  background: linear-gradient(135deg, #fef2f2, #ffe4e6);
  color: #ef4444;
}

.card-title {
  font-size: 18px;
  font-weight: 750;
  color: #0f172a;
  margin: 0;
}

.card-sub {
  font-size: 13px;
  color: #64748b;
  margin: 2px 0 0;
}

/* Tech Metrics Grid */
.tech-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .tech-metrics-grid {
    grid-template-columns: 1fr;
  }
}

.metric-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 16px;
}

.metric-icon {
  margin-top: 2px;
}
.metric-icon.gold { color: #d97706; }
.metric-icon.cyan { color: #0891b2; }
.metric-icon.purple { color: #7c3aed; }
.metric-icon.emerald { color: #059669; }

.metric-content {
  display: flex;
  flex-direction: column;
}

.metric-val {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.4;
}

/* Technology Tags */
.tech-tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  font-size: 11.5px;
  font-weight: 650;
  color: #475569;
  background: rgba(0, 0, 0, 0.04);
  padding: 5px 12px;
  border-radius: 10px;
}

/* Author Avatar & Info */
.author-avatar-ring {
  width: 48px;
  height: 48px;
  padding: 2px;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 50%;
}

.avatar-inner {
  width: 100%;
  height: 100%;
  background: #0f172a;
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.author-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-badge {
  font-size: 11px;
  font-weight: 650;
  color: #7c3aed;
  background: #f3e8ff;
  padding: 2px 8px;
  border-radius: 6px;
}

.author-bio {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  margin: 0 0 24px;
}

.contact-pills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 500px) {
  .contact-pills {
    grid-template-columns: 1fr;
  }
}

.contact-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 14px;
}

.contact-info {
  display: flex;
  flex-direction: column;
}

.c-type {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

.c-detail {
  font-size: 12.5px;
  font-weight: 650;
  color: #1e293b;
}

/* Sponsor Banner */
.banner-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.banner-text h2 {
  font-size: 20px;
  font-weight: 750;
  color: #0f172a;
  margin: 0 0 8px;
}

.banner-text p {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.65;
  margin: 0;
}

.sponsor-trigger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  margin-top: 24px;
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

.sponsor-trigger-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4);
}

/* Footer Section */
.about-footer {
  text-align: center;
  margin-top: 60px;
  font-size: 13px;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.about-footer p {
  margin: 0;
}

.made-by {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.icon-red { color: #ef4444; }
.icon-green { color: #10b981; }
.icon-purple { color: #7c3aed; }

.heart-pulse {
  animation: heartPulse 1.5s infinite;
}

@keyframes heartPulse {
  0% { transform: scale(1); }
  14% { transform: scale(1.16); }
  28% { transform: scale(1); }
  42% { transform: scale(1.16); }
  70% { transform: scale(1); }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Luxury Sponsor Modal */
.sponsor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.sponsor-modal {
  position: relative;
  width: min(390px, 100%);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 28px;
  padding: 36px 28px;
  text-align: center;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.modal-close-btn {
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

.modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #0f172a;
  transform: rotate(90deg);
}

.modal-icon-header {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.heart-aura {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff5f5, #ffe4e6);
  color: #ef4444;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.15);
  position: relative;
}

.heart-aura::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px dashed rgba(239, 68, 68, 0.25);
  animation: spin 16s linear infinite;
}

.modal-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
}

.modal-sub {
  font-size: 13.5px;
  color: #64748b;
  margin: 0 0 24px;
  line-height: 1.5;
}

/* Segmented Tabs */
.segmented-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 14px;
  margin-bottom: 24px;
}

.segment-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  color: #64748b;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dot.green { background: #10b981; }
.dot.blue { background: #0284c7; }

/* QR Display */
.qr-display-box {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.qr-frame {
  position: relative;
  width: 210px;
  height: 210px;
  background: #ffffff;
  border-radius: 20px;
  padding: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
}

.qr-frame.wechat {
  border: 2px solid rgba(16, 185, 129, 0.3);
}
.qr-frame.wechat:hover {
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.25);
  transform: translateY(-2px);
}

.qr-frame.alipay {
  border: 2px solid rgba(2, 132, 199, 0.3);
}
.qr-frame.alipay:hover {
  box-shadow: 0 12px 32px rgba(2, 132, 199, 0.25);
  transform: translateY(-2px);
}

.laser-scanner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 10;
  animation: scanLaser 3.2s linear infinite;
}

.qr-frame.wechat .laser-scanner {
  background: linear-gradient(to right, transparent, #10b981, transparent);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
}

.qr-frame.alipay .laser-scanner {
  background: linear-gradient(to right, transparent, #0284c7, transparent);
  box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);
}

@keyframes scanLaser {
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
}

.qr-code-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.sponsor-thank-msg {
  font-size: 13.5px;
  font-weight: 650;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

/* Fullscreen Zoom Overlay */
.qr-zoom-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(16px);
  cursor: zoom-out;
}

.zoom-card {
  width: min(420px, 90vw);
  height: min(420px, 90vw);
  background: #ffffff;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.4);
  animation: zoomSpring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.zoom-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@keyframes zoomSpring {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.zoom-enter-active,
.zoom-leave-active {
  transition: opacity 0.25s ease;
}

.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
