<template>
  <div class="content-item" :class="item.type">
    <div class="item-container" :class="{ 'with-border': item.type !== 'video' }">
      <!-- 不同类型内容项展示不同的样式 -->
      <div class="item-content" v-if="item.type === 'news' || item.type === 'recommendation' || item.type === 'game'">
        <div class="item-thumbnail">
          <img 
            :src="item.thumbnail" 
            alt="thumbnail" 
            @error="handleImageError" 
            @load="handleImageLoad"
            :class="{ 'loaded': isImageLoaded }"
          />
          <div class="loading-placeholder" v-if="!isImageLoaded && !isImageError">
            <div class="spinner"></div>
          </div>
        </div>
        <div class="item-info">
          <h3 class="item-title">{{ item.title }}</h3>
          <div class="item-author">
            <img :src="item.authorAvatar" alt="avatar" class="author-avatar" />
            <span class="author-name">{{ item.author }}</span>
          </div>
          <div class="item-stats">
            <span class="likes">
              <el-icon><Star /></el-icon> {{ item.likes }}
            </span>
          </div>
        </div>
      </div>

      <!-- 视频类型 -->
      <div class="item-video" v-else-if="item.type === 'video'">
        <div class="video-thumbnail" @click="openFullscreenPlayer">
          <img 
            :src="item.thumbnail" 
            alt="video thumbnail" 
            @error="handleImageError" 
            @load="handleImageLoad"
            :class="{ 'loaded': isImageLoaded }"
          />
          <div class="loading-placeholder" v-if="!isImageLoaded && !isImageError">
            <div class="spinner"></div>
          </div>
          <div class="play-indicator">
            <el-icon><VideoPlay /></el-icon>
          </div>
          <div class="video-duration">{{ item.duration || generateRandomDuration() }}</div>
          <div v-if="isInlinePlayer" class="inline-player-container">
            <video 
              ref="videoElement"
              :src="item.videoUrl"
              controls
              autoplay
              @ended="onVideoEnded"
              @pause="onVideoPause"
              @error="onVideoError"
            >
              您的浏览器不支持视频播放
            </video>
            <div class="video-controls" v-if="videoError">
              <div class="error-message">{{ videoError }}</div>
              <button class="retry-btn" @click="playInlineVideo">重试</button>
            </div>
          </div>
        </div>
        <div class="video-info">
          <h3 class="item-title">{{ item.title }}</h3>
          <div class="video-stats">
            <span class="author-name">{{ item.author }}</span>
            <span class="video-views">{{ formatViews(item.views) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 全屏视频播放器 -->
    <video-player 
      v-if="showFullscreenPlayer" 
      :visible="showFullscreenPlayer"
      :video-data="item"
      @close="closeFullscreenPlayer"
      @ended="onFullscreenVideoEnded"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Star, VideoPlay } from '@element-plus/icons-vue';
import VideoPlayer from './VideoPlayer.vue';

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

// 播放状态
const isInlinePlayer = ref(false);
const showFullscreenPlayer = ref(false);
const videoElement = ref(null);
const videoError = ref(null);

// 媒体加载状态
const isImageLoaded = ref(false);
const isImageError = ref(false);
const imageLoadRetries = ref(0);
const MAX_RETRIES = 3;

// 处理图片加载错误，添加预设默认图片
const handleImageError = (event) => {
  if (imageLoadRetries.value < MAX_RETRIES) {
    imageLoadRetries.value++;
    // 重试加载时尝试添加或移除缓存参数
    const img = event.target;
    const originalSrc = props.item.thumbnail;
    img.src = originalSrc + (originalSrc.includes('?') ? '&' : '?') + 'retry=' + Date.now();
  } else {
    isImageError.value = true;
    // 使用默认图片
    event.target.src = '/图片/信号塔.png';
  }
};

// 图片加载成功处理
const handleImageLoad = () => {
  isImageLoaded.value = true;
  isImageError.value = false;
};

// 在组件挂载时，处理视频URL
onMounted(() => {
  if (props.item.type === 'video' && !props.item.videoUrl) {
    // 这一步已在VideoPlayerPage中处理，此处作为备用逻辑
    console.log('视频项未包含视频URL');
  }
});

// 组件卸载前停止视频播放
onBeforeUnmount(() => {
  if (videoElement.value) {
    videoElement.value.pause();
  }
});

// 打开内嵌播放器
const playInlineVideo = () => {
  videoError.value = null;
  isInlinePlayer.value = true;
  
  // 确保DOM更新后再播放视频
  setTimeout(() => {
    if (videoElement.value) {
      try {
        videoElement.value.play().catch(error => {
          console.error('视频播放出错:', error);
          videoError.value = '视频播放失败，请稍后重试';
        });
      } catch (error) {
        console.error('视频播放出错:', error);
        videoError.value = '视频播放失败，请稍后重试';
      }
    }
  }, 100);
};

// 打开全屏播放器
const openFullscreenPlayer = () => {
  // 在移动设备上使用全屏播放器
  showFullscreenPlayer.value = true;
  
  // 如果有正在播放的内嵌视频，暂停它
  if (isInlinePlayer.value && videoElement.value) {
    videoElement.value.pause();
    isInlinePlayer.value = false;
  }
};

// 关闭全屏播放器
const closeFullscreenPlayer = () => {
  showFullscreenPlayer.value = false;
};

// 视频播放结束处理
const onVideoEnded = () => {
  isInlinePlayer.value = false;
};

// 视频播放结束处理（全屏）
const onFullscreenVideoEnded = () => {
  closeFullscreenPlayer();
};

// 视频暂停处理
const onVideoPause = () => {
  // 可以选择是否在暂停时返回封面，这里保持视频状态
};

// 视频错误处理
const onVideoError = (event) => {
  console.error('视频加载错误:', event);
  videoError.value = '视频加载错误，请稍后重试';
};

// 格式化观看次数（例如：1.5k次观看）
const formatViews = (views) => {
  if (views >= 10000) {
    return (views / 10000).toFixed(1) + 'w次观看';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'k次观看';
  } else {
    return views + '次观看';
  }
};

// 生成随机视频时长
const generateRandomDuration = () => {
  const minutes = Math.floor(Math.random() * 10) + 1;
  const seconds = Math.floor(Math.random() * 60);
  return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
};
</script>

<style scoped>
.content-item {
  width: 100%;
  margin-bottom: 0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.content-item:active {
  transform: scale(0.98);
}

.item-container {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.with-border {
  border: 1px solid #f0f0f0;
}

.item-content {
  display: flex;
  flex-direction: column;
}

.item-info {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}

.item-title {
  margin: 0 0 10px 0;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 2.8em;
}

.item-thumbnail {
  width: 100%;
  height: 0;
  padding-bottom: 60%; /* 宽高比例控制 */
  position: relative;
  overflow: hidden;
}

.item-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-author {
  display: flex;
  align-items: center;
  margin-top: auto;
  font-size: 12px;
  color: #999;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 6px;
  object-fit: cover;
}

.item-stats {
  display: flex;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}

.likes {
  display: flex;
  align-items: center;
}

.likes .el-icon {
  margin-right: 4px;
  font-size: 14px;
  color: #ff9800;
}

/* 视频类型样式 */
.item-video {
  display: flex;
  flex-direction: column;
}

.video-thumbnail {
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9比例 */
  position: relative;
  cursor: pointer;
}

.video-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-indicator {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.video-thumbnail:hover .play-indicator {
  transform: translate(-50%, -50%) scale(1.1);
  background-color: rgba(0, 0, 0, 0.7);
}

.play-indicator .el-icon {
  color: white;
  font-size: 24px;
}

.video-duration {
  position: absolute;
  right: 6px;
  bottom: 6px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 2px;
}

/* 内嵌视频播放器 */
.inline-player-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  z-index: 10;
}

.inline-player-container video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-message {
  color: #ff6b6b;
  font-size: 14px;
  margin-bottom: 10px;
}

.retry-btn {
  padding: 5px 15px;
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.video-info {
  padding: 10px 12px;
}

.video-stats {
  display: flex;
  justify-content: space-between;
  color: #999;
  font-size: 12px;
  margin-top: 6px;
}

/* 不同类型的内容样式差异 */
.content-item.news .item-container {
  border-left: 3px solid #2196f3;
}

.content-item.recommendation .item-container {
  border-left: 3px solid #ff6b6b;
}

.content-item.game .item-container {
  border-left: 3px solid #4caf50;
}

/* 移动端适配 */
@media screen and (max-width: 375px) {
  .item-title {
    font-size: 13px;
  }
  
  .video-info {
    padding: 8px 10px;
  }
  
  .item-info {
    padding: 8px 10px;
  }
}

/* 新增样式 */
.loading-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 107, 107, 0.3);
  border-radius: 50%;
  border-top-color: #ff6b6b;
  animation: spin 1s linear infinite;
}

img.loaded {
  opacity: 1;
  transition: opacity 0.3s ease;
}

img:not(.loaded) {
  opacity: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 