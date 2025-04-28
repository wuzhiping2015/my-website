<template>
  <div class="video-player-overlay" v-if="visible" @click.self="closePlayer">
    <div class="video-player-container" :class="{ 'fullscreen': isFullscreen }">
      <div class="video-player-header">
        <h3 class="video-title">{{ videoData.title }}</h3>
        <button class="close-btn" @click="closePlayer">
          <el-icon><Close /></el-icon>
        </button>
      </div>
      
      <div class="video-wrapper">
        <video 
          ref="videoRef" 
          :src="videoData.videoUrl" 
          @timeupdate="onTimeUpdate"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @ended="onVideoEnded"
          @canplay="isLoaded = true"
          @error="onVideoError"
          controls
          autoplay
          playsinline
          x5-playsinline
          webkit-playsinline
        ></video>
        
        <div class="loading-indicator" v-if="!isLoaded && !error">
          <div class="spinner"></div>
          <span>视频加载中...</span>
        </div>
        
        <div class="error-message" v-if="error">
          <el-icon><WarningFilled /></el-icon>
          <span>{{ error }}</span>
          <button class="retry-btn" @click="retryLoading">重试</button>
        </div>

        <div class="custom-controls" v-if="isLoaded && !error">
          <div class="time-display">
            <span>{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
          </div>
          <div class="fullscreen-btn" @click="toggleFullscreen">
            <i :class="isFullscreen ? 'el-icon-full-screen-exit' : 'el-icon-full-screen'"></i>
          </div>
        </div>
      </div>
      
      <div class="video-info-panel">
        <div class="video-author">
          <img :src="videoData.authorAvatar" alt="作者头像" class="author-avatar">
          <span class="author-name">{{ videoData.author }}</span>
        </div>
        <div class="video-stats">
          <span class="views">{{ formatViews(videoData.views) }}</span>
          <span class="likes">
            <el-icon><Star /></el-icon>
            {{ videoData.likes }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { Close, Star, WarningFilled } from '@element-plus/icons-vue';

// 定义属性
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  videoData: {
    type: Object,
    default: () => ({})
  }
});

// 定义事件
const emit = defineEmits(['close', 'ended']);

// 组件状态
const videoRef = ref(null);
const isPlaying = ref(false);
const isLoaded = ref(false);
const error = ref(null);
const currentTime = ref(0);
const duration = ref(0);
const isFullscreen = ref(false);
const loadRetries = ref(0);
const MAX_RETRIES = 3;

// 监听显示状态变化
watch(() => props.visible, (newValue) => {
  if (newValue) {
    // 组件显示时重置状态
    isLoaded.value = false;
    error.value = null;
    loadRetries.value = 0;
    
    // 确保DOM更新后操作视频元素
    setTimeout(() => {
      if (videoRef.value) {
        try {
          videoRef.value.load();
          const playPromise = videoRef.value.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.error('自动播放失败:', err);
              // 自动播放失败时显示播放按钮
              isPlaying.value = false;
            });
          }
        } catch (err) {
          console.error('视频加载出错:', err);
          handleVideoError(err);
        }
      }
    }, 100);
  } else {
    // 组件隐藏时暂停视频
    if (videoRef.value) {
      videoRef.value.pause();
    }
    // 如果处于全屏模式，退出全屏
    if (isFullscreen.value) {
      exitFullscreen();
    }
  }
});

// 组件挂载
onMounted(() => {
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown);
  
  // 监听全屏变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
});

// 组件卸载
onBeforeUnmount(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown);
  
  // 移除全屏变化监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // 如果处于全屏模式，退出全屏
  if (isFullscreen.value) {
    exitFullscreen();
  }
});

// 处理全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
};

// 进入全屏
const enterFullscreen = () => {
  if (!videoRef.value) return;
  
  const container = videoRef.value.parentElement;
  
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  } else if (container.mozRequestFullScreen) {
    container.mozRequestFullScreen();
  } else if (container.msRequestFullscreen) {
    container.msRequestFullscreen();
  }
};

// 退出全屏
const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};

// 处理键盘事件
const handleKeyDown = (event) => {
  if (!props.visible) return;
  
  switch (event.key) {
    case 'Escape':
      if (!isFullscreen.value) {
        closePlayer();
      }
      break;
    case ' ':
      togglePlay();
      event.preventDefault();
      break;
    case 'ArrowRight':
      seekForward();
      event.preventDefault();
      break;
    case 'ArrowLeft':
      seekBackward();
      event.preventDefault();
      break;
    case 'f':
      toggleFullscreen();
      event.preventDefault();
      break;
  }
};

// 切换全屏
const toggleFullscreen = () => {
  if (isFullscreen.value) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
};

// 关闭播放器
const closePlayer = () => {
  emit('close');
};

// 视频结束处理
const onVideoEnded = () => {
  emit('ended');
};

// 视频错误处理
const handleVideoError = (e) => {
  console.error('视频播放错误:', e);
  
  if (loadRetries.value < MAX_RETRIES) {
    loadRetries.value++;
    error.value = `视频加载失败，正在重试(${loadRetries.value}/${MAX_RETRIES})...`;
    // 自动重试
    setTimeout(retryLoading, 1000);
  } else {
    error.value = '视频加载失败，请稍后重试';
  }
};

// 视频错误事件处理
const onVideoError = (e) => {
  handleVideoError(e);
};

// 重试加载视频
const retryLoading = () => {
  if (!videoRef.value) return;
  
  error.value = null;
  isLoaded.value = false;
  
  try {
    // 添加时间戳参数避免缓存
    const originalSrc = props.videoData.videoUrl;
    const newSrc = originalSrc + (originalSrc.includes('?') ? '&' : '?') + 'retry=' + Date.now();
    videoRef.value.src = newSrc;
    
    videoRef.value.load();
    const playPromise = videoRef.value.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.error('重试播放失败:', err);
        handleVideoError(err);
      });
    }
  } catch (err) {
    console.error('重试加载失败:', err);
    handleVideoError(err);
  }
};

// 切换播放/暂停
const togglePlay = () => {
  if (!videoRef.value) return;
  
  if (videoRef.value.paused) {
    videoRef.value.play().then(() => {
      isPlaying.value = true;
    }).catch(err => {
      console.error('播放失败:', err);
      isPlaying.value = false;
    });
  } else {
    videoRef.value.pause();
    isPlaying.value = false;
  }
};

// 前进10秒
const seekForward = () => {
  if (!videoRef.value) return;
  videoRef.value.currentTime += 10;
};

// 后退10秒
const seekBackward = () => {
  if (!videoRef.value) return;
  videoRef.value.currentTime -= 10;
};

// 更新当前播放时间
const onTimeUpdate = () => {
  if (!videoRef.value) return;
  
  currentTime.value = videoRef.value.currentTime;
  duration.value = videoRef.value.duration;
};

// 格式化观看次数
const formatViews = (views) => {
  if (views >= 10000) {
    return (views / 10000).toFixed(1) + 'w次观看';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'k次观看';
  } else {
    return views + '次观看';
  }
};

// 格式化时间（秒转换为 MM:SS 格式）
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.video-player-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.video-player-container {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.video-player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #111;
  color: white;
}

.video-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.close-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.video-wrapper {
  position: relative;
  width: 100%;
  background-color: #000;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000;
}

.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  z-index: 5;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 107, 107, 0.3);
  border-radius: 50%;
  border-top-color: #ff6b6b;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.error-message {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  z-index: 5;
  padding: 20px;
  text-align: center;
}

.error-message .el-icon {
  font-size: 40px;
  color: #ff6b6b;
  margin-bottom: 16px;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 20px;
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background-color: #ff5252;
}

.custom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 10px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.video-wrapper:hover .custom-controls {
  opacity: 1;
  pointer-events: auto;
}

.time-display {
  font-size: 14px;
}

.fullscreen-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  transition: background-color 0.2s;
}

.fullscreen-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.fullscreen-btn i {
  font-size: 18px;
}

.el-icon-full-screen::before {
  content: "\e623";
}

.el-icon-full-screen-exit::before {
  content: "\e624";
}

/* 全屏模式样式 */
.video-player-container.fullscreen {
  max-width: 100%;
  max-height: 100%;
  border-radius: 0;
}

.fullscreen .video-wrapper {
  aspect-ratio: unset;
  height: calc(100vh - 120px); /* 减去头部和信息面板高度 */
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 移动设备适配 */
@media screen and (max-width: 480px) {
  .video-player-header h3 {
    font-size: 16px;
    max-width: 70%;
  }
  
  .video-info-panel {
    padding: 10px;
  }
  
  .author-avatar {
    width: 30px;
    height: 30px;
  }
  
  .custom-controls {
    padding: 8px;
  }
  
  .time-display {
    font-size: 12px;
  }
  
  .fullscreen-btn {
    width: 28px;
    height: 28px;
  }
}

/* 视频信息面板 */
.video-info-panel {
  padding: 12px 16px;
  background-color: #111;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.video-author {
  display: flex;
  align-items: center;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
}

.author-name {
  font-size: 14px;
  font-weight: 500;
}

.video-stats {
  display: flex;
  align-items: center;
}

.views {
  font-size: 14px;
  margin-right: 16px;
  color: #aaa;
}

.likes {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #aaa;
}

.likes .el-icon {
  margin-right: 4px;
  color: #ff9800;
}
</style> 