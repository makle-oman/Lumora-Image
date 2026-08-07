<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Calendar,
  Download,
  Eye,
  EyeOff,
  Heart,
  Image as ImageIcon,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'
import ImageDetailModal from '../../../../components/ImageDetailModal/index.vue'
import type { GeneratedImage } from '../../../../types/generation'
import type { ViewLayout } from '../../index.vue'

const props = withDefaults(defineProps<{
  items: ReadonlyArray<GeneratedImage>
  mode: 'owned' | 'favorites'
  loading?: boolean
  viewLayout?: ViewLayout
  searchQuery?: string
  updatingIds?: ReadonlyArray<string>
}>(), {
  loading: false,
  viewLayout: 'masonry',
  searchQuery: '',
  updatingIds: () => [],
})

const emit = defineEmits<{
  remove: [item: GeneratedImage]
  reuse: [prompt: string]
  toggleVisibility: [item: GeneratedImage]
  unfavorite: [item: GeneratedImage]
}>()

const selectedItem = ref<GeneratedImage | null>(null)

function dateKey(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '未知日期'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

const dateGroups = computed(() => {
  const groups = new Map<string, GeneratedImage[]>()
  for (const item of props.items) {
    const date = dateKey(props.mode === 'favorites' ? item.favoritedAt ?? item.createdAt : item.createdAt)
    groups.set(date, [...(groups.get(date) ?? []), item])
  }
  return [...groups].map(([date, items]) => ({ date, items }))
})

function requestRemove(item: GeneratedImage): void {
  if (window.confirm('确认删除这张图片？')) emit('remove', item)
}

function handleReuse(prompt: string): void {
  selectedItem.value = null
  emit('reuse', prompt)
}
</script>

<template>
  <div v-if="loading && !items.length" class="ios-skeletons" :class="viewLayout" aria-label="正在加载资产">
    <div v-for="index in 12" :key="index" class="ios-skeleton" />
  </div>

  <div v-else-if="items.length" class="ios-date-groups">
    <section v-for="group in dateGroups" :key="group.date" class="ios-date-group">
      <div class="ios-date-header">
        <div class="ios-date-title">
          <Calendar :size="14" class="ios-cal-icon" />
          <span>{{ group.date }}</span>
          <span class="ios-count-chip">{{ group.items.length }}</span>
        </div>
        <div class="ios-hairline-divider" />
      </div>

      <!-- Main Masonry / Grid Container -->
      <div class="ios-gallery-container" :class="viewLayout">
        <article v-for="item in group.items" :key="item.id" class="ios-card">
          <!-- Image Canvas Click area -->
          <div class="ios-image-box" @click="selectedItem = item">
            <img :src="item.thumbnailUrl" :alt="item.prompt" loading="lazy" decoding="async" />
            <div class="ios-shade-overlay" />

            <!-- Top Left Visibility Status Badge -->
            <div class="ios-badge-topleft">
              <span v-if="mode === 'owned'" class="ios-status-tag" :class="{ 'is-public': item.isPublic }">
                <Eye v-if="item.isPublic" :size="11" />
                <EyeOff v-else :size="11" />
                <span>{{ item.isPublic ? '公开' : '私有' }}</span>
              </span>
              <span v-else-if="item.author" class="ios-author-tag">
                {{ item.author }}
              </span>
            </div>

            <!-- Top Right Translucent Quick Tools (iOS Hover Bar) -->
            <div class="ios-hover-menu" @click.stop>
              <a
                :href="item.url"
                :download="`lumora-${item.id}.${item.format}`"
                target="_blank"
                title="下载原图"
                aria-label="下载原图"
              >
                <Download :size="14" />
              </a>
              <button
                type="button"
                title="同款再创作"
                aria-label="同款再创作"
                @click="emit('reuse', item.prompt)"
              >
                <Sparkles :size="14" />
              </button>
              <button
                v-if="mode === 'owned'"
                type="button"
                :disabled="updatingIds.includes(item.id)"
                :title="item.isPublic ? '设为私有' : '公开至画廊'"
                :aria-label="item.isPublic ? '设为私有' : '公开至画廊'"
                @click="emit('toggleVisibility', item)"
              >
                <EyeOff v-if="item.isPublic" :size="14" />
                <Eye v-else :size="14" />
              </button>
              <button
                v-if="mode === 'owned'"
                class="ios-danger-action"
                type="button"
                :disabled="updatingIds.includes(item.id)"
                title="删除"
                aria-label="删除"
                @click="requestRemove(item)"
              >
                <Trash2 :size="14" />
              </button>
              <button
                v-else
                class="ios-favorite-action"
                type="button"
                :disabled="updatingIds.includes(item.id)"
                title="取消收藏"
                aria-label="取消收藏"
                @click="emit('unfavorite', item)"
              >
                <Heart :size="14" fill="currentColor" />
              </button>
            </div>

            <!-- Bottom Prompt Typography -->
            <div class="ios-card-caption">
              <p>{{ item.prompt }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>

  <!-- iOS Empty State Card -->
  <div v-else class="ios-empty-wrapper">
    <div class="ios-empty-card">
      <div class="ios-empty-icon">
        <ImageIcon :size="32" />
      </div>
      <h3>{{ searchQuery ? '未找到相关项目' : (mode === 'owned' ? '尚无创作作品' : '收藏夹为空') }}</h3>
      <p>{{ searchQuery ? `未检索到匹配关键词 "${searchQuery}" 的作品` : (mode === 'owned' ? '开启第一张 AI 艺术合成为图库添加内容' : '在社区画廊发现好的灵感并随时收藏') }}</p>
      <RouterLink :to="mode === 'owned' ? '/create' : '/gallery'" class="ios-empty-action">
        <Sparkles :size="14" />
        <span>{{ mode === 'owned' ? '前往生图中心' : '浏览社区画廊' }}</span>
      </RouterLink>
    </div>
  </div>

  <ImageDetailModal
    :item="selectedItem"
    :open="!!selectedItem"
    @close="selectedItem = null"
    @reuse="handleReuse"
  />
</template>

<style scoped>
.ios-date-groups {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.ios-date-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.ios-date-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.3px;
}

.ios-cal-icon {
  color: #6366f1;
}

.ios-count-chip {
  padding: 1px 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  background: rgba(241, 245, 249, 0.9);
  border-radius: 12px;
}

.ios-hairline-divider {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(226, 232, 240, 0.9), rgba(226, 232, 240, 0.08));
}

/* iOS Gallery Container: Masonry vs Grid */
.ios-gallery-container.masonry {
  columns: 4 240px;
  column-gap: 18px;
}

.ios-gallery-container.masonry .ios-card {
  break-inside: avoid;
  margin-bottom: 18px;
}

.ios-gallery-container.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 18px;
}

.ios-gallery-container.grid .ios-image-box {
  aspect-ratio: 1;
}

/* Squircle iOS Art Cards */
.ios-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(241, 245, 249, 0.9);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ios-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.1);
}

.ios-image-box {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f1f5f9;
}

.ios-image-box img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ios-card:hover .ios-image-box img {
  transform: scale(1.045);
}

.ios-shade-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(15, 23, 42, 0.35) 0%,
    transparent 28%,
    transparent 60%,
    rgba(15, 23, 42, 0.78) 100%
  );
  opacity: 0;
  transition: opacity 220ms ease;
  pointer-events: none;
}

.ios-card:hover .ios-shade-overlay {
  opacity: 1;
}

/* Badge Top Left */
.ios-badge-topleft {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
}

.ios-status-tag,
.ios-author-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(12px);
}

.ios-status-tag.is-public {
  color: #059669;
  background: rgba(236, 253, 245, 0.94);
}

/* iOS Translucent Hover Action Menu Top Right */
.ios-hover-menu {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  display: flex;
  gap: 5px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 180ms ease, transform 180ms ease;
}

.ios-card:hover .ios-hover-menu {
  opacity: 1;
  transform: translateY(0);
}

.ios-hover-menu a,
.ios-hover-menu button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #334155;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(12px);
  transition: all 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ios-hover-menu a:hover,
.ios-hover-menu button:hover:not(:disabled) {
  color: #4f46e5;
  background: #ffffff;
  transform: scale(1.08);
}

.ios-hover-menu button:disabled {
  cursor: wait;
  opacity: 0.5;
}

.ios-hover-menu .ios-danger-action:hover:not(:disabled) {
  color: #dc2626;
}

.ios-hover-menu .ios-favorite-action {
  color: #e11d48;
}

/* Card Bottom Prompt Caption */
.ios-card-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  z-index: 2;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 200ms ease, transform 200ms ease;
}

.ios-card:hover .ios-card-caption {
  opacity: 1;
  transform: translateY(0);
}

.ios-card-caption p {
  margin: 0;
  color: #ffffff;
  font-size: 12px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* Skeleton Loading */
.ios-skeletons.masonry,
.ios-skeletons.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 18px;
}

.ios-skeleton {
  aspect-ratio: 1;
  border-radius: 20px;
  background: linear-gradient(100deg, #f1f5f9 20%, #ffffff 38%, #f1f5f9 56%);
  background-size: 240% 100%;
  animation: ios-shimmer 1.2s linear infinite;
}

/* iOS Empty State Card */
.ios-empty-wrapper {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.ios-empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 420px;
  padding: 42px 28px;
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(20px);
}

.ios-empty-icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  margin-bottom: 14px;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 50%;
}

.ios-empty-card h3 {
  margin: 0 0 6px;
  color: #0f172a;
  font-size: 17px;
  font-weight: 750;
}

.ios-empty-card p {
  margin: 0 0 20px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.ios-empty-action {
  display: inline-flex;
  height: 38px;
  align-items: center;
  gap: 7px;
  padding: 0 20px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  background: #0f172a;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
  transition: all 180ms ease;
}

.ios-empty-action:hover {
  background: #334155;
  transform: translateY(-1px);
}

@keyframes ios-shimmer {
  to { background-position-x: -240%; }
}

@media (hover: none) {
  .ios-hover-menu,
  .ios-card-caption,
  .ios-shade-overlay {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 900px) {
  .ios-gallery-container.masonry {
    columns: 3 190px;
  }
}

@media (max-width: 640px) {
  .ios-gallery-container.masonry {
    columns: 2 140px;
    column-gap: 12px;
  }
  .ios-gallery-container.grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style>
