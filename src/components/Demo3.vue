<template>
  <div class="model-container">
    <div id="model-viewer"></div>
    <div class="loading-indicator" v-if="!modelLoaded">
      <div class="spinner"></div>
      <span>加载中... {{ loadingProgress }}%</span>
      <div v-if="loadingProgress === 100 && !modelLoaded" class="loading-hint">
        模型加载完成，正在处理中...
        <button @click="retryLoading" class="retry-button">重试加载</button>
      </div>
    </div>
    <div class="error-message" v-if="loadError">
      <div>{{ loadError }}</div>
      <button @click="retryLoading" class="retry-button">重试加载</button>
    </div>
    
    <!-- 新增：模型选择器 -->
    <div class="model-selector">
      <div class="model-category" v-for="(models, category) in modelCategories" :key="category">
        <h3>{{ category }}</h3>
        <div class="model-buttons">
          <button 
            v-for="model in models" 
            :key="model.path"
            @click="loadSpecificModel(model.path)"
            :class="{ active: currentModel === model.path }"
            :title="model.name"
          >
            {{ model.name }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 控制面板 -->
    <div class="controls-panel">
      <div class="control-group">
        <h3>视图控制</h3>
        <button @click="rotateCameraLeft">← 左旋转</button>
        <button @click="rotateCameraRight">右旋转 →</button>
        <button @click="zoomIn">放大 +</button>
        <button @click="zoomOut">缩小 -</button>
        <button @click="resetCamera">重置视图</button>
        <!-- 新增：截图按钮 -->
        <button @click="captureScreenshot" class="screenshot-btn">
          <span class="icon">📷</span> 截图
        </button>
      </div>
      
      <div class="control-group">
        <h3>显示选项</h3>
        <label>
          <input type="checkbox" v-model="showGrid" @change="toggleGrid">
          显示网格
        </label>
        <label>
          <input type="checkbox" v-model="showAxes" @change="toggleAxes">
          显示坐标轴
        </label>
        <label>
          <input type="checkbox" v-model="showBoundingBox" @change="toggleBoundingBox">
          显示包围盒
        </label>
      </div>
      
      <!-- 材质控制 -->
      <div class="control-group">
        <h3>材质控制</h3>
        <div class="slider-container">
          <label>金属度</label>
          <input 
            type="range" 
            v-model="metalness" 
            min="0" 
            max="1" 
            step="0.01"
            @input="updateMaterial"
          >
          <span>{{ metalness }}</span>
        </div>
        <div class="slider-container">
          <label>粗糙度</label>
          <input 
            type="range" 
            v-model="roughness" 
            min="0" 
            max="1" 
            step="0.01"
            @input="updateMaterial"
          >
          <span>{{ roughness }}</span>
        </div>
      </div>

      <!-- 新增：性能优化控制 -->
      <div class="control-group">
        <h3>性能优化</h3>
        <label>
          <input type="checkbox" v-model="useSimplifiedModel">
          简化模型
        </label>
        <div class="slider-container" v-if="useSimplifiedModel">
          <label>简化率</label>
          <input 
            type="range" 
            v-model="simplificationRatio" 
            min="0.1" 
            max="0.9" 
            step="0.1"
          >
          <span>{{ simplificationRatio }}</span>
        </div>
        <button @click="reloadModel">重新加载模型</button>
      </div>

      <!-- 增加拆解模型按钮 -->
      <div class="control-group">
        <h3>模型操作</h3>
        <button v-if="!isMeshDecompose" @click="decomposeMesh">拆解模型</button>
        <button v-if="isMeshDecompose" @click="mergeMesh">合并模型</button>
      </div>
    </div>

    <!-- 部件列表面板 -->
    <div class="parts-panel" v-if="modelLoaded && partsList.length > 0">
      <h3>部件列表</h3>
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索部件..."
        >
      </div>
      <div class="parts-list">
        <div 
          v-for="part in filteredParts" 
          :key="part.id"
          :class="['part-item', {active: selectedPart && selectedPart.id === part.id}]"
          @mouseenter="onPartMouseEnter(part)"
          @mouseleave="onPartMouseLeave(part)"
          @click="selectPart(part)"
        >
          <span class="part-name">{{ part.name }}</span>
        </div>
        <div v-if="filteredParts.length === 0" class="no-parts">
          没有找到匹配的部件
        </div>
      </div>
    </div>
    
    <!-- 部件详情面板 -->
    <div class="part-details-panel" v-if="selectedPart">
      <div class="panel-header">
        <h3>部件详情</h3>
        <button class="close-btn" @click="clearSelectedPart">&times;</button>
      </div>
      <div class="details-content">
        <div class="detail-item">
          <span>名称:</span>
          <span>{{ selectedPart.name }}</span>
        </div>
        <div class="detail-item">
          <span>类型:</span>
          <span>{{ selectedPart.type }}</span>
        </div>
        <div class="detail-item">
          <span>材质:</span>
          <span>{{ selectedPart.materialType }}</span>
        </div>
        <div class="detail-item">
          <span>尺寸:</span>
          <span>{{ selectedPart.dimensions }}</span>
        </div>
        <div class="detail-item">
          <span>位置:</span>
          <span>{{ formatVector(selectedPart.position) }}</span>
        </div>
        <div class="detail-item">
          <span>体积:</span>
          <span>{{ selectedPart.volume || '未知' }} m³</span>
        </div>
        <div class="detail-item">
          <span>描述:</span>
          <span>{{ selectedPart.description }}</span>
        </div>
      </div>
    </div>
    
    <!-- 悬停提示 -->
    <div class="hover-info" v-if="hoveredPart && (!selectedPart || hoveredPart.id !== selectedPart.id)">
      {{ hoveredPart.name }}
    </div>
    
    <!-- 模型信息面板 -->
    <div class="model-info-panel" v-if="modelLoaded">
      <h3>模型信息</h3>
      <div class="info-item">
        <span>顶点数量:</span>
        <span>{{ modelInfo.vertices }}</span>
      </div>
      <div class="info-item">
        <span>面片数量:</span>
        <span>{{ modelInfo.faces }}</span>
      </div>
      <div class="info-item">
        <span>材质数量:</span>
        <span>{{ modelInfo.materials }}</span>
      </div>
      <div class="info-item">
        <span>尺寸(m):</span>
        <span>{{ modelInfo.dimensions }}</span>
      </div>
      
      <!-- 新增：性能信息 -->
      <div class="performance-info">
        <div class="info-item">
          <span>FPS:</span>
          <span>{{ perfMonitor.fps }}</span>
        </div>
        <div class="info-item" v-if="perfMonitor.memoryUsage">
          <span>内存:</span>
          <span>{{ perfMonitor.memoryUsage }} MB</span>
        </div>
      </div>
    </div>
    
    <!-- 新增：截图成功提示 -->
    <div class="screenshot-toast" v-if="showScreenshotToast">
      <div class="toast-content">
        <span class="icon">✓</span>
        <span>截图已保存！</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { markRaw, ref, reactive, onMounted, onBeforeUnmount, onUnmounted, computed, nextTick, watch } from "vue";
import Stats from "three/examples/jsm/libs/stats.module.js";

// 新增：导入Pinia Store
import { useModelStore } from '../stores/modelStore';
import { useMaterialStore } from '../stores/materialStore';
import { useSceneStore } from '../stores/sceneStore';
import { useScreenshotStore } from '../stores/screenshotStore';
import { useUIStore } from '../stores/uiStore';
import { initializeStores } from '../stores';

// 初始化所有Store
const { modelStore, materialStore, sceneStore, screenshotStore, uiStore } = initializeStores();

// 新增：几何体简化
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";
// 新增：加载进度管理
import { LoadingManager } from "three";

// 状态定义
const scene = ref(null);
const camera = ref(null);
const renderer = ref(null);
const controls = ref(null);
const model = ref(null);
const container = ref(null); // 添加container的ref定义
const stats = ref(null); // 添加stats的ref定义
let animationFrameId = null;
const clock = new THREE.Clock();
const initialCameraPosition = new THREE.Vector3(0, 0, 5);
const modelLoaded = ref(false);
const loadError = ref(null);
const loadingProgress = ref(0);
const loading = ref(false); // 添加loading的ref定义
const boundingBox = ref(null); // 添加boundingBox的ref定义
const boundingBoxHelper = ref(null); // 添加boundingBoxHelper的ref定义
const debugMode = ref(false); // 添加debugMode的ref定义
const clippingPlanes = ref([]); // 添加clippingPlanes的ref定义
const clippingPlaneHelper = ref(null); // 添加clippingPlaneHelper的ref定义
const showClippingPlaneHelper = ref(false); // 添加showClippingPlaneHelper的ref定义
const errorMessage = ref(null); // 添加errorMessage的ref定义
const modelInfo = reactive({
  vertices: 0,
  faces: 0,
  materials: 0,
  dimensions: '0 x 0 x 0'
});

// 新增：当前模型和模型分类
const currentModel = ref('阀门.fbx');
const modelCategories = reactive({
  '船舶模型': [
    // { name: 'STEP203模型', path: 'STEP203.fbx' },
    { name: '船模型 (GLTF)', path: '6.gltf' },
    { name: '船模型1 (FBX)', path: 'ship1.fbx' },
    { name: '备用模型 (GLTF)', path: 'untitled.gltf' }
  ],
  '其他模型': [
    { name: '1号模型 (FBX)', path: '1.fbx' },
    { name: '2号模型 (FBX)', path: '2.fbx' },
    { name: 'PrimaryIonDrive', path: 'PrimaryIonDrive.glb' },
    { name: 'UI模型', path: 'ui.fbx' },
    { name: '机器模型', path: 'machine.fbx' },
    { name: '阀门模型', path: '阀门.fbx' },
    { name: '阀门模型(GLTF格式)', path: '阀门.gltf' }  // 新增GLTF格式选项
  ]
});

// 将nonReactiveObjects从reactive改为普通对象
const nonReactiveObjects = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  model: null,
  originalMaterials: new Map(),
  mouse: { x: 0, y: 0 },
  raycaster: null,
  modelManager: null,
  intersectMeshes: null,
  lastModelUpdate: null
};

const showGrid = ref(true);
const showAxes = ref(true);
const showBoundingBox = ref(false);
const metalness = ref(0.8);  // 默认金属度
const roughness = ref(0.2);  // 默认粗糙度
const partsList = ref([]);
const hoveredPart = ref(null);
const selectedPart = ref(null);
const isMeshDecompose = ref(false); // 是否拆解模型
const searchQuery = ref(''); // 搜索查询
let highlightMaterial = null; // 高亮材质
let selectedMaterial = null; // 选中材质
const useSimplifiedModel = ref(true); // 修改为默认启用
const simplificationRatio = ref(0.7); // 更激进的简化比例，从0.5提高到0.7

// 新增：定义LOD层级
const LOD_LEVELS = {
  HIGH: 0,   // 原始模型
  MEDIUM: 0.5, // 中等简化
  LOW: 0.8   // 高度简化
};

// 新增：性能监控对象
const perfMonitor = reactive({
  fps: 0,
  lastFrameTime: 0,
  frameCount: 0,
  lastFpsUpdateTime: 0,
  memoryUsage: 0
});

// 过滤部件列表
const filteredParts = computed(() => {
  if (!searchQuery.value) return partsList.value;
  const query = searchQuery.value.toLowerCase();
  return partsList.value.filter(part => 
    part.name.toLowerCase().includes(query) || 
    part.type.toLowerCase().includes(query)
  );
});

// 初始化Three.js
const initThreeJS = () => {
  try {
    console.log("=== 开始初始化Three.js ===");
    // 创建场景 - 使用markRaw确保Three.js对象不会被Vue响应式系统代理
    const sceneObj = markRaw(new THREE.Scene());
    sceneObj.background = new THREE.Color(0x303030); // 改为稍微亮一点的灰色
    
    // 环境光照
    const ambientLight = markRaw(new THREE.AmbientLight(0xffffff, 0.6)); // 增加环境光强度
    sceneObj.add(ambientLight);

    // 主平行光（模拟太阳光）
    const mainLight = markRaw(new THREE.DirectionalLight(0xffffff, 1.2)); // 稍微增强光照
    mainLight.position.set(5, 10, 7.5);
    mainLight.castShadow = true;
    
    // 优化阴影质量 - 针对性能优化降低阴影贴图分辨率
    mainLight.shadow.mapSize.width = 512; // 从1024降低到512，进一步减少内存使用
    mainLight.shadow.mapSize.height = 512; // 从1024降低到512，进一步减少内存使用
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    // 优化阴影相机视锥体，减少阴影计算范围
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    sceneObj.add(mainLight);

    // 添加填充光（背光）
    const fillLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.6)); // 增加填充光强度
    fillLight.position.set(-5, 5, -7.5);
    sceneObj.add(fillLight);

    // 添加环境半球光
    const hemiLight = markRaw(new THREE.HemisphereLight(0xffffff, 0x555555, 0.6)); // 稍微增强半球光
    hemiLight.position.set(0, 20, 0);
    sceneObj.add(hemiLight);

    // 同时更新nonReactiveObjects和ref，确保一致性
    nonReactiveObjects.scene = sceneObj;
    scene.value = sceneObj; // 保持ref和非响应式引用一致
    
    // 获取容器并设置相机
    const container = document.getElementById("model-viewer");
    if (!container) {
      console.error("找不到model-viewer容器元素，尝试创建容器");
      throw new Error("找不到model-viewer容器元素");
    }
    
    console.log("找到model-viewer容器", container);

    // 设置相机
    const cameraObj = markRaw(new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    ));
    // 修改初始位置，离原点更近一些
    cameraObj.position.set(2, 2, 5);
    cameraObj.lookAt(0, 0, 0);
    
    // 同时更新nonReactiveObjects和ref，确保一致性
    nonReactiveObjects.camera = cameraObj;
    camera.value = cameraObj;

    // 创建渲染器
    const rendererObj = markRaw(new THREE.WebGLRenderer({
      antialias: true, // 启用抗锯齿以提高视觉质量
      alpha: true,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance" // 新增：优先选择高性能GPU
    }));
    
    rendererObj.setSize(container.clientWidth, container.clientHeight);
    rendererObj.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 限制像素比最大为1.5
    rendererObj.shadowMap.enabled = true;
    rendererObj.shadowMap.type = THREE.PCFSoftShadowMap; // 使用更高质量的阴影类型
    rendererObj.outputColorSpace = THREE.SRGBColorSpace;
    rendererObj.toneMapping = THREE.ACESFilmicToneMapping;
    rendererObj.toneMappingExposure = 1.2; // 稍微提高曝光度
    
    // 新增：优化渲染器性能设置
    rendererObj.sortObjects = false; // 禁用对象排序，提高性能
    
    // 同时更新nonReactiveObjects和ref，确保一致性
    nonReactiveObjects.renderer = rendererObj;
    renderer.value = rendererObj;

    // 添加渲染器到容器
    try {
      container.appendChild(rendererObj.domElement);
      console.log("成功将renderer添加到容器");
    } catch (error) {
      console.error("添加renderer到容器时出错:", error);
      throw error;
    }

    // 设置轨道控制器
    const controlsObj = markRaw(new OrbitControls(cameraObj, rendererObj.domElement));
    controlsObj.enableDamping = true;
    controlsObj.dampingFactor = 0.05;
    controlsObj.enablePan = true;
    controlsObj.minDistance = 1;
    controlsObj.maxDistance = 20;
    controlsObj.maxPolarAngle = Math.PI / 1.5;
    controlsObj.update();
    
    // 同时更新nonReactiveObjects和ref，确保一致性
    nonReactiveObjects.controls = controlsObj;
    controls.value = controlsObj;

    // 添加网格辅助线
    const gridHelper = markRaw(new THREE.GridHelper(20, 20, 0x555555, 0x333333));
    gridHelper.name = "gridHelper";
    sceneObj.add(gridHelper);

    // 添加坐标轴辅助
    const axesHelper = markRaw(new THREE.AxesHelper(5));
    axesHelper.name = "axesHelper";
    sceneObj.add(axesHelper);

    // 初始化射线投射器
    nonReactiveObjects.raycaster = markRaw(new THREE.Raycaster());

    // 添加鼠标事件监听
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onMouseClick);

    // 创建高亮材质
    const highlightMat = markRaw(new THREE.MeshStandardMaterial({
      color: 0xff9500,
      emissive: 0xff4400,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    }));
    
    // 创建选中材质
    const selectMat = markRaw(new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 1
    }));
    
    // 设置材质引用
    highlightMaterial = highlightMat;
    selectedMaterial = selectMat;

    // 开始动画循环
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // 使用从nonReactiveObjects获取的原始对象，不使用ref.value以避免代理问题
      const currentCamera = nonReactiveObjects.camera;
      const currentScene = nonReactiveObjects.scene;
      const currentRenderer = nonReactiveObjects.renderer;
      const currentControls = nonReactiveObjects.controls;
      
      if (currentControls) {
        currentControls.update();
      }

      // 新增：性能监控 - 降低更新频率
      const now = performance.now();
      perfMonitor.frameCount++;
      
      // 每秒更新一次FPS计数，而不是每帧更新
      if (now - perfMonitor.lastFpsUpdateTime > 1000) {
        perfMonitor.fps = Math.round((perfMonitor.frameCount * 1000) / (now - perfMonitor.lastFpsUpdateTime));
        perfMonitor.frameCount = 0;
        perfMonitor.lastFpsUpdateTime = now;
        
        // 更新内存使用情况（如果浏览器支持）
        if (window.performance && performance.memory) {
          perfMonitor.memoryUsage = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
        }
      }

      // 检查鼠标射线交点 - 性能优化：大幅降低射线投射频率
      if (perfMonitor.frameCount % 4 === 0) { // 每四帧检查一次
        checkIntersection();
      }

      // 确保场景、相机和渲染器存在，且没有进入Vue响应式系统
      if (currentScene && currentCamera && currentRenderer) {
        try {
          currentRenderer.render(currentScene, currentCamera);
        } catch (error) {
          console.error("渲染错误：", error);
        }
      }
    };
    
    animate();
    
    // 调试输出，确认场景初始化
    console.log("场景初始化完成", {
      scene: sceneObj,
      camera: cameraObj,
      renderer: rendererObj,
      controls: controlsObj
    });
    
    return true;
  } catch (err) {
    console.error("初始化Three.js错误:", err);
    loadError.value = `初始化错误: ${err.message}`;
    return false;
  }
};

// 在script标签顶部添加导入
import { PerformanceMonitor } from "../utils/PerformanceMonitor";
import { ModelManager } from "../utils/ModelManager";

// 初始化工作线程
let modelWorker = null;
try {
  modelWorker = new Worker(new URL('../workers/modelSimplifyWorker.js', import.meta.url), { type: 'module' });
} catch (e) {
  console.error("无法初始化模型简化工作线程:", e);
}

const gltfLoader = new GLTFLoader().setPath('/');
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./draco/');
gltfLoader.setDRACOLoader(dracoLoader);

// 更新模型路径，顺序是先尝试glTF格式，再尝试FBX格式
const loadModel = async (url = 'PrimaryIonDrive.glb') => {  // 改为默认加载更简单的PrimaryIonDrive.glb模型
  if (!scene.value) {
    console.error('场景未初始化');
    return;
  }
  
  try {
    console.log(`开始加载模型: ${url}`);
    // 调用loadSpecificModel函数
    await loadSpecificModel(url);
  } catch (error) {
    console.error('模型加载失败:', error);
    loadError.value = `加载模型失败: ${error.message}`;
    
    // 尝试加载备用模型
    if (url !== 'PrimaryIonDrive.glb') {
      console.log('尝试加载备用模型文件...');
      try {
        // 尝试加载GLB格式备用模型
        await loadSpecificModel('PrimaryIonDrive.glb');
      } catch (backupError) {
        console.error('备用模型加载失败:', backupError);
        loadError.value = `备用模型加载失败: ${backupError.message}`;
      }
    }
  }
};

// 提取模型部件列表
const extractPartsList = (modelObj) => {
  if (!modelObj) return;
  
  console.log('开始提取部件信息...');
  // 清空当前部件列表
  partsList.value = [];
  
  // 遍历模型的所有子对象
  modelObj.traverse((object) => {
    // 只处理网格对象
    if (object instanceof THREE.Mesh) {
      try {
        // 生成部件名称（如果没有名称，则使用UUID的一部分）
        const partName = object.name || `部件-${object.uuid.substring(0, 8)}`;
        const partType = object.userData.type || "模型部件";
        const partVolume = object.userData.volume || calculateVolume(object.geometry);
        
        // 确保nonReactiveObjects.originalMaterials已初始化
        if (!nonReactiveObjects.originalMaterials) {
          nonReactiveObjects.originalMaterials = new Map();
        }
        
        // 保存原始材质，以便后续恢复
        if (object.material) {
          // 克隆材质以防止交叉引用
          if (Array.isArray(object.material)) {
            const materials = object.material.map(mat => mat.clone());
            nonReactiveObjects.originalMaterials.set(object.uuid, materials);
          } else {
            nonReactiveObjects.originalMaterials.set(object.uuid, object.material.clone());
          }
        }
        
        // 将部件添加到列表中
        partsList.value.push({
          id: object.uuid,
          name: partName,
          type: partType,
          materialType: getMaterialType(object.material),
          dimensions: getObjectDimensions(object),
          position: object.position.clone(),
          volume: partVolume,
          description: object.userData.description || `${partName}是模型的一部分`,
          object: markRaw(object) // 使用markRaw避免Vue响应式系统处理Three.js对象
        });
        
        // 在网格对象上添加部件ID引用，便于后续查找
        object.userData.partId = object.uuid;
      } catch (error) {
        console.error(`处理部件 ${object.name || object.uuid} 时出错:`, error);
      }
    }
  });
  
  console.log(`部件提取完成，共找到 ${partsList.value.length} 个部件`);
};

// 更新模型包围盒
const updateBoundingBox = () => {
  if (!model.value) return;
  
  // 创建包围盒
  boundingBox.value = new THREE.Box3().setFromObject(model.value);
  
  // 添加包围盒辅助对象（调试用）
  if (debugMode.value && boundingBox.value) {
    // 移除旧的包围盒辅助对象
    if (boundingBoxHelper.value) {
      scene.value.remove(boundingBoxHelper.value);
    }
    
    boundingBoxHelper.value = new THREE.Box3Helper(boundingBox.value, 0xff0000);
    scene.value.add(boundingBoxHelper.value);
  }
};

// 设置剖切平面
const setClippingPlane = (direction, position = 0) => {
  if (!scene.value || !renderer.value) return;
  
  // 确保渲染器支持剖切平面
  renderer.value.localClippingEnabled = true;
  
  // 清除现有的剖切平面
  if (clippingPlanes.value.length > 0) {
    clippingPlanes.value = [];
  }
  
  // 创建新的剖切平面
  let plane;
  switch (direction) {
    case 'x':
      plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -position);
      break;
    case 'y':
      plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position);
      break;
    case 'z':
      plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -position);
      break;
    default:
      return;
  }
  
  clippingPlanes.value.push(plane);
  
  // 更新模型中所有材质的剖切平面
  if (model.value) {
    model.value.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => {
            material.clippingPlanes = clippingPlanes.value;
            material.clipShadows = true;
            material.needsUpdate = true;
          });
        } else {
          node.material.clippingPlanes = clippingPlanes.value;
          node.material.clipShadows = true;
          node.material.needsUpdate = true;
        }
      }
    });
  }
  
  // 如果启用了辅助平面
  if (showClippingPlaneHelper.value) {
    // 移除旧的辅助平面
    if (clippingPlaneHelper.value) {
      scene.value.remove(clippingPlaneHelper.value);
    }
    
    // 创建新的辅助平面
    const size = 10;
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.2,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    clippingPlaneHelper.value = new THREE.Mesh(geometry, material);
    
    // 根据平面方向设置辅助平面位置和方向
    switch (direction) {
      case 'x':
        clippingPlaneHelper.value.rotation.y = Math.PI / 2;
        clippingPlaneHelper.value.position.x = position;
        break;
      case 'y':
        clippingPlaneHelper.value.rotation.x = Math.PI / 2;
        clippingPlaneHelper.value.position.y = position;
        break;
      case 'z':
        clippingPlaneHelper.value.position.z = position;
        break;
    }
    
    scene.value.add(clippingPlaneHelper.value);
  }
};

// 清除剖切平面
const clearClippingPlanes = () => {
  if (!scene.value) return;
  
  // 清除剖切平面数组
  clippingPlanes.value = [];
  
  // 更新模型中所有材质
  if (model.value) {
    model.value.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => {
            material.clippingPlanes = [];
            material.needsUpdate = true;
          });
        } else {
          node.material.clippingPlanes = [];
          node.material.needsUpdate = true;
        }
      }
    });
  }
  
  // 移除辅助平面
  if (clippingPlaneHelper.value) {
    scene.value.remove(clippingPlaneHelper.value);
    clippingPlaneHelper.value = null;
  }
};

// 初始化性能监控
let performanceMonitor = null;

// onMounted钩子中初始化性能监控
const initPerformanceMonitor = () => {
  performanceMonitor = new PerformanceMonitor({
    targetFPS: 30,
    criticalFPS: 15,
    memoryWarningLevel: 450,
    onFPSUpdate: (fps) => {
      perfMonitor.fps = fps;
    },
    onMemoryUpdate: (memory) => {
      perfMonitor.memoryUsage = memory;
    },
    onQualityChange: (qualityLevel) => {
      console.log(`质量级别自动调整为: ${qualityLevel.toFixed(2)}`);
      adjustRenderQuality(qualityLevel);
    },
    onThresholdExceeded: (fps, memory) => {
      console.warn(`性能警告 - FPS: ${fps}, 内存: ${memory}MB`);
      if (fps < 10) {
        // 紧急降低渲染质量
        emergencyQualityReduction();
      }
    }
  });
  
  // 启动监控
  performanceMonitor.start();
};

// 根据质量级别调整渲染参数
const adjustRenderQuality = (qualityLevel) => {
  if (!nonReactiveObjects.renderer) return;
  
  try {
    // 调整像素密度
    nonReactiveObjects.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 1 + qualityLevel * 0.5)
    );
    
    // 调整阴影质量
    if (qualityLevel < 0.4) {
      nonReactiveObjects.renderer.shadowMap.enabled = false;
    } else {
      nonReactiveObjects.renderer.shadowMap.enabled = true;
      nonReactiveObjects.renderer.shadowMap.type = 
        qualityLevel < 0.7 ? THREE.BasicShadowMap : THREE.PCFShadowMap;
    }
    
    // 更新材质
    if (nonReactiveObjects.model) {
      nonReactiveObjects.model.traverse((object) => {
        if (object.isMesh && object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => {
              if (mat.isMeshStandardMaterial) {
                // 根据质量调整材质参数
                mat.flatShading = qualityLevel < 0.5;
                mat.wireframe = showWireframe.value;
                mat.needsUpdate = true;
              }
            });
          } else if (object.material.isMeshStandardMaterial) {
            object.material.flatShading = qualityLevel < 0.5;
            object.material.wireframe = showWireframe.value;
            object.material.needsUpdate = true;
          }
        }
      });
    }
    
    // 如果质量很低且使用的是高LOD，考虑切换到低LOD
    if (qualityLevel < 0.3 && nonReactiveObjects.modelManager) {
      const modelManager = nonReactiveObjects.modelManager;
      if (modelManager.currentLODLevel === 'HIGH') {
        modelManager.switchLOD('LOW')
          .catch(err => console.warn(`无法切换到低LOD: ${err.message}`));
      }
    }
  } catch (e) {
    console.error("调整渲染质量出错:", e);
  }
};

// 紧急降低渲染质量
const emergencyQualityReduction = () => {
  try {
    console.warn("执行紧急质量降级!");
    
    // 关闭阴影
    if (nonReactiveObjects.renderer) {
      nonReactiveObjects.renderer.shadowMap.enabled = false;
    }
    
    // 最低像素比
    if (nonReactiveObjects.renderer) {
      nonReactiveObjects.renderer.setPixelRatio(1.0);
    }
    
    // 尝试切换到最低LOD
    if (nonReactiveObjects.modelManager) {
      nonReactiveObjects.modelManager
        .switchLOD('LOW')
        .catch(err => console.warn(`紧急切换LOD失败: ${err.message}`));
    }
    
    // 隐藏非必要视觉元素
    showAxes.value = false;
    toggleAxes();
    showGrid.value = false;
    toggleGrid();
    
    // 如果性能监控存在，设置最低质量级别
    if (performanceMonitor) {
      performanceMonitor.setQualityLevel(0.1);
    }
  } catch (e) {
    console.error("紧急质量降级失败:", e);
  }
};

// 清理模型资源
const cleanupModel = () => {
  const currentScene = nonReactiveObjects.scene;
  if (!currentScene) return;
  
  const oldModel = currentScene.getObjectByName("loadedModel");
  if (oldModel) {
    // 在删除模型前，确保从缓存中移除所有对应材质
    oldModel.traverse((object) => {
      if (object.isMesh) {
        if (nonReactiveObjects.originalMaterials.has(object.uuid)) {
          nonReactiveObjects.originalMaterials.delete(object.uuid);
        }
        
        // 清除所有自定义属性
        if (object.userData.partId !== undefined) {
          // 断开对象与部件列表中项目的双向关联
          const partIndex = partsList.value.findIndex(p => p.id === object.userData.partId);
          if (partIndex !== -1) {
            // 避免循环引用
            partsList.value[partIndex].object = null;
          }
        }
        
        // 清除拆解相关的属性
        object.position_0 = null;
        object.decomposeDirection = null;
        
        // 显式销毁几何体
        if (object.geometry) {
          object.geometry.dispose();
          object.geometry = null;
        }
        
        // 显式销毁材质
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
              disposeMaterial(material);
            });
            object.material.length = 0; // 清空数组
          } else {
            disposeMaterial(object.material);
            object.material = null;
          }
        }
      }
    });
    
    // 从场景中移除
    currentScene.remove(oldModel);
  }

  const oldBoxHelper = currentScene.getObjectByName("modelBoxHelper");
  if (oldBoxHelper) {
    currentScene.remove(oldBoxHelper);
  }
  
  // 强制执行一次渲染
  if (nonReactiveObjects.renderer && nonReactiveObjects.camera) {
    nonReactiveObjects.renderer.render(currentScene, nonReactiveObjects.camera);
  }
  
  // 清空部件列表
  partsList.value = [];
  
  // 清空材质缓存
  nonReactiveObjects.originalMaterials.clear();
  
  // 清空选中和悬停状态
  selectedPart.value = null;
  hoveredPart.value = null;
  
  // 移除射线投射缓存
  if (nonReactiveObjects.intersectMeshes) {
    nonReactiveObjects.intersectMeshes = null;
  }
  
  // 提示垃圾回收
  if (oldModel) {
    console.log('已清理模型资源，等待垃圾回收');
    // 请求浏览器执行垃圾回收（注意：这只是一个提示，浏览器可能不会立即执行）
    if (window.gc) window.gc();
  }
};

// 辅助函数来处理材质及其相关纹理
const disposeMaterial = (material) => {
  if (!material) return;
  
  // 处理材质纹理
  const disposeTexture = (texture) => {
    if (!texture) return;
    
    // 释放GPU资源
    texture.dispose();
    
    // 清除可能的事件监听器
    if (texture.image && texture.image.removeEventListener) {
      texture.image.removeEventListener('load', null);
      texture.image.removeEventListener('error', null);
    }
  };
  
  // 处理所有可能的纹理
  if (material.map) disposeTexture(material.map);
  if (material.lightMap) disposeTexture(material.lightMap);
  if (material.bumpMap) disposeTexture(material.bumpMap);
  if (material.normalMap) disposeTexture(material.normalMap);
  if (material.displacementMap) disposeTexture(material.displacementMap);
  if (material.specularMap) disposeTexture(material.specularMap);
  if (material.emissiveMap) disposeTexture(material.emissiveMap);
  if (material.alphaMap) disposeTexture(material.alphaMap);
  if (material.aoMap) disposeTexture(material.aoMap);
  if (material.metalnessMap) disposeTexture(material.metalnessMap);
  if (material.roughnessMap) disposeTexture(material.roughnessMap);
  if (material.envMap) disposeTexture(material.envMap);
  
  // 清理其他可能的纹理引用
  if (material.gradientMap) disposeTexture(material.gradientMap);
  if (material.transmission) disposeTexture(material.transmissionMap);
  if (material.thicknessMap) disposeTexture(material.thicknessMap);
  if (material.sheenColorMap) disposeTexture(material.sheenColorMap);
  if (material.sheenRoughnessMap) disposeTexture(material.sheenRoughnessMap);
  if (material.clearcoatMap) disposeTexture(material.clearcoatMap);
  if (material.clearcoatNormalMap) disposeTexture(material.clearcoatNormalMap);
  if (material.clearcoatRoughnessMap) disposeTexture(material.clearcoatRoughnessMap);

  // 释放材质本身
  material.dispose();
};

// 清理所有资源
const cleanup = () => {
  try {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // 获取非响应式引用
    const currentRenderer = nonReactiveObjects.renderer;
    const currentScene = nonReactiveObjects.scene;
    const currentControls = nonReactiveObjects.controls;

    // 清理鼠标事件监听
    const container = document.getElementById("model-viewer");
    if (container) {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onMouseClick);
    }

    // 清理模型资源
    cleanupModel();

    // 清理渲染器
    if (currentRenderer) {
      // 确保移除所有事件监听
      if (currentRenderer.domElement) {
        const element = currentRenderer.domElement;
        element.oncontextmenu = null;
        element.onfocus = null;
        element.onblur = null;
        element.onmousedown = null;
        element.onmouseup = null;
        element.onmousemove = null;
      }
      
      currentRenderer.dispose();
      
      if (container && container.contains(currentRenderer.domElement)) {
        container.removeChild(currentRenderer.domElement);
      }
    }

    // 清理控制器
    if (currentControls) {
      currentControls.dispose();
    }

    // 清理场景
    if (currentScene) {
      // 移除所有对象
      while(currentScene.children.length > 0) { 
        const object = currentScene.children[0];
        currentScene.remove(object);
        
        // 递归处理对象
        if (object.traverse) {
          object.traverse((child) => {
            if (child.geometry) {
              child.geometry.dispose();
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(disposeMaterial);
              } else {
                disposeMaterial(child.material);
              }
            }
          });
        }
      }
      currentScene.clear();
    }
    
    // 重置非响应式对象
    Object.assign(nonReactiveObjects, {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      model: null,
      raycaster: null,
      mouse: { x: 0, y: 0 },
      originalMaterials: new Map(),
      intersectMeshes: null,
      lastModelUpdate: null,
      modelManager: null,
    });
    
    // 清空部件列表和状态
    partsList.value = [];
    selectedPart.value = null;
    hoveredPart.value = null;
    modelLoaded.value = false;
    loadError.value = null;
    loadingProgress.value = 0;
    
    console.log("清理完成，等待垃圾回收");
  } catch (err) {
    console.error("清理资源时出错:", err);
  }
};

// 窗口大小调整
const onWindowResize = () => {
  try {
    const container = document.getElementById("model-viewer");
    if (!container) return;
    
    const currentCamera = nonReactiveObjects.camera;
    const currentRenderer = nonReactiveObjects.renderer;
    
    if (!currentCamera || !currentRenderer) return;

    // 更新相机
    currentCamera.aspect = container.clientWidth / container.clientHeight;
    currentCamera.updateProjectionMatrix();
    
    // 更新渲染器
    currentRenderer.setSize(container.clientWidth, container.clientHeight);
  } catch (err) {
    console.error("窗口大小调整错误:", err);
  }
};

// 相机控制方法
const rotateCameraLeft = () => {
  const currentControls = nonReactiveObjects.controls;
  if (currentControls) {
    currentControls.rotateLeft(Math.PI / 12);
    currentControls.update();
  }
};

// 相机右转
const rotateCameraRight = () => {
  const currentControls = nonReactiveObjects.controls;
  if (currentControls) {
    currentControls.rotateLeft(-Math.PI / 12);
    currentControls.update();
  }
};

// 放大
const zoomIn = () => {
  const currentControls = nonReactiveObjects.controls;
  if (currentControls) {
    currentControls.dollyIn(1.2);
    currentControls.update();
  }
};

// 缩小
const zoomOut = () => {
  const currentControls = nonReactiveObjects.controls;
  if (currentControls) {
    currentControls.dollyOut(1.2);
    currentControls.update();
  }
};

// 重置相机
const resetCamera = () => {
  const currentCamera = nonReactiveObjects.camera;
  const currentControls = nonReactiveObjects.controls;
  
  if (currentCamera && currentControls) {
    currentCamera.position.copy(initialCameraPosition);
    currentCamera.lookAt(0, 0, 0);
    currentControls.target.set(0, 0, 0);
    currentControls.update();
  }
};

// 切换网格显示
const toggleGrid = () => {
  const currentScene = nonReactiveObjects.scene;
  if (currentScene) {
    const gridHelper = currentScene.getObjectByName("gridHelper");
    if (gridHelper) {
      gridHelper.visible = showGrid.value;
    }
  }
};

// 切换坐标轴显示
const toggleAxes = () => {
  const currentScene = nonReactiveObjects.scene;
  if (currentScene) {
    const axesHelper = currentScene.getObjectByName("axesHelper");
    if (axesHelper) {
      axesHelper.visible = showAxes.value;
    }
  }
};

// 清理包围盒
const toggleBoundingBox = () => {
  const currentScene = nonReactiveObjects.scene;
  if (currentScene) {
    const boundingBox = currentScene.getObjectByName("modelBoxHelper");
    if (boundingBox) {
      boundingBox.visible = showBoundingBox.value;
    }
  }
};

// 更新模型信息
const updateModelInfo = (modelObj) => {
  let vertices = 0;
  let faces = 0;
  let materials = 0;

  modelObj.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry instanceof THREE.BufferGeometry) {
        const geometry = object.geometry;
        vertices += geometry.attributes.position ? geometry.attributes.position.count : 0;
        faces += geometry.index ? geometry.index.count / 3 : 0;
      }
      
      if (Array.isArray(object.material)) {
        materials += object.material.length;
      } else if (object.material) {
        materials++;
      }
    }
  });

  const box = markRaw(new THREE.Box3().setFromObject(modelObj));
  const size = markRaw(new THREE.Vector3());
  box.getSize(size);
  
  Object.assign(modelInfo, {
    vertices,
    faces,
    materials,
    dimensions: `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`
  });
  
  // 根据模型大小调整相机的视锥体
  const maxDim = Math.max(size.x, size.y, size.z);
  const camera = nonReactiveObjects.camera;
  if (camera) {
    camera.near = 0.01;
    camera.far = Math.max(1000, maxDim * 20);
    camera.updateProjectionMatrix();
  }
};

// 新增：鼠标移动事件处理
const onMouseMove = (event) => {
  const container = document.getElementById("model-viewer");
  if (!container) return;
  
  // 计算鼠标在容器中的相对位置
  const rect = container.getBoundingClientRect();
  nonReactiveObjects.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  nonReactiveObjects.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
};

// 新增：鼠标点击事件处理
const onMouseClick = () => {
  // 如果有悬停的部件，选中它
  if (hoveredPart.value) {
    selectPart(hoveredPart.value);
  } else {
    // 点击空白处取消选择
    clearSelectedPart();
  }
};

// 新增：检查射线与模型的交点
const checkIntersection = () => {
  if (!nonReactiveObjects.raycaster || !nonReactiveObjects.model || !modelLoaded.value) return;
  
  const raycaster = nonReactiveObjects.raycaster;
  const mouse = nonReactiveObjects.mouse;
  const camera = nonReactiveObjects.camera;
  
  // 更新射线
  raycaster.setFromCamera(mouse, camera);
  
  // 收集可交互网格
  let meshes = nonReactiveObjects.intersectMeshes;
  
  // 如果meshes不存在或模型已更改，重新收集
  if (!meshes || nonReactiveObjects.lastModelUpdate !== nonReactiveObjects.model.uuid) {
    meshes = [];
    nonReactiveObjects.model.traverse((object) => {
      if (object.isMesh && object.geometry) {
        meshes.push(object);
      }
    });
    nonReactiveObjects.intersectMeshes = meshes;
    nonReactiveObjects.lastModelUpdate = nonReactiveObjects.model.uuid;
  }
  
  // 如果没有网格，退出
  if (meshes.length === 0) return;
  
  // 计算射线与对象的交点
  const intersects = raycaster.intersectObjects(meshes, false);
  
  if (intersects.length > 0) {
    const firstHit = intersects[0].object;
    
    // 如果悬停对象已经变化
    if (!hoveredPart.value || hoveredPart.value.object !== firstHit) {
      // 清除之前的悬停效果
      if (hoveredPart.value && hoveredPart.value.object && hoveredPart.value.object.isMesh) {
        const prevObject = hoveredPart.value.object;
        // 只有当前选中部件不是该对象时，才恢复原始材质
        if (!selectedPart.value || selectedPart.value.object !== prevObject) {
          try {
            restoreOriginalMaterial(prevObject);
          } catch (error) {
            console.error("恢复材质错误:", error);
          }
        }
      }
      
      // 设置新的悬停对象
      try {
        const partName = firstHit.name || `部件-${firstHit.id}`;
        const partType = firstHit.userData.type || "未知类型";
        const partVolume = firstHit.userData.volume || calculateVolume(firstHit.geometry);
        
        // 使用 markRaw 确保 firstHit 不会被 Vue 代理
        hoveredPart.value = {
          id: firstHit.uuid,
          name: partName,
          type: partType,
          materialType: getMaterialType(firstHit.material),
          dimensions: getObjectDimensions(firstHit),
          position: firstHit.position.clone(),
          volume: partVolume,
          description: firstHit.userData.description || "无相关描述",
          object: markRaw(firstHit) // 防止对象进入Vue的响应式系统
        };
        
        // 只有当前选中部件不是该对象时，才应用高亮材质
        if (!selectedPart.value || selectedPart.value.object !== firstHit) {
          applyHighlightMaterial(firstHit);
        }
      } catch (error) {
        console.error("设置悬停对象错误:", error);
        hoveredPart.value = null;
      }
    }
  } else if (hoveredPart.value) {
    // 清除悬停效果
    try {
      const prevObject = hoveredPart.value.object;
      if (prevObject && prevObject.isMesh) {
        // 只有当前选中部件不是该对象时，才恢复原始材质
        if (!selectedPart.value || selectedPart.value.object !== prevObject) {
          restoreOriginalMaterial(prevObject);
        }
      }
    } catch (error) {
      console.error("清除悬停效果错误:", error);
    }
    hoveredPart.value = null;
  }
};

// 新增：应用材质
const applyMaterial = (object, material) => {
  if (!object) return;
  if (object.material) {
    object.material = material;
  }
};

// 新增：重置材质
const resetMaterial = (object) => {
  if (!object) return;
  
  // 如果是选中的部件，保持选中状态
  if (selectedPart.value && object.userData.partId === selectedPart.value.id) {
    applyMaterial(object, selectedMaterial);
    return;
  }
  
  // 否则恢复原始材质
  const originalMaterial = nonReactiveObjects.originalMaterials.get(object.uuid);
  if (originalMaterial) {
    object.material = originalMaterial.clone();
    // 更新金属度和粗糙度
    if (object.material.isMeshStandardMaterial) {
      object.material.metalness = metalness.value;
      object.material.roughness = roughness.value;
    }
  }
};

// 新增：选中部件
const selectPart = (part) => {
  // 如果当前已经选中该部件，取消选择
  if (selectedPart.value && selectedPart.value.id === part.id) {
    clearSelectedPart();
    return;
  }
  
  // 先清除之前选中的部件
  clearSelectedPart();
  
  // 设置新的选中部件
  selectedPart.value = part;
  
  // 应用选中材质
  applyMaterial(part.object, selectedMaterial);
  
  // 聚焦到选中的部件
  focusOnPart(part, true);
};

// 新增：清除选中部件
const clearSelectedPart = () => {
  if (selectedPart.value && selectedPart.value.object) {
    resetMaterial(selectedPart.value.object);
  }
  selectedPart.value = null;
};

// 新增：聚焦到部件
const focusOnPart = (part, animate = false) => {
  try {
    if (!part || !part.object) return;
    
    const controls = nonReactiveObjects.controls;
    const camera = nonReactiveObjects.camera;
    if (!controls || !camera) return;
    
    // 获取部件的世界坐标
    const targetPosition = new THREE.Vector3();
    part.object.getWorldPosition(targetPosition);
    
    // 检查位置是否有效
    if (!isFinite(targetPosition.x) || !isFinite(targetPosition.y) || !isFinite(targetPosition.z)) {
      console.warn("部件位置无效，无法聚焦", part.name);
      return;
    }
    
    // 计算适当的相机距离
    const boundingBox = new THREE.Box3().setFromObject(part.object);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // 确保尺寸有效
    if (size.x === 0 && size.y === 0 && size.z === 0) {
      console.warn("部件尺寸为零，使用默认距离");
      size.set(1, 1, 1);
    }
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = Math.max(maxDim * 3, 1); // 确保最小距离为1
    
    // 设置相机位置
    if (animate) {
      // 使用自定义动画进行平滑过渡
      animateCameraMove(targetPosition, distance);
    } else {
      // 立即设置相机位置
      setCameraPosition(targetPosition, distance);
    }
    
    // 标记选中的部件
    if (!selectedPart.value || selectedPart.value.id !== part.id) {
      selectPart(part);
    }
  } catch (err) {
    console.error("聚焦部件时出错:", err);
  }
};

// 新增：动画移动相机
const animateCameraMove = (targetPosition, distance) => {
  try {
    const controls = nonReactiveObjects.controls;
    const camera = nonReactiveObjects.camera;
    
    if (!controls || !camera) return;
    
    // 获取当前相机位置和目标位置
    const currentPosition = camera.position.clone();
    const currentTarget = controls.target.clone();
    
    // 计算新的相机位置
    const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    const newPosition = targetPosition.clone().add(direction.multiplyScalar(distance));
    
    // 检查新位置是否有效
    if (!isFinite(newPosition.x) || !isFinite(newPosition.y) || !isFinite(newPosition.z)) {
      console.warn("计算的相机位置无效，使用直接设置");
      setCameraPosition(targetPosition, distance);
      return;
    }
    
    // 设置动画时长（毫秒）
    const duration = 1000;
    const startTime = Date.now();
    
    // 定义动画函数
    const animate = () => {
      try {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // 使用缓动函数使动画更平滑
        const easeProgress = easeOutCubic(progress);
        
        // 插值计算当前位置
        camera.position.lerpVectors(currentPosition, newPosition, easeProgress);
        controls.target.lerpVectors(currentTarget, targetPosition, easeProgress);
        controls.update();
        
        // 如果动画未完成，继续请求动画帧
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      } catch (animErr) {
        console.error("相机动画过程中出错:", animErr);
        // 发生错误时，直接设置到目标位置
        setCameraPosition(targetPosition, distance);
      }
    };
    
    // 开始动画
    animate();
  } catch (err) {
    console.error("设置相机动画时出错:", err);
    // 失败时尝试直接设置位置
    setCameraPosition(targetPosition, distance);
  }
};

// 缓动函数
const easeOutCubic = (t) => {
  return 1 - Math.pow(1 - t, 3);
};

// 新增：直接设置相机位置
const setCameraPosition = (targetPosition, distance) => {
  try {
    const controls = nonReactiveObjects.controls;
    const camera = nonReactiveObjects.camera;
    
    if (!controls || !camera) return;
    
    // 检查目标位置是否有效
    if (!isFinite(targetPosition.x) || !isFinite(targetPosition.y) || !isFinite(targetPosition.z)) {
      console.warn("目标位置无效，无法设置相机");
      return;
    }
    
    // 设置控制器目标
    controls.target.copy(targetPosition);
    
    // 计算并设置相机位置
    const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    
    // 如果方向向量是有效的
    if (direction.lengthSq() > 0.001) {
      const newPosition = targetPosition.clone().add(direction.multiplyScalar(distance));
      
      // 检查新位置是否有效
      if (isFinite(newPosition.x) && isFinite(newPosition.y) && isFinite(newPosition.z)) {
        camera.position.copy(newPosition);
      } else {
        // 如果新位置无效，使用默认位置
        console.warn("计算的相机位置无效，使用默认位置");
        camera.position.set(targetPosition.x, targetPosition.y + distance, targetPosition.z);
      }
    } else {
      // 方向向量无效时使用默认方向
      camera.position.set(targetPosition.x, targetPosition.y + distance, targetPosition.z);
    }
    
    controls.update();
  } catch (err) {
    console.error("设置相机位置时出错:", err);
  }
};

// 拆解模型
const decomposeMesh = () => {
  if (!nonReactiveObjects.model) return;
  
  isMeshDecompose.value = true;
  let time = 0;
  const duration = 20; // 动画持续时长（帧数）
  
  // 先给每个部件添加初始位置和拆解方向
  partsList.value.forEach(part => {
    if (part.object) {
      // 保存初始位置
      part.object.position_0 = part.object.position.clone();
      
      // 计算拆解方向（从模型中心向外）
      const center = new THREE.Vector3();
      nonReactiveObjects.model.getWorldPosition(center);
      
      const partPosition = new THREE.Vector3();
      part.object.getWorldPosition(partPosition);
      
      // 安全地计算方向，确保向量不为零
      const direction = new THREE.Vector3().subVectors(partPosition, center);
      if (direction.lengthSq() > 0.0001) {
        direction.normalize().multiplyScalar(0.5);
      } else {
        // 如果方向向量接近零，提供一个默认方向
        direction.set(0, 1, 0).multiplyScalar(0.5);
      }
      
      part.object.decomposeDirection = direction;
    }
  });
  
  const animate = () => {
    if (time < duration) {
      partsList.value.forEach(part => {
        if (part.object && part.object.decomposeDirection) {
          // 使用预计算的方向，而不是在动画中计算
          part.object.position.add(part.object.decomposeDirection);
        }
      });
      time++;
      requestAnimationFrame(animate);
    }
  };
  
  animate();
};

// 合并模型
const mergeMesh = () => {
  if (!nonReactiveObjects.model) return;
  
  isMeshDecompose.value = false;
  let time = 0;
  const duration = 20; // 动画持续时长（帧数）
  
  const animate = () => {
    if (time < duration) {
      partsList.value.forEach(part => {
        if (part.object && part.object.position_0) {
          // 使用lerp平滑插值回到原始位置
          part.object.position.lerp(part.object.position_0, 0.1);
        }
      });
      time++;
      requestAnimationFrame(animate);
    } else {
      // 动画结束，确保所有部件恢复到初始位置
      partsList.value.forEach(part => {
        if (part.object && part.object.position_0) {
          part.object.position.copy(part.object.position_0);
        }
      });
    }
  };
  
  animate();
};

// 部件悬停处理
const onPartMouseEnter = (part) => {
  if (!part || (selectedPart.value && selectedPart.value.id === part.id)) return;
  
  hoveredPart.value = part;
  
  // 应用高亮材质
  if (part.object) {
    applyMaterial(part.object, highlightMaterial);
  }
};

// 部件移出处理
const onPartMouseLeave = (part) => {
  if (!part || (selectedPart.value && selectedPart.value.id === part.id)) return;
  
  hoveredPart.value = null;
  
  // 重置材质
  if (part.object) {
    resetMaterial(part.object);
  }
};

// 格式化向量为字符串
const formatVector = (vector) => {
  if (!vector) return '0, 0, 0';
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
};

// 新增：重新加载模型（带简化）
const reloadModel = () => {
  // 重置模型加载状态
  modelLoaded.value = false;
  nonReactiveObjects.model = null;
  model.value = null;
  
  // 延迟加载，确保UI更新
  nextTick(() => {
    loadModel();
  });
};

// 生命周期钩子
onMounted(() => {
  console.log("组件挂载，开始初始化");
  // 检查WebGL兼容性
  if (!checkWebGLCompatibility()) {
    return; // 如果WebGL不支持，直接返回
  }
  
  // 初始化性能监控
  initPerformanceMonitor();
  
  // 初始化Three.js
  const initSuccess = initThreeJS();
  
  if (!initSuccess) {
    console.error("Three.js初始化失败，无法加载模型");
    return;
  }
  
  // 加载模型
  loadModel();
  
  // 添加窗口事件监听
  window.addEventListener("resize", onWindowResize);
  
  // 使用更通用的方法监听设备像素比变化
  const mediaQueryList = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  if (mediaQueryList.addEventListener) {
    mediaQueryList.addEventListener('change', onDevicePixelRatioChange);
  } else if (mediaQueryList.addListener) {
    // 兼容旧版浏览器
    mediaQueryList.addListener(onDevicePixelRatioChange);
  }
  
  // 初始化stats
  if (debugMode.value) {
    stats.value = markRaw(new Stats());
    document.body.appendChild(stats.value.dom);
  }
  
  // 监听键盘事件
  window.addEventListener("keydown", onKeyDown);
  
  console.log("组件挂载完成，已初始化Three.js场景和模型加载");
});

// 卸载前清理
onBeforeUnmount(() => {
  window.removeEventListener("resize", onWindowResize);
  
  // 移除鼠标事件监听
  const container = document.getElementById("model-viewer");
  if (container) {
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('click', onMouseClick);
  }
  
  // 停止性能监控
  if (performanceMonitor) {
    performanceMonitor.stop();
    performanceMonitor = null;
  }
  
  // 终止Web Worker
  if (modelWorker) {
    modelWorker.terminate();
    modelWorker = null;
  }
  
  // 修复：移除像素比监听器，兼容不同浏览器
  const mediaQueryList = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  if (mediaQueryList.removeEventListener) {
    mediaQueryList.removeEventListener('change', onDevicePixelRatioChange);
  } else if (mediaQueryList.removeListener) {
    mediaQueryList.removeListener(onDevicePixelRatioChange);
  }
  
  cleanup();
});

// 新增：设备像素比变化处理函数
const onDevicePixelRatioChange = () => {
  const currentRenderer = nonReactiveObjects.renderer;
  if (currentRenderer) {
    currentRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  }
};

// 检查WebGL兼容性
const checkWebGLCompatibility = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      loadError.value = "您的浏览器不支持WebGL，无法显示3D模型";
      console.error("浏览器不支持WebGL");
      return false;
    }
    
    // 检查最大纹理尺寸
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log("最大纹理尺寸:", maxTextureSize);
    
    // 检查最大顶点属性
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    console.log("最大顶点属性:", maxVertexAttribs);
    
    // 其他可能的兼容性测试...
    return true;
  } catch (e) {
    console.error("WebGL兼容性检查错误:", e);
    loadError.value = "WebGL兼容性检查失败: " + e.message;
    return false;
  }
};

// 重试加载模型
const retryLoading = () => {
  console.log("重试加载模型");
  // 强制重置状态和清理资源
  loadingProgress.value = 0;
  loadError.value = null;
  modelLoaded.value = false;
  
  // 确保清理现有资源
  try {
    cleanup();
  } catch (e) {
    console.warn("清理资源时出错:", e);
    // 继续尝试重新加载，即使清理失败
  }
  
  // 确保内存释放
  if (window.gc) {
    try {
      window.gc();
    } catch (e) {
      console.warn("触发垃圾回收时出错:", e);
    }
  }
  
  // 短暂延迟后重新初始化，给予浏览器时间释放资源
  setTimeout(() => {
    try {
      // 如果之前使用高质量渲染但失败，则尝试低质量
      if (!useSimplifiedModel.value) {
        useSimplifiedModel.value = true;
        simplificationRatio.value = 0.8;
        console.log("启用模型简化，设置简化率为:", simplificationRatio.value);
      }
      
      // 降低渲染质量
      if (performanceMonitor) {
        performanceMonitor.setQualityLevel(0.4);
      }
      
      // 重新初始化Three.js
      initThreeJS();
      
      // 延迟加载模型，等待场景初始化完成
      setTimeout(() => {
        loadModel();
      }, 500);
    } catch (e) {
      console.error("重试加载模型时出错:", e);
      loadError.value = "重试加载失败: " + e.message;
    }
  }, 1000);
};

// 渲染场景
const renderScene = () => {
  // 使用非响应式对象引用，避免代理问题
  const currentRenderer = nonReactiveObjects.renderer;
  const currentScene = nonReactiveObjects.scene;
  const currentCamera = nonReactiveObjects.camera;
  
  if (!currentRenderer || !currentScene || !currentCamera) return;
  
  // 更新性能监视器
  if (stats.value) stats.value.begin();
  
  // 更新控制器
  if (nonReactiveObjects.controls) nonReactiveObjects.controls.update();
  
  // 渲染场景
  currentRenderer.render(currentScene, currentCamera);
  
  // 结束性能监视
  if (stats.value) stats.value.end();
  
  // 请求下一帧
  requestAnimationFrame(renderScene);
};

// 聚焦到对象
const focusOnObject = (object) => {
  if (!camera.value || !controls.value || !object) return;
  
  try {
    // 计算包围盒
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    
    box.getSize(size);
    box.getCenter(center);
    
    // 确保包围盒有效
    if (!isFinite(size.length()) || size.length() === 0) {
      console.warn('包围盒无效，无法聚焦');
      return;
    }
    
    // 计算适当的距离
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.value.fov * (Math.PI / 180);
    const cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
    
    // 设置相机位置
    const direction = new THREE.Vector3(1, 1, 1).normalize();
    const position = center.clone().add(direction.multiplyScalar(cameraDistance * 1.5));
    
    // 设置相机和控制器
    camera.value.position.copy(position);
    camera.value.lookAt(center);
    camera.value.updateProjectionMatrix();
    
    // 设置控制器目标
    controls.value.target.copy(center);
    controls.value.update();
    
    console.log('摄像机聚焦到对象，距离:', cameraDistance);
  } catch (error) {
    console.error('聚焦对象时出错:', error);
  }
};

// 重置场景视图
const resetView = () => {
  const currentScene = nonReactiveObjects.scene;
  const currentCamera = nonReactiveObjects.camera;
  const currentControls = nonReactiveObjects.controls;
  
  if (!currentScene || !currentCamera || !currentControls || !model.value) {
    console.warn('无法重置视图：缺少必要的组件');
    return;
  }
  
  try {
    console.log('正在重置视图...');
    
    // 计算模型的边界盒
    const box = new THREE.Box3().setFromObject(model.value);
    console.log('模型包围盒: ', box);
    
    // 如果边界盒无效，直接返回
    if (box.isEmpty() || 
        !isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z) || 
        !isFinite(box.max.x) || !isFinite(box.max.y) || !isFinite(box.max.z)) {
      console.warn('模型边界盒无效');
      return;
    }
    
    // 计算边界盒的中心和尺寸
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    
    console.log('模型中心点: ', center);
    console.log('模型尺寸: ', size);
    
    // 计算模型的最大尺寸
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // 如果尺寸过小，设置一个最小值
    const minSize = 0.01;
    const adjustedMaxDim = Math.max(maxDim, minSize);
    
    // 计算相机距离
    // 使用相机的视场角计算所需的距离
    const fov = currentCamera.fov * (Math.PI / 180);
    const distance = adjustedMaxDim / (2 * Math.tan(fov / 2));
    
    // 为了确保完全看到模型，增加一些边距
    const padding = 1.5;
    const totalDistance = distance * padding;
    
    console.log('计算的相机距离: ', totalDistance);
    
    // 将控制器目标设置为模型中心
    currentControls.target.copy(center);
    
    // 设置相机位置 - 从模型中心偏移到合适的距离
    const offset = new THREE.Vector3(totalDistance, totalDistance, totalDistance);
    currentCamera.position.copy(center).add(offset);
    
    // 让相机看向模型中心
    currentCamera.lookAt(center);
    
    // 更新控制器
    currentControls.update();
    
    console.log('视图已重置');
    
    // 触发一次渲染
    if (nonReactiveObjects.renderer) {
      nonReactiveObjects.renderer.render(currentScene, currentCamera);
    }
  } catch (error) {
    console.error('重置视图时出错:', error);
  }
};

// 根据颜色选择模型部件
const selectPartsByColor = (color) => {
  if (!model.value) return;
  
  const selectedParts = [];
  const colorHex = color instanceof THREE.Color ? color.getHex() : new THREE.Color(color).getHex();
  
  model.value.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      let matchFound = false;
      
      if (Array.isArray(node.material)) {
        // 材质数组的情况
        node.material.forEach((material) => {
          if (material.color && material.color.getHex() === colorHex) {
            matchFound = true;
            highlightModelMaterial(material);
          }
        });
      } else if (node.material && node.material.color) {
        // 单一材质的情况
        if (node.material.color.getHex() === colorHex) {
          matchFound = true;
          highlightModelMaterial(node.material);
        }
      }
      
      if (matchFound) {
        selectedParts.push(node);
      }
    }
  });
  
  return selectedParts;
};

// 高亮显示选中的部件
const highlightModelMaterial = (material) => {
  // 存储原始颜色（如果还没有存储）
  if (!material.userData.originalColor) {
    material.userData.originalColor = material.color.clone();
  }
  
  // 应用高亮效果（增加发光效果）
  material.emissive = new THREE.Color(0x333333);
  material.emissiveIntensity = 0.5;
  material.needsUpdate = true;
};

// 清除所有高亮效果
const clearHighlights = () => {
  if (!model.value) return;
  
  model.value.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => {
          restoreOriginalMaterial(material);
        });
      } else if (node.material) {
        restoreOriginalMaterial(node.material);
      }
    }
  });
};

// 恢复材质的原始颜色
const restoreOriginalMaterial = (obj) => {
  try {
    // 如果传入的是mesh对象
    if (obj && obj.isMesh) {
      const originalMaterial = nonReactiveObjects.originalMaterials.get(obj.uuid);
      if (originalMaterial) {
        obj.material = originalMaterial;
        nonReactiveObjects.originalMaterials.delete(obj.uuid);
        return;
      }
    }
    
    // 如果传入的是材质对象或者没有找到原始材质，尝试直接修改材质
    const material = obj.isMesh ? obj.material : obj;
    if (material && material.userData && material.userData.originalColor) {
      material.emissive = new THREE.Color(0x000000);
      material.emissiveIntensity = 0;
      material.needsUpdate = true;
    }
  } catch (error) {
    console.error("恢复原始材质错误:", error);
  }
};

// 拍摄当前视图截图
const takeScreenshot = () => {
  if (!renderer.value) return null;
  
  // 确保场景已渲染
  renderScene();
  
  // 创建截图
  const dataURL = renderer.value.domElement.toDataURL('image/png');
  return dataURL;
};

// 获取材质类型
const getMaterialType = (material) => {
  if (!material) return "未知材质";
  
  if (Array.isArray(material)) {
    // 如果是材质数组，返回第一个材质的类型
    if (material.length === 0) return "未知材质";
    return getMaterialType(material[0]);
  }
  
  if (material.isMeshStandardMaterial) return "PBR标准材质";
  if (material.isMeshPhysicalMaterial) return "PBR物理材质";
  if (material.isMeshPhongMaterial) return "Phong材质";
  if (material.isMeshLambertMaterial) return "Lambert材质";
  if (material.isMeshBasicMaterial) return "基础材质";
  if (material.isShaderMaterial) return "着色器材质";
  
  return "其他材质";
};

// 获取对象尺寸
const getObjectDimensions = (object) => {
  if (!object) return "未知尺寸";
  
  try {
    // 创建包围盒
    const box = new THREE.Box3().setFromObject(object);
    // 计算尺寸
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // 格式化尺寸数据
    return `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`;
  } catch (error) {
    console.error("计算对象尺寸出错:", error);
    return "计算错误";
  }
};

// 计算几何体体积
const calculateVolume = (geometry) => {
  if (!geometry) return 0;
  
  try {
    // 如果是BufferGeometry
    if (geometry.isBufferGeometry) {
      // 获取位置属性
      const positionAttribute = geometry.getAttribute('position');
      if (!positionAttribute) return 0;
      
      // 获取索引属性
      const indexAttribute = geometry.getIndex();
      
      let volume = 0;
      
      // 如果有索引属性
      if (indexAttribute) {
        const indices = indexAttribute.array;
        const positions = positionAttribute.array;
        
        // 遍历所有三角形
        for (let i = 0; i < indices.length; i += 3) {
          const i0 = indices[i] * 3;
          const i1 = indices[i+1] * 3;
          const i2 = indices[i+2] * 3;
          
          // 创建三个顶点
          const v0 = new THREE.Vector3(positions[i0], positions[i0+1], positions[i0+2]);
          const v1 = new THREE.Vector3(positions[i1], positions[i1+1], positions[i1+2]);
          const v2 = new THREE.Vector3(positions[i2], positions[i2+1], positions[i2+2]);
          
          // 计算三角形体积
          volume += calculateTriangleVolume(v0, v1, v2);
        }
      } else {
        // 如果没有索引属性，直接使用顶点数据
        const positions = positionAttribute.array;
        
        // 遍历所有三角形
        for (let i = 0; i < positions.length; i += 9) {
          // 创建三个顶点
          const v0 = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
          const v1 = new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]);
          const v2 = new THREE.Vector3(positions[i+6], positions[i+7], positions[i+8]);
          
          // 计算三角形体积
          volume += calculateTriangleVolume(v0, v1, v2);
        }
      }
      
      // 返回绝对值（体积应该是正数）
      return Math.abs(volume);
    }
    
    // 其他类型的几何体
    return 0;
  } catch (error) {
    console.error("计算几何体体积出错:", error);
    return 0;
  }
};

// 计算三角形体积（相对于原点）
const calculateTriangleVolume = (v0, v1, v2) => {
  const v01 = new THREE.Vector3().subVectors(v1, v0);
  const v02 = new THREE.Vector3().subVectors(v2, v0);
  const cross = new THREE.Vector3().crossVectors(v01, v02);
  
  // 体积 = 1/6 * (v0 · (v1 × v2))
  return v0.dot(cross) / 6.0;
};

// 将材质升级为MeshStandardMaterial
const upgradeToStandardMaterial = (meshObject) => {
  if (!meshObject || !meshObject.isMesh) return;
  
  try {
    // 处理材质数组
    if (Array.isArray(meshObject.material)) {
      const newMaterials = [];
      
      meshObject.material.forEach((mat, index) => {
        // 检查空值并创建默认材质
        if (!mat) {
          console.log(`材质[${index}]为空，创建默认材质`);
          mat = new THREE.MeshBasicMaterial({ color: 0x808080 });
        }
        
        // 如果已经是MeshStandardMaterial，则只更新参数
        if (mat.isMeshStandardMaterial) {
          mat.metalness = metalness.value;
          mat.roughness = roughness.value;
          newMaterials.push(mat);
        } else {
          // 创建新的MeshStandardMaterial
          const newMat = new THREE.MeshStandardMaterial({
            color: mat.color ? mat.color.clone() : new THREE.Color(0xcccccc),
            map: mat.map,
            normalMap: mat.normalMap,
            aoMap: mat.aoMap,
            aoMapIntensity: mat.aoMapIntensity,
            emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
            emissiveMap: mat.emissiveMap,
            emissiveIntensity: mat.emissiveIntensity || 1,
            metalness: metalness.value,
            roughness: roughness.value,
            transparent: mat.transparent,
            opacity: mat.opacity,
            side: mat.side || THREE.DoubleSide
          });
          
          // 如果是线框，保持线框状态
          if (showWireframe.value) {
            newMat.wireframe = true;
          }
          
          newMaterials.push(newMat);
        }
      });
      
      meshObject.material = newMaterials;
    } 
    // 处理单个材质
    else if (meshObject.material) {
      const mat = meshObject.material;
      
      // 如果已经是MeshStandardMaterial，则只更新参数
      if (mat.isMeshStandardMaterial) {
        mat.metalness = metalness.value;
        mat.roughness = roughness.value;
        
        // 确保双面渲染
        mat.side = THREE.DoubleSide;
      } else {
        // 创建新的MeshStandardMaterial
        const newMat = new THREE.MeshStandardMaterial({
          color: mat.color ? mat.color.clone() : new THREE.Color(0xcccccc),
          map: mat.map,
          normalMap: mat.normalMap,
          aoMap: mat.aoMap,
          aoMapIntensity: mat.aoMapIntensity,
          emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
          emissiveMap: mat.emissiveMap,
          emissiveIntensity: mat.emissiveIntensity || 1,
          metalness: metalness.value,
          roughness: roughness.value,
          transparent: mat.transparent,
          opacity: mat.opacity,
          side: mat.side || THREE.DoubleSide
        });
        
        meshObject.material = newMat;
      }
    } else {
      // 如果没有材质，创建一个默认材质
      meshObject.material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: metalness.value,
        roughness: roughness.value,
        side: THREE.DoubleSide
      });
    }
  } catch (error) {
    console.error('升级材质时出错:', error);
  }
};

// 在loadModel函数前添加新的loadSpecificModel函数
const loadSpecificModel = async (modelPath) => {
  try {
    console.log(`=== 开始加载特定模型: ${modelPath} ===`);
    // 检查模型路径是否有效
    if (!modelPath) {
      console.error('无效的模型路径');
      loadError.value = '无效的模型路径';
      return;
    }

    // 更新UI状态
    uiStore.setLoading('model', true);
    loadingProgress.value = 0;
    loadError.value = null;
    
    // 清理当前模型
    cleanupModel();
    
    console.log(`开始加载模型: ${modelPath}`);
    
    // 从路径获取模型类型
    const modelType = getModelType(modelPath);
    console.log(`识别到的模型类型: ${modelType}`);
    
    // 使用loadingManager来跟踪进度
    const manager = new THREE.LoadingManager();
    
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      loadingProgress.value = Math.round((itemsLoaded / itemsTotal) * 100);
      console.log(`模型加载进度: ${loadingProgress.value}%`);
    };
    
    manager.onError = (url) => {
      console.error(`资源加载错误: ${url}`);
      loadError.value = `资源加载错误: ${url}`;
    };
    
    // 创建加载器
    let loader;
    let modelUrl = modelPath;
    
    // 处理相对路径和绝对路径
    if (!modelUrl.startsWith('/') && !modelUrl.startsWith('./') && !modelUrl.startsWith('http')) {
      // 使用相对路径
      modelUrl = './' + modelUrl;
    }
    
    console.log(`使用URL: ${modelUrl} 加载模型`);
    
    // 根据模型类型选择加载器
    if (modelType === 'gltf' || modelType === 'glb') {
      const gltfLoader = new GLTFLoader(manager);
      const dracoLoader = new DRACOLoader(manager);
      // 修改DRACO加载器路径，确保能够找到解码器
      dracoLoader.setDecoderPath('/draco/');  // 修改为正确的路径
      gltfLoader.setDRACOLoader(dracoLoader);
      loader = gltfLoader;
    } else if (modelType === 'fbx') {
      loader = new FBXLoader(manager);
    } else if (modelType === 'obj') {
      loader = new OBJLoader(manager);
    } else {
      throw new Error(`不支持的模型类型: ${modelType}`);
    }
    
    // 加载模型
    try {
      console.log(`=== 开始调用加载器加载模型: ${modelUrl} ===`);
      // 使用Promise包装加载过程
      const loadedObject = await new Promise((resolve, reject) => {
        loader.load(
          modelUrl,
          (result) => {
            console.log(`=== 模型加载成功 ===`, result);
            resolve(result);
          },
          (progress) => {
            if (progress.lengthComputable) {
              loadingProgress.value = Math.round((progress.loaded / progress.total) * 100);
              console.log(`加载进度: ${loadingProgress.value}%`);
            }
          },
          (error) => {
            console.error(`=== 模型加载错误 ===`, error);
            reject(error);
          }
        );
      });

      // 处理加载结果
      let modelObject;
      if (modelType === 'gltf' || modelType === 'glb') {
        modelObject = loadedObject.scene;
        console.log('GLTF/GLB模型已加载', loadedObject);
      } else {
        modelObject = loadedObject;
        console.log('其他类型模型已加载', loadedObject);
      }
      
      if (!modelObject) {
        throw new Error('模型加载结果无效');
      }
      
      // 检查模型是否有网格子对象
      let hasMeshes = false;
      modelObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          hasMeshes = true;
        }
      });
      
      if (!hasMeshes) {
        console.warn('模型中未找到网格对象');
      }
      
      // 更新模型引用
      model.value = markRaw(modelObject);
      nonReactiveObjects.model = model.value;
      model.value.name = "loadedModel";
      
      // 将模型添加到场景
      if (!scene.value) {
        throw new Error('场景未初始化');
      }
      
      scene.value.add(model.value);
      console.log('模型已添加到场景');
      
      // 处理模型材质和阴影
      let meshCount = 0;
      model.value.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshCount++;
          console.log(`处理第 ${meshCount} 个Mesh对象:`, child.name || child.uuid);
          
          // 确保几何体有效
          if (!child.geometry) {
            console.warn('网格缺少几何体:', child.name || child.uuid);
            return;
          }
          
          // 确保可见性
          child.visible = true;
          child.castShadow = true;
          child.receiveShadow = true;
          
          // 设置默认材质（如果缺少）
          if (!child.material) {
            console.log('网格缺少材质，创建默认材质');
            child.material = new THREE.MeshStandardMaterial({
              color: 0x808080,
              metalness: metalness.value,
              roughness: roughness.value
            });
          }
          
          // 初始化材质颜色副本
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material, index) => {
                if (material) {
                  // 如果材质缺少颜色，设置默认颜色
                  if (!material.color) {
                    material.color = new THREE.Color(0x808080);
                  }
                  
                  material.userData = material.userData || {};
                  material.userData.originalColor = material.color.clone();
                  console.log(`材质[${index}]颜色:`, material.color);
                }
              });
            } else if (child.material) {
              // 如果材质缺少颜色，设置默认颜色
              if (!child.material.color) {
                child.material.color = new THREE.Color(0x808080);
              }
              
              child.material.userData = child.material.userData || {};
              child.material.userData.originalColor = child.material.color.clone();
              console.log('材质颜色:', child.material.color);
            }
          }
          
          // 将所有材质转换为MeshStandardMaterial，以便应用金属度和粗糙度
          upgradeToStandardMaterial(child);
        }
      });
      
      console.log(`模型中共有 ${meshCount} 个网格对象`);
      
      // 根据模型类型进行特殊处理
      if (modelType === 'fbx') {
        if (model.value && model.value.scale) {
          // FBX模型通常需要缩小
          model.value.scale.set(0.01, 0.01, 0.01);
          console.log('缩小FBX模型比例');
        }
      }
      
      // 更新包围盒
      updateBoundingBox();
      console.log('模型包围盒:', boundingBox.value);
      
      // 自动对焦模型
      resetView();
      
      // 更新模型信息
      updateModelInfo(model.value);
      console.log('模型信息:', modelInfo);
      
      // 提取模型部件信息
      extractPartsList(model.value);
      console.log('模型部件列表:', partsList.value);
      
      // 更新状态
      modelLoaded.value = true;
      currentModel.value = modelPath;
      
      console.log('模型加载和处理完成');
      return model.value;
    } catch (error) {
      console.error(`=== 模型加载过程中出现错误 ===`, error);
      throw new Error(`模型加载过程出错: ${error.message}`);
    }
  } catch (error) {
    console.error(`=== 模型加载完全失败 ===`, error);
    loadError.value = `加载模型失败: ${error.message}`;
    modelLoaded.value = false;
    throw error;
  } finally {
    console.log(`=== 模型加载过程结束 ===`);
    uiStore.setLoading('model', false);
  }
};

// 辅助函数：从路径获取模型名称
const getModelName = (path) => {
  if (!path) return 'Unknown Model';
  const fileName = path.split('/').pop() || path;
  return fileName.replace(/\.[^/.]+$/, '');
};

// 辅助函数：从路径获取模型类型
const getModelType = (path) => {
  if (!path) return 'unknown';
  
  const extension = path.split('.').pop().toLowerCase();
  
  // 根据扩展名确定类型
  if (extension === 'gltf' || extension === 'glb') return 'gltf';
  if (extension === 'obj') return 'obj';
  if (extension === 'fbx') return 'fbx';
  if (extension === 'stl') return 'stl';
  
  return extension;
};

// 新增：在onKeyDown函数后面添加截图相关代码
const showScreenshotToast = ref(false);

// 执行截图
const captureScreenshot = async () => {
  try {
    if (!renderer.value || !modelLoaded.value) {
      console.error('无法截图：渲染器未初始化或模型未加载');
      return;
    }

    // 使用UI store表示正在截图
    uiStore.setLoading('screenshot', true);

    // 准备截图前的设置 - 可选择性隐藏UI元素
    let uiElements = [];
    if (!screenshotStore.getSettings.captureUI) {
      // 临时隐藏UI组件
      uiElements = document.querySelectorAll('.controls-panel, .parts-panel, .model-info-panel, .model-selector');
      uiElements.forEach(el => {
        el.style.display = 'none';
      });
    }
    
    // 强制渲染一帧，确保场景最新状态
    if (nonReactiveObjects.renderer && nonReactiveObjects.scene && nonReactiveObjects.camera) {
      nonReactiveObjects.renderer.render(nonReactiveObjects.scene, nonReactiveObjects.camera);
    }

    // 获取截图
    const dataURL = renderer.value.domElement.toDataURL(
      screenshotStore.getSettings.format === 'png' ? 'image/png' : 'image/jpeg',
      screenshotStore.getSettings.quality
    );

    // 恢复UI元素
    uiElements.forEach(el => {
      el.style.display = '';
    });

    // 创建缩略图版本
    const thumbnailDataURL = await createThumbnail(dataURL);

    // 准备模型信息
    const modelInfoData = {
      name: getModelName(currentModel.value),
      path: currentModel.value,
      type: getModelType(currentModel.value),
      vertices: modelInfo.vertices,
      faces: modelInfo.faces,
      materials: modelInfo.materials,
      dimensions: modelInfo.dimensions
    };

    // 添加到截图存储
    const screenshotId = screenshotStore.addScreenshot({
      imageData: dataURL,
      thumbnailData: thumbnailDataURL,
      resolution: screenshotStore.getSettings.resolution,
      format: screenshotStore.getSettings.format,
      modelInfo: modelInfoData,
      tags: ['3D视图'],
      note: `${modelInfoData.name} 模型截图`,
      size: estimateImageSize(dataURL)
    });

    // 显示成功提示
    showScreenshotToast.value = true;
    setTimeout(() => {
      showScreenshotToast.value = false;
    }, 3000);

    console.log('截图保存成功，ID:', screenshotId);
  } catch (error) {
    console.error('截图过程中出错:', error);
  } finally {
    uiStore.setLoading('screenshot', false);
  }
};

// 创建缩略图
const createThumbnail = (dataURL, maxWidth = 256, maxHeight = 256) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // 获取缩略图数据URL
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = reject;
    img.src = dataURL;
  });
};

// 估算图像大小
const estimateImageSize = (dataURL) => {
  const head = 'data:image/png;base64,';
  const imgData = dataURL.substring(head.length);
  const strLength = imgData.length;
  return Math.floor((strLength - (strLength / 8) * 2) / 4) * 3;
};

// 添加键盘快捷键处理
const onKeyDown = (event) => {
  // 已有的键盘处理代码...

  // 添加截图快捷键 (按S键)
  if (event.key === 's' || event.key === 'S') {
    if (!event.ctrlKey && !event.metaKey) { // 避免与保存快捷键冲突
      captureScreenshot();
    }
  }
};

// 新增：更新材质属性
const updateMaterial = () => {
  if (!model.value) return;
  
  // 使用materialStore更新材质
  if (materialStore.getSelectedMaterial) {
    materialStore.updateMaterial(materialStore.getSelectedMaterial.id, {
      properties: {
        metalness: metalness.value,
        roughness: roughness.value
      }
    });
  }
  
  // 同时更新模型上的所有材质
  model.value.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => {
          if (material && material.isMeshStandardMaterial) {
            material.metalness = metalness.value;
            material.roughness = roughness.value;
            material.needsUpdate = true;
          }
        });
      } else if (object.material && object.material.isMeshStandardMaterial) {
        object.material.metalness = metalness.value;
        object.material.roughness = roughness.value;
        object.material.needsUpdate = true;
      }
    }
  });
};
</script>

<style scoped>
/* 这些全局样式已经在App.vue中设置，在这里移除
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100%;
  display: flex;
  flex-direction: column;
}
*/

.model-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #222;
  overflow: hidden;
  border: none;
  display: flex;
  flex-direction: column;
}

#model-viewer {
  width: 100%;
  flex: 1;
  margin: 0;
  padding: 0;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 18px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  position: absolute;
  top: 10px;
  left: 10px;
  color: #ff4444;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  max-width: 80%;
}

.controls-panel {
  position: absolute;
  right: 10px;
  top: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  color: white;
  max-width: 200px;
}

.control-group {
  margin-bottom: 15px;
}

.control-group h3 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.control-group button {
  display: block;
  width: 100%;
  padding: 5px 10px;
  margin-bottom: 5px;
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.control-group button:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  cursor: pointer;
}

.control-group input[type="checkbox"] {
  margin-right: 5px;
}

.slider-container {
  margin-bottom: 10px;
}

.slider-container label {
  display: block;
  margin-bottom: 2px;
}

.slider-container input[type="range"] {
  width: 100%;
  margin: 5px 0;
}

.model-info-panel {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  max-width: 200px;
}

.model-info-panel h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.info-item span:first-child {
  color: #aaa;
  margin-right: 10px;
}

/* 新增：部件列表面板样式 */
.parts-panel {
  position: absolute;
  right: 195px;
  top: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  color: white;
  width: 200px;
  max-height: 50%;
  display: flex;
  flex-direction: column;
}

.parts-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  text-align: center;
}

.search-box {
  margin-bottom: 10px;
}

.search-box input {
  width: 100%;
  padding: 5px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.parts-list {
  overflow-y: auto;
  flex-grow: 1;
}

.part-item {
  padding: 6px 8px;
  margin-bottom: 2px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.part-item:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.part-item.active {
  background-color: rgba(255, 149, 0, 0.3);
  border-left: 3px solid #ff9500;
}

.part-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* 新增：部件详情面板样式 */
.part-details-panel {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  color: white;
  width: 250px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

.details-content {
  font-size: 12px;
}

.detail-item {
  display: flex;
  margin-bottom: 5px;
}

.detail-item span:first-child {
  color: #aaa;
  width: 70px;
  flex-shrink: 0;
}

.detail-item span:last-child {
  flex-grow: 1;
}

/* 新增：悬停提示样式 */
.hover-info {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}

/* 为部件列表添加滚动条样式 */
.parts-list::-webkit-scrollbar {
  width: 6px;
}

.parts-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.parts-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.parts-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.no-parts {
  text-align: center;
  padding: 10px;
  color: #999;
  font-style: italic;
  font-size: 12px;
}

/* 新增：性能信息面板样式 */
.performance-info {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.performance-info .info-item span:first-child {
  color: #ffaa44;
}

/* 移动设备响应式优化 */
@media (max-width: 768px) {
  .controls-panel, .parts-panel, .part-details-panel, .model-info-panel {
    max-width: 180px;
    font-size: 11px;
  }
  
  .parts-panel {
    max-height: 40%;
  }
  
  .control-group h3, .parts-panel h3, .panel-header h3, .model-info-panel h3 {
    font-size: 12px;
  }
}

/* 简化率滑块特殊样式 */
input[type="range"][v-model="simplificationRatio"] {
  accent-color: #ff5500;
}

/* 重新加载按钮样式 */
.control-group button[type="button"] {
  transition: all 0.2s;
}

.control-group button:active {
  transform: scale(0.95);
}

.retry-button {
  margin-top: 10px;
  background-color: #ff5500;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.retry-button:hover {
  background-color: #ff7700;
}

/* 新增模型选择器样式 */
.model-selector {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  color: white;
  max-width: 300px;
  z-index: 10;
}

.model-category {
  margin-bottom: 10px;
}

.model-category h3 {
  color: white;
  margin: 0 0 5px 0;
  font-size: 14px;
}

.model-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.model-buttons button {
  padding: 5px 8px;
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.model-buttons button:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

.model-buttons button.active {
  background-color: rgba(0, 150, 255, 0.5);
  border-color: rgba(0, 150, 255, 0.8);
}

/* 新增：截图按钮样式 */
.screenshot-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background-color: #2c8af1 !important;
  color: white;
  font-weight: bold;
  transition: all 0.2s;
}

.screenshot-btn:hover {
  background-color: #1c6cd1 !important;
  transform: scale(1.05);
}

.screenshot-btn .icon {
  font-size: 16px;
}

/* 新增：截图成功提示样式 */
.screenshot-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  animation: toastFadeIn 0.3s, toastFadeOut 0.3s 2.7s;
  z-index: 1000;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toast-content .icon {
  color: #4CAF50;
  font-size: 20px;
}

@keyframes toastFadeIn {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes toastFadeOut {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, 20px); }
}
</style> 