<template>
  <div class="screenshot-list">
    <div class="list-header">
      <h3>截图列表</h3>
      <div class="header-actions">
        <button class="action-btn" @click="refreshList" title="刷新列表">
          <span class="icon">🔄</span>
        </button>
        <button class="action-btn danger" @click="confirmClearAll" title="清空全部">
          <span class="icon">🗑️</span>
        </button>
      </div>
    </div>
    
    <div class="search-box">
      <input type="text" v-model="searchQuery" placeholder="搜索截图..." />
    </div>
    
    <div class="screenshots-container">
      <div v-if="filteredScreenshots.length === 0" class="empty-state">
        <p>{{ isSearching ? '没有找到匹配的截图' : '没有保存的截图' }}</p>
        <button v-if="isSearching" @click="clearSearch">清除搜索</button>
      </div>
      
      <div v-else class="screenshots-grid">
        <div 
          v-for="screenshot in filteredScreenshots" 
          :key="screenshot.id"
          class="screenshot-item"
          :class="{ active: isSelected(screenshot.id) }"
          @click="selectScreenshot(screenshot.id)"
        >
          <div class="thumbnail">
            <img :src="screenshot.thumbnailData" :alt="screenshot.name" />
          </div>
          <div class="info">
            <div class="name">{{ screenshot.name }}</div>
            <div class="date">{{ formatDate(screenshot.createdAt) }}</div>
          </div>
          <div class="actions">
            <button @click.stop="downloadScreenshot(screenshot.id)" title="下载">
              <span class="icon">💾</span>
            </button>
            <button @click.stop="removeScreenshot(screenshot.id)" title="删除">
              <span class="icon">❌</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 截图详情 -->
    <div class="screenshot-details" v-if="selectedScreenshot">
      <div class="details-header">
        <h3>截图详情</h3>
        <button class="close-btn" @click="closeDetails">×</button>
      </div>
      
      <div class="preview">
        <img :src="selectedScreenshot.imageData" :alt="selectedScreenshot.name" />
      </div>
      
      <div class="details-info">
        <div class="info-row">
          <span class="label">名称:</span>
          <span class="value">{{ selectedScreenshot.name }}</span>
        </div>
        <div class="info-row">
          <span class="label">日期:</span>
          <span class="value">{{ formatDate(selectedScreenshot.createdAt, true) }}</span>
        </div>
        <div class="info-row">
          <span class="label">分辨率:</span>
          <span class="value">{{ selectedScreenshot.resolution.width }} × {{ selectedScreenshot.resolution.height }}</span>
        </div>
        <div class="info-row">
          <span class="label">格式:</span>
          <span class="value">{{ selectedScreenshot.format.toUpperCase() }}</span>
        </div>
        <div class="info-row">
          <span class="label">大小:</span>
          <span class="value">{{ formatSize(selectedScreenshot.size) }}</span>
        </div>
        
        <!-- 模型信息 -->
        <div class="model-info" v-if="selectedScreenshot.modelInfo">
          <h4>模型信息</h4>
          <div class="info-row">
            <span class="label">名称:</span>
            <span class="value">{{ selectedScreenshot.modelInfo.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">类型:</span>
            <span class="value">{{ selectedScreenshot.modelInfo.type }}</span>
          </div>
          <div class="info-row" v-if="selectedScreenshot.modelInfo.vertices">
            <span class="label">顶点:</span>
            <span class="value">{{ selectedScreenshot.modelInfo.vertices }}</span>
          </div>
          <div class="info-row" v-if="selectedScreenshot.modelInfo.faces">
            <span class="label">面片:</span>
            <span class="value">{{ selectedScreenshot.modelInfo.faces }}</span>
          </div>
        </div>
        
        <!-- 标签 -->
        <div class="tags-section">
          <h4>标签</h4>
          <div class="tags-container">
            <div 
              v-for="tag in selectedScreenshot.tags" 
              :key="tag" 
              class="tag"
            >
              {{ tag }}
              <button class="remove-tag" @click="removeTag(tag)">×</button>
            </div>
            <input 
              v-if="showTagInput"
              ref="tagInput"
              v-model="newTag"
              @keyup.enter="addTag"
              @blur="cancelAddTag"
              placeholder="添加标签..."
              class="tag-input"
            />
            <button v-else class="add-tag" @click="startAddTag">
              <span class="icon">+</span>
            </button>
          </div>
        </div>
        
        <!-- 笔记 -->
        <div class="notes-section">
          <h4>笔记</h4>
          <textarea
            v-model="screenshotNote"
            @blur="updateNote"
            placeholder="添加笔记..."
          ></textarea>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="btn primary" @click="downloadScreenshot(selectedScreenshot.id)">
            <span class="icon">💾</span> 下载
          </button>
          <button class="btn danger" @click="removeScreenshot(selectedScreenshot.id)">
            <span class="icon">🗑️</span> 删除
          </button>
        </div>
      </div>
    </div>
    
    <!-- 确认对话框 -->
    <div class="confirm-dialog" v-if="showConfirm">
      <div class="dialog-content">
        <h3>{{ confirmTitle }}</h3>
        <p>{{ confirmMessage }}</p>
        <div class="dialog-actions">
          <button class="btn" @click="cancelConfirm">取消</button>
          <button class="btn danger" @click="confirmAction">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useScreenshotStore } from '../stores/screenshotStore';
import { useUIStore } from '../stores/uiStore';

// 初始化存储
const screenshotStore = useScreenshotStore();
const uiStore = useUIStore();

// 搜索查询
const searchQuery = ref('');
const isSearching = computed(() => searchQuery.value.length > 0);

// 标签输入
const showTagInput = ref(false);
const newTag = ref('');
const tagInput = ref(null);

// 笔记
const screenshotNote = ref('');

// 确认对话框
const showConfirm = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmCallback = ref(null);

// 获取所有截图
const allScreenshots = computed(() => screenshotStore.getScreenshots);

// 获取当前选中的截图
const selectedScreenshot = computed(() => screenshotStore.getSelectedScreenshot);

// 过滤截图
const filteredScreenshots = computed(() => {
  if (!searchQuery.value) return allScreenshots.value;
  
  const query = searchQuery.value.toLowerCase();
  return allScreenshots.value.filter(screenshot => {
    // 搜索名称
    const nameMatch = screenshot.name.toLowerCase().includes(query);
    
    // 搜索标签
    const tagMatch = screenshot.tags.some(tag => 
      tag.toLowerCase().includes(query)
    );
    
    // 搜索笔记
    const noteMatch = screenshot.note && screenshot.note.toLowerCase().includes(query);
    
    // 搜索模型信息
    const modelMatch = screenshot.modelInfo && 
      ((screenshot.modelInfo.name && screenshot.modelInfo.name.toLowerCase().includes(query)) ||
      (screenshot.modelInfo.type && screenshot.modelInfo.type.toLowerCase().includes(query)));
    
    return nameMatch || tagMatch || noteMatch || modelMatch;
  });
});

// 检查截图是否被选中
const isSelected = (id) => {
  return selectedScreenshot.value && selectedScreenshot.value.id === id;
};

// 选择截图
const selectScreenshot = (id) => {
  screenshotStore.selectScreenshot(id);
  
  // 更新笔记字段
  if (selectedScreenshot.value) {
    screenshotNote.value = selectedScreenshot.value.note || '';
  }
};

// 关闭详情
const closeDetails = () => {
  screenshotStore.clearSelectedScreenshot();
};

// 下载截图
const downloadScreenshot = (id) => {
  screenshotStore.downloadScreenshot(id);
};

// 删除截图
const removeScreenshot = (id) => {
  confirmTitle.value = '删除截图';
  confirmMessage.value = '确定要删除此截图吗？此操作不可恢复。';
  confirmCallback.value = () => {
    screenshotStore.removeScreenshot(id);
    
    // 显示通知
    uiStore.showNotification('截图已删除', 'success');
  };
  showConfirm.value = true;
};

// 清空所有截图
const confirmClearAll = () => {
  if (allScreenshots.value.length === 0) return;
  
  confirmTitle.value = '清空所有截图';
  confirmMessage.value = '确定要删除所有截图吗？此操作不可恢复。';
  confirmCallback.value = () => {
    screenshotStore.clearAllScreenshots();
    
    // 显示通知
    uiStore.showNotification('所有截图已删除', 'success');
  };
  showConfirm.value = true;
};

// 确认对话框操作
const confirmAction = () => {
  if (confirmCallback.value) {
    confirmCallback.value();
  }
  showConfirm.value = false;
};

// 取消确认
const cancelConfirm = () => {
  showConfirm.value = false;
};

// 刷新列表
const refreshList = () => {
  screenshotStore.loadScreenshotsFromLocalStorage();
};

// 清除搜索
const clearSearch = () => {
  searchQuery.value = '';
};

// 开始添加标签
const startAddTag = () => {
  showTagInput.value = true;
  nextTick(() => {
    tagInput.value.focus();
  });
};

// 添加标签
const addTag = () => {
  if (newTag.value.trim() && selectedScreenshot.value) {
    screenshotStore.addTagToScreenshot(selectedScreenshot.value.id, newTag.value.trim());
    newTag.value = '';
  }
  showTagInput.value = false;
};

// 取消添加标签
const cancelAddTag = () => {
  newTag.value = '';
  showTagInput.value = false;
};

// 移除标签
const removeTag = (tag) => {
  if (selectedScreenshot.value) {
    screenshotStore.removeTagFromScreenshot(selectedScreenshot.value.id, tag);
  }
};

// 更新笔记
const updateNote = () => {
  if (selectedScreenshot.value) {
    screenshotStore.updateScreenshot(selectedScreenshot.value.id, {
      note: screenshotNote.value
    });
  }
};

// 格式化日期
const formatDate = (dateString, includeTime = false) => {
  try {
    const date = new Date(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '未知日期';
    }
    
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
    }
    
    return date.toLocaleDateString('zh-CN', options).replace(/\//g, '-');
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '未知日期';
  }
};

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '未知大小';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// 组件挂载时加载截图数据
onMounted(() => {
  screenshotStore.loadScreenshotsFromLocalStorage();
});
</script>

<style scoped>
.screenshot-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  color: #333;
  position: relative;
  overflow: hidden;
}

.list-header {
  padding: 15px;
  background-color: #333;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444;
}

.list-header h3 {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.action-btn.danger:hover {
  background-color: rgba(255, 0, 0, 0.2);
}

.search-box {
  padding: 10px 15px;
  background-color: #eee;
  border-bottom: 1px solid #ddd;
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.screenshots-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
  color: #666;
}

.empty-state button {
  margin-top: 10px;
  padding: 5px 10px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.screenshots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.screenshot-item {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.screenshot-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.screenshot-item.active {
  border: 2px solid #2c8af1;
}

.thumbnail {
  height: 120px;
  overflow: hidden;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  padding: 10px;
}

.name {
  font-weight: 500;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date {
  font-size: 12px;
  color: #666;
}

.actions {
  position: absolute;
  top: 5px;
  right: 5px;
  display: none;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  padding: 2px;
}

.screenshot-item:hover .actions {
  display: flex;
}

.actions button {
  background: none;
  border: none;
  color: white;
  padding: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

.actions button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

/* 截图详情样式 */
.screenshot-details {
  position: absolute;
  top: 0;
  right: 0;
  width: 350px;
  height: 100%;
  background-color: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 10;
  animation: slideIn 0.3s ease-out;
  overflow-y: auto;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #333;
  color: white;
}

.details-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.preview {
  padding: 15px;
  background-color: #f0f0f0;
  text-align: center;
}

.preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.details-info {
  padding: 15px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
}

.label {
  width: 70px;
  color: #666;
  flex-shrink: 0;
}

.value {
  flex-grow: 1;
  font-weight: 500;
}

.model-info, .tags-section, .notes-section {
  margin-top: 20px;
}

.model-info h4, .tags-section h4, .notes-section h4 {
  font-size: 16px;
  margin-bottom: 10px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background-color: #e1f5fe;
  color: #0277bd;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.remove-tag {
  background: none;
  border: none;
  color: #0277bd;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.add-tag {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #f0f0f0;
  border: 1px dashed #ccc;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tag-input {
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid #ccc;
  font-size: 12px;
  width: 100px;
}

textarea {
  width: 100%;
  height: 100px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn.primary {
  background-color: #2c8af1;
  color: white;
}

.btn.primary:hover {
  background-color: #1c6cd1;
}

.btn.danger {
  background-color: #f44336;
  color: white;
}

.btn.danger:hover {
  background-color: #d32f2f;
}

/* 确认对话框 */
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 300px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dialog-content h3 {
  margin-top: 0;
  color: #333;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .screenshot-details {
    width: 100%;
    right: 0;
  }
  
  .screenshots-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style> 