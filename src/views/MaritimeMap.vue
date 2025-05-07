<template>
  <div class="maritime-map">
    <div ref="mapContainer" class="map-container"></div>
    <div ref="modelContainer" class="model-container"></div>
    <div v-if="errorMessage" class="error-message">
      <div class="error-content">
        <h3>错误</h3>
        <p>{{ errorMessage }}</p>
        <button @click="reloadMap">重新加载</button>
        <div class="key-setting">
          <p>您可以设置自己的MapTiler API密钥:</p>
          <input type="text" v-model="userApiKey" placeholder="输入MapTiler API密钥"/>
          <button @click="setApiKey">保存并使用</button>
          <a href="https://cloud.maptiler.com/account/keys/" target="_blank">获取免费API密钥</a>
        </div>
      </div>
    </div>
    <div v-if="isOfflineMode" class="offline-notice">
      <div class="offline-content">
        <div class="offline-icon">📡</div>
        <div class="offline-text">离线模式</div>
        <p>MapTiler API不可用，当前使用离线地图显示</p>
        <button @click="exitOfflineMode" class="offline-button">尝试重新连接</button>
        <div class="key-setting">
          <p>您可以设置自己的MapTiler API密钥:</p>
          <input type="text" v-model="userApiKey" placeholder="输入MapTiler API密钥"/>
          <button @click="setApiKey">保存并使用</button>
          <a href="https://cloud.maptiler.com/account/keys/" target="_blank">获取免费API密钥</a>
        </div>
      </div>
    </div>
    <div class="control-panel">
      <button @click="toggleMapType">切换地图类型</button>
      <button @click="toggleWeather">天气显示: {{ weatherVisible ? '开' : '关' }}</button>
      <button @click="toggleAIS">AIS显示: {{ aisVisible ? '开' : '关' }}</button>
      <div class="zoom-control">
        <label>缩放级别: {{ zoomLevel }}</label>
        <input type="range" min="1" max="20" v-model="zoomLevel" @input="updateZoom">
      </div>
      <div class="coordinates">
        <label>经度: {{ center[0].toFixed(4) }}</label>
        <label>纬度: {{ center[1].toFixed(4) }}</label>
      </div>
      <button @click="showSettings = !showSettings" class="settings-button">⚙️ 设置</button>
    </div>
    <div v-if="showSettings" class="settings-panel">
      <div class="settings-content">
        <h3>地图设置</h3>
        <div class="setting-item">
          <label>MapTiler API密钥:</label>
          <input type="text" v-model="userApiKey" placeholder="输入MapTiler API密钥"/>
          <button @click="setApiKey">保存</button>
          <button @click="clearApiKey">清除</button>
        </div>
        <div class="setting-item">
          <label>离线模式:</label>
          <button @click="toggleOfflineMode">{{ isOfflineMode ? '退出离线模式' : '进入离线模式' }}</button>
        </div>
        <div class="setting-item">
          <a href="https://cloud.maptiler.com/account/keys/" target="_blank">获取免费API密钥</a>
        </div>
        <button @click="showSettings = false" class="close-button">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
import { MapTilerMap } from '../components/MapViewer';
import { ModelViewer } from '../components/ModelViewer';
import { API_CONFIG } from '../config/api';
import oceanStyle from '../assets/styles/ocean-style.json';
import satelliteStyle from '../assets/styles/satellite-style.json';

export default {
  name: 'MaritimeMap',
  data() {
    return {
      map: null,
      modelViewer: null,
      zoomLevel: 8,
      center: [120.0, 30.0],
      weatherVisible: true,
      aisVisible: true,
      currentStyle: oceanStyle,
      animationFrameId: null,
      needReinitialize: false,
      isReinitializing: false,
      errorMessage: '',
      isOfflineMode: false,
      userApiKey: '',
      showSettings: false
    };
  },
  mounted() {
    // 先检查是否存在用户自定义API密钥
    this.userApiKey = localStorage.getItem('userMapTilerApiKey') || '';
    console.log('使用的API密钥:', this.userApiKey || API_CONFIG.MAPTILER.API_KEY);
    
    this.initMap();
  },
  beforeDestroy() {
    console.log('正在销毁航海地图组件...');
    
    // 释放模型查看器
    if (this.modelViewer) {
      this.modelViewer.dispose();
      this.modelViewer = null;
    }
    
    // 释放地图
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    console.log('航海地图组件已销毁');
  },
  methods: {
    async initMap() {
      try {
        // 重置错误状态
        this.errorMessage = '';
        
        // 检查Cookie设置
        if (!this.checkCookieSupport()) {
          console.warn('第三方Cookie可能被禁用，地图功能可能受限');
        }
        
        // 检查当前是否已经处于离线模式
        this.isOfflineMode = localStorage.getItem('useOfflineMode') === 'true';

        // 初始化地图，优先使用用户设置的API密钥
        this.map = new MapTilerMap(this.$refs.mapContainer, {
          apiKey: this.userApiKey || API_CONFIG.MAPTILER.API_KEY,
          center: this.center,
          zoom: this.zoomLevel,
          style: this.currentStyle
        });
        
        // 添加离线模式事件监听
        if (this.$refs.mapContainer) {
          this.$refs.mapContainer.addEventListener('offline-mode', (e) => {
            this.isOfflineMode = true;
            console.info('已切换到离线模式', e.detail);
          });
        }
        
        await this.map.init();

        // 初始化模型查看器
        this.modelViewer = new ModelViewer(this.$refs.modelContainer);
        
        try {
          console.log('开始加载模型', API_CONFIG.SHIP_MODEL.PATH);
          await this.modelViewer.loadModel(API_CONFIG.SHIP_MODEL.PATH);
          console.log('模型加载成功');
        } catch (modelError) {
          console.error('模型加载失败，但地图功能可继续使用:', modelError);
          // 模型加载失败不影响地图功能
        }

        // 添加事件监听
        this.map.on('moveend', this.updateCenter);
        this.map.on('zoomend', this.updateZoomLevel);

        // 不再需要显式启动动画循环，ModelViewer内部已经处理

      } catch (error) {
        console.error('初始化失败:', error);
        this.handleInitError(error);
      }
    },
    toggleMapType() {
      this.currentStyle = this.currentStyle === oceanStyle ? satelliteStyle : oceanStyle;
      this.map.setStyle(this.currentStyle);
    },
    toggleWeather() {
      this.weatherVisible = !this.weatherVisible;
      this.map.setWeatherVisibility(this.weatherVisible);
    },
    toggleAIS() {
      this.aisVisible = !this.aisVisible;
      this.map.setAISVisibility(this.aisVisible);
    },
    updateZoom() {
      this.map.setZoom(this.zoomLevel);
    },
    updateZoomLevel() {
      this.zoomLevel = this.map.getZoom();
    },
    updateCenter() {
      const center = this.map.getCenter();
      this.center = [center.lng, center.lat];
    },
    handleResize() {
      if (this.map) {
        this.map.resize();
      }
      if (this.modelViewer) {
        this.modelViewer.resize();
      }
    },
    animate() {
      // 现在这个方法基本上是空的，因为ModelViewer内部已经处理了渲染循环
      // 保留此方法以便于向后兼容
    },
    async reinitialize() {
      // 防止多次重新初始化
      if (this.isReinitializing) return;
      
      this.isReinitializing = true;
      console.log('开始重新初始化模型查看器...');
      
      try {
        // 销毁当前模型查看器
        if (this.modelViewer) {
          this.modelViewer.dispose();
          this.modelViewer = null;
        }
        
        // 等待一段时间确保资源释放
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 重新创建模型查看器
        this.modelViewer = new ModelViewer(this.$refs.modelContainer);
        
        // 尝试重新加载模型
        try {
          console.log('重新加载模型', API_CONFIG.SHIP_MODEL.PATH);
          await this.modelViewer.loadModel(API_CONFIG.SHIP_MODEL.PATH);
          console.log('模型重新加载成功');
          this.needReinitialize = false;
        } catch (modelError) {
          console.error('模型重新加载失败:', modelError);
        }
      } catch (error) {
        console.error('重新初始化失败:', error);
      } finally {
        this.isReinitializing = false;
      }
    },
    checkCookieSupport() {
      try {
        document.cookie = 'test=1; SameSite=None; Secure';
        const supported = document.cookie.includes('test');
        document.cookie = 'test=1; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        return supported;
      } catch (e) {
        return false;
      }
    },
    handleInitError(error) {
      let errorMessage = '';
      
      if (error.message.includes('403')) {
        errorMessage = 'API密钥无效或已过期（403 Forbidden），请检查配置。您可以在 https://cloud.maptiler.com/account/keys/ 获取有效密钥。';
        console.error('MapTiler API密钥错误:', error);
      } else if (error.message.includes('Invalid key')) {
        errorMessage = 'API密钥格式错误或被拒绝，请替换有效密钥。当前密钥: ' + (this.userApiKey || API_CONFIG.MAPTILER.API_KEY);
        console.error('API密钥格式错误:', error);
      } else if (error.message.includes('Network') || error.message.includes('connect')) {
        errorMessage = '网络连接失败，请检查网络设置和防火墙配置';
        console.error('网络连接错误:', error);
      } else if (error.message.includes('timeout')) {
        errorMessage = '连接超时，请检查网络速度或服务器响应';
        console.error('连接超时错误:', error);
      } else {
        errorMessage = '初始化失败: ' + error.message;
        console.error('未知错误:', error);
      }
      
      // 在页面中显示错误信息
      this.errorMessage = errorMessage;
    },
    reloadMap() {
      this.initMap();
    },
    exitOfflineMode() {
      try {
        // 清除离线模式标记
        localStorage.removeItem('useOfflineMode');
        this.isOfflineMode = false;
        
        // 如果地图已经初始化，退出离线模式
        if (this.map && this.map.exitOfflineMode) {
          this.map.exitOfflineMode();
        } else {
          // 重新初始化地图
          this.initMap();
        }
      } catch (error) {
        console.error('退出离线模式失败:', error);
        this.errorMessage = '退出离线模式失败: ' + error.message;
      }
    },
    toggleOfflineMode() {
      this.isOfflineMode = !this.isOfflineMode;
      if (this.isOfflineMode) {
        localStorage.setItem('useOfflineMode', 'true');
      } else {
        localStorage.removeItem('useOfflineMode');
      }
      this.initMap();
    },
    setApiKey() {
      if (!this.userApiKey || this.userApiKey.trim() === '') {
        alert('请输入有效的MapTiler API密钥');
        return;
      }

      this.userApiKey = this.userApiKey.trim();
      localStorage.setItem('userMapTilerApiKey', this.userApiKey);
      console.log('新的API密钥已保存:', this.userApiKey);
      
      // 关闭设置面板
      this.showSettings = false;
      
      // 重新加载地图
      this.reloadMap();
    },
    clearApiKey() {
      this.userApiKey = '';
      localStorage.removeItem('userMapTilerApiKey');
      console.log('API密钥已清除，将使用默认密钥');
      
      // 重新加载地图
      this.reloadMap();
    }
  }
};
</script>

<style scoped>
.maritime-map {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.model-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 5px;
  z-index: 1000;
}

.control-panel button {
  display: block;
  margin: 5px 0;
  padding: 5px 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.control-panel button:hover {
  background: #45a049;
}

.zoom-control {
  margin: 10px 0;
}

.coordinates {
  margin-top: 10px;
  font-size: 12px;
}

.error-message {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.error-content {
  background: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}

.error-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.error-content p {
  margin-bottom: 20px;
}

.error-content button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.error-content button:hover {
  background: #45a049;
}

.offline-notice {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.offline-content {
  background: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}

.offline-icon {
  font-size: 24px;
  margin-bottom: 10px;
}

.offline-text {
  font-size: 18px;
  margin-bottom: 20px;
}

.offline-button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.offline-button:hover {
  background: #45a049;
}

.key-setting {
  margin-top: 10px;
}

.settings-button {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 5px 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.settings-button:hover {
  background: #45a049;
}

.settings-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
}

.settings-content {
  background: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}

.settings-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.setting-item {
  margin-bottom: 10px;
}

.setting-item label {
  display: block;
  margin-bottom: 5px;
}

.setting-item input {
  padding: 5px;
  width: 100%;
  box-sizing: border-box;
}

.setting-item button {
  padding: 5px 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.setting-item button:hover {
  background: #45a049;
}

.close-button {
  padding: 5px 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.close-button:hover {
  background: #45a049;
}
</style> 