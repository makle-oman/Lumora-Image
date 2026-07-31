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
await Promise.all([userStore.initialize(), desktopStore.initialize()])
router.beforeEach((to) => {
  if (!to.meta.requiresAuth || userStore.isLoggedIn) return true
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
await Promise.all([generationStore.checkConfiguration(), galleryStore.loadStats()])
if (userStore.isLoggedIn) {
  await generationStore.resumeTasks(false)
  await generationStore.loadImages(false)
}

app.mount('#app')
void desktopStore.checkForUpdates()
