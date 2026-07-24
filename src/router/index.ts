import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/home/index.vue'),
    },
    {
      path: '/create',
      alias: '/generate',
      name: 'create',
      component: () => import('../views/create/index.vue'),
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('../views/gallery/index.vue'),
    },
    {
      path: '/api',
      alias: '/developer',
      name: 'api',
      component: () => import('../views/api/index.vue'),
    },
  ],
})

export default router
