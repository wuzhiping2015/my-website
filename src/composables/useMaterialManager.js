import { ref, reactive } from 'vue';
import * as THREE from 'three';

export function useMaterialManager() {
    // 材质参数
    const metalness = ref(0.3);
    const roughness = ref(0.7);
    const showWireframe = ref(false);

    // 材质预设
    const materialPresets = reactive([{
            name: '金属',
            settings: { metalness: 0.8, roughness: 0.2, color: '#888888' }
        },
        {
            name: '塑料',
            settings: { metalness: 0.1, roughness: 0.8, color: '#ffffff' }
        },
        {
            name: '橡胶',
            settings: { metalness: 0.0, roughness: 1.0, color: '#333333' }
        },
        {
            name: '光滑表面',
            settings: { metalness: 0.5, roughness: 0.0, color: '#aaaaaa' }
        },
        {
            name: '玻璃',
            settings: { metalness: 0.2, roughness: 0.1, color: '#ffffff', transparent: true, opacity: 0.7 }
        }
    ]);

    // 切换线框模式
    const toggleWireframe = () => {
        // 这里只更新状态，实际应用需要外部使用更新材质函数
    };

    // 更新单个对象材质
    const updateObjectMaterial = (object, settings = {}) => {
        if (!object || !object.isMesh) return;

        const materialSettings = {
            metalness: settings.metalness !== undefined ? settings.metalness : metalness.value,
            roughness: settings.roughness !== undefined ? settings.roughness : roughness.value,
            wireframe: settings.wireframe !== undefined ? settings.wireframe : showWireframe.value,
            color: settings.color || null, // 如果提供了颜色则使用
            transparent: settings.transparent,
            opacity: settings.opacity
        };

        try {
            // 处理材质数组
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => {
                    if (mat.isMeshStandardMaterial) {
                        mat.metalness = materialSettings.metalness;
                        mat.roughness = materialSettings.roughness;
                        mat.wireframe = materialSettings.wireframe;

                        if (materialSettings.color) {
                            mat.color.set(materialSettings.color);
                        }

                        if (materialSettings.transparent !== undefined) {
                            mat.transparent = materialSettings.transparent;
                        }

                        if (materialSettings.opacity !== undefined) {
                            mat.opacity = materialSettings.opacity;
                        }

                        mat.needsUpdate = true;
                    }
                });
            }
            // 处理单个材质
            else if (object.material) {
                const mat = object.material;

                if (mat.isMeshStandardMaterial) {
                    mat.metalness = materialSettings.metalness;
                    mat.roughness = materialSettings.roughness;
                    mat.wireframe = materialSettings.wireframe;

                    if (materialSettings.color) {
                        mat.color.set(materialSettings.color);
                    }

                    if (materialSettings.transparent !== undefined) {
                        mat.transparent = materialSettings.transparent;
                    }

                    if (materialSettings.opacity !== undefined) {
                        mat.opacity = materialSettings.opacity;
                    }

                    mat.needsUpdate = true;
                }
            }
        } catch (error) {
            console.error('更新材质时出错:', error);
        }
    };

    // 更新整个模型的材质
    const updateModelMaterial = (model, settings = {}) => {
        if (!model) return;

        model.traverse(child => {
            if (child instanceof THREE.Mesh) {
                updateObjectMaterial(child, settings);
            }
        });
    };

    // 应用材质预设
    const applyMaterialPreset = (presetName, target) => {
        const preset = materialPresets.find(p => p.name === presetName);
        if (!preset) return;

        // 更新材质参数状态
        metalness.value = preset.settings.metalness;
        roughness.value = preset.settings.roughness;

        // 应用到目标对象
        if (target) {
            updateObjectMaterial(target, preset.settings);
        }
    };

    // 创建或者更新材质
    const createOrUpdateMaterial = (originalMaterial, settings = {}) => {
        if (!originalMaterial) {
            // 创建新材质
            return new THREE.MeshStandardMaterial({
                metalness: settings.metalness !== undefined ? settings.metalness : metalness.value,
                roughness: settings.roughness !== undefined ? settings.roughness : roughness.value,
                wireframe: settings.wireframe !== undefined ? settings.wireframe : showWireframe.value,
                color: settings.color ? new THREE.Color(settings.color) : new THREE.Color(0xcccccc),
                transparent: settings.transparent,
                opacity: settings.opacity !== undefined ? settings.opacity : 1.0,
            });
        } else {
            // 更新现有材质
            const mat = originalMaterial.clone();

            mat.metalness = settings.metalness !== undefined ? settings.metalness : metalness.value;
            mat.roughness = settings.roughness !== undefined ? settings.roughness : roughness.value;
            mat.wireframe = settings.wireframe !== undefined ? settings.wireframe : showWireframe.value;

            if (settings.color) {
                mat.color.set(settings.color);
            }

            if (settings.transparent !== undefined) {
                mat.transparent = settings.transparent;
            }

            if (settings.opacity !== undefined) {
                mat.opacity = settings.opacity;
            }

            mat.needsUpdate = true;
            return mat;
        }
    };

    // 添加新的材质预设
    const addMaterialPreset = (name, settings) => {
        // 检查是否已存在同名预设
        const existingIndex = materialPresets.findIndex(p => p.name === name);

        if (existingIndex !== -1) {
            // 更新现有预设
            materialPresets[existingIndex].settings = {...settings };
        } else {
            // 添加新预设
            materialPresets.push({
                name,
                settings: {...settings }
            });
        }
    };

    // 删除材质预设
    const deleteMaterialPreset = (name) => {
        const index = materialPresets.findIndex(p => p.name === name);
        if (index !== -1) {
            materialPresets.splice(index, 1);
        }
    };

    return {
        // 状态
        metalness,
        roughness,
        showWireframe,
        materialPresets,

        // 方法
        toggleWireframe,
        updateObjectMaterial,
        updateModelMaterial,
        applyMaterialPreset,
        createOrUpdateMaterial,
        addMaterialPreset,
        deleteMaterialPreset
    };
}