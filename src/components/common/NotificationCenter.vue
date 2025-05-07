<template>
    <div class="notification-center">
        <el-badge :value="unreadCount" :max="99" class="notification-badge">
            <el-button type="text" @click="toggleNotifications">
                <i class="el-icon-bell"></i>
            </el-button>
        </el-badge>
        
        <el-drawer
            v-model="drawerVisible"
            title="通知中心"
            direction="rtl"
            size="400px"
        >
            <div class="notification-list">
                <div v-if="notifications.length === 0" class="empty-notifications">
                    暂无通知
                </div>
                
                <div
                    v-for="notification in notifications"
                    :key="notification.id"
                    class="notification-item"
                    :class="{ unread: !notification.read }"
                    @click="handleNotificationClick(notification)"
                >
                    <div class="notification-icon">
                        <i :class="getNotificationIcon(notification.type)"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">{{ notification.title }}</div>
                        <div class="notification-message">{{ notification.message }}</div>
                        <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
                    </div>
                </div>
            </div>
            
            <template #footer>
                <div class="notification-actions">
                    <el-button type="text" @click="clearAllNotifications">
                        清空所有通知
                    </el-button>
                    <el-button type="text" @click="markAllAsRead">
                        全部标记为已读
                    </el-button>
                </div>
            </template>
        </el-drawer>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlatformStore } from '@/stores/platform'

const platformStore = usePlatformStore()
const drawerVisible = ref(false)

const notifications = computed(() => platformStore.notifications)
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const toggleNotifications = () => {
    drawerVisible.value = !drawerVisible.value
}

const getNotificationIcon = (type) => {
    const icons = {
        success: 'el-icon-success',
        warning: 'el-icon-warning',
        error: 'el-icon-error',
        info: 'el-icon-info'
    }
    return icons[type] || 'el-icon-info'
}

const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) { // 1分钟内
        return '刚刚'
    } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`
    } else {
        return date.toLocaleDateString()
    }
}

const handleNotificationClick = (notification) => {
    if (!notification.read) {
        notification.read = true
    }
    // 处理通知点击事件
    // TODO: 根据通知类型执行相应操作
}

const clearAllNotifications = () => {
    platformStore.clearNotifications()
}

const markAllAsRead = () => {
    notifications.value.forEach(notification => {
        notification.read = true
    })
}
</script>

<style scoped>
.notification-center {
    position: relative;
}

.notification-badge {
    margin-right: 20px;
}

.notification-list {
    padding: 0;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
}

.notification-item {
    display: flex;
    padding: 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: var(--transition);
}

.notification-item:hover {
    background-color: var(--background-secondary);
}

.notification-item.unread {
    background-color: rgba(59, 130, 246, 0.05);
}

.notification-icon {
    margin-right: 12px;
    font-size: 20px;
}

.notification-content {
    flex: 1;
}

.notification-title {
    font-weight: 500;
    margin-bottom: 4px;
}

.notification-message {
    color: var(--text-secondary);
    font-size: 13px;
    margin-bottom: 4px;
}

.notification-time {
    color: var(--text-tertiary);
    font-size: 12px;
}

.empty-notifications {
    text-align: center;
    padding: 40px;
    color: var(--text-tertiary);
}

.notification-actions {
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
}
</style> 