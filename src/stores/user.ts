import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  activateProvider as activateProviderRequest,
  authenticate as authenticateRequest,
  createApiKey as createApiKeyRequest,
  createProvider as createProviderRequest,
  deleteProvider as deleteProviderRequest,
  endSession,
  getAnnouncements,
  getApiKeys,
  getProviders,
  getPublicConfig,
  getSession,
  getUsage,
  reportHeartbeat,
  revokeApiKey as revokeApiKeyRequest,
  sendRegistrationCode as sendRegistrationCodeRequest,
  updateProfile as updateProfileRequest,
  type AnnouncementItem,
  type ApiKeyItem,
  type ProviderItem,
  type PublicConfig,
  type UsageSummary,
  type UserProfile,
} from '../services/userApi'
import { ApiError, getDeviceId } from '../services/http'

export type { AnnouncementItem, ApiKeyItem, ProviderItem, PublicConfig, UsageSummary, UserProfile }

const emptyUser: UserProfile = {
  id: '',
  name: '',
  email: '',
  avatar: '',
  plan: 'Free',
  credits: 0,
  creditsReserved: 0,
}

const emptyUsage: UsageSummary = {
  todayCalls: 0,
  dailyLimit: 10_000,
  averageLatencyMs: 0,
  items: [],
}

const announcementReadKey = 'lumora:announcement-read-version'
export const useUserStore = defineStore('user', () => {
  // Auth state
  const isLoggedIn = ref(false)
  const user = ref<UserProfile>({ ...emptyUser })
  const authError = ref('')

  // Modals state
  const isAuthModalOpen = ref(false)
  const isNoticeModalOpen = ref(false)
  const isProfileModalOpen = ref(false)

  // API Keys state
  const apiKeys = ref<ApiKeyItem[]>([])
  const oneTimeApiKey = ref('')

  // System Announcements
  const announcements = ref<AnnouncementItem[]>([])
  const hasUnreadAnnouncements = ref(false)

  const providers = ref<ProviderItem[]>([])
  const publicConfig = ref<PublicConfig>({ supportEmail: null, supportWechat: null })
  const usage = ref<UsageSummary>({ ...emptyUsage })
  const operationError = ref('')
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  async function sendHeartbeat(): Promise<void> {
    if (!isLoggedIn.value) return
    await reportHeartbeat({
      deviceId: getDeviceId(),
      platform: navigator.platform || 'web',
      appVersion: __APP_VERSION__,
    })
  }

  function startHeartbeat(): void {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    void sendHeartbeat().catch(() => undefined)
    heartbeatTimer = setInterval(() => void sendHeartbeat().catch(() => undefined), 60_000)
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  async function refreshAnnouncements(): Promise<void> {
    const announcementItems = await getAnnouncements()
    announcements.value = announcementItems
    const version = announcementItems.map(item => `${item.id}:${item.date}:${item.title}`).join('|')
    hasUnreadAnnouncements.value = Boolean(version && localStorage.getItem(announcementReadKey) !== version)
  }

  async function refreshPublicConfig(): Promise<void> {
    publicConfig.value = await getPublicConfig()
  }

  async function initialize(): Promise<void> {
    authError.value = ''
    operationError.value = ''
    try {
      const profile = await getSession()
      if (profile) {
        user.value = profile
        isLoggedIn.value = true
      }
    }
    catch {
      isLoggedIn.value = false
    }

    try {
      const [announcementItems, config] = await Promise.all([getAnnouncements(), getPublicConfig()])
      announcements.value = announcementItems
      publicConfig.value = config
      const version = announcementItems.map(item => `${item.id}:${item.date}:${item.title}`).join('|')
      hasUnreadAnnouncements.value = Boolean(version && localStorage.getItem(announcementReadKey) !== version)
    }
    catch {
      announcements.value = []
      hasUnreadAnnouncements.value = false
      publicConfig.value = { supportEmail: null, supportWechat: null }
    }

    if (isLoggedIn.value) {
      await loadAccountData(false)
      startHeartbeat()
    }
  }

  async function loadAccountData(showError = true): Promise<void> {
    if (showError) operationError.value = ''
    try {
      const [keys, providerItems, usageSummary] = await Promise.all([
        getApiKeys(),
        getProviders(),
        getUsage(),
      ])
      apiKeys.value = keys
      providers.value = providerItems
      usage.value = usageSummary
    }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) expireSession()
      if (showError) operationError.value = error instanceof Error ? error.message : '账户数据加载失败'
    }
  }

  function toggleAuthModal(open?: boolean): void {
    isAuthModalOpen.value = open ?? !isAuthModalOpen.value
    if (isAuthModalOpen.value) authError.value = ''
  }

  function toggleNoticeModal(open?: boolean): void {
    const nextOpen = open ?? !isNoticeModalOpen.value
    isNoticeModalOpen.value = nextOpen
    if (nextOpen && announcements.value.length) {
      const version = announcements.value.map(item => `${item.id}:${item.date}:${item.title}`).join('|')
      localStorage.setItem(announcementReadKey, version)
      hasUnreadAnnouncements.value = false
    }
  }

  function toggleProfileModal(open?: boolean): void {
    isProfileModalOpen.value = open ?? !isProfileModalOpen.value
    if (isProfileModalOpen.value) operationError.value = ''
  }

  async function sendRegistrationCode(email: string): Promise<void> {
    authError.value = ''
    try {
      await sendRegistrationCodeRequest(email)
    }
    catch (error) {
      authError.value = error instanceof Error ? error.message : '验证码发送失败'
      throw error
    }
  }

  async function authenticate(
    mode: 'login' | 'register',
    email: string,
    password: string,
    verificationCode?: string,
  ): Promise<void> {
    authError.value = ''
    try {
      user.value = await authenticateRequest(mode, email, password, verificationCode)
      isLoggedIn.value = true
      startHeartbeat()
      await loadAccountData()
    }
    catch (error) {
      authError.value = error instanceof Error ? error.message : '登录失败'
      throw error
    }
  }

  async function logout(): Promise<void> {
    operationError.value = ''
    try {
      await endSession()
      stopHeartbeat()
      isLoggedIn.value = false
      user.value = { ...emptyUser }
      apiKeys.value = []
      oneTimeApiKey.value = ''
      providers.value = []
      usage.value = { ...emptyUsage }
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : '退出失败'
    }
  }

  async function updateProfile(data: { email?: string; name?: string; password?: string; avatar?: string }): Promise<void> {
    operationError.value = ''
    try {
      const updatedUser = await updateProfileRequest(data)
      user.value = updatedUser
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : '更新个人资料失败'
      throw error
    }
  }

  async function createApiKey(name: string, scope: ApiKeyItem['scope']): Promise<string> {
    operationError.value = ''
    try {
      const created = await createApiKeyRequest(name, scope)
      apiKeys.value = [created.item, ...apiKeys.value]
      oneTimeApiKey.value = created.secret
      return created.secret
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : 'API Key 创建失败'
      throw error
    }
  }

  async function revokeApiKey(id: string): Promise<void> {
    operationError.value = ''
    try {
      await revokeApiKeyRequest(id)
      const found = apiKeys.value.find(item => item.id === id)
      if (found) found.status = 'revoked'
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : 'API Key 废弃失败'
    }
  }

  async function createProvider(input: { name: string; baseUrl: string; apiKey: string }): Promise<void> {
    operationError.value = ''
    try {
      const item = await createProviderRequest(input)
      providers.value = [item, ...providers.value]
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : '调用方创建失败'
      throw error
    }
  }

  async function activateProvider(id: string): Promise<boolean> {
    operationError.value = ''
    try {
      await activateProviderRequest(id)
      providers.value = await getProviders()
      return true
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : '调用方启用失败'
      return false
    }
  }

  async function deleteProvider(id: string): Promise<void> {
    operationError.value = ''
    try {
      await deleteProviderRequest(id)
      providers.value = await getProviders()
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : '调用方删除失败'
    }
  }

  async function refreshUsage(): Promise<void> {
    try {
      usage.value = await getUsage()
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : '调用记录加载失败'
    }
  }

  async function refreshProfile(): Promise<void> {
    const profile = await getSession()
    if (profile) user.value = profile
  }

  function setCredits(credits: number): void {
    user.value.credits = credits
  }

  function clearOneTimeApiKey(): void {
    oneTimeApiKey.value = ''
  }

  function expireSession(): void {
    stopHeartbeat()
    isLoggedIn.value = false
    user.value = { ...emptyUser }
    apiKeys.value = []
    oneTimeApiKey.value = ''
    providers.value = []
    usage.value = { ...emptyUsage }
  }

  return {
    isLoggedIn,
    user,
    authError,
    isAuthModalOpen,
    isNoticeModalOpen,
    isProfileModalOpen,
    apiKeys,
    oneTimeApiKey,
    announcements,
    hasUnreadAnnouncements,
    providers,
    publicConfig,
    usage,
    operationError,
    initialize,
    loadAccountData,
    toggleAuthModal,
    toggleNoticeModal,
    toggleProfileModal,
    sendRegistrationCode,
    authenticate,
    logout,
    updateProfile,
    createApiKey,
    revokeApiKey,
    createProvider,
    activateProvider,
    deleteProvider,
    refreshProfile,
    refreshUsage,
    setCredits,
    clearOneTimeApiKey,
    expireSession,
    refreshAnnouncements,
    refreshPublicConfig,
  }
})
