import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePlatformStore = defineStore('platform', () => {
    // 状态
    const isRealTime = ref(true)
    const refreshInterval = ref(5000)
    const systemStatus = ref('normal')
    const currentDevice = ref(null)
    const isLoading = ref(false)
    const theme = ref('dark')
    const layout = ref('default') // 支持多种布局模式
    const language = ref('zh-CN')
    const notifications = ref([])
    const userPreferences = ref({
        autoRefresh: true,
        notificationSound: true,
        animationEnabled: true
    })

    // 计算属性
    const statusColor = computed(() => {
        switch (systemStatus.value) {
            case 'normal':
                return '#10b981'
            case 'warning':
                return '#f59e0b'
            case 'error':
                return '#ef4444'
            default:
                return '#10b981'
        }
    })

    const isDarkMode = computed(() => theme.value === 'dark')

    // 方法
    function toggleRealTime() {
        isRealTime.value = !isRealTime.value
    }

    function setRefreshInterval(interval) {
        refreshInterval.value = interval
    }

    function setSystemStatus(status) {
        systemStatus.value = status
    }

    function setCurrentDevice(device) {
        currentDevice.value = device
    }

    function toggleTheme() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    function setLayout(newLayout) {
        layout.value = newLayout
    }

    function addNotification(notification) {
        notifications.value.push({
            ...notification,
            id: Date.now(),
            timestamp: new Date()
        })
    }

    function clearNotifications() {
        notifications.value = []
    }

    function updateUserPreferences(preferences) {
        userPreferences.value = {
            ...userPreferences.value,
            ...preferences
        }
    }

    return {
        isRealTime,
        refreshInterval,
        systemStatus,
        currentDevice,
        isLoading,
        theme,
        layout,
        language,
        notifications,
        userPreferences,
        statusColor,
        isDarkMode,
        toggleRealTime,
        setRefreshInterval,
        setSystemStatus,
        setCurrentDevice,
        toggleTheme,
        setLayout,
        addNotification,
        clearNotifications,
        updateUserPreferences
    }
})