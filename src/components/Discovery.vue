<template>
  <div class="discovery-container">
    <!-- 顶部导航栏 -->
    <div class="nav-header">
      <div class="nav-tabs">
        <div class="tab active">发现</div>
        <div class="tab">游戏圈</div>
        <div class="tab"><span class="hot-tag">热门推荐</span>专区</div>
      </div>
      <div class="search-icon">
        <el-icon><Search /></el-icon>
      </div>
      <div class="message-icon">
        <el-icon><ChatDotRound /></el-icon>
      </div>
    </div>

    <!-- 下拉刷新区域 -->
    <div 
      class="pull-refresh-container"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div 
        class="pull-refresh-indicator" 
        :class="{ 'visible': isPulling }"
        :style="{ transform: `translateY(${Math.min(pullDistance, 80)}px)` }"
      >
        <div class="loading-icon" :class="{ 'rotate': isRefreshing }">
          <el-icon><RefreshRight /></el-icon>
        </div>
        <span>{{ isRefreshing ? '刷新中...' : pullDistance > pullThreshold ? '释放刷新' : '下拉刷新' }}</span>
      </div>

      <!-- 内容区域 -->
      <div class="content-area" ref="contentArea" @scroll="handleScroll">
        <!-- 瀑布流内容列表 -->
        <div class="waterfall-container">
          <div class="waterfall-column">
            <content-item 
              v-for="item in leftColumnItems" 
              :key="item.id" 
              :item="item" 
            />
          </div>
          <div class="waterfall-column">
            <content-item 
              v-for="item in rightColumnItems" 
              :key="item.id" 
              :item="item" 
            />
          </div>
        </div>

        <!-- 加载状态 -->
        <div class="loading-more" v-show="isLoadingMore">
          <div class="loading-spinner"></div>
          <span>加载更多内容...</span>
        </div>

        <!-- 全部加载完毕提示 -->
        <div class="no-more" v-if="!hasMore && allContentItems.length > 0">
          已加载全部内容
        </div>

        <!-- 空状态 -->
        <div class="empty-state" v-if="!isLoadingMore && allContentItems.length === 0">
          <el-icon class="empty-icon"><Document /></el-icon>
          <p>暂无内容</p>
          <button class="refresh-btn" @click="() => fetchData(true)">点击刷新</button>
        </div>
      </div>
    </div>

    <!-- 底部导航栏 -->
    <div class="bottom-nav">
      <div class="nav-item active">
        <div class="icon-wrapper">
          <el-icon><Search /></el-icon>
        </div>
        <span>发现</span>
      </div>
      <div class="nav-item">
        <div class="icon-wrapper">
          <el-icon><User /></el-icon>
        </div>
        <span>社区</span>
      </div>
      <div class="nav-item">
        <div class="icon-wrapper">
          <el-icon><Monitor /></el-icon>
        </div>
        <span>游戏</span>
      </div>
      <div class="nav-item">
        <div class="icon-wrapper">
          <el-icon><Avatar /></el-icon>
        </div>
        <span>我的</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import ContentItem from './ContentItem.vue';
import { Search, ChatDotRound, User, Monitor, Avatar, RefreshRight, Document } from '@element-plus/icons-vue';

// 下拉刷新相关状态
const isPulling = ref(false);
const isRefreshing = ref(false);
const pullStartY = ref(0);
const pullMoveY = ref(0);
const pullDistance = ref(0);
const pullThreshold = 60; // 触发刷新的阈值

// 上拉加载更多相关状态
const isLoadingMore = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;
const contentArea = ref(null);

// 所有内容项
const allContentItems = ref([]);

// 瀑布流左右两列内容，根据内容高度智能分配到两列
const leftColumnItems = computed(() => {
  return distributeItems().left;
});

const rightColumnItems = computed(() => {
  return distributeItems().right;
});

// 根据内容类型和文本长度，智能分配左右两列的内容
function distributeItems() {
  const left = [];
  const right = [];
  
  // 计算大致内容高度的权重
  const getItemWeight = (item) => {
    // 视频类型有固定高宽比，但权重略高
    if (item.type === 'video') return 180;
    
    // 其他类型根据标题长度和类型计算大致权重
    let weight = 120 + (item.title.length / 10) * 5;
    
    // 图片内容
    if (item.type === 'game') weight += 20;
    if (item.type === 'recommendation') weight += 10;
    
    return weight;
  };
  
  let leftWeight = 0;
  let rightWeight = 0;
  
  allContentItems.value.forEach(item => {
    const weight = getItemWeight(item);
    
    // 将内容添加到权重较小的列
    if (leftWeight <= rightWeight) {
      left.push(item);
      leftWeight += weight;
    } else {
      right.push(item);
      rightWeight += weight;
    }
  });
  
  return { left, right };
}

// 模拟获取数据
const fetchData = async (isRefresh = false) => {
  if (isRefresh) {
    isRefreshing.value = true;
    page.value = 1;
    hasMore.value = true;
  } else {
    isLoadingMore.value = true;
  }

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000));

  const newItems = generateMockData(page.value, pageSize);
  
  if (isRefresh) {
    allContentItems.value = newItems;
    isRefreshing.value = false;
    isPulling.value = false;
    pullDistance.value = 0;
  } else {
    allContentItems.value = [...allContentItems.value, ...newItems];
    isLoadingMore.value = false;
  }

  // 模拟分页
  page.value += 1;
  hasMore.value = page.value < 5; // 模拟只有5页数据
};

// 生成随机内容数据
const generateMockData = (page, size) => {
  const types = ['news', 'recommendation', 'game', 'video'];
  const result = [];
  const startId = (page - 1) * size + 1;

  // 视频资源数组
  const videoSources = [
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://media.w3.org/2010/05/sintel/trailer.mp4',
    'https://media.w3.org/2010/05/bunny/trailer.mp4',
    'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
    'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4'
  ];

  // 视频时长
  const videoDurations = [
    '0:32',
    '1:47',
    '0:58',
    '2:13',
    '1:22'
  ];

  // 视频封面图片
  const videoThumbnails = [
    'https://img.youtube.com/vi/YE7VzlLtp-4/maxresdefault.jpg',
    'https://img.youtube.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
    'https://cdn.pixabay.com/photo/2016/03/27/18/31/grapes-1283789_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/11/06/18/39/apple-2924531_1280.jpg',
    'https://cdn.pixabay.com/photo/2010/12/13/10/05/berries-2277_1280.jpg'
  ];

  for (let i = 0; i < size; i++) {
    const id = startId + i;
    const type = types[Math.floor(Math.random() * types.length)];
    const imageSeed = Math.floor(Math.random() * 1000) + id;
    
    // 基础内容项
    const item = {
      id,
      type,
      title: generateTitle(type, id),
      author: generateAuthorName(),
      authorAvatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${id % 100}.jpg`,
      likes: Math.floor(Math.random() * 1000),
      views: Math.floor(Math.random() * 10000),
    };

    // 根据类型添加不同属性
    if (type === 'video') {
      // 视频类型使用视频封面
      const videoIndex = id % videoSources.length;
      item.thumbnail = videoThumbnails[videoIndex];
      item.videoUrl = videoSources[videoIndex];
      item.duration = videoDurations[videoIndex];
    } else {
      // 其他类型使用普通图片
      item.thumbnail = `https://picsum.photos/seed/${imageSeed}/400/300`;
    }

    result.push(item);
  }

  return result;
};

// 生成随机标题
const generateTitle = (type, id) => {
  const titles = {
    news: [
      '【热点速递】一周行业大事件盘点，这些变化你需要知道',
      '【深度分析】市场趋势变化背后的真相，专家这样说',
      '【故事前瞻】干宇宙级本格灵异集 — 无尽小镇篇都分外宛若',
      '【独家报道】新技术如何改变我们的生活方式与工作效率',
      '【行业洞察】产业变革中的机遇与挑战，发展前景如何？'
    ],
    recommendation: [
      '『精品推荐』这款产品帮你解决日常困扰，用户好评如潮',
      '『有梦与~♡』落在梦的网里的小家伙🥚+🍽️+#姐妹情',
      '『创意无限』设计师作品集锦，充满灵感的视觉盛宴',
      '『品质生活』提升生活品质的小物件，实用又美观',
      '『美食天地』舌尖上的美味，让你垂涎欲滴的家常菜'
    ],
    game: [
      '【游戏攻略】最新版本隐藏关卡攻略，轻松通关不再难',
      '【徐香幻图一—樱花海峡】第三图全新玩法详解',
      '【游戏测评】年度最佳游戏候选名单，哪一款是你的最爱？',
      '【新游预告】下一代开放世界游戏来袭，画面震撼玩法创新',
      '【游戏社区】玩家自制皮肤展示，创意无限惊艳全场'
    ],
    video: [
      '三角洲行动: 全面战地性开放, 等待合集, 末世大战, 未见',
      '【视频教程】10分钟学会这项技能，提升工作效率翻倍',
      '【vlog记录】我的一天，平凡生活中的小确幸',
      '【影视解说】经典电影背后的故事，导演如何打造名场面',
      '【科技前沿】最新科技产品评测，功能强大令人惊叹'
    ]
  };

  const titlesList = titles[type];
  return titlesList[id % titlesList.length];
};

// 生成随机作者名
const generateAuthorName = () => {
  const firstNames = ['小', '大', '老', '新', '金', '张', '李', '王', '赵', '林'];
  const lastNames = ['明', '华', '强', '伟', '博', '凯', '瑞', '阳', '文', '杰'];
  const nicknames = ['说书人', '解说员', '评测师', '设计师', '玩家', '达人', '爱好者', '创作者', '讲师', '分享者'];
  
  return firstNames[Math.floor(Math.random() * firstNames.length)] 
    + lastNames[Math.floor(Math.random() * lastNames.length)]
    + '的' 
    + nicknames[Math.floor(Math.random() * nicknames.length)];
};

// 下拉刷新处理
const handleTouchStart = (e) => {
  if (isRefreshing.value) return;
  
  const touchY = e.touches[0].clientY;
  pullStartY.value = touchY;
  pullMoveY.value = touchY;
  pullDistance.value = 0;
};

const handleTouchMove = (e) => {
  if (isRefreshing.value) return;
  
  const contentScrollTop = contentArea.value.scrollTop;
  pullMoveY.value = e.touches[0].clientY;
  
  // 只有当内容区域滚动到顶部时才允许下拉
  if (contentScrollTop <= 0) {
    const distance = pullMoveY.value - pullStartY.value;
    if (distance > 0) {
      e.preventDefault(); // 阻止默认滚动行为
      isPulling.value = true;
      // 下拉距离增加阻尼效果
      pullDistance.value = distance * 0.5;
    }
  }
};

const handleTouchEnd = async () => {
  if (isRefreshing.value) return;
  
  if (isPulling.value && pullDistance.value >= pullThreshold) {
    // 触发刷新
    await fetchData(true);
  } else {
    isPulling.value = false;
    pullDistance.value = 0;
  }
};

// 上拉加载更多处理
const handleScroll = () => {
  if (isLoadingMore.value || !hasMore.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = contentArea.value;
  
  // 当滚动到距离底部100px时触发加载更多
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    fetchData();
  }
};

// 组件挂载时加载初始数据
onMounted(async () => {
  await fetchData();
  
  // 设置内容区域高度以适应移动屏幕
  await nextTick();
  adjustContentHeight();
  window.addEventListener('resize', adjustContentHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', adjustContentHeight);
});

// 调整内容区域高度，确保在移动设备上正确显示
const adjustContentHeight = () => {
  if (!contentArea.value) return;
  
  const headerHeight = document.querySelector('.nav-header').offsetHeight;
  const bottomNavHeight = document.querySelector('.bottom-nav').offsetHeight;
  const windowHeight = window.innerHeight;
  
  contentArea.value.style.height = `${windowHeight - headerHeight - bottomNavHeight}px`;
};

</script>

<style scoped>
.discovery-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f8f8;
  font-family: PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif;
  color: #333;
  overflow: hidden;
}

.nav-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.nav-tabs {
  display: flex;
  flex: 1;
}

.tab {
  padding: 0 15px;
  font-size: 16px;
  position: relative;
  display: flex;
  align-items: center;
}

.tab.active {
  font-weight: bold;
  color: #000;
}

.tab.active:after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background-color: #ff6b6b;
  border-radius: 3px;
}

.hot-tag {
  display: inline-block;
  background-color: #ff6b6b;
  color: white;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  margin-right: 4px;
}

.search-icon, .message-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16px;
}

/* 下拉刷新区域 */
.pull-refresh-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
}

.pull-refresh-indicator {
  position: absolute;
  top: -50px;
  left: 0;
  width: 100%;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f8f8f8;
  z-index: 5;
  transition: transform 0.3s ease;
}

.pull-refresh-indicator.visible {
  transform: translateY(50px);
}

.loading-icon {
  margin-right: 8px;
  font-size: 20px;
}

.rotate {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 内容区域 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
  -webkit-overflow-scrolling: touch; /* 提升iOS滚动体验 */
  overscroll-behavior: contain; /* 防止滚动传递 */
}

/* 瀑布流布局 */
.waterfall-container {
  display: flex;
  width: 100%;
  gap: 10px;
  padding-top: 12px;
  padding-bottom: 12px;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 加载更多状态 */
.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px 0;
  color: #999;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border: 2px solid #eee;
  border-top: 2px solid #ff6b6b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 没有更多内容 */
.no-more {
  text-align: center;
  padding: 15px 0;
  color: #999;
  font-size: 14px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  color: #ddd;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 16px;
  font-size: 14px;
}

.refresh-btn {
  padding: 8px 20px;
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 底部导航栏 */
.bottom-nav {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  background-color: #fff;
  border-top: 1px solid #f1f1f1;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0;
}

.nav-item.active {
  color: #ff6b6b;
}

.icon-wrapper {
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-item span {
  font-size: 12px;
}

/* Element Plus 图标样式 */
.el-icon {
  font-size: 20px;
}

.nav-item.active .el-icon {
  color: #ff6b6b;
}

/* 移动端适配 */
@media screen and (max-width: 375px) {
  .tab {
    padding: 0 10px;
    font-size: 14px;
  }
  
  .hot-tag {
    font-size: 9px;
  }
  
  .waterfall-container {
    gap: 8px;
  }
  
  .waterfall-column {
    gap: 8px;
  }
}

@media screen and (max-width: 320px) {
  .tab {
    padding: 0 8px;
    font-size: 13px;
  }
  
  .waterfall-container {
    gap: 6px;
  }
  
  .waterfall-column {
    gap: 6px;
  }
}
</style> 