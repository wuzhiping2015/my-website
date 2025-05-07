<template>
  <div class="digital-twin-monitor">
    <div class="model-viewer-container">
      <!-- 3D模型查看器 -->
      <div id="model-viewer" ref="modelViewerRef"></div>
      
      <!-- 加载提示 -->
      <div class="loading-indicator" v-if="loading">
        <div class="spinner"></div>
        <span>加载中... {{ loadingProgress }}%</span>
      </div>
      
      <!-- 错误提示 -->
      <div class="error-message" v-if="loadError">
        <div>{{ loadError }}</div>
        <button @click="loadModel" class="retry-button">重试加载</button>
      </div>
    </div>
    
    <!-- 右侧控制面板 -->
    <div class="control-panel">
      <div class="panel-section">
        <h3>模型选择</h3>
        <div class="model-buttons">
          <el-button 
            v-for="model in availableModels" 
            :key="model.path"
            @click="loadSelectedModel(model.path)"
            :type="currentModel === model.path ? 'primary' : ''"
            size="small"
          >
            {{ model.name }}
          </el-button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>视图控制</h3>
        <div class="button-group">
          <el-button @click="resetCamera" size="small">重置视图</el-button>
          <el-button @click="toggleGrid" size="small">
            {{ showGrid ? '隐藏网格' : '显示网格' }}
          </el-button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>模型透视</h3>
        <div class="button-group">
          <el-button @click="toggleExplodeView" size="small">
            {{ isExploded ? '合并模型' : '拆解模型' }}
          </el-button>
          <el-slider 
            v-if="isExploded" 
            v-model="explodeAmount" 
            :min="0" 
            :max="2" 
            :step="0.1"
            @input="updateExplodeView"
          ></el-slider>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>部件信息</h3>
        <div class="part-info" v-if="selectedPart">
          <div class="part-detail">
            <span class="label">名称:</span>
            <span class="value">{{ selectedPart.name }}</span>
          </div>
          <div class="part-detail">
            <span class="label">状态:</span>
            <span class="value" :class="'status-' + selectedPart.status">{{ selectedPart.statusText }}</span>
          </div>
          <div class="part-detail">
            <span class="label">温度:</span>
            <span class="value">{{ selectedPart.temperature }}°C</span>
          </div>
          <div class="part-detail">
            <span class="label">振动:</span>
            <span class="value">{{ selectedPart.vibration }} Hz</span>
          </div>
        </div>
        <div class="no-part-selected" v-else>
          点击模型部件查看详情
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

// 状态变量
const loading = ref(false);
const loadingProgress = ref(0);
const loadError = ref(null);
const modelViewerRef = ref(null);
const currentModel = ref('K60发电机.gltf');
const showGrid = ref(true);
const isExploded = ref(false);
const explodeAmount = ref(0);
const selectedPart = ref(null);

// Three.js 对象
let scene, camera, renderer, controls, mixer;
let model = null;
let composer, outlinePass;
let clock = new THREE.Clock();
let grid, raycaster, mouse;
let animationFrameId = null;
let originalPositions = new Map();
let partsList = [];

// 可用模型列表
const availableModels = [
  { name: 'K60发电机', path: 'K60发电机.gltf' },
  { name: '热交换器', path: 'heatExchanger.fbx' },
  { name: '阀门', path: '阀门.gltf' }
];

// 初始化Three.js场景
const initThree = () => {
  if (!modelViewerRef.value) return;
  
  const container = modelViewerRef.value;
  
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121212);
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    45, 
    container.clientWidth / container.clientHeight, 
    0.1, 
    1000
  );
  camera.position.set(5, 5, 10);
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  
  container.appendChild(renderer.domElement);
  
  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
  
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-5, 5, -7.5);
  scene.add(fillLight);
  
  // 添加网格
  grid = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
  grid.visible = showGrid.value;
  scene.add(grid);
  
  // 设置后期处理
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  // 添加轮廓效果
  outlinePass = new OutlinePass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 3;
  outlinePass.edgeGlow = 0;
  outlinePass.edgeThickness = 1;
  outlinePass.pulsePeriod = 0;
  outlinePass.visibleEdgeColor.set('#ffffff');
  outlinePass.hiddenEdgeColor.set('#190a05');
  composer.addPass(outlinePass);
  
  // 添加抗锯齿
  const smaaPass = new SMAAPass(
    container.clientWidth * renderer.getPixelRatio(),
    container.clientHeight * renderer.getPixelRatio()
  );
  composer.addPass(smaaPass);
  
  // 设置鼠标交互
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('click', onMouseClick);
  
  // 开始渲染循环
  animate();
};

// 加载模型
const loadModel = async () => {
  try {
    loading.value = true;
    loadError.value = null;
    loadingProgress.value = 0;
    
    // 清理现有模型
    if (model) {
      scene.remove(model);
      model = null;
    }
    
    // 初始化Draco解码器
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    
    // 初始化GLTF加载器
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    // 加载模型
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        currentModel.value,
        resolve,
        (xhr) => {
          loadingProgress.value = Math.round((xhr.loaded / xhr.total) * 100);
        },
        reject
      );
    });
    
    model = gltf.scene;
    
    // 优化模型
    optimizeModel(model);
    
    // 准备部件列表
    prepareParts(model);
    
    // 设置阴影
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // 应用标准材质
        if (!(node.material instanceof THREE.MeshStandardMaterial)) {
          const stdMaterial = new THREE.MeshStandardMaterial({
            color: node.material.color || 0x7c7c7c,
            metalness: 0.8,
            roughness: 0.4
          });
          node.material = stdMaterial;
        }
      }
    });
    
    // 添加到场景
    scene.add(model);
    
    // 保存原始位置
    saveOriginalPositions(model);
    
    // 重置相机视角
    resetCamera();
    
    // 加载完成
    loading.value = false;
  } catch (error) {
    console.error('加载模型失败:', error);
    loadError.value = '加载模型失败: ' + error.message;
    loading.value = false;
  }
};

// 优化模型
const optimizeModel = (modelObject) => {
  if (!modelObject) return;
  
  // 实现LOD优化
  // ... 这里将实现LOD优化
  
  // 合并静态网格以减少draw calls
  // ... 这里将实现静态网格合并
};

// 准备部件列表
const prepareParts = (modelObject) => {
  partsList = [];
  
  if (!modelObject) return;
  
  modelObject.traverse((node) => {
    if (node.isMesh) {
      // 生成随机状态数据（实际应用中会从后端获取）
      const temperature = Math.floor(Math.random() * 40) + 40;
      const vibration = (Math.random() * 4 + 1).toFixed(2);
      let status = 'normal';
      let statusText = '正常';
      
      if (temperature > 75) {
        status = 'warning';
        statusText = '警告';
      } else if (temperature > 85) {
        status = 'error';
        statusText = '异常';
      }
      
      partsList.push({
        id: node.uuid,
        name: node.name || `部件${partsList.length + 1}`,
        node: node,
        status: status,
        statusText: statusText,
        temperature: temperature,
        vibration: vibration
      });
    }
  });
};

// 选择部件
const selectPart = (part) => {
  if (!part) {
    selectedPart.value = null;
    outlinePass.selectedObjects = [];
    return;
  }
  
  selectedPart.value = part;
  outlinePass.selectedObjects = [part.node];
};

// 保存原始位置
const saveOriginalPositions = (modelObject) => {
  originalPositions.clear();
  
  modelObject.traverse((node) => {
    if (node.isMesh) {
      originalPositions.set(node.uuid, node.position.clone());
    }
  });
};

// 更新模型拆解视图
const updateExplodeView = () => {
  if (!model) return;
  
  model.traverse((node) => {
    if (node.isMesh) {
      const originalPos = originalPositions.get(node.uuid);
      
      if (originalPos) {
        if (isExploded.value) {
          // 计算法线方向
          const normal = new THREE.Vector3(
            node.position.x - model.position.x,
            node.position.y - model.position.y,
            node.position.z - model.position.z
          ).normalize();
          
          // 沿法线方向移动
          node.position.copy(originalPos.clone().add(
            normal.multiplyScalar(explodeAmount.value)
          ));
        } else {
          // 恢复原始位置
          node.position.copy(originalPos);
        }
      }
    }
  });
};

// 切换拆解视图
const toggleExplodeView = () => {
  isExploded.value = !isExploded.value;
  
  if (!isExploded.value) {
    explodeAmount.value = 0;
  } else {
    explodeAmount.value = 1;
  }
  
  updateExplodeView();
};

// 加载选定的模型
const loadSelectedModel = (modelPath) => {
  currentModel.value = modelPath;
  loadModel();
};

// 切换网格显示
const toggleGrid = () => {
  showGrid.value = !showGrid.value;
  
  if (grid) {
    grid.visible = showGrid.value;
  }
};

// 重置相机视角
const resetCamera = () => {
  if (!camera || !controls || !model) return;
  
  // 计算模型的包围盒
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  
  box.getSize(size);
  box.getCenter(center);
  
  // 计算相机位置
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = (maxDim / 2) / Math.tan(fov / 2) * 1.5;
  
  // 设置相机位置
  camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  
  // 设置控制器目标
  controls.target.copy(center);
  controls.update();
};

// 鼠标移动事件
const onMouseMove = (event) => {
  // 将鼠标位置归一化为-1到1之间
  const rect = renderer.domElement.getBoundingClientRect();
  
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
};

// 鼠标点击事件
const onMouseClick = () => {
  if (!raycaster || !scene || !camera) return;
  
  // 更新光线投射
  raycaster.setFromCamera(mouse, camera);
  
  // 获取与光线相交的对象
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    // 查找相交对象
    for (const intersect of intersects) {
      // 找到相交的部件
      const part = partsList.find(p => p.node === intersect.object);
      
      if (part) {
        selectPart(part);
        return;
      }
    }
  } else {
    // 没有点击到部件，清除选择
    selectPart(null);
  }
};

// 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  
  if (controls) {
    controls.update();
  }
  
  if (composer) {
    composer.render();
  } else if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

// 窗口大小调整
const onResize = () => {
  if (!camera || !renderer || !composer || !modelViewerRef.value) return;
  
  const container = modelViewerRef.value;
  
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  
  renderer.setSize(container.clientWidth, container.clientHeight);
  composer.setSize(container.clientWidth, container.clientHeight);
};

// 组件挂载
onMounted(() => {
  nextTick(() => {
    initThree();
    loadModel();
    window.addEventListener('resize', onResize);
  });
});

// 组件销毁
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  // 清理场景
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
  
  // 清理渲染器
  if (renderer) {
    renderer.dispose();
    
    const container = modelViewerRef.value;
    if (container && container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  }
  
  // 清理控制器
  if (controls) {
    controls.dispose();
  }
});
</script>

<style scoped>
.digital-twin-monitor {
  display: flex;
  height: 100%;
  background-color: #0c0c0c;
  color: #e2e8f0;
}

.model-viewer-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

#model-viewer {
  width: 100%;
  height: 100%;
}

.control-panel {
  width: 280px;
  background-color: #1e293b;
  padding: 15px;
  overflow-y: auto;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #2d3748;
  padding-bottom: 5px;
}

.model-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.part-info {
  background-color: #2d3748;
  border-radius: 4px;
  padding: 10px;
}

.part-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.label {
  color: #a0aec0;
}

.value {
  font-weight: 500;
}

.status-normal {
  color: #48bb78; /* 绿色 */
}

.status-warning {
  color: #ecc94b; /* 黄色 */
}

.status-error {
  color: #f56565; /* 红色 */
}

.no-part-selected {
  color: #a0aec0;
  text-align: center;
  padding: 10px;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 8px;
  z-index: 100;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  background-color: rgba(220, 38, 38, 0.8);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  z-index: 100;
}

.retry-button {
  margin-top: 10px;
  padding: 5px 10px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style> 