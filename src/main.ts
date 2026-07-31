import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useDesktopStore } from './stores/desktop'
import { useGenerationStore } from './stores/generation'
import { useGalleryStore } from './stores/gallery'
import { useUserStore } from './stores/user'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const userStore = useUserStore(pinia)
const desktopStore = useDesktopStore(pinia)
const generationStore = useGenerationStore(pinia)
const galleryStore = useGalleryStore(pinia)
const userInitialization = userStore.initialize()
const desktopInitialization = desktopStore.initialize()
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  await userInitialization
  if (userStore.isLoggedIn) return true
  userStore.toggleAuthModal(true)
  return { name: 'home' }
})
router.afterEach((_to, from) => {
  if (!from.name) return
  const refreshes = [userStore.refreshAnnouncements(), userStore.refreshPublicConfig()]
  if (userStore.isLoggedIn) refreshes.push(userStore.refreshProfile())
  void Promise.allSettled(refreshes)
})
app.use(router)
app.mount('#app')
void desktopStore.checkForUpdates()

async function initializeData(): Promise<void> {
  await Promise.all([
    userInitialization,
    desktopInitialization,
    generationStore.checkConfiguration(),
    galleryStore.loadStats(),
  ])
  if (!userStore.isLoggedIn) return
  await Promise.all([
    generationStore.resumeTasks(false),
    generationStore.loadImages(false),
  ])
}

void initializeData()
