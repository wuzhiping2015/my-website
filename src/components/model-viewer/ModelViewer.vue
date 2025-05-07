<template>
  <div 
    ref="containerRef" 
    class="model-viewer-container"
    @mousedown="onContainerMouseDown"
    @mouseup="onContainerMouseUp"
    @mousemove="onContainerMouseMove"
    @wheel="onContainerWheel"
  >
    <!-- 加载指示器 -->
    <div v-if="loading" class="loading-overlay">
      <el-progress 
        type="circle" 
        :percentage="Math.round(loadingProgress)" 
        :status="loadError ? 'exception' : undefined"
      />
      <div class="loading-text">{{ loadError ? '加载失败' : `加载中 ${Math.round(loadingProgress)}%` }}</div>
    </div>

    <!-- 零件信息面板 -->
    <div v-if="selectedPart" class="part-info-panel">
      <h3>{{ selectedPart.name || '未命名零件' }}</h3>
      <p v-if="selectedPart.dimensions">
        尺寸: {{ selectedPart.dimensions.width.toFixed(2) }} × 
        {{ selectedPart.dimensions.height.toFixed(2) }} × 
        {{ selectedPart.dimensions.depth.toFixed(2) }} 单位
      </p>
      <p v-if="selectedPart.volume">体积: {{ selectedPart.volume.toFixed(2) }} 立方单位</p>
      <el-button size="small" @click="clearSelectedPart">关闭</el-button>
    </div>

    <!-- 工具栏 -->
    <div class="viewer-toolbar">
      <el-button-group>
        <el-tooltip content="上一个模型">
          <el-button 
            icon="el-icon-arrow-left" 
            :disabled="!canGoBack" 
            @click="goBack"
          />
        </el-tooltip>
        <el-tooltip content="下一个模型">
          <el-button 
            icon="el-icon-arrow-right" 
            :disabled="!canGoForward" 
            @click="goForward"
          />
        </el-tooltip>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-tooltip content="拍摄截图">
        <el-button 
          icon="el-icon-camera" 
          :loading="isCapturing" 
          @click="takeScreenshot"
        />
      </el-tooltip>

      <el-tooltip content="切换网格显示">
        <el-button 
          :class="{ 'is-active': showWireframe }" 
          icon="el-icon-view" 
          @click="toggleWireframe"
        />
      </el-tooltip>

      <el-tooltip content="重置视图">
        <el-button 
          icon="el-icon-refresh" 
          @click="resetCamera"
        />
      </el-tooltip>
    </div>

    <!-- 材质控制面板 -->
    <div class="material-controls">
      <el-form label-position="top" size="small">
        <el-form-item label="金属度">
          <el-slider 
            v-model="metalness" 
            :min="0" 
            :max="1" 
            :step="0.01" 
            @change="updateMaterial"
          />
        </el-form-item>
        <el-form-item label="粗糙度">
          <el-slider 
            v-model="roughness" 
            :min="0" 
            :max="1" 
            :step="0.01" 
            @change="updateMaterial"
          />
        </el-form-item>
        
        <el-form-item label="材质预设">
          <el-select 
            placeholder="选择材质" 
            @change="applyPreset"
          >
            <el-option 
              v-for="preset in materialPresets" 
              :key="preset.name" 
              :label="preset.name" 
              :value="preset.name"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 零件搜索面板 -->
    <div class="parts-search-panel">
      <el-input
        v-model="searchQuery"
        placeholder="搜索零件..."
        prefix-icon="el-icon-search"
        clearable
      />
      <div class="parts-list" v-if="filteredParts.length">
        <el-scrollbar height="200px">
          <el-list>
            <el-list-item 
              v-for="part in filteredParts" 
              :key="part.uuid"
              @click="selectPart(part)" 
              @mouseenter="highlightPart(part)"
              @mouseleave="clearHighlight"
            >
              {{ part.name || '未命名零件' }}
            </el-list-item>
          </el-list>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { useConfigStore } from '../../stores/configStore'
import { useModelLoader } from '../../composables/useModelLoader'
import { useSceneManager } from '../../composables/useSceneManager'
import { useModelParts } from '../../composables/useModelParts'
import { useMaterialManager } from '../../composables/useMaterialManager'
import { useModelHistory } from '../../composables/useModelHistory'
import { useScreenshot } from '../../composables/useScreenshot'

export default {
  name: 'ModelViewer',
  props: {
    initialModelPath: {
      type: String,
      default: ''
    },
    width: {
      type: [String, Number],
      default: '100%'
    },
    height: {
      type: [String, Number],
      default: '100%'
    },
    showControls: {
      type: Boolean,
      default: true
    }
  },
  
  setup(props) {
    // 引用DOM容器
    const containerRef = ref(null)
    
    // 使用状态存储
    const modelStore = useModelStore()
    const configStore = useConfigStore()
    
    // 使用composables
    const { 
      loadModel, 
      loadingProgress, 
      loading, 
      loadError 
    } = useModelLoader()
    
    const {
      initScene,
      scene,
      camera,
      renderer,
      controls,
      animate,
      disposeScene,
      resize,
      resetCamera
    } = useSceneManager()
    
    const {
      partsList,
      selectedPart,
      hoveredPart,
      searchQuery,
      filteredParts,
      extractPartsList,
      selectPart,
      clearSelectedPart,
      highlightPart,
      clearHighlight
    } = useModelParts()
    
    const {
      metalness,
      roughness,
      showWireframe,
      materialPresets,
      toggleWireframe,
      updateModelMaterial,
      applyMaterialPreset
    } = useMaterialManager()
    
    const {
      modelHistory,
      canGoBack,
      canGoForward,
      addToHistory,
      goBack,
      goForward,
      getCurrentModel
    } = useModelHistory()
    
    const {
      captureScreenshot,
      isCapturing,
      downloadScreenshot
    } = useScreenshot()
    
    // 当前模型对象
    const currentModelObject = ref(null)
    
    // 监听模型路径变化
    watch(() => props.initialModelPath, (newPath) => {
      if (newPath) {
        loadSelectedModel(newPath)
      }
    }, { immediate: true })
    
    // 加载选定的模型
    const loadSelectedModel = async (modelPath) => {
      if (!modelPath) return
      
      if (currentModelObject.value) {
        scene.value.remove(currentModelObject.value)
        currentModelObject.value = null
      }
      
      try {
        const model = await loadModel(modelPath)
        
        // 更新模型状态
        modelStore.setCurrentModel(modelPath)
        modelStore.updateLoadingState({
          modelLoaded: true,
          loading: false,
          loadError: null
        })
        
        // 添加到历史记录
        addToHistory(modelPath)
        
        // 提取零件列表
        currentModelObject.value = model
        scene.value.add(model)
        extractPartsList(model)
        
        // 更新材质
        if (configStore.defaultMaterial) {
          applyMaterialPreset(configStore.defaultMaterial, model)
        }
        
        // 重置相机位置
        resetCamera(model)
        
      } catch (error) {
        modelStore.updateLoadingState({
          modelLoaded: false,
          loading: false,
          loadError: error.message
        })
        console.error('加载模型失败:', error)
      }
    }
    
    // 更新材质
    const updateMaterial = () => {
      if (currentModelObject.value) {
        updateModelMaterial(currentModelObject.value, { metalness: metalness.value, roughness: roughness.value })
      }
    }
    
    // 应用材质预设
    const applyPreset = (presetName) => {
      if (currentModelObject.value && presetName) {
        applyMaterialPreset(presetName, currentModelObject.value)
      }
    }
    
    // 拍摄截图
    const takeScreenshot = async () => {
      if (!renderer.value || !scene.value || !camera.value) return
      
      try {
        await captureScreenshot(renderer.value, scene.value, camera.value)
        const modelName = modelStore.currentModel?.name || 'model'
        downloadScreenshot(`${modelName}-screenshot.png`)
      } catch (error) {
        console.error('截图失败:', error)
      }
    }
    
    // 鼠标事件处理
    const isMouseDown = ref(false)
    
    const onContainerMouseDown = (event) => {
      isMouseDown.value = true
    }
    
    const onContainerMouseUp = (event) => {
      isMouseDown.value = false
    }
    
    const onContainerMouseMove = (event) => {
      // 鼠标移动处理逻辑可以在这里添加
    }
    
    const onContainerWheel = (event) => {
      // 鼠标滚轮处理逻辑可以在这里添加
    }
    
    // 生命周期钩子
    onMounted(() => {
      if (!containerRef.value) return
      
      // 初始化场景
      initScene(containerRef.value)
      
      // 添加window resize监听
      const handleResize = () => {
        if (containerRef.value) {
          resize(containerRef.value.clientWidth, containerRef.value.clientHeight)
        }
      }
      
      window.addEventListener('resize', handleResize)
      
      // 启动动画循环
      animate()
      
      // 如果有初始模型路径，加载模型
      if (props.initialModelPath) {
        loadSelectedModel(props.initialModelPath)
      }
    })
    
    onBeforeUnmount(() => {
      // 清理资源
      window.removeEventListener('resize', handleResize)
      disposeScene()
    })
    
    return {
      containerRef,
      loadingProgress,
      loading,
      loadError,
      resetCamera,
      
      // 零件管理
      partsList,
      selectedPart,
      searchQuery,
      filteredParts,
      selectPart,
      clearSelectedPart,
      highlightPart,
      clearHighlight,
      
      // 材质管理
      metalness,
      roughness,
      showWireframe,
      materialPresets,
      toggleWireframe,
      updateMaterial,
      applyPreset,
      
      // 历史记录
      canGoBack,
      canGoForward,
      goBack,
      goForward,
      
      // 截图功能
      isCapturing,
      takeScreenshot,
      
      // 鼠标事件处理
      onContainerMouseDown,
      onContainerMouseUp,
      onContainerMouseMove,
      onContainerWheel,
    }
  }
}
</script>

<style scoped>
.model-viewer-container {
  position: relative;
  width: v-bind(width);
  height: v-bind(height);
  overflow: hidden;
  background-color: #f0f0f0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 10;
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
}

.viewer-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 5;
  display: flex;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.material-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 240px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 12px;
  z-index: 5;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.parts-search-panel {
  position: absolute;
  bottom: 16px;
  left: 16px;
  width: 240px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 12px;
  z-index: 5;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.parts-list {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.part-info-panel {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 240px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 12px;
  z-index: 5;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.is-active {
  background-color: #409eff;
  color: white;
}
</style> 