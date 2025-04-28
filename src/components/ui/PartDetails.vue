<template>
  <div class="part-details-container">
    <div v-if="!part" class="no-part-selected">
      <div class="placeholder-message">
        <div class="placeholder-icon">🔍</div>
        <div class="placeholder-text">选择一个部件查看详情</div>
      </div>
    </div>
    
    <div v-else class="part-info">
      <div class="part-header">
        <h3 class="part-title">{{ part.name || '未命名部件' }}</h3>
        <div class="part-actions">
          <button 
            class="action-button" 
            title="定位到该部件"
            @click="$emit('focus', part)"
          >
            <span class="action-icon">🔍</span>
          </button>
          <button 
            class="action-button" 
            :title="part.visible ? '隐藏部件' : '显示部件'"
            @click="$emit('toggle-visibility', part)"
          >
            <span class="action-icon">{{ part.visible ? '👁️' : '👁️‍🗨️' }}</span>
          </button>
        </div>
      </div>
      
      <div class="details-section">
        <div class="detail-item">
          <span class="detail-label">ID:</span>
          <span class="detail-value id-value">{{ part.id?.substring(0, 8) || '无ID' }}...</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">类型:</span>
          <span class="detail-value">{{ part.type || '网格' }}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">可见性:</span>
          <span class="detail-value">{{ part.visible ? '可见' : '隐藏' }}</span>
        </div>
        
        <div v-if="showMaterialInfo && part.object?.material" class="detail-item">
          <span class="detail-label">材质:</span>
          <span class="detail-value">{{ getMaterialInfo(part) }}</span>
        </div>
        
        <div v-if="part.position" class="detail-item">
          <span class="detail-label">位置:</span>
          <span class="detail-value">
            X: {{ formatNumber(part.position.x) }}, 
            Y: {{ formatNumber(part.position.y) }}, 
            Z: {{ formatNumber(part.position.z) }}
          </span>
        </div>
      </div>
      
      <div v-if="showMaterialEditor && part.object?.material" class="material-editor">
        <h4 class="section-title">材质编辑</h4>
        
        <div class="material-controls">
          <div class="control-item">
            <label>颜色</label>
            <input type="color" v-model="materialColor" @change="updateMaterialColor" />
          </div>
          
          <div class="control-item">
            <label>透明度</label>
            <input 
              type="range" 
              v-model.number="materialOpacity" 
              min="0" 
              max="1" 
              step="0.05"
              @input="updateMaterialOpacity" 
            />
            <span class="control-value">{{ materialOpacity.toFixed(2) }}</span>
          </div>
          
          <div class="control-item">
            <label>金属度</label>
            <input 
              type="range" 
              v-model.number="materialMetalness" 
              min="0" 
              max="1" 
              step="0.05"
              @input="updateMaterialMetalness" 
            />
            <span class="control-value">{{ materialMetalness.toFixed(2) }}</span>
          </div>
          
          <div class="control-item">
            <label>粗糙度</label>
            <input 
              type="range" 
              v-model.number="materialRoughness" 
              min="0" 
              max="1" 
              step="0.05"
              @input="updateMaterialRoughness" 
            />
            <span class="control-value">{{ materialRoughness.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  part: {
    type: Object,
    default: null
  },
  showMaterialInfo: {
    type: Boolean,
    default: true
  },
  showMaterialEditor: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update-material', 'focus', 'toggle-visibility']);

// 材质编辑器状态
const materialColor = ref('#ffffff');
const materialOpacity = ref(1);
const materialMetalness = ref(0.5);
const materialRoughness = ref(0.5);

// 当部件变化时更新材质编辑器状态
watch(() => props.part, (newPart) => {
  if (newPart && newPart.object && newPart.object.material) {
    const material = newPart.object.material;
    
    // 更新颜色
    if (material.color) {
      materialColor.value = '#' + material.color.getHexString();
    }
    
    // 更新透明度
    materialOpacity.value = material.opacity !== undefined ? material.opacity : 1;
    
    // 更新金属度和粗糙度（仅适用于标准材质）
    if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
      materialMetalness.value = material.metalness !== undefined ? material.metalness : 0.5;
      materialRoughness.value = material.roughness !== undefined ? material.roughness : 0.5;
    }
  }
}, { immediate: true });

// 获取材质信息
const getMaterialInfo = (part) => {
  if (!part.object || !part.object.material) {
    return '无材质';
  }
  
  const material = part.object.material;
  
  if (Array.isArray(material)) {
    return `多材质 (${material.length})`;
  }
  
  return material.type || '标准材质';
};

// 格式化数字
const formatNumber = (num) => {
  if (num === undefined || num === null) return 'N/A';
  return typeof num === 'number' ? num.toFixed(2) : num;
};

// 更新材质颜色
const updateMaterialColor = () => {
  if (!props.part || !props.part.object) return;
  
  const color = new THREE.Color(materialColor.value);
  
  emit('update-material', {
    part: props.part,
    properties: { color }
  });
};

// 更新材质透明度
const updateMaterialOpacity = () => {
  if (!props.part || !props.part.object) return;
  
  emit('update-material', {
    part: props.part,
    properties: { 
      opacity: materialOpacity.value,
      transparent: materialOpacity.value < 1
    }
  });
};

// 更新材质金属度
const updateMaterialMetalness = () => {
  if (!props.part || !props.part.object) return;
  
  emit('update-material', {
    part: props.part,
    properties: { metalness: materialMetalness.value }
  });
};

// 更新材质粗糙度
const updateMaterialRoughness = () => {
  if (!props.part || !props.part.object) return;
  
  emit('update-material', {
    part: props.part,
    properties: { roughness: materialRoughness.value }
  });
};
</script>

<style scoped>
.part-details-container {
  padding: 15px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.no-part-selected {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.placeholder-message {
  text-align: center;
  color: #999;
}

.placeholder-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.placeholder-text {
  font-size: 14px;
}

.part-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.part-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.part-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 5px 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #f5f5f5;
}

.action-icon {
  font-size: 16px;
}

.details-section {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-label {
  flex: 0 0 80px;
  font-weight: 500;
  color: #666;
}

.detail-value {
  flex: 1;
  word-break: break-word;
}

.id-value {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 12px;
}

.section-title {
  font-size: 16px;
  margin: 15px 0 10px;
  color: #333;
}

.material-editor {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  margin-top: 10px;
}

.material-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-item label {
  flex: 0 0 70px;
  font-size: 14px;
  color: #555;
}

.control-item input[type="range"] {
  flex: 1;
}

.control-value {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: #666;
}
</style> 