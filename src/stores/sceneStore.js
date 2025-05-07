import { defineStore } from 'pinia'

export const useSceneStore = defineStore('scene', {
    state: () => ({
        // 环境设置
        environment: {
            // 背景色
            backgroundColor: '#F5F5F5',
            // 环境贴图
            environmentMap: null,
            // 环境贴图强度
            environmentMapIntensity: 1,
            // 雾效设置
            fog: {
                enabled: false,
                color: '#CCCCCC',
                near: 1,
                far: 1000
            },
            // 地面网格
            grid: {
                enabled: true,
                size: 20,
                divisions: 20,
                colorCenterLine: '#444444',
                colorGrid: '#888888'
            }
        },

        // 灯光设置
        lights: [{
                id: 'ambient',
                type: 'ambient',
                name: '环境光',
                color: '#FFFFFF',
                intensity: 0.5,
                visible: true
            },
            {
                id: 'directional',
                type: 'directional',
                name: '主光源',
                color: '#FFFFFF',
                intensity: 1.0,
                position: { x: 5, y: 10, z: 7.5 },
                castShadow: true,
                shadowBias: -0.001,
                shadowMapSize: 2048,
                visible: true
            }
        ],

        // 当前选中的灯光
        selectedLight: null,

        // 相机设置
        camera: {
            position: { x: 5, y: 5, z: 5 },
            lookAt: { x: 0, y: 0, z: 0 },
            fov: 50,
            near: 0.1,
            far: 2000,
            zoom: 1
        },

        // 渲染设置
        renderer: {
            antialias: true,
            shadowsEnabled: true,
            shadowType: 'PCFSoftShadowMap',
            toneMapping: 'ACESFilmic',
            toneMappingExposure: 1,
            outputEncoding: 'sRGB',
            physicallyCorrectLights: true
        },

        // 后期处理设置
        postProcessing: {
            enabled: false,
            bloom: {
                enabled: false,
                strength: 0.5,
                radius: 0.4,
                threshold: 0.85
            },
            ssao: {
                enabled: false,
                radius: 4,
                intensity: 1.5,
                bias: 0.025
            }
        },

        // 场景预设
        scenePresets: [{
                id: 'preset_default',
                name: '默认场景',
                environment: {
                    backgroundColor: '#F5F5F5',
                    environmentMapIntensity: 1,
                    fog: { enabled: false }
                },
                lights: [{
                        type: 'ambient',
                        color: '#FFFFFF',
                        intensity: 0.5
                    },
                    {
                        type: 'directional',
                        color: '#FFFFFF',
                        intensity: 1.0,
                        position: { x: 5, y: 10, z: 7.5 },
                        castShadow: true
                    }
                ]
            },
            {
                id: 'preset_studio',
                name: '工作室预设',
                environment: {
                    backgroundColor: '#000000',
                    environmentMapIntensity: 0.5,
                    fog: { enabled: false }
                },
                lights: [{
                        type: 'ambient',
                        color: '#FFFFFF',
                        intensity: 0.2
                    },
                    {
                        type: 'directional',
                        color: '#FFFFFF',
                        intensity: 1.5,
                        position: { x: 0, y: 10, z: 10 },
                        castShadow: true
                    },
                    {
                        type: 'point',
                        color: '#FFEED9',
                        intensity: 1.0,
                        position: { x: -10, y: 5, z: 0 },
                        castShadow: false
                    },
                    {
                        type: 'point',
                        color: '#D9F9FF',
                        intensity: 1.0,
                        position: { x: 10, y: 5, z: 0 },
                        castShadow: false
                    }
                ]
            },
            {
                id: 'preset_outdoor',
                name: '室外预设',
                environment: {
                    backgroundColor: '#87CEEB',
                    environmentMapIntensity: 1.5,
                    fog: {
                        enabled: true,
                        color: '#E0E0E0',
                        near: 10,
                        far: 1000
                    }
                },
                lights: [{
                        type: 'ambient',
                        color: '#AACCFF',
                        intensity: 0.8
                    },
                    {
                        type: 'directional',
                        color: '#FFFAFA',
                        intensity: 1.2,
                        position: { x: 50, y: 100, z: 50 },
                        castShadow: true
                    },
                    {
                        type: 'hemisphere',
                        skyColor: '#87CEEB',
                        groundColor: '#57432A',
                        intensity: 0.5
                    }
                ]
            }
        ],

        // 自定义场景预设
        customScenePresets: []
    }),

    getters: {
        getEnvironment: (state) => state.environment,
        getLights: (state) => state.lights,
        getCamera: (state) => state.camera,
        getRenderer: (state) => state.renderer,
        getPostProcessing: (state) => state.postProcessing,

        getAmbientLight: (state) => state.lights.find(light => light.type === 'ambient'),
        getMainLight: (state) => state.lights.find(light => light.id === 'directional'),

        getSelectedLight: (state) => state.selectedLight,

        getScenePresets: (state) => [
            ...state.scenePresets,
            ...state.customScenePresets
        ],

        getActivePreset: (state) => {
            // 检查当前场景是否与某个预设匹配
            const matchPreset = [...state.scenePresets, ...state.customScenePresets]
                .find(preset => {
                    // 这里仅比较简单的环境属性进行匹配
                    return preset.environment.backgroundColor === state.environment.backgroundColor &&
                        preset.environment.fog.enabled === state.environment.fog.enabled
                })

            return matchPreset ? matchPreset.id : null
        }
    },

    actions: {
        // 更新环境设置
        updateEnvironment(settings) {
            this.environment = {...this.environment, ...settings }
        },

        // 更新背景色
        setBackgroundColor(color) {
            this.environment.backgroundColor = color
        },

        // 设置环境贴图
        setEnvironmentMap(mapPath, intensity = 1) {
            this.environment.environmentMap = mapPath
            this.environment.environmentMapIntensity = intensity
        },

        // 切换雾效状态
        toggleFog(enabled) {
            this.environment.fog.enabled = enabled
        },

        // 更新雾效设置
        updateFog(settings) {
            this.environment.fog = {...this.environment.fog, ...settings }
        },

        // 切换网格显示
        toggleGrid(enabled) {
            this.environment.grid.enabled = enabled
        },

        // 更新网格设置
        updateGrid(settings) {
            this.environment.grid = {...this.environment.grid, ...settings }
        },

        // 添加灯光
        addLight(lightData) {
            const id = 'light_' + Date.now()
            const newLight = {
                id,
                type: 'point', // 默认为点光源
                name: '新建光源',
                color: '#FFFFFF',
                intensity: 1.0,
                position: { x: 0, y: 5, z: 0 },
                castShadow: false,
                visible: true,
                ...lightData
            }

            this.lights.push(newLight)
            return id
        },

        // 删除灯光
        removeLight(lightId) {
            // 不允许删除主光源和环境光
            if (lightId === 'ambient' || lightId === 'directional') {
                return false
            }

            const index = this.lights.findIndex(light => light.id === lightId)
            if (index !== -1) {
                this.lights.splice(index, 1)

                // 如果删除的是当前选中的灯光，清除选中状态
                if (this.selectedLight && this.selectedLight.id === lightId) {
                    this.selectedLight = null
                }

                return true
            }

            return false
        },

        // 更新灯光属性
        updateLight(lightId, properties) {
            const light = this.lights.find(light => light.id === lightId)
            if (light) {
                for (const key in properties) {
                    if (key === 'position' || key === 'rotation') {
                        light[key] = {...light[key], ...properties[key] }
                    } else {
                        light[key] = properties[key]
                    }
                }

                // 如果更新的是当前选中的灯光，同步更新选中灯光
                if (this.selectedLight && this.selectedLight.id === lightId) {
                    this.selectedLight = light
                }

                return true
            }

            return false
        },

        // 选择灯光
        selectLight(lightId) {
            const light = this.lights.find(light => light.id === lightId)
            this.selectedLight = light || null
        },

        // 清除选中灯光
        clearSelectedLight() {
            this.selectedLight = null
        },

        // 更新相机设置
        updateCamera(settings) {
            this.camera = {...this.camera, ...settings }
        },

        // 更新渲染器设置
        updateRenderer(settings) {
            this.renderer = {...this.renderer, ...settings }
        },

        // 切换后期处理
        togglePostProcessing(enabled) {
            this.postProcessing.enabled = enabled
        },

        // 更新后期处理设置
        updatePostProcessing(settings) {
            this.postProcessing = {...this.postProcessing, ...settings }
        },

        // 切换辉光效果
        toggleBloom(enabled) {
            this.postProcessing.bloom.enabled = enabled

            // 如果启用辉光，确保后期处理总开关也打开
            if (enabled && !this.postProcessing.enabled) {
                this.postProcessing.enabled = true
            }
        },

        // 更新辉光设置
        updateBloom(settings) {
            this.postProcessing.bloom = {...this.postProcessing.bloom, ...settings }
        },

        // 切换环境光遮蔽
        toggleSSAO(enabled) {
            this.postProcessing.ssao.enabled = enabled

            // 如果启用SSAO，确保后期处理总开关也打开
            if (enabled && !this.postProcessing.enabled) {
                this.postProcessing.enabled = true
            }
        },

        // 更新环境光遮蔽设置
        updateSSAO(settings) {
            this.postProcessing.ssao = {...this.postProcessing.ssao, ...settings }
        },

        // 应用场景预设
        applyScenePreset(presetId) {
            const preset = [...this.scenePresets, ...this.customScenePresets]
                .find(preset => preset.id === presetId)

            if (!preset) return false

            // 应用环境设置
            if (preset.environment) {
                this.environment = {
                    ...this.environment,
                    ...preset.environment
                }
            }

            // 应用灯光设置
            if (preset.lights) {
                // 保留特殊灯光（ambient、directional）
                const specialLights = this.lights.filter(
                    light => light.id === 'ambient' || light.id === 'directional'
                )

                // 更新特殊灯光属性
                specialLights.forEach(light => {
                    const presetLight = preset.lights.find(l => l.type === light.type)
                    if (presetLight) {
                        for (const key in presetLight) {
                            if (key !== 'id' && key !== 'type') {
                                light[key] = presetLight[key]
                            }
                        }
                    }
                })

                // 添加预设中的其他灯光
                const additionalLights = preset.lights.filter(
                    light => light.type !== 'ambient' && light.type !== 'directional'
                )

                // 移除现有的非特殊灯光
                this.lights = specialLights

                // 添加预设中的额外灯光
                additionalLights.forEach(lightData => {
                    this.addLight(lightData)
                })
            }

            return true
        },

        // 保存当前场景为自定义预设
        saveCurrentAsPreset(name) {
            const presetId = 'custom_' + Date.now()

            // 提取当前环境设置
            const environment = {
                backgroundColor: this.environment.backgroundColor,
                environmentMap: this.environment.environmentMap,
                environmentMapIntensity: this.environment.environmentMapIntensity,
                fog: {...this.environment.fog }
            }

            // 提取当前灯光设置
            const lights = this.lights.map(light => {
                const lightCopy = {...light }
                    // 深拷贝位置和旋转
                if (light.position) lightCopy.position = {...light.position }
                if (light.rotation) lightCopy.rotation = {...light.rotation }
                return lightCopy
            })

            // 创建预设对象
            const newPreset = {
                id: presetId,
                name: name || '自定义场景',
                environment,
                lights
            }

            // 添加到自定义预设列表
            this.customScenePresets.push(newPreset)

            // 保存到本地存储
            this.saveCustomPresetsToLocalStorage()

            return presetId
        },

        // 删除自定义场景预设
        deleteCustomPreset(presetId) {
            const index = this.customScenePresets.findIndex(preset => preset.id === presetId)
            if (index !== -1) {
                this.customScenePresets.splice(index, 1)
                this.saveCustomPresetsToLocalStorage()
                return true
            }
            return false
        },

        // 加载自定义预设从本地存储
        loadCustomPresetsFromLocalStorage() {
            try {
                const savedPresets = localStorage.getItem('scenePresets')
                if (savedPresets) {
                    this.customScenePresets = JSON.parse(savedPresets)
                }
            } catch (error) {
                console.error('加载场景预设失败:', error)
            }
        },

        // 保存自定义预设到本地存储
        saveCustomPresetsToLocalStorage() {
            try {
                localStorage.setItem('scenePresets', JSON.stringify(this.customScenePresets))
            } catch (error) {
                console.error('保存场景预设失败:', error)
            }
        },

        // 重置场景到默认状态
        resetToDefaultScene() {
            return this.applyScenePreset('preset_default')
        },

        // 初始化存储
        initStore() {
            this.loadCustomPresetsFromLocalStorage()
        }
    }
})