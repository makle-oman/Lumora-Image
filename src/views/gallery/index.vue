<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Sparkles } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import ImageGallery from '../../components/ImageGallery/index.vue'
import { useGalleryStore } from '../../stores/gallery'

const router = useRouter()
const galleryStore = useGalleryStore()
const { items, stats, loading, error } = storeToRefs(galleryStore)

const searchKeyword = ref('')
const selectedCategory = ref('全部')

// Animated Stat Numbers
const statNum1 = ref(0)
const statNum2 = ref(0)

function animateCounters(): void {
  const duration = 1200
  const startTime = performance.now()

  function step(currentTime: number): void {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3) // Ease out cubic

    statNum1.value = Math.floor(ease * stats.value.publicImages)
    statNum2.value = Math.floor(ease * stats.value.categories.length)

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      statNum1.value = stats.value.publicImages
      statNum2.value = stats.value.categories.length
    }
  }

  requestAnimationFrame(step)
}

onMounted(async () => {
  await Promise.all([galleryStore.loadStats(), galleryStore.search('', '全部', false)])
  animateCounters()
})

const primaryCategories = computed(() => [
  { name: '全部', count: stats.value.publicImages },
  ...stats.value.categories,
])

async function handleSearch(): Promise<void> {
  // Filter triggers via computed
  await galleryStore.search(searchKeyword.value, selectedCategory.value)
}

function handleReuse(prompt: string): void {
  router.push({ path: '/create', query: { prompt } })
}

watch(selectedCategory, () => {
  void handleSearch()
})
</script>

<template>
  <section class="prompts-page">
    <header class="prompts-header">
      <!-- Top Announcement Badge -->
      <div class="top-badge animate-item" style="--delay: 0.05s;">
        <Sparkles :size="14" />
        <span>公共作品库</span>
      </div>

      <!-- Main Title -->
      <h1 class="animate-item" style="--delay: 0.15s;">发现无尽创意</h1>
      <p class="subtitle animate-item" style="--delay: 0.22s;">探索精选提示词，一键生成你的专属大作</p>

      <!-- Stat Counters with Live Number Animation -->
      <div class="stats-row animate-item" style="--delay: 0.3s;">
        <div class="stat-item">
          <div class="stat-num">{{ statNum1 }}</div>
          <div class="stat-label">展厅作品</div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-num">{{ statNum2 }}</div>
          <div class="stat-label">作品分类</div>
        </div>
      </div>

      <!-- Search Capsule Bar -->
      <div class="search-capsule animate-item" style="--delay: 0.4s;">
        <div class="capsule-tag">
          <span>库检索</span>
        </div>
        <Search :size="18" class="search-icon" />
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索提示词、风格或元素..."
          @keyup.enter="handleSearch"
        />
        <button class="search-btn" type="button" @click="handleSearch">
          搜索
        </button>
      </div>

      <!-- Two-Row Category Filter Pills with Stagger Animation -->
      <div class="categories-wrapper animate-item" style="--delay: 0.48s;">
        <div class="cat-row">
          <button
            v-for="(cat, idx) in primaryCategories"
            :key="cat.name"
            class="cat-pill"
            :class="{ active: selectedCategory === cat.name }"
            :style="{ animationDelay: `${0.5 + idx * 0.04}s` }"
            @click="selectedCategory = cat.name"
          >
            <span>{{ cat.name }}</span>
            <span class="count">({{ cat.count }})</span>
          </button>
        </div>

      </div>
    </header>

    <!-- Prompts Grid Component -->
    <div class="grid-wrapper animate-item" style="--delay: 0.58s;">
      <ImageGallery
        :items="items"
        :loading="loading"
        :selected-category="selectedCategory"
        mode="explore"
        @reuse="handleReuse"
      />
      <p v-if="error" class="gallery-error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.prompts-page {
  width: min(1280px, calc(100% - 64px));
  margin: 0 auto;
  padding: 80px 0 100px;
}

.gallery-error {
  color: #dc2626;
  font-size: 13px;
  text-align: center;
}

.prompts-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
  text-align: center;
}

/* Staggered entrance animation */
.animate-item {
  animation: fadeInUp 700ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay, 0s) backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.top-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  margin-bottom: 20px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 550;
  background: rgba(243, 232, 255, 0.85);
  border: 1px solid rgba(216, 180, 254, 0.5);
  border-radius: 20px;
  backdrop-filter: blur(8px);
}

.prompts-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 48px;
  font-weight: 750;
  letter-spacing: -0.5px;
}

.subtitle {
  margin: 12px 0 28px;
  color: #64748b;
  font-size: 16px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 16px 36px;
  margin-bottom: 36px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  backdrop-filter: blur(10px);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  color: #0f172a;
  font-size: 32px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: #cbd5e1;
}

/* Search Capsule Bar */
.search-capsule {
  position: relative;
  display: flex;
  width: min(640px, 100%);
  align-items: center;
  padding: 6px 6px 6px 8px;
  margin-bottom: 32px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.search-capsule:focus-within {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.capsule-tag {
  padding: 6px 14px;
  margin-right: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  background: #1e293b;
  border-radius: 20px;
}

.search-icon {
  color: #94a3b8;
  margin-right: 8px;
}

.search-capsule input {
  flex: 1;
  height: 38px;
  color: #0f172a;
  font-size: 14px;
  background: transparent;
  border: 0;
  outline: none;
}

.search-btn {
  padding: 8px 22px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #0f172a;
  border: 0;
  border-radius: 20px;
  transition: background-color 150ms ease, transform 150ms ease;
}

.search-btn:hover {
  background: #334155;
  transform: scale(1.02);
}

/* Category Filter Pills */
.categories-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.cat-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 16px;
  animation: fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  transition: all 150ms ease;
}

.cat-pill:hover {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.7);
  transform: translateY(-1px);
}

.cat-pill.active {
  color: #0f172a;
  font-weight: 650;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.cat-pill .count {
  color: #94a3b8;
  font-size: 11px;
}

.grid-wrapper {
  width: 100%;
}

@media (max-width: 768px) {
  .prompts-page {
    width: calc(100% - 32px);
    padding-top: 60px;
  }
  .prompts-header h1 {
    font-size: 32px;
  }
  .search-capsule {
    flex-wrap: wrap;
    border-radius: 20px;
  }
}
</style>
