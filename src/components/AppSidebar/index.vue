<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  Bell,
  Brush,
  CircleUserRound,
  Compass,
  Headphones,
  Images,
  Languages,
  LogOut,
  Menu,
  Sparkles,
  TerminalSquare,
  X,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useGenerationStore } from '../../stores/generation'
import { useUserStore } from '../../stores/user'

const generationStore = useGenerationStore()
const { apiStatus } = storeToRefs(generationStore)

const userStore = useUserStore()
const isProfileMenuOpen = ref(false)
const isContactAdminOpen = ref(false)

function handleLoginClick(e: MouseEvent): void {
  e.stopPropagation()
  if (userStore.isLoggedIn) {
    isProfileMenuOpen.value = !isProfileMenuOpen.value
  } else {
    userStore.toggleAuthModal(true)
  }
}

function handleClickOutside(event: MouseEvent): void {
  const target = event.target as HTMLElement
  if (isProfileMenuOpen.value && !target.closest('.user-menu-wrapper')) {
    isProfileMenuOpen.value = false
  }
}

function handleContactAdmin(): void {
  isProfileMenuOpen.value = false
  isContactAdminOpen.value = true
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <aside class="sidebar" aria-label="主导航">
    <RouterLink class="brand" to="/" aria-label="Lumora 首页">
      Lu<sup>®</sup>
    </RouterLink>

    <nav class="nav-list">
      <RouterLink class="nav-item" to="/">
        <Compass :size="21" :stroke-width="1.8" />
        <span>{{ userStore.lang === 'zh' ? '发现' : 'Explore' }}</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/create">
        <Brush :size="21" :stroke-width="1.8" />
        <span>{{ userStore.lang === 'zh' ? '生图' : 'Create' }}</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/gallery">
        <Images :size="21" :stroke-width="1.8" />
        <span>{{ userStore.lang === 'zh' ? '画廊' : 'Gallery' }}</span>
      </RouterLink>

      <RouterLink class="nav-item mobile-only" to="/api">
        <TerminalSquare :size="21" :stroke-width="1.8" />
        <span>API</span>
      </RouterLink>

      <button class="nav-item mobile-more" type="button" aria-label="更多">
        <Menu :size="21" :stroke-width="1.8" />
        <span>更多</span>
      </button>
    </nav>

    <div class="utility-list">
      <RouterLink
        class="utility-item"
        to="/api"
        :class="`is-${apiStatus}`"
        title="开发者 API 中心"
      >
        <TerminalSquare :size="19" :stroke-width="1.7" />
        <span>API</span>
      </RouterLink>

      <button
        class="utility-item"
        type="button"
        title="系统公告"
        @click="userStore.toggleNoticeModal(true)"
      >
        <Bell :size="19" :stroke-width="1.7" />
        <span class="notice-wrap">
          {{ userStore.lang === 'zh' ? '公告' : 'Notice' }}
          <span class="unread-dot" />
        </span>
      </button>

      <button
        class="utility-item"
        type="button"
        title="切换语言 Language"
        @click="userStore.toggleLanguage"
      >
        <Languages :size="19" :stroke-width="1.7" />
        <span>{{ userStore.lang === 'zh' ? 'EN' : 'CN' }}</span>
      </button>

      <!-- User Login / Profile Button -->
      <div class="user-menu-wrapper">
        <button
          class="utility-item login"
          :class="{ 'is-active': isProfileMenuOpen }"
          type="button"
          @click="handleLoginClick"
        >
          <img
            v-if="userStore.isLoggedIn"
            class="user-avatar"
            :src="userStore.user.avatar"
            :alt="userStore.user.name"
          />
          <CircleUserRound v-else :size="20" :stroke-width="1.7" />
          <span>{{ userStore.isLoggedIn ? '我的' : (userStore.lang === 'zh' ? '登录' : 'Login') }}</span>
        </button>

        <!-- Logged-in Profile Dropdown Popover -->
        <Transition name="fade">
          <div v-if="isProfileMenuOpen && userStore.isLoggedIn" class="profile-popover">
            <div class="user-info">
              <img :src="userStore.user.avatar" class="avatar-large" />
              <div>
                <div class="name-row">
                  <span class="user-name">{{ userStore.user.name }}</span>
                  <span class="plan-tag">{{ userStore.user.plan }}</span>
                </div>
                <span class="user-email">{{ userStore.user.email }}</span>
              </div>
            </div>

            <div class="credits-box">
              <div class="c-title">
                <Sparkles :size="14" />
                <span>生成点数余额</span>
              </div>
              <div class="c-val">{{ userStore.user.credits.toLocaleString() }} PTS</div>
            </div>

            <div class="popover-actions">
              <button class="action-item" type="button" @click="handleContactAdmin">
                <Headphones :size="15" />
                <span>联系管理员</span>
              </button>

              <button class="logout-btn" type="button" @click="userStore.logout(); isProfileMenuOpen = false">
                <LogOut :size="15" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </aside>

  <!-- Contact Admin Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isContactAdminOpen" class="admin-modal-backdrop" @click.self="isContactAdminOpen = false">
        <div class="admin-modal">
          <button class="close-admin-btn" type="button" @click="isContactAdminOpen = false">
            <X :size="18" />
          </button>

          <div class="modal-icon-wrap">
            <Headphones :size="28" />
          </div>

          <h2>联系系统管理员</h2>
          <p class="admin-subtitle">如有专属模型需求、充值疑问或 API 接入问题，欢迎随时联系：</p>

          <div class="contact-info-card">
            <div class="info-row">
              <span class="info-label">客服微信</span>
              <span class="info-val">Lumora_Support</span>
            </div>
            <div class="info-row">
              <span class="info-label">技术支持邮箱</span>
              <span class="info-val">admin@lumora.ai</span>
            </div>
            <div class="info-row">
              <span class="info-label">服务时间</span>
              <span class="info-val">周一至周日 9:00 - 22:00</span>
            </div>
          </div>

          <button class="confirm-admin-btn" type="button" @click="isContactAdminOpen = false">
            好的，我知道了
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 30px;
  bottom: 30px;
  left: 16px;
  z-index: 40;
  display: flex;
  width: 72px;
  flex-direction: column;
  align-items: center;
  padding: 16px 10px 12px;
  color: #555555;
  background: rgb(255 255 255 / 45%);
  border: 1px solid rgb(0 0 0 / 10%);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgb(0 0 0 / 5%);
  backdrop-filter: blur(16px);
}

.brand {
  display: grid;
  height: 44px;
  place-items: center;
  color: #1a1a1a;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 18px;
  font-style: italic;
  text-decoration: none;
}

.brand sup {
  position: absolute;
  margin: -11px 0 0 30px;
  font-family: inherit;
  font-size: 7px;
  font-style: normal;
}

.nav-list,
.utility-list {
  display: grid;
  width: 100%;
  gap: 6px;
}

.nav-list {
  margin-top: 18px;
}

.utility-list {
  margin-top: auto;
}

.nav-item,
.utility-item {
  position: relative;
  display: grid;
  width: 50px;
  min-height: 65px;
  place-items: center;
  align-content: center;
  gap: 5px;
  padding: 0;
  color: #666666;
  font-size: 12px;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 12px;
  transition: color 180ms ease, background-color 180ms ease;
}

.nav-item:hover,
.nav-item.router-link-exact-active,
.nav-item.router-link-active,
.utility-item:hover,
.utility-item.router-link-active,
.utility-item.is-active {
  color: #1a1a1a;
  background: rgb(255 255 255 / 65%);
}

.nav-item.router-link-active,
.utility-item.router-link-active {
  font-weight: 650;
}

.user-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.notice-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.unread-dot {
  position: absolute;
  top: -2px;
  right: -6px;
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 50%;
}

.user-menu-wrapper {
  position: relative;
}

.profile-popover {
  position: absolute;
  bottom: 0;
  left: 64px;
  width: 240px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.12);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.avatar-large {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-name {
  color: #1e293b;
  font-size: 13px;
  font-weight: 650;
}

.plan-tag {
  padding: 1px 5px;
  color: #7c3aed;
  font-size: 10px;
  font-weight: 700;
  background: #f3e8ff;
  border-radius: 4px;
}

.user-email {
  color: #94a3b8;
  font-size: 11px;
}

.credits-box {
  padding: 10px;
  margin: 12px 0;
  background: #f8fafc;
  border-radius: 10px;
}

.c-title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 550;
}

.c-val {
  margin-top: 4px;
  color: #1e293b;
  font-size: 16px;
  font-weight: 700;
}

.popover-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  color: #334155;
  font-size: 12px;
  font-weight: 550;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  transition: all 150ms ease;
}

.action-item:hover {
  color: #0f172a;
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.logout-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  color: #ef4444;
  font-size: 12px;
  font-weight: 550;
  cursor: pointer;
  background: #fef2f2;
  border: 0;
  border-radius: 8px;
  transition: background-color 150ms ease;
}

.logout-btn:hover {
  background: #fee2e2;
}

/* Contact Admin Modal */
.admin-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
}

.admin-modal {
  position: relative;
  display: flex;
  width: min(420px, 100%);
  flex-direction: column;
  align-items: center;
  padding: 32px 28px;
  text-align: center;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18);
}

.close-admin-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #94a3b8;
  cursor: pointer;
  background: #f8fafc;
  border: 0;
  border-radius: 50%;
}

.modal-icon-wrap {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  margin-bottom: 16px;
  color: #7c3aed;
  background: #f3e8ff;
  border-radius: 50%;
}

.admin-modal h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.admin-subtitle {
  margin: 0 0 20px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.contact-info-card {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  margin-bottom: 24px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.info-label {
  color: #64748b;
}

.info-val {
  color: #0f172a;
  font-weight: 600;
}

.confirm-admin-btn {
  width: 100%;
  height: 40px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #0f172a;
  border: 0;
  border-radius: 10px;
}

.mobile-only {
  display: none;
}

.mobile-more {
  display: none;
}

@media (max-width: 720px) {
  .sidebar {
    inset: auto 0 0;
    display: block;
    width: 100%;
    height: calc(66px + env(safe-area-inset-bottom));
    padding: 5px 10px env(safe-area-inset-bottom);
    background: rgb(255 255 255 / 94%);
    border: 0;
    border-top: 1px solid #eeeeee;
    border-radius: 0;
    box-shadow: none;
    backdrop-filter: blur(18px);
  }

  .brand,
  .utility-list {
    display: none;
  }

  .nav-list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    height: 100%;
    margin: 0;
  }

  .nav-item {
    display: grid;
    width: 100%;
    min-width: 0;
    min-height: 56px;
    gap: 3px;
    font-size: 10px;
    border-radius: 8px;
  }

  .mobile-only {
    display: grid;
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity 150ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
