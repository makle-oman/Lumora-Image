import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MessageType = 'success' | 'error' | 'info'

export const useMessageStore = defineStore('message', () => {
  const current = ref<Readonly<{ id: number; text: string; type: MessageType }> | null>(null)
  let timeout: ReturnType<typeof setTimeout> | null = null

  function close(): void {
    if (timeout) clearTimeout(timeout)
    timeout = null
    current.value = null
  }

  function show(text: string, type: MessageType = 'info', duration = 3500): void {
    close()
    current.value = { id: Date.now(), text, type }
    timeout = setTimeout(close, duration)
  }

  return { current, show, close }
})
