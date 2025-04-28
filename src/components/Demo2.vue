<template>
  <div class="model-container">
    <div id="model-viewer"></div>
    <div class="loading-indicator" v-if="!modelLoaded">
      <div class="spinner"></div>
      <span>加载中... {{ loadingProgress }}%</span>
    </div>
    <div class="error-message" v-if="loadError">{{ loadError }}</div>
    
    <!-- 模型选择器 -->
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
      
      <div class="control-group" v-if="hasAnimations">
        <h3>动画控制</h3>
        <button @click="toggleAnimation">
          {{ isPlaying ? '暂停' : '播放' }}
        </button>
        <input 
          type="range" 
          v-model="animationSpeed" 
          min="0.1" 
          max="2" 
          step="0.1"
          @input="updateAnimationSpeed"
        >
        <span>速度: {{ animationSpeed }}x</span>
      </div>

      <div class="control-group">
        <h3>工具</h3>
        <button @click="captureScreenshot">截图</button>
      </div>
    </div>
    
    <!-- 性能监控 -->
    <div class="performance-monitor" v-if="showPerformance">
      <div>FPS: {{ fps }}</div>
      <div>内存: {{ memoryUsage }} MB</div>
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
    </div>
  </div>
</template>

<script lang="ts">
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { ToneMapShader } from "three/examples/jsm/shaders/ToneMapShader.js";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { shallowRef, defineComponent, markRaw } from "vue";

// 类型定义
interface ModelCategory {
  name: string;
  path: string;
}

interface ModelCategories {
  [key: string]: ModelCategory[];
}

interface NonReactiveObjects {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  model: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  composer: THREE.EffectComposer | null;
}

interface ModelInfo {
  vertices: number;
  faces: number;
  materials: number;
  dimensions: string;
}

export default defineComponent({
  name: "Demo2",
  data() {
    return {
      scene: null as THREE.Scene | null,
      camera: null as THREE.PerspectiveCamera | null,
      renderer: null as THREE.WebGLRenderer | null,
      controls: null as OrbitControls | null,
      model: null as THREE.Object3D | null,
      mixer: null as THREE.AnimationMixer | null,
      animationFrameId: null as number | null,
      clock: new THREE.Clock(),
      initialCameraPosition: new THREE.Vector3(0, 5, 10),
      modelLoaded: false,
      loadError: null as string | null,
      loadingProgress: 0,
      nonReactiveObjects: {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        model: null,
        mixer: null,
        composer: null
      } as NonReactiveObjects,
      fitCameraToObject: null as ((object: THREE.Object3D, offset?: number) => void) | null,
      currentModel: "STEP203.fbx",
      showGrid: true,
      showAxes: true,
      showBoundingBox: false,
      hasAnimations: false,
      isPlaying: false,
      animationSpeed: 1,
      fps: 0,
      memoryUsage: 0,
      showPerformance: true,
      lastTime: 0,
      frameCount: 0,
      modelCategories: {
        '船舶模型': [
          { name: 'STEP203模型', path: 'STEP203.fbx' },
          { name: '船模型 (GLTF)', path: '6.gltf' },
          { name: '船模型1 (FBX)', path: 'ship1.fbx' },
          { name: '备用模型 (GLTF)', path: 'untitled.gltf' }
        ],
        '其他模型': [
          { name: '1号模型 (FBX)', path: '1.fbx' },
          { name: '2号模型 (FBX)', path: '2.fbx' },
          { name: 'PrimaryIonDrive', path: 'PrimaryIonDrive.glb' },
          { name: 'UI模型', path: 'ui.fbx' },
          { name: '机器模型', path: 'machine.fbx' }
        ]
      },
      modelInfo: {
        vertices: 0,
        faces: 0,
        materials: 0,
        dimensions: '0 x 0 x 0'
      } as ModelInfo,
    };
  },
  mounted() {
    this.initThreeJS();
    this.loadModel();
    window.addEventListener("resize", this.onWindowResize);
    this.startPerformanceMonitoring();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
    this.cleanup();
  },
  methods: {
    initThreeJS() {
      try {
        const scene = markRaw(new THREE.Scene());
        scene.background = new THREE.Color(0x222222);
        
        // 优化环境光照
        const ambientLight = markRaw(new THREE.AmbientLight(0xffffff, 0.4));
        scene.add(ambientLight);

        // 主平行光（模拟太阳光）
        const mainLight = markRaw(new THREE.DirectionalLight(0xffffff, 1.0));
        mainLight.position.set(5, 10, 7.5);
        mainLight.castShadow = true;
        // 优化阴影质量
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 500;
        mainLight.shadow.bias = -0.0001;
        mainLight.shadow.normalBias = 0.02;
        // 调整阴影相机范围
        mainLight.shadow.camera.left = -50;
        mainLight.shadow.camera.right = 50;
        mainLight.shadow.camera.top = 50;
        mainLight.shadow.camera.bottom = -50;
        scene.add(mainLight);

        // 添加填充光（背光）
        const fillLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.4));
        fillLight.position.set(-5, 5, -7.5);
        scene.add(fillLight);

        // 添加环境半球光（提供更自然的环境光照）
        const hemiLight = markRaw(new THREE.HemisphereLight(0xffffff, 0x444444, 0.4));
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        // 添加地面反射光
        const groundLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.2));
        groundLight.position.set(0, -10, 0);
        scene.add(groundLight);

        // 直接保存到非响应式对象中，不使用Vue的响应式
        this.nonReactiveObjects.scene = scene;
        this.scene = scene;
        
        // 获取容器并设置相机
        const container = document.getElementById("model-viewer");
        if (!container) {
          throw new Error("找不到model-viewer容器元素");
        }

        // 设置相机
        const camera = markRaw(new THREE.PerspectiveCamera(
          45,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        ));
        camera.position.copy(this.initialCameraPosition);
        camera.lookAt(0, 0, 0);
        
        // 直接保存到非响应式对象中，不使用Vue的响应式引用
        this.nonReactiveObjects.camera = camera;
        this.camera = camera;

        // 创建渲染器
        const renderer = markRaw(new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          logarithmicDepthBuffer: true,
          powerPreference: "high-performance"
        }));
        
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        
        // 直接保存到非响应式对象中，不使用Vue的响应式引用
        this.nonReactiveObjects.renderer = renderer;
        this.renderer = renderer;

        container.appendChild(renderer.domElement);

        // 设置轨道控制器
        const controls = markRaw(new OrbitControls(camera, renderer.domElement));
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = true;
        controls.minDistance = 2;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 1.5;
        controls.update();
        
        // 直接保存到非响应式对象中，不使用Vue的响应式引用
        this.nonReactiveObjects.controls = controls;
        this.controls = controls;

        // 添加网格辅助线
        const gridHelper = markRaw(new THREE.GridHelper(20, 20, 0x555555, 0x333333));
        gridHelper.name = "gridHelper";
        scene.add(gridHelper);

        // 添加坐标轴辅助
        const axesHelper = markRaw(new THREE.AxesHelper(5));
        axesHelper.name = "axesHelper";
        scene.add(axesHelper);

        // 修改fitCameraToObject方法
        this.fitCameraToObject = (object, offset = 1.5) => {
          const camera = this.nonReactiveObjects.camera;
          const controls = this.nonReactiveObjects.controls;
          
          if (!camera) return;
          
          const box = new THREE.Box3().setFromObject(object);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * offset;

          camera.position.set(center.x, center.y, center.z + cameraZ);
          camera.lookAt(center);
          camera.updateProjectionMatrix();

          if (controls) {
            controls.target.copy(center);
            controls.update();
          }
        };

        // 开始动画循环
        const animate = () => {
          this.animationFrameId = requestAnimationFrame(animate);
          
          // 使用非响应式对象来避免 Vue 的 Proxy 问题
          const camera = this.nonReactiveObjects.camera;
          const scene = this.nonReactiveObjects.scene;
          const renderer = this.nonReactiveObjects.renderer;
          const controls = this.nonReactiveObjects.controls;
          const mixer = this.nonReactiveObjects.mixer;
          
          if (controls) {
            controls.update();
          }

          if (mixer) {
            const delta = this.clock.getDelta();
            mixer.update(delta * this.animationSpeed);
          }

          if (scene && camera && renderer) {
            renderer.render(scene, camera);
          }
          
          // 更新性能监控
          this.updatePerformanceMetrics();
        };
        
        animate();
      } catch (err) {
        console.error("初始化Three.js错误:", err);
        this.loadError = `初始化错误: ${err.message}`;
      }
    },
    // 加载模型
    loadModel() {
      this.loadSpecificModel(this.currentModel);
    },
    // 加载特定模型
    loadSpecificModel(modelPath) {
      this.currentModel = modelPath;
      this.modelLoaded = false;
      this.loadError = null;
      this.loadingProgress = 0;
      
      console.log(`开始加载模型: ${modelPath}`);
      
      // 清理旧模型资源
      this.cleanupModel();
      
      // 判断文件类型并使用适当的加载器
      const fileExtension = modelPath.split('.').pop().toLowerCase();
      
      if (fileExtension === 'gltf' || fileExtension === 'glb') {
        this.loadGLTFModel(modelPath);
      } else if (fileExtension === 'fbx') {
        this.loadFBXModel(modelPath);
      } else {
        this.loadError = `不支持的文件格式: ${fileExtension}`;
        console.error(this.loadError);
      }
    },
    // 加载GLTF模型
    loadGLTFModel(modelPath) {
      console.log(`开始加载GLTF模型: ${modelPath}`);
      const loader = new GLTFLoader();
      
      // 添加DRACO压缩支持
      const dracoLoader = new DRACOLoader();
      // 使用官方CDN
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      dracoLoader.setDecoderConfig({ type: 'js' });
      loader.setDRACOLoader(dracoLoader);
      
      loader.load(
        modelPath,
        (gltf) => {
          try {
            console.log(`模型 ${modelPath} 加载成功:`, {
              animations: gltf.animations?.length || 0,
              scenes: gltf.scenes?.length || 0,
              cameras: gltf.cameras?.length || 0,
              assets: gltf.asset
            });
            
            if (!gltf.scene) {
              throw new Error("加载的模型没有场景数据");
            }
            
            // 使用markRaw防止Vue的响应式系统代理Three.js对象
            const scene = markRaw(gltf.scene);
            const animations = gltf.animations ? gltf.animations.map(anim => markRaw(anim)) : [];
            
            this.processModel(scene);
            
            // 设置动画
            if (animations && animations.length) {
              this.setupAnimations(scene, animations);
            }
          } catch (err) {
            console.error("模型处理错误:", err);
            this.loadError = `模型处理错误: ${err.message}`;
          }
        },
        (xhr) => {
          const percent = xhr.loaded / xhr.total;
          this.loadingProgress = Math.round(percent * 100);
          console.log(`加载进度: ${this.loadingProgress}%`);
        },
        (error) => {
          console.error(`模型 ${modelPath} 加载错误:`, error);
          this.loadError = `模型加载错误: ${error.message || "未知错误"}`;
          // 检查常见错误
          if (error.message.includes("404")) {
            this.loadError = `找不到模型文件: ${modelPath}，请检查文件路径是否正确`;
          } else if (error.message.includes("Failed to load resource")) {
            this.loadError = `加载资源失败: ${modelPath}，请检查文件格式是否正确`;
          } else if (error.message.includes("Unexpected token")) {
            this.loadError = `模型文件格式错误: ${modelPath}，请确保文件未损坏`;
          }
        }
      );
    },
    // 加载FBX模型
    loadFBXModel(modelPath) {
      const loader = new FBXLoader();
      loader.load(
        modelPath,
        (fbx) => {
          try {
            console.log(`模型 ${modelPath} 加载成功`);
            
            // 使用markRaw防止Vue的响应式系统代理Three.js对象
            const model = markRaw(fbx);
            const animations = fbx.animations ? fbx.animations.map(anim => markRaw(anim)) : [];
            
            this.processModel(model);
            
            // 设置动画
            if (animations && animations.length) {
              this.setupAnimations(model, animations);
            }
          } catch (err) {
            console.error("FBX模型处理错误:", err);
            this.loadError = `FBX模型处理错误: ${err.message}`;
          }
        },
        (xhr) => {
          this.loadingProgress = Math.round((xhr.loaded / xhr.total) * 100);
        },
        (error) => {
          console.error(`FBX模型 ${modelPath} 加载错误:`, error);
          this.loadError = `FBX模型加载错误: ${error.message || "未知错误"}`;
        }
      );
    },
    // 处理模型
    processModel(model) {
      try {
        // Ensure model is not reactive
        model = markRaw(model);
        
        const scene = this.nonReactiveObjects.scene;
        if (!scene) {
          throw new Error("场景未初始化");
        }

        // 清除旧模型
        const oldModel = scene.getObjectByName("loadedModel");
        if (oldModel) {
          scene.remove(oldModel);
        }
        
        // 设置模型名称
        model.name = "loadedModel";
        
        // 计算包围盒
        const box = markRaw(new THREE.Box3().setFromObject(model));
        const size = markRaw(new THREE.Vector3());
        const center = markRaw(new THREE.Vector3());
        box.getSize(size);
        box.getCenter(center);
        
        // 计算合适的缩放比例
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 5 / maxDim : 1;
        
        // 设置模型变换
        model.scale.setScalar(scale);
        model.position.copy(center).multiplyScalar(-scale);
        
        // 优化模型
        model.traverse((object) => {
          if (object.isMesh) {
            // 优化几何体
            if (object.geometry) {
              // 计算法线
              object.geometry.computeVertexNormals();
              if (!object.geometry.attributes.uv) {
                object.geometry.computeVertexNormals();
              }
              
              // 使用 BufferGeometryUtils 合并顶点 (如果需要)
              // 注意：现代版本的 three.js 中，这是可选的，只有在特定场景下才需要
              try {
                // 仅在必要时应用合并顶点
                if (object.geometry.attributes.position && 
                    object.geometry.attributes.position.count > 1000) {
                  // 使用正确的 BufferGeometryUtils.mergeVertices
                  object.geometry = BufferGeometryUtils.mergeVertices(object.geometry);
                }
              } catch (err) {
                console.warn("合并顶点失败，跳过此步骤:", err);
              }
            }
            
            // 设置默认PBR材质
            if (!object.material) {
              object.material = new THREE.MeshStandardMaterial({
                color: 0x808080,
                metalness: 0.5,
                roughness: 0.5,
                envMapIntensity: 1.0
              });
            }
            
            // 优化材质
            if (object.material) {
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach(material => {
                // 基础材质设置
                material.side = THREE.DoubleSide;
                material.needsUpdate = true;
                
                // 启用阴影
                object.castShadow = true;
                object.receiveShadow = true;
                
                // 优化PBR材质参数
                if (material instanceof THREE.MeshStandardMaterial) {
                  material.envMapIntensity = 1.0;
                  material.roughness = Math.min(Math.max(material.roughness, 0.2), 0.8);
                  material.metalness = Math.min(Math.max(material.metalness, 0.1), 0.9);
                }
                
                // 优化纹理
                if (material.map) {
                  material.map.anisotropy = 16;
                  material.map.minFilter = THREE.LinearMipmapLinearFilter;
                  material.map.magFilter = THREE.LinearFilter;
                  material.map.needsUpdate = true;
                }
                
                // 优化法线贴图
                if (material.normalMap) {
                  material.normalMap.anisotropy = 16;
                  material.normalScale.set(1, 1);
                }
                
                // 优化环境遮挡贴图
                if (material.aoMap) {
                  material.aoMap.anisotropy = 16;
                  material.aoMapIntensity = 1.0;
                }
              });
            }
          }
        });

        // 添加到场景
        scene.add(model);
        
        // 更新包围盒辅助对象
        const boundingBox = markRaw(new THREE.BoxHelper(model, 0xff0000));
        boundingBox.name = "modelBoxHelper";
        boundingBox.visible = this.showBoundingBox;
        scene.add(boundingBox);
        
        // 添加地面阴影接收平面
        const groundGeometry = markRaw(new THREE.PlaneGeometry(100, 100));
        const groundMaterial = markRaw(new THREE.ShadowMaterial({ opacity: 0.3 }));
        const ground = markRaw(new THREE.Mesh(groundGeometry, groundMaterial));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = box.min.y;
        ground.receiveShadow = true;
        ground.name = "shadowGround";
        scene.add(ground);
        
        // 调整相机视角
        this.fitCameraToObject(model, 1.5);
        
        // 强制渲染一帧
        const renderer = this.nonReactiveObjects.renderer;
        const camera = this.nonReactiveObjects.camera;
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
        
        this.modelLoaded = true;
        this.loadError = null;
        
        // 更新模型信息
        this.updateModelInfo(model);
        
      } catch (err) {
        console.error("处理模型时出错:", err);
        this.loadError = `处理模型错误: ${err.message}`;
        throw err;
      }
    },
    // 优化材质
    optimizeMaterial(material) {
      material.transparent = false;
      material.opacity = 1.0;
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
      
      // 添加环境光遮蔽
      if (material.aoMap) {
        material.aoMapIntensity = 1.0;
      }
      
      // 添加法线贴图
      if (material.normalMap) {
        material.normalScale.set(1, 1);
      }
    },
    // 设置动画
    setupAnimations(model, animations) {
      this.hasAnimations = animations.length > 0;
      if (this.hasAnimations) {
        const mixer = markRaw(new THREE.AnimationMixer(model));
        this.nonReactiveObjects.mixer = mixer;
        this.mixer = mixer; // The keep the property for compatibility
        
        const action = mixer.clipAction(animations[0]);
        action.play();
        this.isPlaying = true;
      }
    },
    // 切换动画播放状态
    toggleAnimation() {
      const mixer = this.nonReactiveObjects.mixer;
      if (mixer) {
        if (this.isPlaying) {
          mixer.stopAllAction();
        } else {
          const actions = mixer._actions;
          if (actions.length > 0) {
            actions[0].play();
          }
        }
        this.isPlaying = !this.isPlaying;
      }
    },
    // 更新动画速度
    updateAnimationSpeed() {
      const mixer = this.nonReactiveObjects.mixer;
      if (mixer) {
        mixer.timeScale = this.animationSpeed;
      }
    },
    // 清理模型资源
    cleanupModel() {
      const scene = this.nonReactiveObjects.scene;
      if (!scene) return;
      
      const oldModel = scene.getObjectByName("loadedModel");
      if (oldModel) {
        scene.remove(oldModel);
        
        // 递归处理模型以释放内存
        oldModel.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => {
                disposeMaterial(material);
              });
            } else {
              disposeMaterial(object.material);
            }
          }
        });
      }

      const oldBoxHelper = scene.getObjectByName("modelBoxHelper");
      if (oldBoxHelper) {
        scene.remove(oldBoxHelper);
      }

      // 清理动画混合器
      const mixer = this.nonReactiveObjects.mixer;
      if (mixer) {
        mixer.stopAllAction();
        this.nonReactiveObjects.mixer = null;
        this.mixer = null;
      }
      
      // 辅助函数来处理材质及其相关纹理
      function disposeMaterial(material) {
        if (!material) return;
        
        // 处理材质纹理
        if (material.map) material.map.dispose();
        if (material.lightMap) material.lightMap.dispose();
        if (material.bumpMap) material.bumpMap.dispose();
        if (material.normalMap) material.normalMap.dispose();
        if (material.displacementMap) material.displacementMap.dispose();
        if (material.specularMap) material.specularMap.dispose();
        if (material.emissiveMap) material.emissiveMap.dispose();
        if (material.alphaMap) material.alphaMap.dispose();
        if (material.aoMap) material.aoMap.dispose();
        if (material.metalnessMap) material.metalnessMap.dispose();
        if (material.roughnessMap) material.roughnessMap.dispose();
        if (material.envMap) material.envMap.dispose();
        
        // 释放材质本身
        material.dispose();
      }
    },
    // 清理所有资源
    cleanup() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      // 获取非响应式引用
      const renderer = this.nonReactiveObjects.renderer;
      const scene = this.nonReactiveObjects.scene;
      const controls = this.nonReactiveObjects.controls;

      // 清理模型资源
      this.cleanupModel();

      // 清理渲染器
      if (renderer) {
        renderer.dispose();
        const container = document.getElementById("model-viewer");
        if (container && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }

      // 清理控制器
      if (controls) {
        controls.dispose();
      }

      // 清理场景
      if (scene) {
        scene.clear();
      }
      
      // 重置非响应式对象
      this.nonReactiveObjects = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        model: null,
        mixer: null,
        composer: null
      };
    },
    // 性能监控
    startPerformanceMonitoring() {
      this.lastTime = performance.now();
      this.frameCount = 0;
    },
    updatePerformanceMetrics() {
      this.frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - this.lastTime >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
        
        if (performance && 'memory' in performance) {
          this.memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024)) || 0;
        } else {
          this.memoryUsage = 0;
        }
        
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
    },
    // 窗口大小调整
    onWindowResize() {
      try {
        const container = document.getElementById("model-viewer");
        if (!container) return;
        
        const camera = this.nonReactiveObjects.camera;
        const renderer = this.nonReactiveObjects.renderer;
        
        if (!camera || !renderer) return;

        // 更新相机
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        
        // 更新渲染器
        renderer.setSize(container.clientWidth, container.clientHeight);
      } catch (err) {
        console.error("窗口大小调整错误:", err);
      }
    },
    // 相机控制方法
    rotateCameraLeft() {
      const controls = this.nonReactiveObjects.controls;
      if (controls) {
        controls.rotateLeft(Math.PI / 12);
        controls.update();
      }
    },
    rotateCameraRight() {
      const controls = this.nonReactiveObjects.controls;
      if (controls) {
        controls.rotateLeft(-Math.PI / 12);
        controls.update();
      }
    },
    zoomIn() {
      const controls = this.nonReactiveObjects.controls;
      if (controls) {
        controls.dollyIn(1.2);
        controls.update();
      }
    },
    zoomOut() {
      const controls = this.nonReactiveObjects.controls;
      if (controls) {
        controls.dollyOut(1.2);
        controls.update();
      }
    },
    resetCamera() {
      const camera = this.nonReactiveObjects.camera;
      const controls = this.nonReactiveObjects.controls;
      
      if (camera && controls) {
        camera.position.copy(this.initialCameraPosition);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
      }
    },
    // 更新模型信息
    updateModelInfo(model: THREE.Object3D) {
      let vertices = 0;
      let faces = 0;
      let materials = 0;

      model.traverse((object) => {
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

      const box = markRaw(new THREE.Box3().setFromObject(model));
      const size = markRaw(new THREE.Vector3());
      box.getSize(size);
      
      this.modelInfo = {
        vertices,
        faces,
        materials,
        dimensions: `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`
      };
    },
    // 截图功能
    captureScreenshot() {
      try {
        const scene = this.nonReactiveObjects.scene;
        const camera = this.nonReactiveObjects.camera;
        const renderer = this.nonReactiveObjects.renderer;
        
        if (!renderer || !scene || !camera) {
          throw new Error("渲染器未初始化");
        }

        // 强制渲染一帧
        renderer.render(scene, camera);
        
        // 获取画布数据
        const canvas = renderer.domElement;
        const dataURL = canvas.toDataURL('image/png');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `model-screenshot-${new Date().getTime()}.png`;
        link.href = dataURL;
        link.click();
        
        console.log("截图已保存");
      } catch (err) {
        console.error("截图错误:", err);
        this.loadError = `截图错误: ${err.message}`;
      }
    },
    // 切换网格显示
    toggleGrid() {
      const scene = this.nonReactiveObjects.scene;
      if (scene) {
        const gridHelper = scene.getObjectByName("gridHelper");
        if (gridHelper) {
          gridHelper.visible = this.showGrid;
        }
      }
    },

    // 切换坐标轴显示
    toggleAxes() {
      const scene = this.nonReactiveObjects.scene;
      if (scene) {
        const axesHelper = scene.getObjectByName("axesHelper");
        if (axesHelper) {
          axesHelper.visible = this.showAxes;
        }
      }
    },

    // 切换包围盒显示
    toggleBoundingBox() {
      const scene = this.nonReactiveObjects.scene;
      if (scene) {
        const boundingBox = scene.getObjectByName("modelBoxHelper");
        if (boundingBox) {
          boundingBox.visible = this.showBoundingBox;
        }
      }
    },
  }
});
</script>

<style scoped>
.model-container {
  width: 100%;
  height: 600px;
  position: relative;
  background-color: #222;
  overflow: hidden;
  border: 1px solid #444;
}

#model-viewer {
  width: 100%;
  height: 100%;
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

.model-selector {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  max-width: 300px;
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
  padding: 5px 10px;
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

.control-group input[type="range"] {
  width: 100%;
  margin: 5px 0;
}

.performance-monitor {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 5px 10px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
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
</style>
