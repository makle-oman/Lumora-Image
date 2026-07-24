<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, CheckCircle2, Lock, Mail, Sparkles, X } from 'lucide-vue-next'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const isSuccess = ref(false)

function handleSubmit(): void {
  if (!email.value) return
  userStore.login(email.value)
  isSuccess.value = true
  setTimeout(() => {
    isSuccess.value = false
  }, 1500)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="userStore.isAuthModalOpen" class="modal-backdrop" @click.self="userStore.toggleAuthModal(false)">
        <div class="modal-card">
          <button class="close-btn" type="button" @click="userStore.toggleAuthModal(false)">
            <X :size="18" />
          </button>

          <div class="auth-header">
            <div class="brand-badge">
              <Sparkles :size="16" />
              <span>Lumora Account</span>
            </div>
            <h2>{{ mode === 'login' ? '欢迎回来' : '注册 Lumora 账号' }}</h2>
            <p>{{ mode === 'login' ? '登录以解锁无限 AI 图像创作与 API 访问权限' : '免费注册即赠送 3,000 生成点数' }}</p>
          </div>

          <div v-if="isSuccess" class="success-box">
            <CheckCircle2 :size="36" />
            <h3>登录成功！</h3>
            <p>正在进入 Lumora 创作者空间...</p>
          </div>

          <form v-else class="auth-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label for="auth-email">邮箱地址</label>
              <div class="input-wrap">
                <Mail :size="17" />
                <input
                  id="auth-email"
                  v-model="email"
                  type="email"
                  placeholder="your.name@domain.com"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="auth-password">密码</label>
              <div class="input-wrap">
                <Lock :size="17" />
                <input
                  id="auth-password"
                  v-model="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button class="submit-btn" type="submit">
              <span>{{ mode === 'login' ? '立即登录' : '创建账号' }}</span>
              <ArrowRight :size="16" />
            </button>
          </form>

          <div class="auth-switch">
            <template v-if="mode === 'login'">
              <span>还没有账号？</span>
              <button type="button" @click="mode = 'register'">立即免费注册</button>
            </template>
            <template v-else>
              <span>已有账号？</span>
              <button type="button" @click="mode = 'login'">返回登录</button>
            </template>
          </div>
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
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px);
}

.modal-card {
  position: relative;
  width: min(420px, 100%);
  padding: 32px 28px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.14);
}

.close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #666666;
  cursor: pointer;
  background: #f4f4f5;
  border: 0;
  border-radius: 50%;
}

.auth-header {
  margin-bottom: 24px;
  text-align: center;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  margin-bottom: 12px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 600;
  background: #f3e8ff;
  border-radius: 20px;
}

.auth-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
}

.auth-header p {
  margin: 6px 0 0;
  color: #666666;
  font-size: 13px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  color: #374151;
  font-size: 13px;
  font-weight: 550;
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: #9ca3af;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input-wrap:focus-within {
  color: #7c3aed;
  background: #ffffff;
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
}

.input-wrap input {
  width: 100%;
  height: 44px;
  color: #1a1a1a;
  font-size: 14px;
  background: transparent;
  border: 0;
  outline: none;
}

.submit-btn {
  display: flex;
  height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #18181b;
  border: 0;
  border-radius: 12px;
  transition: opacity 150ms ease;
}

.submit-btn:hover {
  opacity: 0.9;
}

.auth-switch {
  margin-top: 20px;
  color: #666666;
  font-size: 13px;
  text-align: center;
}

.auth-switch button {
  margin-left: 6px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 0;

  &:hover {
    text-decoration: underline;
  }
}

.success-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 0;
  color: #16a34a;
  text-align: center;
}

.success-box h3 {
  margin: 0;
  color: #1a1a1a;
  font-size: 18px;
}

.success-box p {
  margin: 0;
  color: #666666;
  font-size: 13px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
