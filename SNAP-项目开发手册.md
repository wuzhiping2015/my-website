# SNAP 3D模型查看器项目开发手册

## 1. 开发环境搭建

### 1.1 必要软件
- Node.js v12+
- npm 或 yarn
- Git
- Visual Studio Code (推荐编辑器)

### 1.2 推荐VSCode插件
- Vue Language Features (Volar)
- ESLint
- Prettier
- TypeScript Vue Plugin
- Three.js snippets

### 1.3 环境配置
1. 克隆项目代码库
   ```bash
   git clone [项目仓库地址]
   cd SNAP-正式
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动开发环境
   ```bash
   # Vue开发服务器
   npm run dev
   
   # Electron开发环境
   npm run electron:serve
   ```

## 2. 项目结构说明

### 2.1 核心目录
- `src/`: Vue源代码目录
  - `components/`: Vue组件
  - `views/`: 页面视图
  - `store/`: Pinia状态管理
  - `services/`: API服务
  - `utils/`: 工具函数
  - `assets/`: 静态资源
- `public/`: 公共资源目录
- `dist/`: 构建输出目录
- `electron-main.js`: Electron主进程脚本
- `preload.js`: Electron预加载脚本
- `build/`: 构建资源目录
- `ele-build/`: Electron构建目录

### 2.2 关键文件
- `package.json`: 项目配置和依赖
- `dist/config.js`: 部署配置文件
- `dist/index.html`: 应用入口HTML
- `electron-main.js`: Electron应用入口

## 3. 开发指南

### 3.1 Vue组件开发
- 使用Vue 3组合式API(`setup`)
- 按功能模块组织组件
- 推荐使用TypeScript开发
- 使用Element Plus组件库构建UI

示例组件:
```vue
<template>
  <div class="model-viewer">
    <canvas ref="threeCanvas"></canvas>
    <div class="controls">
      <!-- 控制UI -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// 组件逻辑
const threeCanvas = ref(null)
let scene, camera, renderer

// 初始化Three.js
const initThree = () => {
  // 初始化代码
}

// 生命周期钩子
onMounted(() => {
  initThree()
})

onUnmounted(() => {
  // 资源清理
})
</script>
```

### 3.2 Three.js开发指南
- 遵循Three.js最佳实践
- 模型加载使用异步处理
- 注意资源释放和内存管理
- 使用DRACOLoader压缩大型模型

```javascript
// 示例：模型加载器
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const loadModel = async (url) => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  
  const loader = new GLTFLoader()
  loader.setDRACOLoader(dracoLoader)
  
  try {
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  } catch (error) {
    console.error('模型加载失败:', error)
    throw error
  }
}
```

### 3.3 数据通信
- HTTP请求使用Axios
- 实时数据使用MQTT
- API请求集中管理

```javascript
// API服务示例
import axios from 'axios'

const API_URL = window.SANGO_AMS_URL || 'http://192.168.100.89:9990'

export const apiService = {
  // 获取模型列表
  async getModels() {
    try {
      const response = await axios.get(`${API_URL}/api/models`)
      return response.data
    } catch (error) {
      console.error('获取模型列表失败:', error)
      throw error
    }
  },
  
  // 其他API方法
}
```

### 3.4 MQTT通信
```javascript
// MQTT服务连接示例
import mqtt from 'mqtt'

const MQTT_URL = `ws://${window.SANGO_AMS_SOCKET_URL || '192.168.100.89:8083'}/mqtt`

export const setupMqttClient = () => {
  const client = mqtt.connect(MQTT_URL)
  
  client.on('connect', () => {
    console.log('MQTT已连接')
    client.subscribe('ship/505/sensors/#')
  })
  
  client.on('message', (topic, message) => {
    console.log(`收到消息: ${topic} - ${message.toString()}`)
    // 处理消息
  })
  
  return client
}
```

## 4. 状态管理

### 4.1 Pinia Store
```javascript
// 模型状态store示例
import { defineStore } from 'pinia'

export const useModelStore = defineStore('model', {
  state: () => ({
    currentModel: null,
    modelList: [],
    isLoading: false,
    selectedPart: null,
  }),
  
  actions: {
    async loadModel(modelId) {
      this.isLoading = true
      try {
        // 加载模型逻辑
        this.currentModel = { id: modelId, /* 其他属性 */ }
      } catch (error) {
        console.error('加载模型失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    selectPart(partId) {
      this.selectedPart = partId
    }
  }
})
```

## 5. Electron开发

### 5.1 主进程开发
- 修改`electron-main.js`时注意应用生命周期
- 注册全局快捷键使用`globalShortcut`
- 处理窗口事件和状态

### 5.2 渲染进程与主进程通信
```javascript
// 预加载脚本示例扩展
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 截图功能
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  
  // 打开文件对话框
  openFile: () => ipcRenderer.invoke('open-file'),
  
  // 接收事件
  onSystemEvent: (callback) => {
    ipcRenderer.on('system-event', (event, ...args) => callback(...args))
    return () => ipcRenderer.removeListener('system-event', callback)
  }
})
```

### 5.3 应用打包
```bash
# 构建Vue应用
npm run build

# 打包Electron应用
npm run electron:build
```

## 6. 性能优化

### 6.1 模型优化
- 使用LOD(Level of Detail)技术
- 合并小型网格减少绘制调用
- 优化模型纹理和贴图
- 使用实例化渲染相同对象

### 6.2 渲染优化
- 使用`shallowRef`优化响应式性能
- 实现按需渲染，而非持续渲染
- 适当使用WebGL缓冲区对象
- 合理设置视锥剔除

### 6.3 内存管理
- 及时释放不需要的几何体和材质
- 用完的纹理调用`dispose()`方法
- 场景切换时清理旧资源
- 大型模型使用延迟加载

```javascript
// 资源释放示例
const disposeModel = (model) => {
  if (!model) return
  
  model.traverse((object) => {
    // 释放几何体
    if (object.geometry) {
      object.geometry.dispose()
    }
    
    // 释放材质
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose())
      } else {
        object.material.dispose()
      }
    }
  })
}
```

## 7. 测试与调试

### 7.1 性能监控
- 使用stats.js监控FPS
- Chrome DevTools分析内存使用
- 使用性能记录分析瓶颈

### 7.2 常见问题与解决方案

| 问题 | 可能原因 | 解决方案 |
|------|--------|---------|
| 模型加载失败 | 格式不支持或文件损坏 | 检查模型格式；使用其他工具检查模型 |
| 性能低下 | 模型过于复杂 | 优化模型；使用LOD；减少绘制调用 |
| 内存泄漏 | 资源未释放 | 检查dispose()调用；监控内存使用 |
| 渲染错误 | 着色器问题 | 检查WebGL支持；更新驱动程序 |
| MQTT连接失败 | 网络问题或配置错误 | 检查网络连接；验证MQTT服务器地址 |

## 8. 协作开发

### 8.1 Git协作流程
- 使用Feature Branch工作流
- 提交前先拉取最新代码
- 编写有意义的提交信息
- 大型功能使用Pull Request

### 8.2 代码规范
- 遵循ESLint和Prettier配置
- Vue单文件组件按功能拆分
- 使用JSDoc注释函数和类
- 重要逻辑添加注释说明

### 8.3 版本管理
- 语义化版本号(SemVer)
- 每次发布添加详细的变更日志
- 重大更新提前通知团队

## 9. 部署与发布

### 9.1 构建流程
```bash
# 清理旧构建
rm -rf dist ele-build

# 构建Vue应用
npm run build

# 修改配置文件
# 根据环境修改dist/config.js

# 构建Electron应用
npm run electron:build
```

### 9.2 部署检查清单
- [ ] 确认config.js配置正确
- [ ] 测试所有核心功能
- [ ] 验证MQTT连接
- [ ] 检查资源加载性能
- [ ] 验证不同船型配置
- [ ] 测试异常情况处理
- [ ] 验证快捷键功能

## 10. 附录

### 10.1 相关资源
- [Vue 3文档](https://v3.vuejs.org/)
- [Three.js文档](https://threejs.org/docs/)
- [Electron文档](https://www.electronjs.org/docs)
- [MQTT.js文档](https://github.com/mqttjs/MQTT.js)

### 10.2 常用命令
```bash
# 开发环境
npm run dev          # 启动Vue开发服务器
npm run electron:serve   # 启动Electron开发环境

# 构建命令
npm run build           # 构建Vue应用
npm run electron:build  # 打包Electron应用

# 代码检查
npm run lint        # 运行代码检查
npm run format      # 格式化代码
```

### 10.3 技术支持联系
- 项目负责人：[联系人]
- 技术支持邮箱：[邮箱地址]
- 问题反馈系统：[系统地址] 