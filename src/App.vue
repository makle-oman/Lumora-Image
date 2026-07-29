<script setup lang="ts">
import AmbientScene from './components/AmbientScene/index.vue'
import AppSidebar from './components/AppSidebar/index.vue'
import AuthModal from './components/AuthModal/index.vue'
import DesktopStorageModal from './components/DesktopStorageModal/index.vue'
import NoticeModal from './components/NoticeModal/index.vue'
import ProfileModal from './components/ProfileModal/index.vue'
import UpdateModal from './components/UpdateModal/index.vue'
</script>

<template>
  <div class="app-shell">
    <div class="ambient-background" aria-hidden="true">
      <AmbientScene />
      <div class="ambient-fade" />
      <div class="ambient-glow" />
    </div>
    <AppSidebar />
    <main id="main-content" class="app-main">
      <RouterView />
    </main>

    <!-- Global Modals -->
    <NoticeModal />
    <AuthModal />
    <ProfileModal />
    <DesktopStorageModal />
    <UpdateModal />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: #ffffff;
}

.ambient-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #ffffff;
  pointer-events: none;
}

.ambient-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.15) 20%,
    rgba(255, 255, 255, 0.55) 45%,
    rgba(255, 255, 255, 0.88) 68%,
    #ffffff 85%
  );
  pointer-events: none;
}

.ambient-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    65% 55% at 50% 28%,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0) 100%
  );
  pointer-events: none;
}

.app-main {
  position: relative;
  z-index: 2;
  height: 100dvh;
  min-width: 0;
  margin-left: 104px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

@media (max-width: 720px) {
  .app-main {
    height: calc(100dvh - 66px - env(safe-area-inset-bottom));
    margin-left: 0;
  }
}
</style>
