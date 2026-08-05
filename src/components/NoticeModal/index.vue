<script setup lang="ts">
import { Bell, CheckCircle2, Sparkles, Wrench, X } from 'lucide-vue-next'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="userStore.isNoticeModalOpen" class="modal-backdrop" @click.self="userStore.toggleNoticeModal(false)">
        <div class="modal-card" role="dialog" aria-labelledby="notice-title">
          <header class="modal-header">
            <div class="header-title">
              <div class="icon-wrap">
                <Bell :size="20" />
              </div>
              <div>
                <h2 id="notice-title">系统公告与更新日志</h2>
                <p>了解 Lumora AI Studio 的最新功能与升级动态</p>
              </div>
            </div>
            <button class="close-btn" type="button" @click="userStore.toggleNoticeModal(false)">
              <X :size="18" />
            </button>
          </header>

          <div class="announcement-list">
            <article
              v-for="item in userStore.announcements"
              :key="item.id"
              class="announcement-item"
              :class="{ 'is-new': item.isNew }"
            >
              <div class="item-meta">
                <span class="badge" :class="item.type">
                  <Sparkles v-if="item.type === 'feature'" :size="12" />
                  <Wrench v-else-if="item.type === 'update'" :size="12" />
                  <CheckCircle2 v-else :size="12" />
                  {{ item.type === 'feature' ? '新功能' : item.type === 'update' ? '更新优化' : '系统公告' }}
                </span>
                <time>{{ item.date }}</time>
                <span v-if="item.isNew" class="new-dot">NEW</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.content }}</p>
            </article>
          </div>

          <footer class="modal-footer">
            <button class="primary-btn" type="button" @click="userStore.toggleNoticeModal(false)">
              我知道了
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.modal-card {
  display: flex;
  width: min(580px, 100%);
  max-height: 82vh;
  flex-direction: column;
  color: #1a1a1a;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-wrap {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: #8b5cf6;
  background: #f3e8ff;
  border-radius: 12px;
}

.header-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.header-title p {
  margin: 2px 0 0;
  color: #777777;
  font-size: 13px;
}

.close-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #666666;
  cursor: pointer;
  background: #f4f4f5;
  border: 0;
  border-radius: 50%;
  transition: background-color 150ms ease;
}

.close-btn:hover {
  background: #e4e4e7;
}

.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  overflow-y: auto;
}

.announcement-item {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
}

.announcement-item.is-new {
  background: #faf5ff;
  border-color: #f3e8ff;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
}

.badge.feature {
  color: #7c3aed;
  background: #f3e8ff;
}

.badge.update {
  color: #0284c7;
  background: #e0f2fe;
}

.badge.system {
  color: #d97706;
  background: #fef3c7;
}

time {
  color: #94a3b8;
  font-size: 12px;
}

.new-dot {
  padding: 1px 5px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  background: #ef4444;
  border-radius: 4px;
}

.announcement-item h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}

.announcement-item p {
  margin: 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}

.modal-footer {
  padding: 14px 24px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  text-align: right;
}

.primary-btn {
  padding: 8px 20px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #18181b;
  border: 0;
  border-radius: 8px;
  transition: opacity 150ms ease;
}

.primary-btn:hover {
  opacity: 0.9;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 160ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
