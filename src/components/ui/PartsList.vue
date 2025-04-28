<template>
  <div class="parts-list-container">
    <div class="search-container" v-if="enableSearch">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索部件..." 
        class="search-input"
      />
    </div>
    
    <div class="parts-list">
      <div v-if="filteredParts.length === 0" class="no-parts">
        {{ searchQuery ? '没有找到匹配的部件' : '暂无可用部件' }}
      </div>
      
      <div
        v-for="part in filteredParts"
        :key="part.id"
        class="part-item"
        :class="{ 'part-selected': isSelected(part), 'part-hovered': isHovered(part) }"
        @mouseenter="onPartHover(part)"
        @mouseleave="onPartLeave(part)"
        @click="onPartClick(part)"
      >
        <div class="part-info">
          <span class="part-name">{{ part.name || `部件_${part.id.substring(0, 5)}` }}</span>
          <span v-if="showDetails" class="part-type">{{ part.type || '网格' }}</span>
        </div>
        <div v-if="showVisibilityToggle" class="part-actions">
          <button 
            class="visibility-toggle" 
            :title="part.visible ? '隐藏部件' : '显示部件'"
            @click.stop="toggleVisibility(part)"
          >
            {{ part.visible ? '👁️' : '👁️‍🗨️' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue';

const props = defineProps({
  parts: {
    type: Array,
    default: () => []
  },
  selectedPart: {
    type: Object,
    default: null
  },
  hoveredPart: {
    type: Object,
    default: null
  },
  enableSearch: {
    type: Boolean,
    default: true
  },
  showDetails: {
    type: Boolean,
    default: false
  },
  showVisibilityToggle: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['select', 'hover', 'visibility-change']);

const searchQuery = ref('');

// 过滤部件列表
const filteredParts = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.parts;
  }
  
  const query = searchQuery.value.toLowerCase();
  return props.parts.filter(part => {
    const name = (part.name || '').toLowerCase();
    return name.includes(query);
  });
});

// 判断部件是否被选中
const isSelected = (part) => {
  return props.selectedPart && props.selectedPart.id === part.id;
};

// 判断部件是否被悬停
const isHovered = (part) => {
  return props.hoveredPart && props.hoveredPart.id === part.id;
};

// 部件悬停事件处理
const onPartHover = (part) => {
  emit('hover', part);
};

// 部件离开悬停事件处理
const onPartLeave = (part) => {
  emit('hover', null);
};

// 部件点击事件处理
const onPartClick = (part) => {
  emit('select', part);
};

// 切换部件可见性
const toggleVisibility = (part) => {
  emit('visibility-change', {
    part,
    visible: !part.visible
  });
};
</script>

<style scoped>
.parts-list-container {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.search-container {
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.parts-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.part-item {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.part-item:last-child {
  border-bottom: none;
}

.part-item:hover {
  background-color: #f0f7ff;
}

.part-selected {
  background-color: #e6f7ff;
  border-left: 4px solid #1890ff;
}

.part-hovered {
  background-color: #f5f5f5;
}

.part-info {
  display: flex;
  flex-direction: column;
}

.part-name {
  font-weight: 500;
}

.part-type {
  font-size: 12px;
  color: #888;
}

.part-actions {
  display: flex;
}

.visibility-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px;
  border-radius: 2px;
}

.visibility-toggle:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.no-parts {
  text-align: center;
  padding: 20px;
  color: #999;
  font-style: italic;
}
</style> 