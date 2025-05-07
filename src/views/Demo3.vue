<template>
  <div class="model-viewer-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="left-tools">
        <div class="tech-button-group">
          <el-button class="tech-button" type="primary" icon="el-icon-upload">
            <span class="button-text">导入模型</span>
            <div class="button-glow"></div>
          </el-button>
          <el-button class="tech-button" type="primary" icon="el-icon-download">
            <span class="button-text">导出</span>
            <div class="button-glow"></div>
          </el-button>
        </div>
      </div>
      <div class="center-tools">
        <div class="view-controls">
          <div class="control-button" @click="resetView">
            <i class="el-icon-refresh"></i>
            <span class="control-tooltip">重置视角</span>
          </div>
          <div class="control-button" @click="toggleOrthographic">
            <i class="el-icon-view"></i>
            <span class="control-tooltip">正交视图</span>
          </div>
        </div>
      </div>
      <div class="right-tools">
        <div class="tech-button-group">
          <el-button class="tech-button" icon="el-icon-setting">
            <span class="button-text">设置</span>
            <div class="button-glow"></div>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧属性面板 -->
      <div class="property-panel">
        <div class="panel-header">
          <h3>模型控制台</h3>
          <div class="panel-indicator"></div>
        </div>
        <el-collapse v-model="activeNames" class="tech-collapse">
          <el-collapse-item title="模型信息" name="1">
            <div class="model-info">
              <div class="info-item">
                <span class="info-label">模型名称</span>
                <span class="info-value">{{ modelName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">顶点数</span>
                <span class="info-value">{{ vertexCount }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">面数</span>
                <span class="info-value">{{ faceCount }}</span>
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="材质设置" name="2">
            <div class="material-settings">
              <div class="setting-item">
                <span class="setting-label">材质颜色</span>
                <el-color-picker v-model="materialColor" class="tech-color-picker"></el-color-picker>
              </div>
              <div class="setting-item">
                <span class="setting-label">粗糙度</span>
                <el-slider v-model="roughness" :min="0" :max="1" :step="0.1" class="tech-slider"></el-slider>
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="环境设置" name="3">
            <div class="environment-settings">
              <div class="setting-item">
                <span class="setting-label">光照强度</span>
                <el-slider v-model="lightIntensity" :min="0" :max="2" :step="0.1" class="tech-slider"></el-slider>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 中间3D视图区 -->
      <div class="viewer-area" ref="viewerContainer">
        <div class="viewer-overlay">
          <div class="coordinate-system">
            <div class="axis x-axis">X</div>
            <div class="axis y-axis">Y</div>
            <div class="axis z-axis">Z</div>
          </div>
          <div class="viewer-stats">
            <div class="stat-item">
              <span class="stat-label">FPS</span>
              <span class="stat-value">{{ fps }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">状态</span>
              <span class="stat-value">{{ loadingStatus }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧工具面板 -->
      <div class="tool-panel">
        <div class="tool-button" @click="toggleMeasure">
          <i class="el-icon-position"></i>
          <span class="tool-tooltip">测量工具</span>
        </div>
        <div class="tool-button" @click="captureScreenshot">
          <i class="el-icon-camera"></i>
          <span class="tool-tooltip">截图</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModelViewer',
  data() {
    return {
      activeNames: ['1', '2', '3'],
      modelName: '未加载模型',
      vertexCount: 0,
      faceCount: 0,
      materialColor: '#00A8FF',
      roughness: 0.5,
      lightIntensity: 1.0,
      fps: 0,
      loadingStatus: '就绪'
    }
  },
  mounted() {
    this.initThreeJS()
  },
  methods: {
    initThreeJS() {
      // Three.js初始化代码将在这里实现
    },
    resetView() {
      // 重置视角
    },
    toggleOrthographic() {
      // 切换正交视图
    },
    toggleMeasure() {
      // 切换测量工具
    },
    captureScreenshot() {
      // 截图功能
    }
  }
}
</script>

<style scoped>
.model-viewer-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1A1F2C 0%, #0A0E17 100%);
  color: #fff;
}

.toolbar {
  height: 60px;
  background: rgba(26, 31, 44, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 168, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.tech-button {
  background: rgba(0, 168, 255, 0.1);
  border: 1px solid rgba(0, 168, 255, 0.3);
  color: #00A8FF;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}

.tech-button:hover {
  background: rgba(0, 168, 255, 0.2);
  box-shadow: 0 0 15px rgba(0, 168, 255, 0.4);
}

.button-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(0, 168, 255, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.tech-button:hover .button-glow {
  opacity: 1;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.property-panel {
  width: 280px;
  background: rgba(26, 31, 44, 0.8);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(0, 168, 255, 0.2);
  padding: 20px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  color: #00A8FF;
  margin: 0;
  font-size: 18px;
}

.panel-indicator {
  width: 8px;
  height: 8px;
  background: #00FF9D;
  border-radius: 50%;
  margin-left: 10px;
  animation: pulse 2s infinite;
}

.viewer-area {
  flex: 1;
  position: relative;
  background: linear-gradient(135deg, #0A0E17 0%, #1A1F2C 100%);
}

.viewer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.coordinate-system {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 20px;
}

.axis {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.x-axis {
  background: rgba(255, 0, 0, 0.2);
  color: #FF0000;
}

.y-axis {
  background: rgba(0, 255, 0, 0.2);
  color: #00FF00;
}

.z-axis {
  background: rgba(0, 0, 255, 0.2);
  color: #0000FF;
}

.viewer-stats {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #00A8FF;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #00FF9D;
}

.tool-panel {
  width: 60px;
  background: rgba(26, 31, 44, 0.8);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(0, 168, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  gap: 20px;
}

.tool-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 168, 255, 0.1);
  border: 1px solid rgba(0, 168, 255, 0.3);
  border-radius: 4px;
  color: #00A8FF;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.tool-button:hover {
  background: rgba(0, 168, 255, 0.2);
  box-shadow: 0 0 15px rgba(0, 168, 255, 0.4);
}

.tool-tooltip {
  position: absolute;
  right: 50px;
  background: rgba(26, 31, 44, 0.9);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
}

.tool-button:hover .tool-tooltip {
  opacity: 1;
}

.tech-collapse {
  background: transparent;
  border: none;
}

.tech-collapse >>> .el-collapse-item__header {
  background: rgba(0, 168, 255, 0.1);
  color: #00A8FF;
  border: 1px solid rgba(0, 168, 255, 0.3);
  border-radius: 4px;
  margin-bottom: 10px;
}

.tech-collapse >>> .el-collapse-item__content {
  background: transparent;
  color: #fff;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.info-label {
  color: #00A8FF;
}

.info-value {
  color: #00FF9D;
}

.setting-item {
  margin-bottom: 15px;
}

.setting-label {
  display: block;
  color: #00A8FF;
  margin-bottom: 5px;
}

.tech-color-picker >>> .el-color-picker__trigger {
  border: 1px solid rgba(0, 168, 255, 0.3);
  background: rgba(0, 168, 255, 0.1);
}

.tech-slider >>> .el-slider__runway {
  background: rgba(0, 168, 255, 0.1);
}

.tech-slider >>> .el-slider__bar {
  background: #00A8FF;
}

.tech-slider >>> .el-slider__button {
  border: 2px solid #00A8FF;
  background: #1A1F2C;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 157, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 255, 157, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 157, 0);
  }
}
</style> 