<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import ImageGallery from '../../components/ImageGallery/index.vue'
import PromptComposer from '../../components/PromptComposer/index.vue'
import { useGenerationStore } from '../../stores/generation'

const generationStore = useGenerationStore()
const { images, isLoading, errorMessage, apiStatus } = storeToRefs(generationStore)
const prompt = ref('')
</script>

<template>
  <section class="create-view">
    <div class="showcase-stage">
      <ImageGallery
        :items="images"
        :loading="isLoading"
        mode="showcase"
        @reuse="prompt = $event"
      />
    </div>

    <div class="composer-dock">
      <PromptComposer
        v-model="prompt"
        :loading="isLoading"
        :api-status="apiStatus"
        :error-message="errorMessage"
        show-batch-edit
        @generate="generationStore.generate"
      />
    </div>
  </section>
</template>

<style scoped>
.create-view {
  position: relative;
  width: 100%;
  min-height: 100dvh;
}

.showcase-stage {
  width: min(1280px, calc(100% - 64px));
  margin: 0 auto;
  padding: 240px 0 240px;
}

.composer-dock {
  position: fixed;
  bottom: 20px;
  left: calc(50% + 52px);
  z-index: 50;
  width: min(960px, calc(100% - 140px));
  transform: translateX(-50%);
}

.composer-dock::before {
  position: absolute;
  inset: -48px -100px -20px;
  z-index: -1;
  content: '';
  background: linear-gradient(to top, rgba(255, 255, 255, 0.95) 60%, transparent);
  backdrop-filter: blur(12px);
  pointer-events: none;
  border-radius: 24px;
}

@media (max-width: 720px) {
  .showcase-stage {
    width: calc(100% - 32px);
    padding: 220px 0 270px;
  }

  .composer-dock {
    left: 50%;
    bottom: 12px;
    width: calc(100% - 32px);
  }

  .composer-dock::before {
    inset: -60px -16px -8px;
  }
}
</style>
