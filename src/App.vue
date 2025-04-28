<template>
  <div class="app-container">
    <div class="nav-menu">
      <!-- <button :class="{ active: currentView === 'demo' }" @click="currentView = 'demo'">原始Demo</button>
      <button :class="{ active: currentView === 'demo2' }" @click="currentView = 'demo2'">3D模型查看器</button> -->
      <!-- <button :class="{ active: currentView === 'demo3' }" @click="currentView = 'demo3'">阀门金属材质</button>
      <button :class="{ active: currentView === 'modelViewer' }" @click="currentView = 'modelViewer'">模型查看器(新)</button> -->
      <button :class="{ active: currentView === 'discovery' }" @click="currentView = 'discovery'">发现页面</button>
      <button :class="{ active: currentView === 'videoPlayerPage' }" @click="currentView = 'videoPlayerPage'">发现页面2</button>
    </div>
    <div class="content-container">
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script>
import Demo from './components/Demo.vue'
import Demo2 from './components/Demo2.vue'
import Demo3 from './components/Demo3.vue'
import ModelViewer from './components/ModelViewer.vue'
import Discovery from './components/Discovery.vue'
import VideoPlayerPage from './components/VideoPlayerPage.vue'

export default {
  name: 'App',
  components: {
    Demo,
    Demo2,
    Demo3,
    ModelViewer,
    Discovery,
    VideoPlayerPage
  },
  data() {
    return {
      currentView: 'discovery'
    }
  },
  computed: {
    currentComponent() {
      if (this.currentView === 'demo') return 'Demo';
      if (this.currentView === 'demo2') return 'Demo2';
      if (this.currentView === 'demo3') return 'Demo3';
      if (this.currentView === 'modelViewer') return 'ModelViewer';
      if (this.currentView === 'discovery') return 'Discovery';
      if (this.currentView === 'videoPlayerPage') return 'VideoPlayerPage';
      return 'Demo3';
    }
  }
}
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* 防止出现滚动条 */
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内容溢出 */
}

.nav-menu {
  display: flex;
  padding: 10px;
  background-color: #333;
  gap: 10px;
}

.nav-menu button {
  padding: 8px 16px;
  border: none;
  background: #555;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.nav-menu button:hover {
  background: #777;
}

.nav-menu button.active {
  background: #4a90e2;
}
</style>
