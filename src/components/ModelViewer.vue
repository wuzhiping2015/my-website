<template>
  <div class="model-viewer-container">
    <!-- 3D渲染区域 -->
    <div class="renderer-container" ref="containerRef"></div>
    
    <!-- 加载指示器 -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载模型中... {{ Math.round(loadProgress) }}%</div>
    </div>
    
    <!-- 错误提示 -->
    <div class="error-message" v-if="loadError">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span>{{ loadError.message || loadError }}</span>
        <el-button size="small" type="primary" @click="retryLoading">重试</el-button>
      </div>
    </div>
    
    <!-- 悬浮控制面板 -->
    <div class="control-panel" :class="{ 'panel-collapsed': isPanelCollapsed }">
      <div class="panel-header">
        <h3>模型查看器控制面板</h3>
        <button class="collapse-btn" @click="isPanelCollapsed = !isPanelCollapsed">
          {{ isPanelCollapsed ? '展开' : '收起' }}
        </button>
      </div>
      
      <div class="panel-content" v-if="!isPanelCollapsed">
        <el-collapse v-model="activePanel">
          <!-- 模型选择面板 -->
          <el-collapse-item title="选择模型" name="model-select">
            <div class="model-buttons">
              <el-button 
                v-for="(model, index) in modelList" 
                :key="index"
                :disabled="isLoading"
                @click="loadModelByIndex(index)"
                :class="{ 'active-model': currentModelIndex === index }"
              >
                {{ model.name || `模型${index + 1}` }}
              </el-button>
            </div>
          </el-collapse-item>
          
          <!-- 模型动画控制 -->
          <el-collapse-item title="模型自带动画" name="animation">
            <el-button
              :disabled="!currentModel"
              @click="toggleAnimation"
            >
              {{ isAnimationPlaying ? "已启用" : "已关闭" }}
            </el-button>
          </el-collapse-item>
          
          <!-- 模型操作 -->
          <el-collapse-item title="模型操作" name="operations">
            <div class="operation-buttons">
              <el-button
                :disabled="!currentModel || isLoading"
                v-if="!isModelDecomposed"
                @click="decomposeCurrentModel"
              >拆解模型</el-button>
              
              <el-button
                :disabled="!currentModel || isLoading"
                v-if="isModelDecomposed"
                @click="mergeCurrentModel"
              >合并模型</el-button>
              
              <el-button
                :disabled="!currentModel || isLoading"
                @click="applyRandomColor"
              >随机颜色</el-button>
              
              <el-button
                :disabled="!currentModel || isLoading"
                @click="resetModelColor"
              >原始颜色</el-button>
              
              <el-button
                :disabled="!currentModel || isLoading"
                @click="toggleVertexColors"
              >
                {{ isVertexColorsEnabled ? "关闭模型顶点颜色" : "启用模型顶点颜色" }}
              </el-button>
            </div>
          </el-collapse-item>
          
          <!-- 显示设置 -->
          <el-collapse-item title="显示设置" name="display">
            <div class="display-options">
              <el-switch
                v-model="showGrid"
                @change="toggleGrid"
                active-text="显示网格"
              ></el-switch>
              
              <el-switch
                v-model="showAxes"
                @change="toggleAxes"
                active-text="显示坐标轴"
              ></el-switch>
              
              <el-switch
                v-model="showWireframe"
                @change="toggleWireframe"
                active-text="线框模式"
              ></el-switch>
            </div>
          </el-collapse-item>
          
          <!-- 部件列表 -->
          <el-collapse-item title="部件列表" name="parts">
            <div class="parts-list">
              <div v-if="partsList.length === 0" class="no-parts">暂无可用部件</div>
              
              <div
                v-for="(part, index) in partsList"
                :key="part.id"
                class="part-item"
                @mouseenter="selectPart(part)"
                @click="showPartDetails(part)"
              >
                <span>{{ part.name || `部件_${index + 1}` }}</span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
    
    <!-- 部件详情对话框 -->
    <el-dialog
      title="部件信息"
      v-model="isPartDetailsVisible"
      width="30%"
      destroy-on-close
    >
      <div v-if="selectedPart">
        <p><strong>名称:</strong> {{ selectedPart.name }}</p>
        <p><strong>材质:</strong> {{ getMaterialInfo(selectedPart) }}</p>
        <p><strong>可见性:</strong> {{ selectedPart.visible ? '可见' : '隐藏' }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import * as THREE from 'three';
import useModelLoader from '../composables/useModelLoader';
import useModelInteraction from '../composables/useModelInteraction';
import useModelViewer from '../composables/useModelViewer';
import SceneManager from '../services/SceneManager';
import ModelService from '../services/ModelService';

// 控制面板状态
const isPanelCollapsed = ref(false);
const activePanel = ref(['model-select', 'parts']);
const currentModelIndex = ref(0);
const isModelDecomposed = ref(false);
const isVertexColorsEnabled = ref(false);
const isAnimationPlaying = ref(true);
const isPartDetailsVisible = ref(false);
const selectedPart = ref(null);

// 显示设置
const showGrid = ref(true);
const showAxes = ref(true);
const showWireframe = ref(false);

// 容器引用
const containerRef = ref(null);

// 模型列表配置
const modelList = [
  { name: "阀门模型", path: "./阀门.gltf" },
  { name: "离子驱动器", path: "./阀门红色材质.gltf" },
  { name: "船舶模型", path: "./untitled.gltf" },
  { name: "K60发电机", path: "./K60发电机.gltf", isLarge: true },
  { name: "模型4", path: "./1.fbx" },
  { name: "模型5", path: "./2.fbx" },
];

// 初始化模型查看器
const {
  // 状态
  isInitialized,
  viewerState,
  sceneManager,
  modelService,
  currentModel,
  loadProgress,
  loadError,
  isLoading,
  
  // 方法
  initViewer,
  loadModelToScene,
  toggleGrid: toggleGridVisibility,
  toggleAxes: toggleAxesVisibility,
  toggleWireframe: toggleWireframeMode,
  resetViewer,
  
  // 模型操作
  getPartsList,
  decomposeModel,
  mergeModel,
  updateMaterial,
  
  // 交互方法
  hoveredPart,
  selectedPart: interactionSelectedPart,
  selectPart: selectPartForInteraction,
  focusOnPart,
  captureScreenshot,
} = useModelViewer({
  autoLoad: false,
  showStats: true,
  enableShadows: true,
  backgroundColor: 0x222222,
  optimize: true,
  simplificationRatio: 0.5,
  useDraco: true
});

// 计算属性
const partsList = computed(() => {
  if (!currentModel.value || !currentModel.value.model) {
    return [];
  }
  return getPartsList();
});

// 方法
const loadModelByIndex = async (index) => {
  if (index < 0 || index >= modelList.length) {
    console.error('无效的模型索引:', index);
    loadError.value = {
      message: `无效的模型索引: ${index}`
    };
    return;
  }

  // 清理之前的错误
  loadError.value = null;
  
  // 更新当前模型索引
  currentModelIndex.value = index;
  
  // 获取模型信息
  const modelInfo = modelList[index];
  
  console.log(`加载模型: ${modelInfo.name} (${modelInfo.path})`);
  
  try {
    // 检查服务是否初始化
    if (!isInitialized.value) {
      throw new Error('查看器尚未初始化，请等待初始化完成');
    }
    
    // 重置模型状态
    if (isModelDecomposed.value && mergeCurrentModel) {
      await mergeCurrentModel();
    }
    isModelDecomposed.value = false;
    
    // 创建超时处理器
    const timeoutPromise = new Promise((_, reject) => {
      // 根据模型大小动态调整超时时间
      const isLargeModel = modelInfo.isLarge || modelInfo.path.includes('K60发电机') || modelInfo.path.includes('ship');
      const timeoutMs = isLargeModel ? 300000 : 120000; // 大型模型5分钟，普通模型2分钟
      setTimeout(() => reject(new Error(`加载模型超时，请稍后再试 (${timeoutMs/1000}秒)`)), timeoutMs);
    });
    
    // 确保服务已初始化
    if (!sceneManager.value || !modelService.value) {
      console.error('服务状态:', { 
        sceneManager: !!sceneManager.value, 
        modelService: !!modelService.value 
      });
      throw new Error('服务尚未初始化，请等待初始化完成或刷新页面');
    }
    
    // 检测是否为大型模型
    const isLargeModel = modelInfo.isLarge || modelInfo.path.includes('K60发电机') || modelInfo.path.includes('ship');
    console.log(`模型类型: ${isLargeModel ? '大型模型' : '普通模型'}`);
    
    // 应用特定的大型模型处理（如清理内存）
    if (isLargeModel) {
      console.log("大型模型加载前清理内存...");
      // 在加载大型模型前尝试主动触发垃圾回收
      if (window.gc) {
        try {
          window.gc();
          console.log("手动垃圾回收已执行");
        } catch (gcError) {
          console.log("尝试手动垃圾回收失败:", gcError);
        }
      }
    }
    
    // 检查模型文件是否存在
    console.log('开始检查模型文件路径:', modelInfo.path);
    
    // 加载模型（添加超时和错误处理）
    await Promise.race([
      loadModelToScene(modelInfo.path, {
        onProgress: (progress) => {
          console.log(`模型加载进度: ${progress * 100}%`);
        },
        // 针对不同大小的模型使用不同的优化策略
        optimizeModel: true,
        simplificationRatio: isLargeModel ? 0.8 : 0.5, // 大型模型使用更高的简化率
        useDraco: true,
        enableInstancing: true, // 使用实例化优化
        maxTextureSize: isLargeModel ? 256 : 1024, // 大型模型使用更小的纹理
        aggressiveMode: isLargeModel, // 大型模型使用激进模式
        createLOD: isLargeModel, // 大型模型启用LOD
        // 大型模型禁用几何体合并，以避免内存占用过高
        mergeGeometries: !isLargeModel
      }),
      timeoutPromise
    ]);
    
    console.log(`模型 ${modelInfo.name} 加载成功`);
  } catch (error) {
    console.error('加载模型失败:', error);
    console.error('错误堆栈:', error.stack);
    loadError.value = {
      message: `加载模型 "${modelList[index].name}" 失败: ${error.message || '未知错误'}`
    };
    
    // 添加额外错误恢复逻辑
    try {
      // 尝试清理当前场景中的模型
      if (currentModel.value && sceneManager.value) {
        console.log('正在清理失败的模型资源...');
        
        if (currentModel.value.model && sceneManager.value.scene) {
          sceneManager.value.scene.remove(currentModel.value.model);
        }
        
        if (modelService.value) {
          modelService.value.dispose();
        }
      }
    } catch (cleanupError) {
      console.warn('清理失败的模型时出错:', cleanupError);
    }
  }
};

const retryLoading = () => {
  if (currentModelIndex.value >= 0 && currentModelIndex.value < modelList.length) {
    loadModelByIndex(currentModelIndex.value);
  }
};

const toggleAnimation = () => {
  isAnimationPlaying.value = !isAnimationPlaying.value;
  if (modelService.value) {
    modelService.value.toggleAnimations(isAnimationPlaying.value);
  }
};

const decomposeCurrentModel = () => {
  if (!currentModel.value) return;
  
  decomposeModel(0.1);
  isModelDecomposed.value = true;
};

const mergeCurrentModel = () => {
  if (!currentModel.value) return;
  
  mergeModel();
  isModelDecomposed.value = false;
};

const applyRandomColor = () => {
  if (!currentModel.value || !modelService.value) return;
  
  modelService.value.updateModelMaterials({
    color: new THREE.Color(Math.random() * 0xffffff)
  });
};

const resetModelColor = () => {
  if (!currentModel.value || !modelService.value) return;
  
  modelService.value.resetModelMaterials();
};

const toggleVertexColors = () => {
  isVertexColorsEnabled.value = !isVertexColorsEnabled.value;
  
  if (modelService.value && currentModel.value) {
    modelService.value.updateModelMaterials({
      vertexColors: isVertexColorsEnabled.value
    });
  }
};

const toggleGrid = (value) => {
  showGrid.value = value;
  toggleGridVisibility(value);
};

const toggleAxes = (value) => {
  showAxes.value = value;
  toggleAxesVisibility(value);
};

const toggleWireframe = (value) => {
  showWireframe.value = value;
  toggleWireframeMode(value);
};

const selectPart = (part) => {
  if (!part) return;
  
  selectPartForInteraction(part);
};

const showPartDetails = (part) => {
  selectedPart.value = part;
  isPartDetailsVisible.value = true;
};

const getMaterialInfo = (part) => {
  if (!part || !part.object) return '无材质信息';
  
  if (part.object.material) {
    return part.object.material.type || '标准材质';
  }
  
  return '无材质信息';
};

// 监听器
watch(interactionSelectedPart, (newPart) => {
  if (!newPart) return;
  // 可以在这里添加部件选中后的额外处理
});

// 生命周期钩子
onMounted(async () => {
  console.log('ModelViewer组件已挂载');
  console.log('容器引用状态:', containerRef.value);
  
  if (containerRef.value) {
    console.log('容器尺寸:', containerRef.value.clientWidth, containerRef.value.clientHeight);
    // 初始化查看器
    try {
      console.log('开始初始化查看器...');
      await initViewer(containerRef.value);
      console.log('查看器初始化完成');
      
      // 加载默认模型
      if (modelList.length > 0) {
        console.log('准备加载默认模型...');
        loadModelByIndex(0);
      }
    } catch (error) {
      console.error('初始化查看器失败:', error);
      loadError.value = {
        message: `初始化失败: ${error.message || '未知错误'}`
      };
    }
  } else {
    console.error('容器引用无效，无法初始化查看器');
    loadError.value = {
      message: '容器引用无效，无法初始化查看器'
    };
  }
});

onBeforeUnmount(() => {
  // 确保资源被正确释放
  if (sceneManager.value) {
    sceneManager.value.dispose();
  }
  
  if (modelService.value) {
    modelService.value.dispose();
  }
});
</script>

<style scoped>
.model-viewer-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #1a1a1a;
}

.renderer-container {
  width: 100%;
  height: 100%;
}

/* 加载指示器 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 100;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 18px;
  font-weight: bold;
}

/* 错误消息 */
.error-message {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 50, 50, 0.9);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 200;
  max-width: 80%;
  text-align: center;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  font-size: 24px;
}

/* 控制面板 */
.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 320px;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s, width 0.3s;
  z-index: 150;
  max-height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
}

.panel-collapsed {
  width: 200px;
  transform: translateX(calc(100% - 50px));
}

.panel-header {
  padding: 15px;
  background-color: #4a6bff;
  color: white;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
}

.collapse-btn {
  background-color: transparent;
  border: 1px solid white;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.panel-content {
  padding: 10px;
  overflow-y: auto;
  max-height: calc(100vh - 150px);
}

/* 模型操作按钮 */
.model-buttons, .operation-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.active-model {
  background-color: #4a6bff;
  color: white;
}

/* 部件列表 */
.parts-list {
  max-height: 300px;
  overflow-y: auto;
}

.part-item {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.part-item:hover {
  background-color: #f0f7ff;
}

.no-parts {
  text-align: center;
  padding: 20px;
  color: #999;
}

/* 显示选项 */
.display-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style> 