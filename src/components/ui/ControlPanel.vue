<template>
  <div class="control-panel" :class="{ 'panel-collapsed': collapsed }">
    <div class="panel-header">
      <h3>{{ title }}</h3>
      <button class="collapse-btn" @click="toggleCollapsed">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>
    
    <div class="panel-content" v-if="!collapsed">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '控制面板'
  },
  initialCollapsed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['collapse', 'expand']);

const collapsed = ref(props.initialCollapsed);

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
  emit(collapsed.value ? 'collapse' : 'expand');
};
</script>

<style scoped>
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
</style> 