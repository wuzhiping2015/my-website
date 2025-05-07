<template>
  <transition name="fade">
    <div 
      v-if="notification.show" 
      class="notification-toast"
      :class="notification.color"
    >
      <div class="toast-content">
        <span class="icon">{{ getIcon(notification.color) }}</span>
        <span class="message">{{ notification.message }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue';
import { useUIStore } from '../stores/uiStore';

// 使用UI存储
const uiStore = useUIStore();

// 获取通知状态
const notification = computed(() => uiStore.notification);

// 根据通知类型获取图标
const getIcon = (type) => {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✗';
    case 'warning': return '⚠';
    case 'info': 
    default: return 'ℹ';
  }
};
</script>

<style scoped>
.notification-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 250px;
  text-align: center;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.icon {
  font-size: 20px;
  font-weight: bold;
}

.message {
  font-size: 14px;
}

/* 通知类型样式 */
.success {
  background-color: rgba(76, 175, 80, 0.9);
}

.error {
  background-color: rgba(244, 67, 54, 0.9);
}

.warning {
  background-color: rgba(255, 152, 0, 0.9);
}

.info {
  background-color: rgba(33, 150, 243, 0.9);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style> 