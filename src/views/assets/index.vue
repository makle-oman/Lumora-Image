<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Columns,
  Eye,
  EyeOff,
  Grid,
  Heart,
  Images,
  LoaderCircle,
  Search,
  Sparkles,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import AssetGrid from './components/AssetGrid/index.vue'
import { useFavoritesStore } from '../../stores/favorites'
import { useGenerationStore } from '../../stores/generation'
import type { ImageVisibilityFilter } from '../../services/imageApi'
import type { GeneratedImage } from '../../types/generation'

type AssetTab = 'owned' | 'favorites'
type VisibilityFilter = ImageVisibilityFilter
export type ViewLayout = 'masonry' | 'grid'

const router = useRouter()
const favoritesStore = useFavoritesStore()
const generationStore = useGenerationStore()
const {
  images,
  imageTotal,
  imageAllTotal,
  imagePublicTotal,
  imagePrivateTotal,
  imagesLoading,
  hasMoreImages,
  errorMessage,
} = storeToRefs(generationStore)
const {
  items: favoriteItems,
  total: favoriteTotal,
  loading: favoritesLoading,
  loadingMore: favoritesLoadingMore,
  error: favoritesError,
  updatingIds: favoriteUpdatingIds,
  hasMore: hasMoreFavorites,
} = storeToRefs(favoritesStore)

const activeTab = ref<AssetTab>('owned')
const searchQuery = ref('')
const visibilityFilter = ref<VisibilityFilter>('all')
const viewLayout = ref<ViewLayout>('masonry')
const visibilityUpdatingId = ref('')
const removingId = ref('')
let filterTimer: ReturnType<typeof setTimeout> | null = null

const publicCount = computed(() => imagePublicTotal.value)
const privateCount = computed(() => imagePrivateTotal.value)

const rawActiveItems = computed(() => activeTab.value === 'owned' ? images.value : favoriteItems.value)

const filteredItems = computed(() => {
  let list = rawActiveItems.value

  // Visibility Filter for owned items
  if (activeTab.value === 'owned' && visibilityFilter.value !== 'all') {
    const isPub = visibilityFilter.value === 'public'
    list = list.filter(item => item.isPublic === isPub)
  }

  // Search Filter
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(item =>
      item.prompt?.toLowerCase().includes(q)
      || item.category?.toLowerCase().includes(q)
      || item.author?.toLowerCase().includes(q)
    )
  }

  return list
})

const activeLoading = computed(() => activeTab.value === 'owned'
  ? imagesLoading.value
  : favoritesLoading.value)
const activeLoadingMore = computed(() => activeTab.value === 'owned'
  ? imagesLoading.value && images.value.length > 0
  : favoritesLoadingMore.value)
const activeHasMore = computed(() => activeTab.value === 'owned'
  ? hasMoreImages.value
  : hasMoreFavorites.value)
const activeError = computed(() => activeTab.value === 'owned'
  ? errorMessage.value
  : favoritesError.value)
const updatingIds = computed(() => [
  ...favoriteUpdatingIds.value,
  visibilityUpdatingId.value,
  removingId.value,
].filter(Boolean))

onMounted(() => void Promise.all([
  generationStore.loadImages(),
  favoritesStore.load(true, ''),
]))

onUnmounted(() => {
  if (filterTimer) clearTimeout(filterTimer)
})

watch([activeTab, searchQuery, visibilityFilter], ([tab, query, visibility]) => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    if (tab === 'owned') {
      void generationStore.loadImages(true, { query, visibility })
    }
    else {
      void favoritesStore.load(true, query)
    }
  }, 250)
})

function handleReuse(prompt: string): void {
  void router.push({ path: '/create', query: { prompt } })
}

async function handleRemove(item: GeneratedImage): Promise<void> {
  removingId.value = item.id
  await generationStore.removeImage(item.id)
  await favoritesStore.load()
  removingId.value = ''
}

async function handleVisibility(item: GeneratedImage): Promise<void> {
  visibilityUpdatingId.value = item.id
  const updated = await generationStore.setImageVisibility(item.id, !item.isPublic)
  if (updated && item.isPublic) await favoritesStore.load()
  visibilityUpdatingId.value = ''
}

async function handleUnfavorite(item: GeneratedImage): Promise<void> {
  await favoritesStore.setFavorite(item, false)
}

function loadMore(): void {
  if (activeTab.value === 'owned') void generationStore.loadMoreImages()
  else void favoritesStore.loadMore()
}
</script>

<template>
  <section class="ios-assets-page">
    <!-- Sticky iOS Acrylic Navigation Topbar -->
    <header class="ios-nav-header">
      <div class="ios-header-content">
        <!-- Title & Page Info -->
        <div class="ios-title-group">
          <h2>媒体图库</h2>
          <span class="ios-count-badge">{{ activeTab === 'owned' ? imageTotal : favoriteTotal }} 个项目</span>
        </div>

        <!-- iOS Apple-style Segmented Control Bar -->
        <div class="ios-segmented-control" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'owned'"
            :class="{ active: activeTab === 'owned' }"
            @click="activeTab = 'owned'"
          >
            <Images :size="14" />
            <span>我的作品</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'favorites'"
            :class="{ active: activeTab === 'favorites' }"
            @click="activeTab = 'favorites'"
          >
            <Heart :size="14" :fill="activeTab === 'favorites' ? 'currentColor' : 'none'" />
            <span>收藏夹</span>
          </button>
        </div>

        <!-- Controls: Search Input & View Layout Switcher -->
        <div class="ios-actions-group">
          <!-- Search Capsule -->
          <div class="ios-search-bar">
            <Search :size="14" class="ios-search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索..."
            />
            <button v-if="searchQuery" type="button" class="ios-clear-btn" @click="searchQuery = ''">✕</button>
          </div>

          <!-- View Mode Toggle -->
          <div class="ios-view-toggle">
            <button
              type="button"
              title="瀑布流视角"
              :class="{ active: viewLayout === 'masonry' }"
              @click="viewLayout = 'masonry'"
            >
              <Columns :size="14" />
            </button>
            <button
              type="button"
              title="标准网格"
              :class="{ active: viewLayout === 'grid' }"
              @click="viewLayout = 'grid'"
            >
              <Grid :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Sub Filter Bar for Visibility (iOS Tag Pills) -->
      <div v-if="activeTab === 'owned'" class="ios-subfilter-bar">
        <div class="ios-tags-group">
          <button
            type="button"
            class="ios-tag-pill"
            :class="{ active: visibilityFilter === 'all' }"
            @click="visibilityFilter = 'all'"
          >
            <span>全部作品</span>
            <span class="tag-num">{{ imageAllTotal }}</span>
          </button>
          <button
            type="button"
            class="ios-tag-pill"
            :class="{ active: visibilityFilter === 'public' }"
            @click="visibilityFilter = 'public'"
          >
            <Eye :size="12" />
            <span>已公开</span>
            <span class="tag-num">{{ publicCount }}</span>
          </button>
          <button
            type="button"
            class="ios-tag-pill"
            :class="{ active: visibilityFilter === 'private' }"
            @click="visibilityFilter = 'private'"
          >
            <EyeOff :size="12" />
            <span>仅私有</span>
            <span class="tag-num">{{ privateCount }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="ios-main-gallery">
      <AssetGrid
        :items="filteredItems"
        :mode="activeTab"
        :loading="activeLoading"
        :view-layout="viewLayout"
        :search-query="searchQuery"
        :updating-ids="updatingIds"
        @remove="handleRemove"
        @reuse="handleReuse"
        @toggle-visibility="handleVisibility"
        @unfavorite="handleUnfavorite"
      />

      <p v-if="activeError" class="ios-error-msg" role="alert">{{ activeError }}</p>

      <!-- iOS Infinite Load Button -->
      <div v-if="activeHasMore" class="ios-load-more">
        <button
          type="button"
          :disabled="activeLoadingMore"
          @click="loadMore"
        >
          <LoaderCircle v-if="activeLoadingMore" :size="15" class="ios-spin" />
          <Sparkles v-else :size="15" />
          <span>{{ activeLoadingMore ? '载入中...' : '载入更多精彩' }}</span>
        </button>
      </div>
    </main>
  </section>
</template>

<style scoped>
.ios-assets-page {
  width: min(1380px, calc(100% - 48px));
  min-height: 100%;
  margin: 0 auto;
  padding: 24px 0 120px;
}

/* Sticky iOS Acrylic Navigation Topbar */
.ios-nav-header {
  position: sticky;
  top: 16px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 18px;
  margin-bottom: 28px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 22px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03);
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  transition: all 240ms ease;
}

.ios-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* Title & Badge */
.ios-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ios-title-group h2 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  font-weight: 750;
  letter-spacing: -0.4px;
}

.ios-count-badge {
  padding: 3px 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  background: rgba(241, 245, 249, 0.9);
  border-radius: 14px;
}

/* iOS Segmented Pill Tabs */
.ios-segmented-control {
  position: relative;
  display: inline-flex;
  padding: 3px;
  background: rgba(238, 242, 246, 0.9);
  border-radius: 14px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}

.ios-segmented-control button {
  position: relative;
  z-index: 1;
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 11px;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ios-segmented-control button:hover {
  color: #0f172a;
}

.ios-segmented-control button.active {
  color: #0f172a;
  background: #ffffff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Actions Group */
.ios-actions-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* iOS Search Input */
.ios-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  width: 180px;
  height: 34px;
  padding: 0 10px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  transition: all 200ms ease;
}

.ios-search-bar:focus-within {
  width: 220px;
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.ios-search-icon {
  color: #94a3b8;
  margin-right: 6px;
}

.ios-search-bar input {
  width: 100%;
  color: #0f172a;
  font-size: 12px;
  background: transparent;
  border: 0;
  outline: none;
}

.ios-clear-btn {
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  border: 0;
  padding: 0 2px;
}

.ios-clear-btn:hover {
  color: #0f172a;
}

/* iOS View Toggle */
.ios-view-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: rgba(238, 242, 246, 0.9);
  border-radius: 11px;
}

.ios-view-toggle button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #64748b;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 9px;
  transition: all 160ms ease;
}

.ios-view-toggle button:hover {
  color: #0f172a;
}

.ios-view-toggle button.active {
  color: #4f46e5;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

/* Subfilter Bar */
.ios-subfilter-bar {
  display: flex;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.ios-tags-group {
  display: flex;
  gap: 6px;
}

.ios-tag-pill {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 550;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 14px;
  transition: all 160ms ease;
}

.ios-tag-pill:hover {
  color: #0f172a;
  background: rgba(241, 245, 249, 0.8);
}

.ios-tag-pill.active {
  color: #4f46e5;
  background: #eef2ff;
}

.tag-num {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
}

/* Error Message */
.ios-error-msg {
  margin-top: 32px;
  color: #dc2626;
  font-size: 13px;
  text-align: center;
}

/* Load More */
.ios-load-more {
  display: flex;
  justify-content: center;
  margin-top: 48px;
}

.ios-load-more button {
  display: inline-flex;
  height: 42px;
  align-items: center;
  gap: 8px;
  padding: 0 26px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 20px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(16px);
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ios-load-more button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.09);
}

.ios-load-more button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.ios-spin {
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 860px) {
  .ios-assets-page {
    width: calc(100% - 24px);
    padding-top: 12px;
  }
  .ios-nav-header {
    top: 8px;
    border-radius: 18px;
    padding: 12px;
  }
  .ios-header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .ios-segmented-control button {
    flex: 1;
    justify-content: center;
  }
  .ios-actions-group {
    width: 100%;
  }
  .ios-search-bar, .ios-search-bar:focus-within {
    flex: 1;
    width: 100%;
  }
}
</style>
