import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useGenerationStore } from './stores/generation'
import { useGalleryStore } from './stores/gallery'
import { useUserStore } from './stores/user'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const userStore = useUserStore(pinia)
const generationStore = useGenerationStore(pinia)
const galleryStore = useGalleryStore(pinia)
await userStore.initialize()
router.beforeEach((to) => {
  if (!to.meta.requiresAuth || userStore.isLoggedIn) return true
  userStore.toggleAuthModal(true)
  return { name: 'home' }
})
app.use(router)
await Promise.all([generationStore.checkConfiguration(), galleryStore.loadStats()])
if (userStore.isLoggedIn) {
  await generationStore.resumeTasks(false)
  await generationStore.loadImages(false)
}

app.mount('#app')
