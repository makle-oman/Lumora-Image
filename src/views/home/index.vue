<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import ImageGallery from '../../components/ImageGallery/index.vue'
import PromptComposer from '../../components/PromptComposer/index.vue'
import { useGenerationStore } from '../../stores/generation'
import { useGalleryStore } from '../../stores/gallery'
import { useUserStore } from '../../stores/user'
import type { GenerateImageRequest } from '../../types/generation'

const router = useRouter()
const generationStore = useGenerationStore()
const galleryStore = useGalleryStore()
const userStore = useUserStore()
const { isLoading, errorMessage, apiStatus } = storeToRefs(generationStore)
const { items, stats, loading } = storeToRefs(galleryStore)
const prompt = ref('')

async function generate(request: GenerateImageRequest): Promise<void> {
  if (!userStore.isLoggedIn) {
    userStore.toggleAuthModal(true)
    return
  }
  await router.push('/create')
  await generationStore.generate(request)
}

onMounted(() => void galleryStore.search('', '全部', false))
</script>

<template>
  <section class="home-view">
    <div class="home-hero">
      <h1>用想象力 <em>创造</em> 世界</h1>
      <p class="subtitle">用 GPT-IMAGE-2 将你的创意变为精美图片，只需描述你脑海中的画面。</p>

      <PromptComposer
        v-model="prompt"
        :loading="isLoading"
        :api-status="apiStatus"
        :error-message="errorMessage"
        @generate="generate"
      />

      <div class="generation-count" :aria-label="`今日已生成 ${stats.todayGenerations} 张图片`">
        <span class="stars">★★★★★</span>
        <span>今日已生成 {{ stats.todayGenerations.toLocaleString() }} 张图片</span>
        <span class="color-dots" aria-hidden="true">
          <i v-for="color in ['#4285f4', '#f04b4b', '#f7a21b', '#56b563', '#8b5bd6']" :key="color" :style="{ background: color }" />
        </span>
      </div>
    </div>

    <section class="recent-work">
      <h2>最近创作</h2>
      <p>来自所有创作者的灵感</p>
      <ImageGallery :items="items" :loading="loading" mode="showcase" />
    </section>
  </section>
</template>

<style scoped>
.home-view {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
}

.home-hero {
  width: min(960px, calc(100% - 64px));
  margin: 0 auto;
  padding-top: 194px;
  text-align: center;
}

h1 {
  margin: 0;
  color: #111111;
  font-size: 80px;
  font-weight: 520;
  line-height: 1.3;
}

h1 em {
  font-family: Georgia, "Times New Roman", "STSong", serif;
  font-weight: 400;
}

.subtitle {
  max-width: 580px;
  margin: 12px auto 34px;
  color: #555555;
  font-size: 18px;
  line-height: 1.55;
}

.generation-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  color: #888888;
  font-size: 14px;
}

.stars {
  color: #ffcf22;
  font-size: 17px;
}

.color-dots {
  display: flex;
  gap: 5px;
}

.color-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.recent-work {
  width: min(1120px, calc(100% - 64px));
  margin: 82px auto 80px;
  text-align: center;
}

.recent-work h2 {
  margin: 0;
  font-size: 30px;
  font-weight: 620;
}

.recent-work > p {
  margin: 9px 0 28px;
  color: #999999;
  font-size: 14px;
}

@media (max-width: 720px) {
  .home-hero {
    width: 100%;
    padding: 96px 16px 0;
  }

  h1 {
    font-size: 36px;
    line-height: 1.3;
    white-space: nowrap;
  }

  .subtitle {
    margin: 17px auto 24px;
    font-size: 15px;
    line-height: 1.55;
  }

  .generation-count {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    margin-top: 25px;
    font-size: 14px;
  }

  .stars {
    font-size: 15px;
  }

  .generation-count > span:nth-child(2) {
    line-height: 1.45;
  }

  .recent-work {
    width: calc(100% - 32px);
    margin-top: 300px;
  }

  .recent-work h2 {
    font-size: 24px;
  }
}
</style>
