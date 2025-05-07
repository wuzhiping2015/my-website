<template>
  <div class="app-container">
    <div class="nav-menu">
      <router-link to="/Demo" class="nav-button">模型查看器</router-link>
      <router-link to="/Demo2" class="nav-button">模型查看器2</router-link>
      <router-link to="/model-viewer" class="nav-button">3D模型查看器</router-link>
      <router-link to="/digital-twin" class="nav-button">digital-twin</router-link>
      <router-link to="/maritime-map" class="nav-button">海事地图</router-link>
      <router-link to="/mapbox-maritime" class="nav-button">Mapbox航海系统</router-link>
    </div>
    <div class="content-container">
      <router-view />
    </div>

    <!-- 全局通知组件 -->
    <NotificationToast />
  </div>
</template>

<script setup>
// 使用组合式API
import { useUIStore } from "./stores/uiStore";
import { onMounted } from "vue";
import NotificationToast from "./components/NotificationToast.vue";

// 初始化UI存储
const uiStore = useUIStore();

// 组件挂载时初始化UI状态
onMounted(() => {
  uiStore.initStore();

  // 监听窗口大小变化
  window.addEventListener("resize", () => {
    uiStore.updateViewportSize(window.innerWidth, window.innerHeight);
  });
});
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

#app {
  height: 100vh;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-menu {
  display: flex;
  padding: 10px;
  background-color: #333;
  gap: 10px;
}

.nav-button {
  padding: 8px 16px;
  border: none;
  background: #555;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  display: inline-block;
  transition: background-color 0.2s;
}

.nav-button:hover {
  background: #777;
}

.router-link-active {
  background: #4a90e2;
}
</style>
