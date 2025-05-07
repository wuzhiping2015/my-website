import { ref, reactive, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export function useModelLoader() {
    // 状态变量
    const model = ref(null);
    const modelLoaded = ref(false);
    const loadingProgress = ref(0);
    const loading = ref(false);
    const loadError = ref(null);
    const currentModel = ref('');

    // 缓存管理 - 避免重复加载
    const modelCache = new Map();

    // 初始化加载器
    const gltfLoader = new GLTFLoader().setPath('/');
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);

    // 清理当前模型
    const cleanupModel = () => {
        if (model.value) {
            model.value.traverse((object) => {
                // 清理几何体和材质
                if (object.geometry) {
                    object.geometry.dispose();
                }

                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });

            // 清除引用
            model.value = null;
        }
    };

    // 加载模型函数
    const loadModel = async(modelPath, scene, options = {}) => {
        if (!scene) {
            console.error('场景未初始化');
            return null;
        }

        // 更新状态
        currentModel.value = modelPath;
        loadError.value = null;
        loadingProgress.value = 0;
        loading.value = true;
        modelLoaded.value = false;

        // 清理当前模型
        cleanupModel();

        try {
            // 检查缓存中是否已存在该模型
            if (modelCache.has(modelPath) && !options.forceReload) {
                console.log(`从缓存加载模型: ${modelPath}`);
                model.value = modelCache.get(modelPath).clone();
                handleModelLoaded(model.value, scene, options);
                return model.value;
            }

            // 根据文件类型选择合适的加载器
            let loader;
            if (modelPath.toLowerCase().endsWith('.gltf') || modelPath.toLowerCase().endsWith('.glb')) {
                loader = gltfLoader;
            } else if (modelPath.toLowerCase().endsWith('.obj')) {
                loader = new OBJLoader();
            } else if (modelPath.toLowerCase().endsWith('.fbx')) {
                loader = new FBXLoader();
            } else {
                throw new Error(`不支持的文件格式: ${modelPath}`);
            }

            // 加载模型
            const result = await new Promise((resolve, reject) => {
                loader.load(
                    modelPath,
                    (object) => resolve(object),
                    (xhr) => {
                        if (xhr.lengthComputable) {
                            loadingProgress.value = Math.round((xhr.loaded / xhr.total) * 100);
                        }
                    },
                    (error) => reject(error)
                );
            });

            // 处理不同类型的模型结果
            if (modelPath.toLowerCase().endsWith('.gltf') || modelPath.toLowerCase().endsWith('.glb')) {
                model.value = result.scene;
            } else {
                model.value = result;
            }

            // 缓存模型
            modelCache.set(modelPath, model.value.clone());

            // 处理加载完成后的逻辑
            handleModelLoaded(model.value, scene, options);

            return model.value;
        } catch (error) {
            console.error('模型加载失败:', error);
            loadError.value = `加载模型失败: ${error.message}`;
            return null;
        } finally {
            loading.value = false;
            loadingProgress.value = 0;
        }
    };

    // 处理模型加载完成
    const handleModelLoaded = (loadedModel, scene, options) => {
        if (!loadedModel) return;

        // 处理模型材质和阴影
        loadedModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // 初始化材质颜色副本
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material) => {
                            if (material.color) {
                                material.userData.originalColor = material.color.clone();
                            }
                        });
                    } else if (child.material.color) {
                        child.material.userData.originalColor = child.material.color.clone();
                    }
                }

                // 升级材质 (如果需要)
                if (options.upgradeMaterials) {
                    upgradeToStandardMaterial(child, options.materialSettings);
                }
            }
        });

        // 处理不同格式模型的特殊逻辑
        if (currentModel.value.toLowerCase().endsWith('.fbx')) {
            console.log('正在处理FBX模型...');
            if (!loadedModel.scale || loadedModel.scale.x === 0) {
                loadedModel.scale.set(0.01, 0.01, 0.01);
            }

            loadedModel.name = loadedModel.name || "loadedModel";
        }

        // 计算模型包围盒
        const box = new THREE.Box3().setFromObject(loadedModel);
        // 将模型定位到场景中央
        if (!box.isEmpty() && options.centerModel) {
            const center = new THREE.Vector3();
            box.getCenter(center);
            loadedModel.position.sub(center);
        }

        // 计算模型尺寸
        loadedModel.userData.modelSize = {
            box: box,
            dimensions: new THREE.Vector3()
        };
        box.getSize(loadedModel.userData.modelSize.dimensions);

        // 添加到场景
        scene.add(loadedModel);

        // 更新状态
        modelLoaded.value = true;

        // 触发加载完成回调
        if (typeof options.onLoaded === 'function') {
            options.onLoaded(loadedModel);
        }
    };

    // 升级到标准材质
    const upgradeToStandardMaterial = (meshObject, settings = {}) => {
        if (!meshObject || !meshObject.isMesh) return;

        const defaultSettings = {
            metalness: 0.3,
            roughness: 0.7,
            wireframe: false
        };

        const materialSettings = {...defaultSettings, ...settings };

        try {
            // 处理材质数组
            if (Array.isArray(meshObject.material)) {
                const newMaterials = [];

                meshObject.material.forEach((mat) => {
                    // 如果已经是MeshStandardMaterial，则只更新参数
                    if (mat.isMeshStandardMaterial) {
                        mat.metalness = materialSettings.metalness;
                        mat.roughness = materialSettings.roughness;
                        mat.wireframe = materialSettings.wireframe;
                        newMaterials.push(mat);
                    } else {
                        // 创建新的MeshStandardMaterial
                        const newMat = new THREE.MeshStandardMaterial({
                            color: mat.color ? mat.color.clone() : new THREE.Color(0xcccccc),
                            map: mat.map,
                            normalMap: mat.normalMap,
                            aoMap: mat.aoMap,
                            aoMapIntensity: mat.aoMapIntensity,
                            emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
                            emissiveMap: mat.emissiveMap,
                            emissiveIntensity: mat.emissiveIntensity || 1,
                            metalness: materialSettings.metalness,
                            roughness: materialSettings.roughness,
                            transparent: mat.transparent,
                            opacity: mat.opacity,
                            side: mat.side,
                            wireframe: materialSettings.wireframe
                        });

                        newMaterials.push(newMat);
                    }
                });

                meshObject.material = newMaterials;
            }
            // 处理单个材质
            else if (meshObject.material) {
                const mat = meshObject.material;

                // 如果已经是MeshStandardMaterial，则只更新参数
                if (mat.isMeshStandardMaterial) {
                    mat.metalness = materialSettings.metalness;
                    mat.roughness = materialSettings.roughness;
                    mat.wireframe = materialSettings.wireframe;
                } else {
                    // 创建新的MeshStandardMaterial
                    const newMat = new THREE.MeshStandardMaterial({
                        color: mat.color ? mat.color.clone() : new THREE.Color(0xcccccc),
                        map: mat.map,
                        normalMap: mat.normalMap,
                        aoMap: mat.aoMap,
                        aoMapIntensity: mat.aoMapIntensity,
                        emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
                        emissiveMap: mat.emissiveMap,
                        emissiveIntensity: mat.emissiveIntensity || 1,
                        metalness: materialSettings.metalness,
                        roughness: materialSettings.roughness,
                        transparent: mat.transparent,
                        opacity: mat.opacity,
                        side: mat.side,
                        wireframe: materialSettings.wireframe
                    });

                    meshObject.material = newMat;
                }
            }
        } catch (error) {
            console.error('升级材质时出错:', error);
        }
    };

    // 重置模型缓存
    const clearModelCache = () => {
        modelCache.clear();
    };

    return {
        model,
        modelLoaded,
        loadingProgress,
        loading,
        loadError,
        currentModel,
        loadModel,
        cleanupModel,
        clearModelCache
    };
}