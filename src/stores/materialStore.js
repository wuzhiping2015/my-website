import { defineStore } from 'pinia'

export const useMaterialStore = defineStore('materials', {
    state: () => ({
        // 当前模型的所有材质列表
        materials: [],

        // 原始材质备份，用于重置
        originalMaterials: [],

        // 当前选中的材质
        selectedMaterial: null,

        // 材质预设
        materialPresets: [
            { id: 'preset_metal', name: '金属材质', properties: { metalness: 0.9, roughness: 0.1, color: '#ffffff' } },
            { id: 'preset_plastic', name: '塑料材质', properties: { metalness: 0.0, roughness: 0.9, color: '#dddddd' } },
            { id: 'preset_glass', name: '玻璃材质', properties: { metalness: 0.0, roughness: 0.0, color: '#ffffff', transparent: true, opacity: 0.5 } },
            { id: 'preset_neon', name: '霓虹材质', properties: { metalness: 0.5, roughness: 0.2, color: '#00ff00', emissive: '#00ff00', emissiveIntensity: 0.5 } },
            { id: 'preset_matte', name: '哑光材质', properties: { metalness: 0.0, roughness: 1.0, color: '#cccccc' } }
        ],

        // 自定义材质列表
        customMaterials: [],
    }),

    getters: {
        // 获取当前模型的所有材质
        getAllMaterials: (state) => state.materials,

        // 获取选中的材质
        getSelectedMaterial: (state) => state.selectedMaterial,

        // 获取材质预设列表
        getMaterialPresets: (state) => state.materialPresets,

        // 获取自定义材质列表
        getCustomMaterials: (state) => state.customMaterials,
    },

    actions: {
        // 初始化存储
        initStore() {
            console.log('初始化材质存储')
            this.loadCustomMaterialsFromStorage()
                // 如果没有数据则设置默认材质
            if (this.materials.length === 0) {
                // 默认添加一些材质
                this.materials = [...this.materialPresets]
                this.originalMaterials = [...this.materials]
            }
        },

        // 设置材质列表
        setMaterials(materials) {
            this.materials = materials
            this.originalMaterials = [...materials]
        },

        // 更新单个材质
        updateMaterial(materialId, properties) {
            const materialIndex = this.materials.findIndex(m => m.id === materialId)
            if (materialIndex !== -1) {
                this.materials[materialIndex] = {
                    ...this.materials[materialIndex],
                    ...properties
                }
            }
        },

        // 选择材质
        selectMaterial(material) {
            this.selectedMaterial = material
        },

        // 清除所有材质
        clearAllMaterials() {
            this.materials = []
            this.selectedMaterial = null
        },

        // 序列化当前材质状态（用于保存场景）
        serializeMaterials() {
            return JSON.stringify({
                materials: this.materials,
                customMaterials: this.customMaterials,
                selectedMaterial: this.selectedMaterial ? this.selectedMaterial.id : null
            })
        },

        // 从序列化的数据加载材质
        loadMaterialsFromSerialized(serializedData) {
            try {
                const data = JSON.parse(serializedData)
                this.materials = data.materials || []
                this.customMaterials = data.customMaterials || []

                if (data.selectedMaterial) {
                    this.selectedMaterial = this.materials.find(m => m.id === data.selectedMaterial) || null
                }

                return true
            } catch (error) {
                console.error('加载材质数据失败:', error)
                return false
            }
        },

        // 重置材质到原始状态
        resetMaterials() {
            this.materials = [...this.originalMaterials]
            this.selectedMaterial = null
        },

        // 应用预设材质
        applyMaterialPreset(presetName) {
            const preset = this.materialPresets.find(p => p.name === presetName)
            if (preset && this.selectedMaterial) {
                this.updateMaterial(this.selectedMaterial.id, preset.properties)
                return true
            }
            return false
        },

        // 创建自定义材质
        createCustomMaterial(name, properties) {
            const newMaterial = {
                id: `custom_${Date.now()}`,
                name,
                properties
            }

            this.customMaterials.push(newMaterial)
            this.saveCustomMaterialsToStorage()
            return newMaterial
        },

        // 删除自定义材质
        deleteCustomMaterial(materialId) {
            const index = this.customMaterials.findIndex(m => m.id === materialId)
            if (index !== -1) {
                this.customMaterials.splice(index, 1)
                this.saveCustomMaterialsToStorage()
                return true
            }
            return false
        },

        // 保存自定义材质到本地存储
        saveCustomMaterialsToStorage() {
            try {
                localStorage.setItem('customMaterials', JSON.stringify(this.customMaterials))
            } catch (error) {
                console.error('保存自定义材质失败:', error)
            }
        },

        // 从本地存储加载自定义材质
        loadCustomMaterialsFromStorage() {
            try {
                const stored = localStorage.getItem('customMaterials')
                if (stored) {
                    this.customMaterials = JSON.parse(stored)
                }
            } catch (error) {
                console.error('加载自定义材质失败:', error)
            }
        }
    }
})