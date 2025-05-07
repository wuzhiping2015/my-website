import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

export const useModelStore = defineStore('model', {
    state: () => ({
        // 已加载的模型列表
        models: [],

        // 选中的模型
        selectedModel: null,

        // 模型加载状态
        loadingModels: {},

        // 模型加载错误
        loadingErrors: {},

        // 全局模型变换设置
        globalTransform: {
            scale: 1.0, // 全局缩放比例
            autoCenter: true, // 自动居中
            autoScale: true, // 自动缩放
            normalizeSize: true // 标准化大小
        }
    }),

    getters: {
        // 获取所有模型
        getModels: (state) => state.models,

        // 获取选中的模型
        getSelectedModel: (state) => state.selectedModel,

        // 检查是否有选中模型
        hasSelectedModel: (state) => state.selectedModel !== null,

        // 获取模型数量
        getModelCount: (state) => state.models.length,

        // 获取可见模型列表
        getVisibleModels: (state) => state.models.filter(model => model.visible),

        // 获取模型加载状态
        getLoadingStatus: (state) => (modelId) => {
            return state.loadingModels[modelId] || false
        },

        // 检查是否有模型正在加载
        isLoading: (state) => Object.values(state.loadingModels).some(status => status),

        // 获取模型加载错误
        getLoadingError: (state) => (modelId) => {
            return state.loadingErrors[modelId] || null
        },

        // 获取全局变换设置
        getGlobalTransform: (state) => state.globalTransform
    },

    actions: {
        // 添加模型
        addModel(modelData) {
            const id = modelData.id || uuidv4()

            // 创建新模型对象
            const newModel = {
                id,
                name: modelData.name || `模型 ${this.models.length + 1}`,
                file: modelData.file || null, // 文件对象或路径
                url: modelData.url || null, // 模型URL
                type: modelData.type || 'gltf', // 模型类型：gltf, obj, fbx等
                visible: modelData.visible !== undefined ? modelData.visible : true,
                wireframe: modelData.wireframe || false,
                position: modelData.position || { x: 0, y: 0, z: 0 },
                rotation: modelData.rotation || { x: 0, y: 0, z: 0 },
                scale: modelData.scale || { x: 1, y: 1, z: 1 },
                materials: modelData.materials || [], // 应用的材质列表
                animations: modelData.animations || [], // 动画数据
                metadata: modelData.metadata || {}, // 其他元数据
                thumbnail: modelData.thumbnail || null, // 缩略图
                createdAt: modelData.createdAt || new Date().toISOString()
            }

            // 添加到模型列表
            this.models.push(newModel)

            // 如果之前没有选中模型，自动选中新添加的模型
            if (!this.selectedModel) {
                this.selectedModel = newModel
            }

            // 如果设置了自动保存，则保存模型列表
            this.saveModelsToLocalStorage()

            return id
        },

        // 从本地文件加载模型
        async loadModelFromFile(file, options = {}) {
            const modelId = uuidv4()
            const fileName = file.name
            const fileExtension = fileName.split('.').pop().toLowerCase()

            // 确定模型类型
            let modelType = 'gltf' // 默认类型
            if (['obj'].includes(fileExtension)) modelType = 'obj'
            else if (['fbx'].includes(fileExtension)) modelType = 'fbx'
            else if (['stl'].includes(fileExtension)) modelType = 'stl'
            else if (['glb', 'gltf'].includes(fileExtension)) modelType = 'gltf'

            // 创建文件URL
            const fileURL = URL.createObjectURL(file)

            // 设置加载状态
            this.setModelLoadingStatus(modelId, true)

            try {
                // 创建新模型对象
                const newModel = {
                    id: modelId,
                    name: options.name || fileName.replace(`.${fileExtension}`, ''),
                    file: fileURL,
                    localFile: file, // 保存本地文件引用
                    type: modelType,
                    visible: true,
                    wireframe: false,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    materials: [],
                    animations: [],
                    metadata: {
                        fileSize: file.size,
                        fileType: file.type,
                        originalName: fileName
                    },
                    createdAt: new Date().toISOString()
                }

                // 添加到模型列表
                this.models.push(newModel)

                // 选中新添加的模型
                this.selectedModel = newModel

                // 保存模型列表
                this.saveModelsToLocalStorage()

                // 清除加载状态
                this.setModelLoadingStatus(modelId, false)

                return modelId
            } catch (error) {
                console.error('加载模型文件失败:', error)
                this.setModelLoadingError(modelId, error.message || '加载失败')
                this.setModelLoadingStatus(modelId, false)
                throw error
            }
        },

        // 从URL加载模型
        async loadModelFromURL(url, options = {}) {
            const modelId = options.id || uuidv4()

            // 从URL确定模型类型
            const fileExtension = url.split('.').pop().split('?')[0].toLowerCase()
            let modelType = options.type || 'gltf' // 默认类型

            // 如果未指定类型，尝试从URL推断
            if (!options.type) {
                if (['obj'].includes(fileExtension)) modelType = 'obj'
                else if (['fbx'].includes(fileExtension)) modelType = 'fbx'
                else if (['stl'].includes(fileExtension)) modelType = 'stl'
                else if (['glb', 'gltf'].includes(fileExtension)) modelType = 'gltf'
            }

            // 设置加载状态
            this.setModelLoadingStatus(modelId, true)

            try {
                // 创建模型名称（如果未提供）
                let modelName = options.name
                if (!modelName) {
                    // 从URL提取文件名
                    const urlParts = url.split('/')
                    let fileName = urlParts[urlParts.length - 1]
                        // 移除查询参数
                    fileName = fileName.split('?')[0]
                        // 移除文件扩展名
                    modelName = fileName.replace(`.${fileExtension}`, '')
                }

                // 创建新模型对象
                const newModel = {
                    id: modelId,
                    name: modelName,
                    url: url,
                    type: modelType,
                    visible: true,
                    wireframe: false,
                    position: options.position || { x: 0, y: 0, z: 0 },
                    rotation: options.rotation || { x: 0, y: 0, z: 0 },
                    scale: options.scale || { x: 1, y: 1, z: 1 },
                    materials: [],
                    animations: [],
                    metadata: {
                        source: 'url',
                        ...options.metadata
                    },
                    createdAt: new Date().toISOString()
                }

                // 添加到模型列表
                this.models.push(newModel)

                // 选中新添加的模型
                this.selectedModel = newModel

                // 保存模型列表
                this.saveModelsToLocalStorage()

                // 清除加载状态
                this.setModelLoadingStatus(modelId, false)

                return modelId
            } catch (error) {
                console.error('从URL加载模型失败:', error)
                this.setModelLoadingError(modelId, error.message || '加载失败')
                this.setModelLoadingStatus(modelId, false)
                throw error
            }
        },

        // 设置模型加载状态
        setModelLoadingStatus(modelId, isLoading) {
            if (isLoading) {
                this.loadingModels[modelId] = true
            } else {
                // 使用解构和重组来触发响应式更新
                this.loadingModels = {
                    ...this.loadingModels,
                    [modelId]: false
                }
            }
        },

        // 设置模型加载错误
        setModelLoadingError(modelId, errorMessage) {
            this.loadingErrors = {
                ...this.loadingErrors,
                [modelId]: errorMessage
            }
        },

        // 清除模型加载错误
        clearModelLoadingError(modelId) {
            const newErrors = {...this.loadingErrors }
            delete newErrors[modelId]
            this.loadingErrors = newErrors
        },

        // 更新模型属性
        updateModel(modelId, properties) {
            const modelIndex = this.models.findIndex(model => model.id === modelId)
            if (modelIndex === -1) return false

            const model = this.models[modelIndex]

            // 更新各属性
            for (const key in properties) {
                if (key === 'position' || key === 'rotation' || key === 'scale') {
                    model[key] = {...model[key], ...properties[key] }
                } else {
                    model[key] = properties[key]
                }
            }

            // 如果更新的是当前选中的模型，同步更新selectedModel
            if (this.selectedModel && this.selectedModel.id === modelId) {
                this.selectedModel = {...model }
            }

            // 保存到本地存储
            this.saveModelsToLocalStorage()

            return true
        },

        // 删除模型
        removeModel(modelId) {
            const modelIndex = this.models.findIndex(model => model.id === modelId)
            if (modelIndex === -1) return false

            // 获取模型对象
            const model = this.models[modelIndex]

            // 如果有本地文件URL，释放它
            if (model.file && model.file.startsWith('blob:')) {
                URL.revokeObjectURL(model.file)
            }

            // 从数组中移除
            this.models.splice(modelIndex, 1)

            // 如果删除的是当前选中的模型，清除选中状态
            if (this.selectedModel && this.selectedModel.id === modelId) {
                // 如果还有其他模型，选中第一个
                if (this.models.length > 0) {
                    this.selectedModel = this.models[0]
                } else {
                    this.selectedModel = null
                }
            }

            // 清除加载状态和错误
            const newLoadingModels = {...this.loadingModels }
            const newLoadingErrors = {...this.loadingErrors }
            delete newLoadingModels[modelId]
            delete newLoadingErrors[modelId]
            this.loadingModels = newLoadingModels
            this.loadingErrors = newLoadingErrors

            // 保存到本地存储
            this.saveModelsToLocalStorage()

            return true
        },

        // 选择模型
        selectModel(modelId) {
            const model = this.models.find(model => model.id === modelId)
            this.selectedModel = model || null
        },

        // 清除选中模型
        clearSelectedModel() {
            this.selectedModel = null
        },

        // 显示/隐藏模型
        toggleModelVisibility(modelId) {
            const model = this.models.find(model => model.id === modelId)
            if (model) {
                model.visible = !model.visible

                // 如果是当前选中的模型，同步更新
                if (this.selectedModel && this.selectedModel.id === modelId) {
                    this.selectedModel = {...model }
                }

                // 保存到本地存储
                this.saveModelsToLocalStorage()

                return true
            }
            return false
        },

        // 设置模型材质
        setModelMaterial(modelId, materialId, options = {}) {
            const model = this.models.find(model => model.id === modelId)
            if (!model) return false

            // 如果指定了全局应用
            if (options.applyToAll) {
                model.materials = [{ id: materialId, applyToAll: true }]
            } else if (options.meshName) {
                // 查找是否已有该网格的材质设置
                const existingIndex = model.materials.findIndex(
                    m => m.meshName === options.meshName
                )

                if (existingIndex !== -1) {
                    // 更新现有设置
                    model.materials[existingIndex].id = materialId
                } else {
                    // 添加新设置
                    model.materials.push({
                        id: materialId,
                        meshName: options.meshName
                    })
                }
            }

            // 同步更新选中模型
            if (this.selectedModel && this.selectedModel.id === modelId) {
                this.selectedModel = {...model }
            }

            // 保存到本地存储
            this.saveModelsToLocalStorage()

            return true
        },

        // 更新模型动画列表
        updateModelAnimations(modelId, animations) {
            const model = this.models.find(model => model.id === modelId)
            if (!model) return false

            model.animations = animations

            // 同步更新选中模型
            if (this.selectedModel && this.selectedModel.id === modelId) {
                this.selectedModel = {...model }
            }

            // 保存到本地存储
            this.saveModelsToLocalStorage()

            return true
        },

        // 更新模型缩略图
        updateModelThumbnail(modelId, thumbnailURL) {
            const model = this.models.find(model => model.id === modelId)
            if (!model) return false

            // 如果有旧的缩略图URL，释放它
            if (model.thumbnail && model.thumbnail.startsWith('blob:')) {
                URL.revokeObjectURL(model.thumbnail)
            }

            model.thumbnail = thumbnailURL

            // 同步更新选中模型
            if (this.selectedModel && this.selectedModel.id === modelId) {
                this.selectedModel = {...model }
            }

            // 保存到本地存储
            this.saveModelsToLocalStorage()

            return true
        },

        // 更新全局变换设置
        updateGlobalTransform(settings) {
            this.globalTransform = {
                ...this.globalTransform,
                ...settings
            }
        },

        // 保存模型列表到本地存储
        saveModelsToLocalStorage() {
            try {
                // 创建一个安全的模型副本，排除可能引起循环引用的对象
                const modelsSafe = this.models.map(model => {
                    // 排除本地文件对象，避免循环引用
                    const { localFile, ...modelData } = model
                    return modelData
                })

                localStorage.setItem('models', JSON.stringify(modelsSafe))
            } catch (error) {
                console.error('保存模型数据失败:', error)
            }
        },

        // 从本地存储加载模型列表
        loadModelsFromLocalStorage() {
            try {
                const savedModels = localStorage.getItem('models')
                if (savedModels) {
                    this.models = JSON.parse(savedModels)

                    // 如果有模型，默认选中第一个
                    if (this.models.length > 0) {
                        this.selectedModel = this.models[0]
                    }
                }
            } catch (error) {
                console.error('加载模型数据失败:', error)
            }
        },

        // 清空所有模型
        clearAllModels() {
            // 释放所有文件URL
            this.models.forEach(model => {
                if (model.file && model.file.startsWith('blob:')) {
                    URL.revokeObjectURL(model.file)
                }
                if (model.thumbnail && model.thumbnail.startsWith('blob:')) {
                    URL.revokeObjectURL(model.thumbnail)
                }
            })

            // 清空模型列表
            this.models = []
            this.selectedModel = null
            this.loadingModels = {}
            this.loadingErrors = {}

            // 清除本地存储
            localStorage.removeItem('models')
        },

        // 导出模型数据为JSON
        exportModelsAsJSON() {
            const exportData = {
                models: this.models.map(({ localFile, ...model }) => model), // 排除本地文件对象
                version: '1.0',
                exportDate: new Date().toISOString()
            }

            return JSON.stringify(exportData, null, 2)
        },

        // 从JSON导入模型数据
        importModelsFromJSON(jsonData) {
            try {
                const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

                if (!data.models || !Array.isArray(data.models)) {
                    throw new Error('无效的模型数据格式')
                }

                // 先清空现有模型
                this.clearAllModels()

                // 导入新模型
                data.models.forEach(model => {
                    this.models.push({
                        ...model,
                        id: model.id || uuidv4() // 确保有ID
                    })
                })

                // 选择第一个模型
                if (this.models.length > 0) {
                    this.selectedModel = this.models[0]
                }

                // 保存到本地存储
                this.saveModelsToLocalStorage()

                return true
            } catch (error) {
                console.error('导入模型数据失败:', error)
                return false
            }
        },

        // 初始化存储
        initStore() {
            this.loadModelsFromLocalStorage()
        }
    }
})