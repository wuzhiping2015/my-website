/**
 * useModelLoader.js
 * 模型加载器Composable
 * 处理模型的加载、解析与优化
 */

import { ref, reactive, computed, watch, markRaw } from 'vue';
import ModelOptimizer from '../utils/ModelOptimizer';
import * as THREE from 'three';

/**
 * 模型加载钩子
 * @param {Object} options - 配置选项
 * @returns {Object} - 模型加载器状态和方法
 */
export default function useModelLoader(options = {}) {
    // 默认选项
    const {
        autoLoad = false,
            modelPath = '',
            optimize = true,
            simplificationRatio = 0.5,
            useDraco = true,
            onProgress = null,
            onError = null,
            onLoad = null
    } = options;

    // 状态
    const isLoading = ref(false);
    const loadProgress = ref(0);
    const loadError = ref(null);
    const currentModel = ref(null);
    const partsList = ref([]);

    /**
     * 加载模型
     * @param {string} path - 模型路径
     * @param {Object} modelService - 模型服务实例
     * @param {Object} options - 加载选项
     * @returns {Promise<Object>} - 加载的模型对象
     */
    const loadModel = async(path, modelService, options = {}) => {
        if (!modelService) {
            const error = new Error('模型服务未初始化');
            loadError.value = error;
            throw error;
        }

        if (!path) {
            const error = new Error('未提供模型路径');
            loadError.value = error;
            throw error;
        }

        // 开始加载
        isLoading.value = true;
        loadProgress.value = 0;
        loadError.value = null;

        try {
            // 清理当前模型
            if (currentModel.value) {
                modelService.disposeModel(currentModel.value.model);
                currentModel.value = null;
            }

            // 合并默认选项和传入选项
            const loadOptions = {
                optimizeModel: options.optimizeModel !== undefined ? options.optimizeModel : optimize,
                simplificationRatio: options.simplificationRatio !== undefined ? options.simplificationRatio : simplificationRatio,
                useDraco: options.useDraco !== undefined ? options.useDraco : useDraco,
                onProgress: (progress) => {
                    loadProgress.value = progress;
                    if (onProgress && typeof onProgress === 'function') {
                        onProgress(progress);
                    }
                    if (options.onProgress && typeof options.onProgress === 'function') {
                        options.onProgress(progress);
                    }
                },
                ...options
            };

            // 加载新模型
            const modelResult = await modelService.loadModel(path, loadOptions);

            // 提取模型对象
            if (!modelResult || !modelResult.model) {
                throw new Error('加载模型失败：返回的结果无效');
            }

            // 使用markRaw处理模型对象，防止被Vue代理
            const safeModel = markRaw(modelResult.model);
            const safeAnimations = modelResult.animations ? markRaw(modelResult.animations) : [];

            // 确保模型的子对象也被markRaw包装
            safeModel.traverse(node => {
                if (node.isMesh) {
                    // 确保几何体不被Vue代理
                    node.geometry = markRaw(node.geometry);

                    // 确保材质不被Vue代理
                    if (Array.isArray(node.material)) {
                        node.material = node.material.map(mat => markRaw(mat));
                    } else if (node.material) {
                        node.material = markRaw(node.material);
                    }
                }
            });

            // 创建安全的模型结果对象
            const safeModelResult = markRaw({
                model: safeModel,
                animations: safeAnimations,
                type: modelResult.type
            });

            // 优化模型（如果ModelService未优化）
            if (loadOptions.optimizeModel &&
                !options.skipAdditionalOptimization &&
                safeModel) {
                try {
                    console.log('开始进行额外的模型优化...');
                    // 检测模型大小
                    const modelSize = calculateModelSize(safeModel);
                    const isLargeModel = modelSize > 50; // 大于50MB的模型认为是大型模型
                    console.log(`模型大小估计: ${modelSize.toFixed(2)}MB, 是大型模型: ${isLargeModel}`);

                    // 为大型模型启用更激进的优化策略
                    const optimizationOptions = {
                        simplificationRatio: isLargeModel ? 0.7 : loadOptions.simplificationRatio,
                        simplifyGeometry: true,
                        mergeGeometries: loadOptions.mergeGeometries !== undefined ?
                            loadOptions.mergeGeometries : loadOptions.useDraco,
                        optimizeMaterials: true,
                        enableInstancing: true,
                        maxTextureSize: isLargeModel ? 512 : 1024,
                        aggressiveMode: isLargeModel,
                        createLOD: isLargeModel, // 大型模型自动启用LOD
                        onProgress: (stage, progress) => {
                            console.log(`优化阶段 ${stage}: ${progress * 100}%`);
                            // 模型加载完成后，优化进度从80%到100%
                            if (loadOptions.onProgress) {
                                const adjustedProgress = 0.8 + (progress * 0.2);
                                loadOptions.onProgress(adjustedProgress);
                            }
                        }
                    };

                    // 使用异步优化来避免UI阻塞
                    await ModelOptimizer.optimizeAsync(safeModel, optimizationOptions);
                    console.log('额外优化完成');
                } catch (error) {
                    console.warn('模型额外优化过程中发生错误:', error);
                    // 尝试禁用几何体合并后重新优化
                    try {
                        console.log('尝试禁用几何体合并后重新优化...');
                        await ModelOptimizer.optimizeAsync(safeModel, {
                            simplificationRatio: loadOptions.simplificationRatio,
                            simplifyGeometry: true,
                            mergeGeometries: false, // 禁用几何体合并
                            optimizeMaterials: true,
                            maxTextureSize: 512, // 降低纹理大小以节省内存
                            onProgress: (stage, progress) => {
                                console.log(`备用优化阶段 ${stage}: ${progress * 100}%`);
                                // 模型加载完成后，优化进度从80%到100%
                                if (loadOptions.onProgress) {
                                    const adjustedProgress = 0.8 + (progress * 0.2);
                                    loadOptions.onProgress(adjustedProgress);
                                }
                            }
                        });
                        console.log('备用优化完成');
                    } catch (fallbackError) {
                        console.warn('备用优化也失败，将使用原始模型:', fallbackError);
                        // 即使优化失败，仍然继续使用ModelService已经优化的模型
                    }
                }
            }

            // 更新状态
            currentModel.value = safeModelResult;

            isLoading.value = false;
            loadProgress.value = 100;

            // 更新部件列表
            updatePartsList();

            // 调用回调
            if (onLoad && typeof onLoad === 'function') {
                onLoad(currentModel.value);
            }

            return currentModel.value;
        } catch (error) {
            console.error('模型加载失败:', error);
            loadError.value = error;
            isLoading.value = false;

            if (onError && typeof onError === 'function') {
                onError(error);
            }

            throw error;
        }
    };

    /**
     * 更新部件列表
     */
    const updatePartsList = () => {
        if (!currentModel.value || !currentModel.value.model) {
            partsList.value = [];
            return;
        }

        const parts = [];
        currentModel.value.model.traverse((object) => {
            if (object.isMesh) {
                // 忽略帮助器对象
                if (object.name.toLowerCase().includes('helper')) {
                    return;
                }

                // 确保对象有唯一标识
                if (!object.uuid) {
                    object.uuid = THREE.MathUtils.generateUUID();
                }

                // 添加到部件列表
                parts.push({
                    id: object.uuid,
                    name: object.name || `部件_${parts.length + 1}`,
                    type: 'mesh',
                    visible: object.visible,
                    object
                });
            }
        });

        partsList.value = parts;
    };

    /**
     * 获取部件列表
     * @returns {Array} - 部件列表
     */
    const getPartsList = () => {
        return partsList.value;
    };

    /**
     * 分解模型
     * @param {number} [spacing=0.5] - 部件间距
     * @returns {Object} - 分解后的模型信息
     */
    const decomposeModel = (spacing = 0.5) => {
        if (!currentModel.value || !currentModel.value.model) {
            return null;
        }

        const parts = [];
        const center = new THREE.Vector3();
        const box = new THREE.Box3().setFromObject(currentModel.value.model);
        box.getCenter(center);

        // 计算模型尺寸
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        // 遍历所有部件
        currentModel.value.model.traverse((object) => {
            if (object.isMesh) {
                // 记录原始位置
                if (!object.userData.originalPosition) {
                    object.userData.originalPosition = object.position.clone();
                }

                // 计算部件中心
                const partBox = new THREE.Box3().setFromObject(object);
                const partCenter = new THREE.Vector3();
                partBox.getCenter(partCenter);

                // 计算从模型中心到部件中心的方向向量
                const direction = new THREE.Vector3().subVectors(partCenter, center).normalize();

                // 沿着方向向量移动部件
                const distance = maxDim * spacing;
                const newPosition = new THREE.Vector3().addVectors(
                    object.userData.originalPosition,
                    direction.multiplyScalar(distance)
                );

                // 更新位置
                object.position.copy(newPosition);

                parts.push({
                    id: object.uuid,
                    name: object.name,
                    originalPosition: object.userData.originalPosition.clone(),
                    newPosition: newPosition.clone()
                });
            }
        });

        return {
            parts,
            isDecomposed: true,
            spacing
        };
    };

    /**
     * 合并模型
     * @returns {Object} - 合并后的模型信息
     */
    const mergeModel = () => {
        if (!currentModel.value || !currentModel.value.model) {
            return null;
        }

        const parts = [];

        // 遍历所有部件
        currentModel.value.model.traverse((object) => {
            if (object.isMesh && object.userData.originalPosition) {
                // 恢复原始位置
                object.position.copy(object.userData.originalPosition);

                parts.push({
                    id: object.uuid,
                    name: object.name,
                    position: object.position.clone()
                });
            }
        });

        return {
            parts,
            isDecomposed: false
        };
    };

    /**
     * 更新材质
     * @param {Object} options - 材质选项
     * @param {string|Array} [targetIds] - 目标部件ID，不指定则更新所有部件
     * @returns {Array} - 更新的部件列表
     */
    const updateMaterial = (options, targetIds = null) => {
        if (!currentModel.value || !currentModel.value.model) {
            return [];
        }

        const updatedParts = [];

        // 创建ID集合，用于快速查找
        const targetIdSet = targetIds ? new Set(Array.isArray(targetIds) ? targetIds : [targetIds]) : null;

        // 遍历所有部件
        currentModel.value.model.traverse((object) => {
            if (object.isMesh) {
                // 检查是否为目标部件
                if (targetIdSet && !targetIdSet.has(object.uuid)) {
                    return;
                }

                // 更新材质
                if (Array.isArray(object.material)) {
                    // 多材质对象
                    object.material.forEach((material, index) => {
                        Object.keys(options).forEach(key => {
                            if (material[key] !== undefined) {
                                material[key] = options[key];

                                // 对于某些属性，需要标记更新
                                if (['map', 'normalMap', 'roughnessMap', 'metalnessMap'].includes(key)) {
                                    material.needsUpdate = true;
                                }
                            }
                        });
                    });
                } else if (object.material) {
                    // 单材质对象
                    Object.keys(options).forEach(key => {
                        if (object.material[key] !== undefined) {
                            object.material[key] = options[key];

                            // 对于某些属性，需要标记更新
                            if (['map', 'normalMap', 'roughnessMap', 'metalnessMap'].includes(key)) {
                                object.material.needsUpdate = true;
                            }
                        }
                    });
                }

                updatedParts.push({
                    id: object.uuid,
                    name: object.name
                });
            }
        });

        return updatedParts;
    };

    /**
     * 优化模型
     * @param {Object} options - 优化选项
     * @returns {Promise<Object>} - 优化后的模型
     */
    const optimizeModel = async(options = {}) => {
        if (!currentModel.value || !currentModel.value.model) {
            return null;
        }

        try {
            // 使用静态方法而不是实例方法
            ModelOptimizer.optimize(currentModel.value.model, {
                simplificationRatio: options.simplificationRatio || simplificationRatio,
                simplifyGeometry: true,
                mergeGeometries: options.useDraco !== undefined ? options.useDraco : useDraco,
                optimizeMaterials: true,
                ...options
            });

            return currentModel.value;
        } catch (error) {
            console.error('模型优化失败:', error);
            throw error;
        }
    };

    /**
     * 计算模型大小（MB）
     * @param {THREE.Object3D} model - 模型对象
     * @returns {number} - 估计大小（MB）
     */
    const calculateModelSize = (model) => {
        if (!model) return 0;

        let totalSize = 0;
        let geometriesProcessed = new Set();
        let texturesProcessed = new Set();

        // 遍历模型中的所有网格
        model.traverse(node => {
            // 计算几何体大小
            if (node.geometry && !geometriesProcessed.has(node.geometry.uuid)) {
                geometriesProcessed.add(node.geometry.uuid);

                // 对于每个几何体，计算顶点、法线、UV等数据大小
                if (node.geometry.attributes) {
                    for (const name in node.geometry.attributes) {
                        const attribute = node.geometry.attributes[name];
                        if (attribute.array) {
                            totalSize += attribute.array.byteLength / (1024 * 1024);
                        }
                    }
                }

                // 计算索引缓冲区大小
                if (node.geometry.index && node.geometry.index.array) {
                    totalSize += node.geometry.index.array.byteLength / (1024 * 1024);
                }
            }

            // 计算材质和纹理大小
            if (node.material) {
                const materials = Array.isArray(node.material) ? node.material : [node.material];

                materials.forEach(material => {
                    // 为材质本身添加一个小的固定大小
                    totalSize += 0.001;

                    // 检查所有可能包含纹理的属性
                    ['map', 'normalMap', 'roughnessMap', 'metalnessMap',
                        'emissiveMap', 'aoMap', 'displacementMap', 'alphaMap'
                    ].forEach(texType => {
                        const texture = material[texType];

                        if (texture && texture.image && !texturesProcessed.has(texture.uuid)) {
                            texturesProcessed.add(texture.uuid);

                            // 估算纹理大小 (宽 * 高 * 4字节/像素)
                            if (texture.image.width && texture.image.height) {
                                const texSize = texture.image.width * texture.image.height * 4 / (1024 * 1024);
                                totalSize += texSize;
                            } else {
                                // 无法获取尺寸时的默认估计
                                totalSize += 1; // 假设为1MB
                            }
                        }
                    });
                });
            }
        });

        return totalSize;
    };

    // 如果提供了模型路径且启用自动加载，初始化后自动加载
    // 注意：自动加载需要在外部提供 modelService 并调用 loadModel 方法

    // 返回状态和方法
    return {
        isLoading,
        loadProgress,
        loadError,
        currentModel,
        partsList,

        loadModel,
        updatePartsList,
        getPartsList,
        decomposeModel,
        mergeModel,
        updateMaterial,
        optimizeModel
    };
}