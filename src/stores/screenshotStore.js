import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

export const useScreenshotStore = defineStore('screenshot', {
    state: () => ({
        // 截图列表
        screenshots: [],

        // 当前选中的截图
        selectedScreenshot: null,

        // 截图设置
        settings: {
            resolution: { width: 1920, height: 1080 }, // 默认截图分辨率
            format: 'png', // 截图格式：png 或 jpg
            quality: 0.9, // 图片质量 (0-1)，仅对jpg格式有效
            captureUI: false, // 是否包含UI界面
            transparentBackground: false, // 是否使用透明背景
            fileNameTemplate: 'screenshot_{date}_{time}' // 文件名模板
        }
    }),

    getters: {
        // 获取所有截图
        getScreenshots: (state) => state.screenshots,

        // 获取选中的截图
        getSelectedScreenshot: (state) => state.selectedScreenshot,

        // 获取设置
        getSettings: (state) => state.settings,

        // 获取最近的截图
        getRecentScreenshots: (state) => {
            // 按时间排序，返回最近的10张
            return [...state.screenshots]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
        },

        // 获取指定截图
        getScreenshotById: (state) => (id) => {
            return state.screenshots.find(screenshot => screenshot.id === id) || null
        }
    },

    actions: {
        // 添加截图
        addScreenshot(screenshotData) {
            const id = screenshotData.id || uuidv4()
            const timestamp = new Date()

            // 创建新截图对象
            const newScreenshot = {
                id,
                name: screenshotData.name || this.generateFileName(timestamp),
                imageData: screenshotData.imageData, // base64或blob URL
                thumbnailData: screenshotData.thumbnailData || screenshotData.imageData, // 缩略图
                resolution: screenshotData.resolution || this.settings.resolution,
                format: screenshotData.format || this.settings.format,
                size: screenshotData.size || 0, // 文件大小（字节）
                createdAt: timestamp.toISOString(),
                modelInfo: screenshotData.modelInfo || {}, // 关联的模型信息
                tags: screenshotData.tags || [], // 标签
                note: screenshotData.note || '' // 注释
            }

            // 添加到截图列表
            this.screenshots.push(newScreenshot)

            // 选中新添加的截图
            this.selectedScreenshot = newScreenshot

            // 保存到本地存储
            this.saveScreenshotsToLocalStorage()

            return id
        },

        // 生成文件名
        generateFileName(date) {
            const template = this.settings.fileNameTemplate
            const now = date || new Date()

            // 格式化日期: YYYY-MM-DD
            const dateStr = now.toISOString().split('T')[0]

            // 格式化时间: HH-MM-SS
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')

            // 替换模板中的变量
            return template
                .replace('{date}', dateStr)
                .replace('{time}', timeStr)
                .replace('{random}', Math.floor(Math.random() * 1000))
        },

        // 更新截图信息
        updateScreenshot(id, updates) {
            const screenshot = this.screenshots.find(s => s.id === id)
            if (!screenshot) return false

            // 应用更新
            for (const key in updates) {
                if (key !== 'id' && key !== 'createdAt') {
                    screenshot[key] = updates[key]
                }
            }

            // 如果是当前选中的截图，更新选中对象
            if (this.selectedScreenshot && this.selectedScreenshot.id === id) {
                this.selectedScreenshot = {...screenshot }
            }

            // 保存到本地存储
            this.saveScreenshotsToLocalStorage()

            return true
        },

        // 删除截图
        removeScreenshot(id) {
            const index = this.screenshots.findIndex(s => s.id === id)
            if (index === -1) return false

            // 获取截图对象
            const screenshot = this.screenshots[index]

            // 如果图片数据是Blob URL，释放它
            if (screenshot.imageData && screenshot.imageData.startsWith('blob:')) {
                URL.revokeObjectURL(screenshot.imageData)
            }

            // 如果缩略图数据是Blob URL且不同于图片数据，释放它
            if (screenshot.thumbnailData &&
                screenshot.thumbnailData.startsWith('blob:') &&
                screenshot.thumbnailData !== screenshot.imageData) {
                URL.revokeObjectURL(screenshot.thumbnailData)
            }

            // 从数组中移除
            this.screenshots.splice(index, 1)

            // 如果删除的是当前选中的截图，更新选中状态
            if (this.selectedScreenshot && this.selectedScreenshot.id === id) {
                // 如果还有其他截图，选中第一个
                if (this.screenshots.length > 0) {
                    this.selectedScreenshot = this.screenshots[0]
                } else {
                    this.selectedScreenshot = null
                }
            }

            // 保存到本地存储
            this.saveScreenshotsToLocalStorage()

            return true
        },

        // 批量删除截图
        removeMultipleScreenshots(ids) {
            const results = []

            for (const id of ids) {
                results.push({
                    id,
                    success: this.removeScreenshot(id)
                })
            }

            return results
        },

        // 选择截图
        selectScreenshot(id) {
            const screenshot = this.screenshots.find(s => s.id === id)
            this.selectedScreenshot = screenshot || null
        },

        // 清除选中的截图
        clearSelectedScreenshot() {
            this.selectedScreenshot = null
        },

        // 更新截图设置
        updateSettings(newSettings) {
            this.settings = {
                ...this.settings,
                ...newSettings
            }

            // 保存设置到本地存储
            this.saveSettingsToLocalStorage()
        },

        // 下载截图
        downloadScreenshot(id) {
            const screenshot = this.screenshots.find(s => s.id === id)
            if (!screenshot || !screenshot.imageData) return false

            // 创建下载链接
            const link = document.createElement('a')

            // 如果是base64图像数据
            if (screenshot.imageData.startsWith('data:')) {
                link.href = screenshot.imageData
            }
            // 如果是Blob URL
            else if (screenshot.imageData.startsWith('blob:')) {
                link.href = screenshot.imageData
            }
            // 如果是其他URL
            else {
                link.href = screenshot.imageData
            }

            // 设置文件名
            link.download = screenshot.name + '.' + screenshot.format

            // 添加到文档并触发点击
            document.body.appendChild(link)
            link.click()

            // 移除链接
            document.body.removeChild(link)

            return true
        },

        // 添加标签到截图
        addTagToScreenshot(id, tag) {
            const screenshot = this.screenshots.find(s => s.id === id)
            if (!screenshot) return false

            // 确保不重复添加标签
            if (!screenshot.tags.includes(tag)) {
                screenshot.tags.push(tag)

                // 更新选中截图
                if (this.selectedScreenshot && this.selectedScreenshot.id === id) {
                    this.selectedScreenshot = {...screenshot }
                }

                // 保存到本地存储
                this.saveScreenshotsToLocalStorage()
            }

            return true
        },

        // 从截图中移除标签
        removeTagFromScreenshot(id, tag) {
            const screenshot = this.screenshots.find(s => s.id === id)
            if (!screenshot) return false

            // 查找并移除标签
            const tagIndex = screenshot.tags.indexOf(tag)
            if (tagIndex !== -1) {
                screenshot.tags.splice(tagIndex, 1)

                // 更新选中截图
                if (this.selectedScreenshot && this.selectedScreenshot.id === id) {
                    this.selectedScreenshot = {...screenshot }
                }

                // 保存到本地存储
                this.saveScreenshotsToLocalStorage()
            }

            return true
        },

        // 获取所有标签
        getAllTags() {
            // 收集所有截图中的标签并去重
            const allTags = new Set()
            this.screenshots.forEach(screenshot => {
                screenshot.tags.forEach(tag => allTags.add(tag))
            })

            return Array.from(allTags)
        },

        // 按标签查找截图
        findScreenshotsByTag(tag) {
            return this.screenshots.filter(screenshot =>
                screenshot.tags.includes(tag)
            )
        },

        // 保存截图到本地存储
        saveScreenshotsToLocalStorage() {
            try {
                // 创建可以安全存储的截图副本
                const screenshotsSafe = this.screenshots.map(screenshot => {
                    // 如果imageData是blob URL，只保存URL而不是完整的blob
                    let safeImageData = screenshot.imageData
                    let safeThumbnailData = screenshot.thumbnailData

                    // 如果数据太大，只存储ID信息
                    if (safeImageData && safeImageData.length > 1000000) {
                        safeImageData = `[Large image data: ${screenshot.id}]`
                    }

                    if (safeThumbnailData && safeThumbnailData.length > 100000) {
                        safeThumbnailData = `[Large thumbnail data: ${screenshot.id}]`
                    }

                    return {
                        ...screenshot,
                        imageData: safeImageData,
                        thumbnailData: safeThumbnailData
                    }
                })

                localStorage.setItem('screenshots', JSON.stringify(screenshotsSafe))
            } catch (error) {
                console.error('保存截图数据失败:', error)

                // 尝试保存没有图像数据的版本
                try {
                    const metadataOnly = this.screenshots.map(({ imageData, thumbnailData, ...metadata }) => metadata)
                    localStorage.setItem('screenshots_metadata', JSON.stringify(metadataOnly))
                } catch (innerError) {
                    console.error('保存截图元数据也失败:', innerError)
                }
            }
        },

        // 从本地存储加载截图
        loadScreenshotsFromLocalStorage() {
            try {
                const savedScreenshots = localStorage.getItem('screenshots')
                if (savedScreenshots) {
                    this.screenshots = JSON.parse(savedScreenshots)

                    // 如果有截图，默认选中第一个
                    if (this.screenshots.length > 0) {
                        this.selectedScreenshot = this.screenshots[0]
                    }
                }
            } catch (error) {
                console.error('加载截图数据失败:', error)
            }
        },

        // 保存设置到本地存储
        saveSettingsToLocalStorage() {
            try {
                localStorage.setItem('screenshot_settings', JSON.stringify(this.settings))
            } catch (error) {
                console.error('保存截图设置失败:', error)
            }
        },

        // 从本地存储加载设置
        loadSettingsFromLocalStorage() {
            try {
                const savedSettings = localStorage.getItem('screenshot_settings')
                if (savedSettings) {
                    this.settings = {
                        ...this.settings,
                        ...JSON.parse(savedSettings)
                    }
                }
            } catch (error) {
                console.error('加载截图设置失败:', error)
            }
        },

        // 清空所有截图
        clearAllScreenshots() {
            // 释放所有Blob URL
            this.screenshots.forEach(screenshot => {
                if (screenshot.imageData && screenshot.imageData.startsWith('blob:')) {
                    URL.revokeObjectURL(screenshot.imageData)
                }
                if (screenshot.thumbnailData &&
                    screenshot.thumbnailData.startsWith('blob:') &&
                    screenshot.thumbnailData !== screenshot.imageData) {
                    URL.revokeObjectURL(screenshot.thumbnailData)
                }
            })

            // 清空截图列表
            this.screenshots = []
            this.selectedScreenshot = null

            // 清除本地存储
            localStorage.removeItem('screenshots')
            localStorage.removeItem('screenshots_metadata')
        },

        // 导出截图数据为JSON
        exportScreenshotsAsJSON() {
            const exportData = {
                screenshots: this.screenshots.map(({ imageData, thumbnailData, ...metadata }) => metadata),
                version: '1.0',
                exportDate: new Date().toISOString()
            }

            return JSON.stringify(exportData, null, 2)
        },

        // 初始化存储
        initStore() {
            this.loadSettingsFromLocalStorage()
            this.loadScreenshotsFromLocalStorage()
        }
    }
})