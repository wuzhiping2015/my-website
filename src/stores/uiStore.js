import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
    state: () => ({
        // 面板显示状态
        panels: {
            modelList: true, // 模型列表面板
            materialEditor: false, // 材质编辑器面板
            sceneEditor: false, // 场景编辑器面板
            properties: true, // 属性面板
            screenshots: false, // 截图面板
            settings: false // 设置面板
        },

        // 左侧面板宽度
        leftPanelWidth: 280,

        // 右侧面板宽度
        rightPanelWidth: 300,

        // 面板折叠状态
        collapsed: {
            leftPanel: false,
            rightPanel: false
        },

        // 工具栏状态
        toolbar: {
            visible: true,
            position: 'top', // top, left, right, bottom
            items: [
                { id: 'pan', icon: 'mdi-cursor-move', active: true, tooltip: '平移视图' },
                { id: 'rotate', icon: 'mdi-rotate-3d', active: false, tooltip: '旋转视图' },
                { id: 'zoom', icon: 'mdi-magnify', active: false, tooltip: '缩放视图' },
                { id: 'select', icon: 'mdi-cursor-default', active: false, tooltip: '选择对象' },
                { id: 'reset-view', icon: 'mdi-camera-outline', active: false, tooltip: '重置视图' },
                { id: 'screenshot', icon: 'mdi-camera', active: false, tooltip: '截图' }
            ]
        },

        // 当前选中的工具
        activeToolId: 'pan',

        // 对话框状态
        dialogs: {
            about: false,
            settings: false,
            materialCreate: false,
            exportModel: false,
            importModel: false,
            confirmDelete: false,
            help: false
        },

        // 确认删除对话框配置
        confirmDeleteConfig: {
            title: '',
            message: '',
            itemId: null,
            itemType: '', // model, material, screenshot
            callback: null
        },

        // 主题设置
        theme: {
            dark: false,
            primary: '#1976D2',
            accent: '#FF4081',
            secondary: '#424242',
            success: '#4CAF50',
            info: '#2196F3',
            warning: '#FB8C00',
            error: '#FF5252'
        },

        // 全局消息通知
        notification: {
            show: false,
            message: '',
            color: 'info', // success, info, warning, error
            timeout: 3000
        },

        // 加载状态
        loading: {
            global: false,
            model: false,
            material: false,
            screenshot: false,
            export: false
        },

        // 视口大小
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },

        // 上下文菜单
        contextMenu: {
            show: false,
            x: 0,
            y: 0,
            items: []
        },

        // 拖放状态
        dragDrop: {
            isDragging: false,
            dragType: null, // model, material, texture
            dragData: null
        },

        // 用户界面偏好设置
        preferences: {
            autoHidePanels: false, // 3D视图操作时自动隐藏面板
            showTooltips: true,
            showWelcomeScreen: true,
            interfaceScale: 1.0, // 界面缩放因子
            lowPerformanceMode: false, // 低性能模式
            showFPS: false, // 显示FPS计数器
            language: 'zh-CN' // 界面语言
        }
    }),

    getters: {
        // 判断面板是否可见
        isPanelVisible: (state) => (panelId) => {
            return state.panels[panelId] || false
        },

        // 获取左侧面板状态
        getLeftPanelStatus: (state) => {
            return {
                width: state.leftPanelWidth,
                collapsed: state.collapsed.leftPanel
            }
        },

        // 获取右侧面板状态
        getRightPanelStatus: (state) => {
            return {
                width: state.rightPanelWidth,
                collapsed: state.collapsed.rightPanel
            }
        },

        // 获取工具栏配置
        getToolbar: (state) => state.toolbar,

        // 获取活动工具
        getActiveTool: (state) => {
            return state.toolbar.items.find(item => item.id === state.activeToolId) || state.toolbar.items[0]
        },

        // 判断对话框是否打开
        isDialogOpen: (state) => (dialogId) => {
            return state.dialogs[dialogId] || false
        },

        // 获取主题设置
        getTheme: (state) => state.theme,

        // 判断是否为暗色主题
        isDarkTheme: (state) => state.theme.dark,

        // 获取用户偏好设置
        getPreferences: (state) => state.preferences,

        // 判断是否显示加载状态
        isLoading: (state) => (type = 'global') => {
            return state.loading[type] || state.loading.global
        },

        // 获取视口尺寸
        getViewportSize: (state) => state.viewport
    },

    actions: {
        // 切换面板显示状态
        togglePanel(panelId) {
            if (this.panels.hasOwnProperty(panelId)) {
                this.panels[panelId] = !this.panels[panelId]
            }
        },

        // 显示指定面板
        showPanel(panelId) {
            if (this.panels.hasOwnProperty(panelId)) {
                this.panels[panelId] = true
            }
        },

        // 隐藏指定面板
        hidePanel(panelId) {
            if (this.panels.hasOwnProperty(panelId)) {
                this.panels[panelId] = false
            }
        },

        // 设置面板宽度
        setPanelWidth(panel, width) {
            const minWidth = 200
            const maxWidth = 600
            const safeWidth = Math.max(minWidth, Math.min(maxWidth, width))

            if (panel === 'left') {
                this.leftPanelWidth = safeWidth
            } else if (panel === 'right') {
                this.rightPanelWidth = safeWidth
            }
        },

        // 切换面板折叠状态
        togglePanelCollapse(panel) {
            if (panel === 'left' || panel === 'right') {
                this.collapsed[`${panel}Panel`] = !this.collapsed[`${panel}Panel`]
            }
        },

        // 设置工具栏可见性
        setToolbarVisible(visible) {
            this.toolbar.visible = visible
        },

        // 设置工具栏位置
        setToolbarPosition(position) {
            if (['top', 'left', 'right', 'bottom'].includes(position)) {
                this.toolbar.position = position
            }
        },

        // 激活工具
        setActiveTool(toolId) {
            // 更新按钮活动状态
            this.toolbar.items.forEach(item => {
                item.active = (item.id === toolId)
            })

            // 设置当前活动工具ID
            this.activeToolId = toolId
        },

        // 打开对话框
        openDialog(dialogId) {
            if (this.dialogs.hasOwnProperty(dialogId)) {
                this.dialogs[dialogId] = true
            }
        },

        // 关闭对话框
        closeDialog(dialogId) {
            if (this.dialogs.hasOwnProperty(dialogId)) {
                this.dialogs[dialogId] = false
            }
        },

        // 配置确认删除对话框
        configureConfirmDialog({ title, message, itemId, itemType, callback }) {
            this.confirmDeleteConfig = {
                title: title || '确认删除',
                message: message || '您确定要删除此项目吗？此操作无法撤销。',
                itemId,
                itemType,
                callback
            }

            // 打开确认对话框
            this.dialogs.confirmDelete = true
        },

        // 切换主题模式
        toggleDarkMode() {
            this.theme.dark = !this.theme.dark
            this.saveThemeToLocalStorage()
        },

        // 设置主题颜色
        setThemeColor(colorType, colorValue) {
            if (this.theme.hasOwnProperty(colorType)) {
                this.theme[colorType] = colorValue
                this.saveThemeToLocalStorage()
            }
        },

        // 显示通知消息
        showNotification(message, options = {}) {
            this.notification = {
                show: true,
                message,
                color: options.color || 'info',
                timeout: options.timeout || 3000
            }

            // 自动关闭
            if (this.notification.timeout > 0) {
                setTimeout(() => {
                    this.notification.show = false
                }, this.notification.timeout)
            }
        },

        // 隐藏通知
        hideNotification() {
            this.notification.show = false
        },

        // 设置加载状态
        setLoading(type = 'global', isLoading) {
            if (this.loading.hasOwnProperty(type)) {
                this.loading[type] = isLoading
            }
        },

        // 更新视口大小
        updateViewportSize(width, height) {
            this.viewport.width = width
            this.viewport.height = height
        },

        // 显示上下文菜单
        showContextMenu(x, y, items) {
            this.contextMenu = {
                show: true,
                x,
                y,
                items
            }
        },

        // 隐藏上下文菜单
        hideContextMenu() {
            this.contextMenu.show = false
        },

        // 设置拖放状态
        setDragDropState(isDragging, type = null, data = null) {
            this.dragDrop = {
                isDragging,
                dragType: type,
                dragData: data
            }
        },

        // 更新用户偏好设置
        updatePreferences(newPreferences) {
            this.preferences = {
                ...this.preferences,
                ...newPreferences
            }

            this.savePreferencesToLocalStorage()
        },

        // 保存主题设置到本地存储
        saveThemeToLocalStorage() {
            try {
                localStorage.setItem('ui_theme', JSON.stringify(this.theme))
            } catch (error) {
                console.error('保存主题设置失败:', error)
            }
        },

        // 从本地存储加载主题设置
        loadThemeFromLocalStorage() {
            try {
                const savedTheme = localStorage.getItem('ui_theme')
                if (savedTheme) {
                    this.theme = {
                        ...this.theme,
                        ...JSON.parse(savedTheme)
                    }
                }
            } catch (error) {
                console.error('加载主题设置失败:', error)
            }
        },

        // 保存用户偏好到本地存储
        savePreferencesToLocalStorage() {
            try {
                localStorage.setItem('ui_preferences', JSON.stringify(this.preferences))
            } catch (error) {
                console.error('保存用户偏好设置失败:', error)
            }
        },

        // 从本地存储加载用户偏好
        loadPreferencesFromLocalStorage() {
            try {
                const savedPreferences = localStorage.getItem('ui_preferences')
                if (savedPreferences) {
                    this.preferences = {
                        ...this.preferences,
                        ...JSON.parse(savedPreferences)
                    }
                }
            } catch (error) {
                console.error('加载用户偏好设置失败:', error)
            }
        },

        // 保存面板配置到本地存储
        savePanelConfigToLocalStorage() {
            try {
                const panelConfig = {
                    panels: this.panels,
                    leftPanelWidth: this.leftPanelWidth,
                    rightPanelWidth: this.rightPanelWidth,
                    collapsed: this.collapsed
                }

                localStorage.setItem('ui_panel_config', JSON.stringify(panelConfig))
            } catch (error) {
                console.error('保存面板配置失败:', error)
            }
        },

        // 从本地存储加载面板配置
        loadPanelConfigFromLocalStorage() {
            try {
                const savedConfig = localStorage.getItem('ui_panel_config')
                if (savedConfig) {
                    const config = JSON.parse(savedConfig)

                    // 更新面板状态
                    if (config.panels) {
                        this.panels = {
                            ...this.panels,
                            ...config.panels
                        }
                    }

                    // 更新面板宽度
                    if (config.leftPanelWidth) {
                        this.leftPanelWidth = config.leftPanelWidth
                    }

                    if (config.rightPanelWidth) {
                        this.rightPanelWidth = config.rightPanelWidth
                    }

                    // 更新折叠状态
                    if (config.collapsed) {
                        this.collapsed = {
                            ...this.collapsed,
                            ...config.collapsed
                        }
                    }
                }
            } catch (error) {
                console.error('加载面板配置失败:', error)
            }
        },

        // 重置面板配置为默认值
        resetPanelConfig() {
            this.panels = {
                modelList: true,
                materialEditor: false,
                sceneEditor: false,
                properties: true,
                screenshots: false,
                settings: false
            }

            this.leftPanelWidth = 280
            this.rightPanelWidth = 300
            this.collapsed = {
                leftPanel: false,
                rightPanel: false
            }

            // 保存到本地存储
            this.savePanelConfigToLocalStorage()
        },

        // 重置所有UI设置
        resetAllUISettings() {
            // 重置主题
            this.theme = {
                dark: false,
                primary: '#1976D2',
                accent: '#FF4081',
                secondary: '#424242',
                success: '#4CAF50',
                info: '#2196F3',
                warning: '#FB8C00',
                error: '#FF5252'
            }

            // 重置用户偏好
            this.preferences = {
                autoHidePanels: false,
                showTooltips: true,
                showWelcomeScreen: true,
                interfaceScale: 1.0,
                lowPerformanceMode: false,
                showFPS: false,
                language: 'zh-CN'
            }

            // 重置面板配置
            this.resetPanelConfig()

            // 保存所有设置到本地存储
            this.saveThemeToLocalStorage()
            this.savePreferencesToLocalStorage()
        },

        // 初始化存储
        initStore() {
            // 加载用户UI设置
            this.loadThemeFromLocalStorage()
            this.loadPreferencesFromLocalStorage()
            this.loadPanelConfigFromLocalStorage()

            // 设置视口初始大小
            this.updateViewportSize(window.innerWidth, window.innerHeight)

            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                this.updateViewportSize(window.innerWidth, window.innerHeight)
            })
        }
    }
})