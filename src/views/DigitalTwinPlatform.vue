<template>
  <div class="digital-twin-platform" :class="{ 'dark-mode': isDarkMode }">
    <el-container class="main-container">
      <!-- 顶部导航栏 -->
      <el-header class="platform-header">
        <div class="logo-container">
          <h1 class="platform-title">船舶/工业设备数字孪生监控平台</h1>
          <StatusIndicator :status="systemStatus" />
        </div>
        <div class="header-controls">
          <el-button-group>
            <el-button type="primary" size="small" @click="toggleRealTime">
              <i class="el-icon-refresh"></i>
              {{ isRealTime ? '停止实时' : '开启实时' }}
            </el-button>
            <el-button type="success" size="small" @click="refreshData">
              <i class="el-icon-refresh"></i>
              刷新数据
            </el-button>
          </el-button-group>
          
          <NotificationCenter />
          
          <el-dropdown>
            <span class="user-profile">
              <i class="el-icon-user"></i>
              工程师
              <i class="el-icon-arrow-down"></i>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="toggleTheme">
                  <i class="el-icon-moon"></i>
                  {{ isDarkMode ? '切换浅色主题' : '切换深色主题' }}
                </el-dropdown-item>
                <el-dropdown-item>个人信息</el-dropdown-item>
                <el-dropdown-item>设置</el-dropdown-item>
                <el-dropdown-item>退出</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-container class="content-container">
        <!-- 左侧菜单 -->
        <el-aside width="220px" class="platform-sidebar">
          <el-menu
            :default-active="currentTab"
            class="menu"
            background-color="var(--background-secondary)"
            text-color="var(--text-primary)"
            active-text-color="var(--primary)"
          >
            <el-menu-item-group title="核心功能">
              <el-menu-item index="overview" @click="changeTab('overview')">
                <i class="el-icon-monitor"></i>
                <span>概览</span>
              </el-menu-item>
              <el-menu-item index="monitor" @click="changeTab('monitor')">
                <i class="el-icon-view"></i>
                <span>3D监控</span>
              </el-menu-item>
            </el-menu-item-group>
            
            <el-menu-item-group title="数据分析">
              <el-menu-item index="data" @click="changeTab('data')">
                <i class="el-icon-data-line"></i>
                <span>数据分析</span>
              </el-menu-item>
              <el-menu-item index="alarm" @click="changeTab('alarm')">
                <i class="el-icon-warning"></i>
                <span>告警管理</span>
              </el-menu-item>
            </el-menu-item-group>
            
            <el-menu-item-group title="运维管理">
              <el-menu-item index="maintenance" @click="changeTab('maintenance')">
                <i class="el-icon-set-up"></i>
                <span>预测性维护</span>
              </el-menu-item>
              <el-menu-item index="reports" @click="changeTab('reports')">
                <i class="el-icon-document"></i>
                <span>报表中心</span>
              </el-menu-item>
            </el-menu-item-group>
          </el-menu>
        </el-aside>
        
        <!-- 主内容区重构 -->
        <el-main class="platform-main">
          <LoadingSpinner :loading="isLoading" />
          <div class="main-content-rebuild">
            <!-- 上半区：数据看板/告警摘要 -->
            <div class="dashboard-area">
              <div class="dashboard-card">
                <div class="dashboard-title">实时数据看板</div>
                <div class="dashboard-metrics">
                  <div class="metric-item">
                    <span class="metric-label">设备总数</span>
                    <span class="metric-value">128</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">在线设备</span>
                    <span class="metric-value metric-online">120</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">告警数</span>
                    <span class="metric-value metric-alarm">3</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">待维护</span>
                    <span class="metric-value metric-maintain">5</span>
                  </div>
                </div>
              </div>
              <div class="dashboard-card">
                <div class="dashboard-title">告警摘要</div>
                <ul class="alarm-list">
                  <li class="alarm-item">
                    <span class="alarm-level alarm-critical"></span> K60发动机温度过高
                  </li>
                  <li class="alarm-item">
                    <span class="alarm-level alarm-warning"></span> 热交换器流量异常
                  </li>
                  <li class="alarm-item">
                    <span class="alarm-level alarm-info"></span> 阀门状态变化
                  </li>
                </ul>
              </div>
            </div>
            <!-- 下半区：3D视图区及右侧悬浮卡片功能区 -->
            <div class="viewer-area-rebuild">
              <div class="viewer-3d">
                <component :is="activeComponent"></component>
              </div>
              <!-- <div class="floating-panel">
                <div class="floating-section">
                  <div class="floating-title">模型选择</div>
                  <el-button-group>
                    <el-button size="mini" type="primary">K60发动机</el-button>
                    <el-button size="mini">热交换器</el-button>
                    <el-button size="mini">阀门</el-button>
                  </el-button-group>
                </div>
                <div class="floating-section">
                  <div class="floating-title">视图控制</div>
                  <el-button size="mini">重置视图</el-button>
                  <el-button size="mini">隐藏网格</el-button>
                </div>
                <div class="floating-section">
                  <div class="floating-title">模型透视</div>
                  <el-button size="mini">拆解模型</el-button>
                </div>
                <div class="floating-section">
                  <div class="floating-title">部件信息</div>
                  <div class="floating-info">点击模型部件查看详情</div>
                </div>
              </div> -->
            </div>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted } from 'vue'
import { usePlatformStore } from '@/stores/platform'
import DigitalTwinMonitor from '../components/digital-twin/DigitalTwinMonitor.vue'
import DigitalTwinOverview from '../components/digital-twin/DigitalTwinOverview.vue'
import DigitalTwinData from '../components/digital-twin/DigitalTwinData.vue'
import DigitalTwinAlarm from '../components/digital-twin/DigitalTwinAlarm.vue'
import DigitalTwinMaintenance from '../components/digital-twin/DigitalTwinMaintenance.vue'
import DigitalTwinReports from '../components/digital-twin/DigitalTwinReports.vue'
import StatusIndicator from '../components/common/StatusIndicator.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import NotificationCenter from '../components/common/NotificationCenter.vue'

const platformStore = usePlatformStore()

// 状态
const activeComponent = shallowRef(DigitalTwinMonitor)
const currentTab = ref('monitor')
const isLoading = ref(false)

// 计算属性
const isDarkMode = computed(() => platformStore.isDarkMode)
const isRealTime = computed(() => platformStore.isRealTime)
const systemStatus = computed(() => platformStore.systemStatus)

// 方法
const changeTab = (tab) => {
  currentTab.value = tab
  isLoading.value = true
  
  // 根据选中的标签页，显示对应的组件
  switch(tab) {
    case 'overview':
      activeComponent.value = DigitalTwinOverview
      break
    case 'monitor':
      activeComponent.value = DigitalTwinMonitor
      break
    case 'data':
      activeComponent.value = DigitalTwinData
      break
    case 'alarm':
      activeComponent.value = DigitalTwinAlarm
      break
    case 'maintenance':
      activeComponent.value = DigitalTwinMaintenance
      break
    case 'reports':
      activeComponent.value = DigitalTwinReports
      break
    default:
      activeComponent.value = DigitalTwinMonitor
  }
  
  setTimeout(() => {
    isLoading.value = false
  }, 300)
}

const toggleRealTime = () => {
  platformStore.toggleRealTime()
}

const toggleTheme = () => {
  platformStore.toggleTheme()
}

const refreshData = () => {
  isLoading.value = true
  // TODO: 实现数据刷新逻辑
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
}

// 组件挂载时的初始化
onMounted(() => {
  // 默认显示监控页面
  changeTab('monitor')
})
</script>

<style>
.digital-twin-platform {
  height: 100%;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  transition: var(--transition);
}

.dark-mode {
  background-color: var(--background);
  color: var(--text-primary);
}

.main-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.platform-header {
  background: rgba(10, 18, 36, 0.92);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.12);
  transition: var(--transition);
  border-bottom: 1px solid #1a4fff44;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.platform-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #4fc3ff;
  text-shadow: 0 0 8px #1a4fff88;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-profile {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #fff;
}

.content-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

.platform-sidebar {
  flex-shrink: 0;
  z-index: 2;
  background: linear-gradient(180deg, #101a2c 0%, #162a4a 100%);
  box-shadow: 2px 0 8px 0 rgba(0,0,0,0.10);
  border-right: 1.5px solid #00eaff44;
  transition: var(--transition);
}

.menu {
  border-right: none;
}

.menu-item-group__title {
  color: #00eaff;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1px;
  padding: 0 20px;
  margin-top: 18px;
  text-shadow: 0 0 8px #00eaff88, 0 0 2px #fff;
}

.el-menu-item {
  color: #e6f7ff !important;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: color 0.2s, background 0.2s;
}

.el-menu-item:hover,
.el-menu-item.is-active {
  color: #fff !important;
  background: linear-gradient(90deg, #1a4fff 0%, #00eaff 100%) !important;
  font-weight: bold;
  text-shadow: 0 0 10px #00eaff99, 0 0 2px #fff;
}

.el-menu-item i {
  color: #4fc3ff !important;
  margin-right: 8px;
  font-size: 18px;
  vertical-align: middle;
  transition: color 0.2s;
}
.el-menu-item:hover i,
.el-menu-item.is-active i {
  color: #fff !important;
  text-shadow: 0 0 8px #00eaff88;
}

.platform-main {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #101a2c 0%, #1a223a 100%);
  padding: 0;
  height: 100%;
  overflow-y: auto;
  transition: var(--transition);
  position: relative;
}

.main-content-rebuild {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.dashboard-area {
  display: flex;
  flex-direction: row;
  gap: 24px;
  padding: 24px 24px 0 24px;
  min-height: 120px;
  flex-shrink: 0;
}

.dashboard-card {
  background: rgba(20, 40, 80, 0.92);
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 #1a4fff22;
  padding: 28px 36px 28px 36px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 260px;
  color: #fff;
  position: relative;
  overflow: hidden;
  justify-content: center;
}

.dashboard-card:first-child {
  margin-right: 24px;
}

.dashboard-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 18px;
  color: #00eaff;
  letter-spacing: 1px;
  text-shadow: 0 0 10px #00eaff99, 0 0 2px #fff;
}

.dashboard-metrics {
  display: flex;
  gap: 40px;
  justify-content: flex-start;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-size: 15px;
}

.metric-label {
  color: #b0cfff;
  margin-bottom: 4px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 8px #1a4fff44, 0 0 2px #fff;
}

.metric-online {
  color: #00ffb0;
  text-shadow: 0 0 10px #00ffb088, 0 0 2px #fff;
}

.metric-alarm {
  color: #ff4f4f;
  text-shadow: 0 0 10px #ff4f4f88, 0 0 2px #fff;
}

.metric-maintain {
  color: #ffd24f;
  text-shadow: 0 0 10px #ffd24f88, 0 0 2px #fff;
}

.alarm-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.alarm-item {
  display: flex;
  align-items: center;
  font-size: 15px;
  margin-bottom: 10px;
  color: #fff;
}

.alarm-level {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
}

.alarm-critical {
  background: #ff4f4f;
  box-shadow: 0 0 10px #ff4f4f88;
}

.alarm-warning {
  background: #ffd24f;
  box-shadow: 0 0 10px #ffd24f88;
}

.alarm-info {
  background: #4fc3ff;
  box-shadow: 0 0 10px #4fc3ff88;
}

.viewer-area-rebuild {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  position: relative;
  min-height: 0;
  margin-top: 12px;
  padding: 0 24px 24px 24px;
}

.viewer-3d {
  flex: 1 1 0;
  background: #181f2c;
  border-radius: 12px;
  margin-left: 0;
  margin-right: 0;
  box-shadow: 0 2px 12px 0 #1a4fff22;
  position: relative;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.floating-panel {
  width: 260px;
  background: rgba(20, 40, 80, 0.92);
  border-radius: 16px;
  box-shadow: 0 4px 24px 0 #1a4fff44;
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: floatIn 0.7s cubic-bezier(.68,-0.55,.27,1.55);
  border: 1.5px solid #4fc3ff44;
  backdrop-filter: blur(8px);
}

@keyframes floatIn {
  0% { opacity: 0; transform: translateY(40px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.floating-section {
  margin-bottom: 8px;
}

.floating-title {
  font-size: 15px;
  font-weight: 600;
  color: #4fc3ff;
  margin-bottom: 10px;
}

.floating-info {
  color: #b0cfff;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .dashboard-area { flex-direction: column; gap: 12px; }
  .dashboard-card:first-child { margin-right: 0; }
  .viewer-area-rebuild { flex-direction: column; }
  .floating-panel { position: static; margin: 16px 0 0 0; width: 100%; }
  .viewer-3d { margin-left: 0; }
}
</style> 