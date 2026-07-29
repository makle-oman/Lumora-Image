import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import packageJson from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '^/api/': 'http://127.0.0.1:8787',
      '^/public/': 'http://127.0.0.1:8787',
      '^/v1/': 'http://127.0.0.1:8787',
    },
  },
})
