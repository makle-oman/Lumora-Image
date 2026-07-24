import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  plan: 'Free' | 'Pro' | 'Enterprise'
  credits: number
}

export interface ApiKeyItem {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string
  status: 'active' | 'revoked'
}

export interface AnnouncementItem {
  id: string
  title: string
  content: string
  date: string
  type: 'feature' | 'system' | 'update'
  isNew?: boolean
}

export const useUserStore = defineStore('user', () => {
  // Auth state
  const isLoggedIn = ref(true)
  const user = ref<UserProfile>({
    id: 'usr-849201',
    name: 'Lumora 创作者',
    email: 'creator@lumora.ai',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    plan: 'Pro',
    credits: 2850,
  })

  // Modals state
  const isAuthModalOpen = ref(false)
  const isNoticeModalOpen = ref(false)
  const lang = ref<'zh' | 'en'>('zh')

  // API Keys state
  const apiKeys = ref<ApiKeyItem[]>([
    {
      id: 'key-1',
      name: 'Default Production Key',
      key: 'lum-live-8f4920a1b2c3d4e5f6',
      createdAt: '2026-07-01',
      lastUsed: '刚刚',
      status: 'active',
    },
    {
      id: 'key-2',
      name: 'Dev Testing Key',
      key: 'lum-test-3a1b2c4d5e6f7a8b9c',
      createdAt: '2026-07-15',
      lastUsed: '2 天前',
      status: 'active',
    },
  ])

  // System Announcements
  const announcements = ref<AnnouncementItem[]>([
    {
      id: 'ann-1',
      title: 'Lumora Ambient Matrix 全新重构上线',
      content: '全新升级 2D 极简流光渐变矩阵引擎，提供极致流畅的交互体验与更高饱和度的色彩表达！',
      date: '2026-07-24',
      type: 'feature',
      isNew: true,
    },
    {
      id: 'ann-2',
      title: 'GPT-IMAGE-2 API 渲染效率提升 40%',
      content: '底层集群节点扩容完毕，现在图像生成速度已缩短至 1.8 秒以内，并发能力大幅增强。',
      date: '2026-07-20',
      type: 'update',
      isNew: false,
    },
    {
      id: 'ann-3',
      title: 'API 开发者中心与模型参数对接开放',
      content: '现已支持开放 API Key 自定义配置，支持 cURL、Python、Node.js 多语言接入。',
      date: '2026-07-12',
      type: 'system',
      isNew: false,
    },
  ])

  function toggleAuthModal(open?: boolean): void {
    isAuthModalOpen.value = open ?? !isAuthModalOpen.value
  }

  function toggleNoticeModal(open?: boolean): void {
    isNoticeModalOpen.value = open ?? !isNoticeModalOpen.value
  }

  function toggleLanguage(): void {
    lang.value = lang.value === 'zh' ? 'en' : 'zh'
  }

  function login(email: string): void {
    isLoggedIn.value = true
    user.value.email = email
    user.value.name = email.split('@')[0] || 'Lumora 创作者'
    isAuthModalOpen.value = false
  }

  function logout(): void {
    isLoggedIn.value = false
  }

  function createApiKey(name: string): ApiKeyItem {
    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: name || 'API Key',
      key: `lum-live-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`,
      createdAt: new Date().toISOString().split('T')[0] ?? '2026-07-24',
      lastUsed: '未调用',
      status: 'active',
    }
    apiKeys.value = [newKey, ...apiKeys.value]
    return newKey
  }

  function revokeApiKey(id: string): void {
    const found = apiKeys.value.find(k => k.id === id)
    if (found) {
      found.status = 'revoked'
    }
  }

  return {
    isLoggedIn,
    user,
    isAuthModalOpen,
    isNoticeModalOpen,
    lang,
    apiKeys,
    announcements,
    toggleAuthModal,
    toggleNoticeModal,
    toggleLanguage,
    login,
    logout,
    createApiKey,
    revokeApiKey,
  }
})
