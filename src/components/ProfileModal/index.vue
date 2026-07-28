<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Camera, CheckCircle2, Lock, Mail, User, X } from 'lucide-vue-next'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const fileInput = ref<HTMLInputElement | null>(null)

const name = ref('')
const email = ref('')
const password = ref('')
const avatarDataUrl = ref('')
const errorMsg = ref('')

const isSuccess = ref(false)
const isSubmitting = ref(false)

// Populate inputs when modal opens
watch(
  () => userStore.isProfileModalOpen,
  (isOpen) => {
    if (isOpen) {
      name.value = userStore.user.name || ''
      email.value = userStore.user.email || ''
      password.value = ''
      avatarDataUrl.value = userStore.user.avatar || ''
      errorMsg.value = ''
      isSuccess.value = false
      isSubmitting.value = false
    }
  }
)

const avatarPreviewUrl = computed(() => {
  if (avatarDataUrl.value && avatarDataUrl.value.trim() !== '') {
    return avatarDataUrl.value
  }
  // Default SVG avatar
  const initials = name.value ? name.value.charAt(0).toUpperCase() : 'U'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#f3e8ff"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="40" font-weight="bold" fill="#7c3aed">${initials}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
})

function closeModal(): void {
  userStore.toggleProfileModal(false)
}

function triggerFileInput(): void {
  fileInput.value?.click()
}

function handleAvatarChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = '图片大小不能超过 2MB'
    return
  }

  errorMsg.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    avatarDataUrl.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

function removeCustomAvatar(): void {
  avatarDataUrl.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleSubmit(): Promise<void> {
  errorMsg.value = ''
  if (!name.value.trim() || !email.value.trim()) {
    errorMsg.value = '昵称与邮箱不能为空'
    return
  }
  if (password.value && password.value.length < 8) {
    errorMsg.value = '新密码长度至少为 8 位'
    return
  }

  isSubmitting.value = true
  try {
    const payload: { name?: string; email?: string; password?: string; avatar?: string } = {
      name: name.value.trim(),
      email: email.value.trim(),
      avatar: avatarDataUrl.value
    }
    if (password.value) {
      payload.password = password.value
    }
    await userStore.updateProfile(payload)
    isSuccess.value = true
    setTimeout(() => {
      isSuccess.value = false
      closeModal()
    }, 1200)
  }
  catch (err: any) {
    // Error is set in userStore.operationError
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="userStore.isProfileModalOpen" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-card">
          <button class="close-btn" type="button" @click="closeModal">
            <X :size="18" />
          </button>

          <div class="modal-header">
            <h2>修改个人资料</h2>
            <p>更新您的账户信息、邮箱、密码及头像</p>
          </div>

          <div v-if="isSuccess" class="success-box">
            <CheckCircle2 :size="36" />
            <h3>保存成功！</h3>
            <p>您的个人资料已成功更新。</p>
          </div>

          <form v-else class="profile-form" @submit.prevent="handleSubmit">
            <!-- Avatar Upload Row -->
            <div class="avatar-upload-group">
              <div class="avatar-preview-container" @click="triggerFileInput">
                <img :src="avatarPreviewUrl" alt="Avatar Preview" class="avatar-preview" />
                <div class="avatar-hover-overlay">
                  <Camera :size="18" />
                  <span>更换头像</span>
                </div>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden-file-input"
                @change="handleAvatarChange"
              />
              <button 
                v-if="avatarDataUrl" 
                type="button" 
                class="remove-avatar-btn" 
                @click="removeCustomAvatar"
              >
                恢复默认头像
              </button>
            </div>

            <!-- Nickname -->
            <div class="form-group">
              <label for="profile-name">昵称</label>
              <div class="input-wrap">
                <User :size="17" />
                <input
                  id="profile-name"
                  v-model="name"
                  type="text"
                  placeholder="请输入您的昵称"
                  required
                />
              </div>
            </div>

            <!-- Email -->
            <div class="form-group">
              <label for="profile-email">电子邮箱</label>
              <div class="input-wrap">
                <Mail :size="17" />
                <input
                  id="profile-email"
                  v-model="email"
                  type="email"
                  placeholder="your.name@domain.com"
                  required
                />
              </div>
            </div>

            <!-- Password -->
            <div class="form-group">
              <label for="profile-password">新密码 (可选)</label>
              <div class="input-wrap">
                <Lock :size="17" />
                <input
                  id="profile-password"
                  v-model="password"
                  type="password"
                  placeholder="留空表示不修改"
                />
              </div>
            </div>

            <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
            <p v-if="userStore.operationError" class="error-text">{{ userStore.operationError }}</p>

            <div class="btn-group">
              <button class="cancel-btn" type="button" @click="closeModal" :disabled="isSubmitting">
                取消
              </button>
              <button class="submit-btn" type="submit" :disabled="isSubmitting">
                <span>{{ isSubmitting ? '保存中...' : '保存修改' }}</span>
              </button>
            </div>
          </form>
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
  width: min(440px, 100%);
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
  transition: background-color 150ms ease;
}

.close-btn:hover {
  background: #e4e4e7;
}

.modal-header {
  margin-bottom: 24px;
  text-align: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  color: #0f172a;
}

.modal-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.avatar-upload-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.avatar-preview-container {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #e2e8f0;
  transition: border-color 150ms ease;
}

.avatar-preview-container:hover {
  border-color: #7c3aed;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-hover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 150ms ease;
}

.avatar-preview-container:hover .avatar-hover-overlay {
  opacity: 1;
}

.avatar-hover-overlay span {
  font-size: 10px;
  font-weight: 550;
}

.hidden-file-input {
  display: none;
}

.remove-avatar-btn {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: color 150ms ease, background-color 150ms ease;
}

.remove-avatar-btn:hover {
  color: #ef4444;
  background: #fef2f2;
}

.profile-form {
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
  height: 42px;
  color: #1a1a1a;
  font-size: 14px;
  background: transparent;
  border: 0;
  outline: none;
}

.error-text {
  margin: -4px 0 0;
  color: #dc2626;
  font-size: 12px;
}

.btn-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  display: flex;
  height: 44px;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 0;
  border-radius: 12px;
  transition: all 150ms ease;
}

.cancel-btn {
  color: #4b5563;
  background: #f3f4f6;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  color: #ffffff;
  background: #18181b;
}

.submit-btn:hover {
  opacity: 0.9;
}

.cancel-btn:disabled,
.submit-btn:disabled {
  cursor: wait;
  opacity: 0.6;
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
