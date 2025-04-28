/**
 * ModelService.js
 * 负责模型的加载、处理和管理
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { markRaw } from 'vue';

class ModelService {
    constructor(options = {}) {
        const { sceneManager, useDraco = true } = options;
        // 保存场景管理器引用
        this.sceneManager = sceneManager;

        // 初始化加载器
        this.gltfLoader = new GLTFLoader();
        this.fbxLoader = new FBXLoader();
        this.objLoader = new OBJLoader();

        // 设置Draco解码器
        if (useDraco) {
            this.dracoLoader = new DRACOLoader();
            this.dracoLoader.setDecoderPath('./draco/');
            this.dracoLoader.setDecoderConfig({ type: 'js' });
            this.gltfLoader.setDRACOLoader(this.dracoLoader);
            console.log("已配置Draco解码器，路径:", './draco/');
        }

        // 存储当前加载的模型
        this.currentModel = null;

        // 原始材质缓存
        this.originalMaterials = new Map();

        // 材质预设
        this.materialPresets = {
            default: new THREE.MeshStandardMaterial({
                color: 0x7a7a7a,
                metalness: 0.5,
                roughness: 0.5,
                side: THREE.DoubleSide
            }),
            highlighted: new THREE.MeshStandardMaterial({
                color: 0xff9500,
                emissive: 0xff4400,
                emissiveIntensity: 0.4,
                metalness: 0.8,
                roughness: 0.2,
                transparent: true,
                opacity: 0.9
            }),
            selected: new THREE.MeshStandardMaterial({
                color: 0x44aaff,
                emissive: 0x0088ff,
                emissiveIntensity: 0.6,
                metalness: 0.8,
                roughness: 0.2,
                transparent: true,
                opacity: 1
            })
        };

        // 模型拆解信息
        this.decomposeDirections = new Map();
        this.originalPositions = new Map();
        this.isDecomposed = false;

        // LOD设置
        this.LOD_LEVELS = {
            HIGH: 0, // 原始模型
            MEDIUM: 0.5, // 中等简化
            LOW: 0.8 // 高度简化
        };

        // 模型元数据
        this.modelInfo = {
            vertices: 0,
            faces: 0,
            materials: 0,
            partCount: 0,
            dimensions: '0 x 0 x 0'
        };

        // 动画混合器 - 使用markRaw包装，避免Vue代理
        this.mixer = null;
        this.animationActions = [];
    }

    /**
     * 加载模型
     * @param {string} url - 模型URL
     * @param {Object} options - 加载选项
     * @returns {Promise} 包含加载结果的Promise
     */
    loadModel(url, options = {}) {
        const {
            onProgress = null,
                optimizeModel = true,
                simplificationRatio = 0.5,
                maxTextureSize = 1024,
                useLOD = true,
                mergeGeometries = true,
                enableInstancing = false,
                aggressiveMode = false,
                createLOD = false
        } = options;

        return new Promise((resolve, reject) => {
            // 根据文件扩展名选择加载器
            const extension = url.split('.').pop().toLowerCase();
            let loader;

            switch (extension) {
                case 'gltf':
                case 'glb':
                    loader = this.gltfLoader;
                    break;
                case 'fbx':
                    loader = this.fbxLoader;
                    break;
                case 'obj':
                    loader = this.objLoader;
                    break;
                default:
                    return reject(new Error(`不支持的文件格式: ${extension}`));
            }

            // 创建加载超时处理
            const loadTimeout = setTimeout(() => {
                reject(new Error(`加载模型超时: ${url}`));
            }, 60000); // 60秒超时

            // 对于大型模型，提前显示加载进度
            if (onProgress) {
                onProgress(0);
            }

            // 记录加载开始时间，用于日志分析
            const startTime = Date.now();
            console.log(`开始加载模型: ${url}`);

            // 加载模型
            loader.load(
                url,
                (result) => {
                    clearTimeout(loadTimeout);
                    console.log(`模型加载完成: ${url}, 耗时: ${(Date.now() - startTime) / 1000}秒`);

                    try {
                        // 处理不同加载器的返回结果
                        let model;
                        if (result.scene) {
                            // GLTF/GLB模型
                            model = result.scene;
                            this.currentModel = {
                                model: model,
                                animations: result.animations || [],
                                type: 'gltf'
                            };
                        } else {
                            // FBX/OBJ模型
                            model = result;
                            this.currentModel = {
                                model: model,
                                animations: result.animations || [],
                                type: extension
                            };
                        }

                        // 优化模型（如果需要）
                        if (optimizeModel) {
                            console.log(`开始优化模型: ${url}`);
                            try {
                                this.optimizeModel(model, {
                                    simplificationRatio,
                                    maxTextureSize,
                                    useLOD,
                                    mergeGeometries,
                                    enableInstancing,
                                    aggressiveMode,
                                    createLOD
                                });
                                console.log(`模型优化完成: ${url}`);
                            } catch (optimizeError) {
                                console.warn(`模型优化失败，将使用未优化模型: ${optimizeError.message}`);
                                // 继续使用未优化的模型
                            }
                        }

                        // 预处理模型（计算边界框、准备拆解等）
                        this.preprocessModel(model);

                        // 收集模型信息
                        this.collectModelInfo(model);

                        console.log(`模型处理完成: ${url}, 总耗时: ${(Date.now() - startTime) / 1000}秒`);
                        resolve(this.currentModel);
                    } catch (error) {
                        console.error(`处理模型时出错: ${url}`, error);
                        // 尝试清理可能已部分加载的资源
                        if (this.currentModel && this.currentModel.model) {
                            try {
                                this.disposeModel(this.currentModel.model);
                                this.currentModel = null;
                            } catch (cleanupError) {
                                console.warn('清理模型资源时出错:', cleanupError);
                            }
                        }
                        reject(new Error(`处理模型失败: ${error.message}`));
                    }
                },
                // 进度回调
                (xhr) => {
                    if (onProgress) {
                        const percentComplete = xhr.total ? Math.round((xhr.loaded / xhr.total) * 100) : 0;
                        onProgress(percentComplete);
                    }
                },
                // 错误回调
                (error) => {
                    clearTimeout(loadTimeout);
                    console.error(`加载模型失败: ${url}`, error);
                    reject(new Error(`加载模型失败: ${error.message || '未知错误'}`));
                }
            );
        });
    }

    /**
     * 预处理模型
     * @param {THREE.Object3D} model - 要处理的模型
     */
    preprocessModel(model) {
        // 清除之前的缓存
        this.originalMaterials.clear();
        this.decomposeDirections.clear();
        this.originalPositions.clear();

        // 模型中心点
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        // 遍历模型中的所有网格
        model.traverse((node) => {
            if (node.isMesh) {
                // 启用阴影
                node.castShadow = true;
                node.receiveShadow = true;

                // 保存原始材质
                if (!this.originalMaterials.has(node.uuid)) {
                    this.originalMaterials.set(node.uuid, node.material.clone());
                }

                // 保存原始位置
                this.originalPositions.set(node.uuid, node.position.clone());

                // 计算拆解方向（从中心点向外）
                const nodeCenter = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
                const direction = nodeCenter.clone().sub(center).normalize().multiplyScalar(0.1);
                this.decomposeDirections.set(node.uuid, direction);

                // 确保所有网格都有有效名称
                if (!node.name || node.name === '') {
                    node.name = `Part_${node.uuid.substring(0, 8)}`;
                }
            }
        });
    }

    /**
     * 收集模型信息
     * @param {THREE.Object3D} model - 要分析的模型
     */
    collectModelInfo(model) {
        let vertexCount = 0;
        let faceCount = 0;
        let materialCount = 0;
        let partCount = 0;
        const materials = new Set();

        // 计算边界盒
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());

        // 遍历模型中的所有网格
        model.traverse((node) => {
            if (node.isMesh) {
                partCount++;

                // 计算顶点和面数
                if (node.geometry) {
                    if (node.geometry.attributes.position) {
                        vertexCount += node.geometry.attributes.position.count;
                    }
                    if (node.geometry.index) {
                        faceCount += node.geometry.index.count / 3;
                    } else if (node.geometry.attributes.position) {
                        faceCount += node.geometry.attributes.position.count / 3;
                    }
                }

                // 统计不同材质
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => materials.add(mat.uuid));
                    } else {
                        materials.add(node.material.uuid);
                    }
                }
            }
        });

        // 更新模型信息
        this.modelInfo = {
            vertices: vertexCount,
            faces: faceCount,
            materials: materials.size,
            partCount: partCount,
            dimensions: `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`
        };

        return this.modelInfo;
    }

    /**
     * 优化模型
     * @param {THREE.Object3D} model - 要优化的模型
     * @param {Object} options - 优化选项
     */
    optimizeModel(model, options = {}) {
        const {
            simplificationRatio = 0.5,
                maxTextureSize = 1024,
                useLOD = true,
                mergeGeometries = true,
                enableInstancing = false,
                aggressiveMode = false,
                createLOD = false
        } = options;

        const startTime = performance.now();
        console.log('开始优化模型...');

        // 尝试使用ModelOptimizer进行高级优化
        try {
            const ModelOptimizer = require('../utils/ModelOptimizer').default;
            if (ModelOptimizer) {
                console.log('使用ModelOptimizer进行高级优化，选项:', options);
                return ModelOptimizer.optimize(model, {
                    simplificationRatio,
                    mergeGeometries,
                    optimizeMaterials: true,
                    createLOD,
                    enableInstancing,
                    maxTextureSize,
                    aggressiveMode,
                    useDraco: true
                });
            }
        } catch (e) {
            console.warn('ModelOptimizer不可用，将使用内置优化:', e);
        }

        // 禁用几何体合并的日志信息
        if (!mergeGeometries) {
            console.log('几何体合并功能已禁用，这可能有助于降低内存使用并提高大型模型的性能');
        }

        // 对于激进模式，增加简化比例
        const actualRatio = aggressiveMode ? Math.min(0.8, simplificationRatio * 1.5) : simplificationRatio;

        // 纹理大小基于模式调整
        const actualTextureSize = aggressiveMode ? Math.min(512, maxTextureSize) : maxTextureSize;

        model.traverse((node) => {
            // 优化网格
            if (node.isMesh) {
                // 简化几何体（如果面数过多）
                if (node.geometry &&
                    node.geometry.attributes &&
                    node.geometry.attributes.position &&
                    node.geometry.attributes.position.count > 10000) {

                    console.log(`简化网格 ${node.name || 'unnamed'}, 面数: ${node.geometry.attributes.position.count}`);

                    try {
                        // 使用SimplifyModifier简化网格
                        const modifier = new SimplifyModifier();
                        const count = Math.floor(node.geometry.attributes.position.count * (1 - actualRatio));

                        if (count > 100) { // 确保不会过度简化
                            const simplified = modifier.modify(node.geometry, count);

                            // 保存原始几何体，以便可以在需要时恢复
                            node.userData.originalGeometry = node.geometry;

                            // 应用简化的几何体
                            node.geometry.dispose(); // 释放原始几何体
                            node.geometry = simplified;
                        }
                    } catch (err) {
                        console.warn(`简化网格 ${node.name || 'unnamed'} 失败:`, err);
                    }
                }

                // 优化材质
                if (node.material) {
                    this.optimizeMaterial(node.material, {
                        maxTextureSize: actualTextureSize,
                        aggressiveMode
                    });
                }

                // 启用阴影
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        console.log(`模型优化完成，耗时: ${Math.round(performance.now() - startTime)}ms`);
    }

    /**
     * 优化材质
     * @param {THREE.Material|Array<THREE.Material>} material - 要优化的材质
     * @param {Object} options - 优化选项
     */
    optimizeMaterial(material, options = {}) {
        const { maxTextureSize = 1024, aggressiveMode = false } = options;

        const processMaterial = (mat) => {
            // 存储原始材质属性
            if (!this.originalMaterials.has(mat.uuid)) {
                this.originalMaterials.set(mat.uuid, {
                    color: mat.color ? mat.color.clone() : null,
                    map: mat.map,
                    normalMap: mat.normalMap,
                    aoMap: mat.aoMap,
                    emissiveMap: mat.emissiveMap,
                    metalness: mat.metalness,
                    roughness: mat.roughness,
                    transparent: mat.transparent,
                    opacity: mat.opacity
                });
            }

            // 基本优化设置
            mat.side = THREE.DoubleSide; // 双面渲染避免背面不可见
            mat.needsUpdate = true;

            // 优化纹理
            if (mat.map) {
                this.optimizeTexture(mat.map, maxTextureSize);
            }

            if (mat.normalMap) {
                // 激进模式可以考虑完全禁用法线贴图以提高性能
                if (aggressiveMode) {
                    mat.normalMap = null;
                } else {
                    this.optimizeTexture(mat.normalMap, maxTextureSize);
                }
            }

            if (mat.aoMap) {
                // 激进模式下也可以考虑禁用环境光遮蔽贴图
                if (aggressiveMode) {
                    mat.aoMap = null;
                } else {
                    this.optimizeTexture(mat.aoMap, maxTextureSize);
                    mat.aoMapIntensity = 1.0;
                }
            }

            if (mat.emissiveMap) {
                this.optimizeTexture(mat.emissiveMap, maxTextureSize);
            }

            // 调整材质参数
            if (mat.type === 'MeshStandardMaterial') {
                // 普通模式下使用高质量参数
                if (!aggressiveMode) {
                    mat.metalness = 0.8; // 金属感
                    mat.roughness = 0.4; // 粗糙度
                } else {
                    // 激进模式下使用更简单的材质参数，以提高性能
                    mat.metalness = 0.6;
                    mat.roughness = 0.6;
                    mat.envMapIntensity = 0.8;
                }
            }

            // 如果是激进模式，禁用一些高级材质特性
            if (aggressiveMode) {
                mat.flatShading = true; // 使用平面着色而不是平滑着色
                mat.dithering = false; // 禁用抖动

                // 对于 MeshPhysicalMaterial 类型，禁用一些物理特性
                if (mat.type === 'MeshPhysicalMaterial') {
                    mat.clearcoat = 0;
                    mat.clearcoatRoughness = 0;
                    mat.sheen = 0;
                    mat.transmission = 0;
                }
            }
        };

        if (Array.isArray(material)) {
            material.forEach(processMaterial);
        } else {
            processMaterial(material);
        }
    }

    /**
     * 优化纹理
     * @param {THREE.Texture} texture - 要优化的纹理
     * @param {number} maxSize - 最大纹理尺寸
     */
    optimizeTexture(texture, maxSize) {
        if (!texture) return;

        // 启用mipmap，提高渲染性能
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 4; // 提高斜视角下的纹理清晰度

        // TODO: 实现纹理尺寸缩减功能，这需要创建一个WebGL纹理调整器
        // 当前版本先不实现此功能
    }

    /**
     * 高亮显示一个部件
     * @param {THREE.Object3D} part - 要高亮显示的部件
     */
    highlightPart(part) {
        if (part && part.isMesh) {
            // 保存原始材质（如果尚未保存）
            if (!this.originalMaterials.has(part.uuid)) {
                this.originalMaterials.set(part.uuid, part.material.clone());
            }

            // 应用高亮材质
            part.material = this.materialPresets.highlighted.clone();
        }
    }

    /**
     * 选中一个部件
     * @param {THREE.Object3D} part - 要选中的部件
     */
    selectPart(part) {
        if (part && part.isMesh) {
            // 保存原始材质（如果尚未保存）
            if (!this.originalMaterials.has(part.uuid)) {
                this.originalMaterials.set(part.uuid, part.material.clone());
            }

            // 应用选中材质
            part.material = this.materialPresets.selected.clone();
        }
    }

    /**
     * 恢复部件的原始材质
     * @param {THREE.Object3D} part - 要恢复的部件
     */
    resetPartMaterial(part) {
        if (part && part.isMesh && this.originalMaterials.has(part.uuid)) {
            // 清理当前材质
            if (part.material) {
                part.material.dispose();
            }

            // 恢复原始材质
            part.material = this.originalMaterials.get(part.uuid).clone();
        }
    }

    /**
     * 设置所有部件的透明度
     * @param {number} opacity - 透明度值 (0-1)
     * @param {THREE.Object3D} model - 要处理的模型（可选，默认为当前模型）
     */
    setModelOpacity(opacity, model = null) {
        const targetModel = model || (this.currentModel ? this.currentModel.model : null);
        if (!targetModel) return;

        targetModel.traverse((node) => {
            if (node.isMesh && node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach(mat => {
                        mat.transparent = opacity < 1;
                        mat.opacity = opacity;
                        mat.depthWrite = opacity >= 1;
                        mat.needsUpdate = true;
                    });
                } else {
                    node.material.transparent = opacity < 1;
                    node.material.opacity = opacity;
                    node.material.depthWrite = opacity >= 1;
                    node.material.needsUpdate = true;
                }
            }
        });
    }

    /**
     * 拆解模型
     * @param {number} distance - 拆解距离乘数
     * @param {number} duration - 动画持续时间（毫秒）
     * @param {Function} onUpdate - 每次更新时调用的回调函数
     * @param {Function} onComplete - 动画完成时调用的回调函数
     */
    decomposeModel(distance = 1, duration = 1000, onUpdate = null, onComplete = null) {
        if (!this.currentModel || !this.currentModel.model) return;

        // 如果模型已经拆解，不执行操作
        if (this.isDecomposed) return;

        const model = this.currentModel.model;
        const startTime = Date.now();
        const meshes = [];

        // 收集所有网格
        model.traverse(node => {
            if (node.isMesh) {
                meshes.push(node);
            }
        });

        // 动画函数
        const animate = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            // 对每个网格应用位移
            for (const mesh of meshes) {
                if (this.decomposeDirections.has(mesh.uuid)) {
                    const direction = this.decomposeDirections.get(mesh.uuid);
                    const originalPosition = this.originalPositions.get(mesh.uuid);

                    // 计算新位置
                    const newPosition = originalPosition.clone().add(
                        direction.clone().multiplyScalar(distance * progress)
                    );

                    // 应用新位置
                    mesh.position.copy(newPosition);
                }
            }

            // 调用更新回调
            if (onUpdate) onUpdate(progress);

            // 继续动画或完成
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isDecomposed = true;
                if (onComplete) onComplete();
            }
        };

        // 开始动画
        animate();
    }

    /**
     * 合并模型
     * @param {number} duration - 动画持续时间（毫秒）
     * @param {Function} onUpdate - 每次更新时调用的回调函数
     * @param {Function} onComplete - 动画完成时调用的回调函数
     */
    mergeModel(duration = 1000, onUpdate = null, onComplete = null) {
        if (!this.currentModel || !this.currentModel.model) return;

        // 如果模型未拆解，不执行操作
        if (!this.isDecomposed) return;

        const model = this.currentModel.model;
        const startTime = Date.now();
        const meshes = [];

        // 收集所有网格
        model.traverse(node => {
            if (node.isMesh) {
                meshes.push(node);
            }
        });

        // 动画函数
        const animate = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            // 对每个网格应用位移
            for (const mesh of meshes) {
                if (this.originalPositions.has(mesh.uuid)) {
                    const currentPosition = mesh.position.clone();
                    const originalPosition = this.originalPositions.get(mesh.uuid);

                    // 计算新位置（从当前位置向原始位置插值）
                    const newPosition = currentPosition.clone().lerp(
                        originalPosition,
                        progress
                    );

                    // 应用新位置
                    mesh.position.copy(newPosition);
                }
            }

            // 调用更新回调
            if (onUpdate) onUpdate(progress);

            // 继续动画或完成
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 恢复所有网格到原始位置
                for (const mesh of meshes) {
                    if (this.originalPositions.has(mesh.uuid)) {
                        mesh.position.copy(this.originalPositions.get(mesh.uuid));
                    }
                }

                this.isDecomposed = false;
                if (onComplete) onComplete();
            }
        };

        // 开始动画
        animate();
    }

    /**
     * 更新模型材质参数
     * @param {Object} params - 材质参数
     * @param {THREE.Object3D} model - 要处理的模型（可选，默认为当前模型）
     */
    updateModelMaterials(params, model = null) {
        const targetModel = model || (this.currentModel ? this.currentModel.model : null);
        if (!targetModel) return;

        targetModel.traverse((node) => {
            if (node.isMesh && node.material) {
                // 处理材质数组
                if (Array.isArray(node.material)) {
                    node.material.forEach(mat => this.updateMaterialParams(mat, params));
                } else {
                    this.updateMaterialParams(node.material, params);
                }
            }
        });
    }

    /**
     * 更新单个材质的参数
     * @param {THREE.Material} material - 要更新的材质
     * @param {Object} params - 材质参数
     */
    updateMaterialParams(material, params) {
        // 只处理标准材质和物理材质
        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            // 更新金属度
            if (params.metalness !== undefined) {
                material.metalness = params.metalness;
            }

            // 更新粗糙度
            if (params.roughness !== undefined) {
                material.roughness = params.roughness;
            }

            // 更新法线贴图强度
            if (params.normalScale !== undefined && material.normalMap) {
                material.normalScale.set(params.normalScale, params.normalScale);
            }

            // 更新环境光遮蔽强度
            if (params.aoMapIntensity !== undefined && material.aoMap) {
                material.aoMapIntensity = params.aoMapIntensity;
            }

            // 更新其他参数...

            // 标记材质需要更新
            material.needsUpdate = true;
        }
    }

    /**
     * 获取模型中所有部件信息
     * @param {THREE.Object3D} model - 要处理的模型（可选，默认为当前模型）
     * @returns {Array} 包含部件信息的数组
     */
    getPartsList(model = null) {
        const targetModel = model || (this.currentModel ? this.currentModel.model : null);
        if (!targetModel) return [];

        const parts = [];

        targetModel.traverse((node) => {
            if (node.isMesh) {
                // 获取部件边界盒
                const box = new THREE.Box3().setFromObject(node);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // 估算体积
                const volume = size.x * size.y * size.z;

                // 创建部件信息对象
                parts.push({
                    id: node.uuid,
                    name: node.name || `Part_${node.uuid.substring(0, 8)}`,
                    type: node.geometry ? node.geometry.type : 'Unknown',
                    materialType: node.material ? node.material.type : 'Unknown',
                    position: center,
                    dimensions: `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`,
                    volume: volume.toFixed(3),
                    description: node.userData.description || '暂无描述',
                    node: node // 引用原始节点
                });
            }
        });

        return parts;
    }

    /**
     * 清理资源
     */
    dispose() {
        // 清理存储的材质
        this.originalMaterials.forEach(material => {
            if (material.dispose) material.dispose();
        });
        this.originalMaterials.clear();

        // 清理材质预设
        Object.values(this.materialPresets).forEach(material => {
            if (material.dispose) material.dispose();
        });

        // 清理当前模型
        if (this.currentModel && this.currentModel.model) {
            this.currentModel.model.traverse(node => {
                if (node.isMesh) {
                    if (node.geometry) node.geometry.dispose();
                    if (node.material) {
                        if (Array.isArray(node.material)) {
                            node.material.forEach(mat => mat.dispose());
                        } else {
                            node.material.dispose();
                        }
                    }
                }
            });

            this.currentModel = null;
        }

        // 重置其他数据结构
        this.decomposeDirections.clear();
        this.originalPositions.clear();
        this.isDecomposed = false;
    }

    /**
     * 控制模型动画播放状态
     * @param {boolean} play - 是否播放动画
     */
    toggleAnimations(play) {
        try {
            if (!this.currentModel || !this.currentModel.animations || this.currentModel.animations.length === 0) {
                return;
            }

            if (!this.mixer) {
                // 如果没有动画混合器，创建一个
                // 使用原始对象，避免Vue代理
                const model = this.currentModel.model;
                this.mixer = markRaw(new THREE.AnimationMixer(model));

                // 为每个动画创建动作
                this.animationActions = markRaw(this.currentModel.animations.map(
                    animation => this.mixer.clipAction(animation)
                ));
            }

            if (play) {
                // 播放所有动画
                this.animationActions.forEach(action => {
                    try {
                        action.reset();
                        action.play();
                    } catch (error) {
                        console.error("播放动画动作时出错:", error);
                    }
                });
            } else {
                // 暂停所有动画
                try {
                    this.mixer.stopAllAction();
                } catch (error) {
                    console.error("停止动画时出错:", error);
                }
            }
        } catch (error) {
            console.error("控制动画播放状态时出错:", error);
        }
    }

    /**
     * 更新动画（应在渲染循环中调用）
     * @param {number} delta - 时间增量
     */
    updateAnimations(delta) {
        try {
            // 检查mixer是否存在且有效
            if (!this.mixer) {
                return;
            }

            // 确保delta是数值类型
            const safeDelta = typeof delta === 'number' ? delta : 0.016; // 默认约16ms

            // 使用try/catch包装更新操作，避免因为一次错误导致整个动画系统崩溃
            try {
                this.mixer.update(safeDelta);
            } catch (updateError) {
                console.error("更新动画混合器时出错:", updateError);

                // 如果错误与Vue代理有关，记录更多信息
                if (updateError.toString().includes('get on proxy') ||
                    updateError.toString().includes('modelViewMatrix')) {
                    console.error("检测到可能的Vue代理问题，尝试重新创建混合器");

                    // 尝试重新创建混合器
                    if (this.currentModel && this.currentModel.model && this.currentModel.animations) {
                        try {
                            // 移除当前混合器
                            this.mixer = null;
                            this.animationActions = [];

                            // 重新创建混合器
                            const model = this.currentModel.model;
                            this.mixer = markRaw(new THREE.AnimationMixer(model));
                            this.animationActions = markRaw(this.currentModel.animations.map(
                                animation => this.mixer.clipAction(animation)
                            ));

                            console.log("成功重建动画混合器");
                        } catch (rebuildError) {
                            console.error("重建动画混合器失败:", rebuildError);
                            // 为避免持续错误，标记混合器为null
                            this.mixer = null;
                            this.animationActions = [];
                        }
                    } else {
                        // 为避免持续错误，标记混合器为null
                        this.mixer = null;
                        this.animationActions = [];
                    }
                } else {
                    // 其他普通错误，重置mixer以避免持续错误
                    this.mixer = null;
                    this.animationActions = [];
                }
            }
        } catch (error) {
            console.error("更新动画时出错:", error);
            // 出错时，重置mixer以避免持续错误
            this.mixer = null;
            this.animationActions = [];
        }
    }

    /**
     * 恢复模型所有材质到原始状态
     * @param {THREE.Object3D} model - 目标模型（可选，默认为当前模型）
     */
    resetModelMaterials(model = null) {
        const targetModel = model || (this.currentModel ? this.currentModel.model : null);
        if (!targetModel) return;

        targetModel.traverse((node) => {
            if (node.isMesh) {
                if (this.originalMaterials.has(node.uuid)) {
                    // 清理当前材质
                    if (node.material) {
                        if (Array.isArray(node.material)) {
                            node.material.forEach(mat => {
                                if (mat && mat.dispose) mat.dispose();
                            });
                        } else if (node.material.dispose) {
                            node.material.dispose();
                        }
                    }

                    // 恢复原始材质
                    const originalMaterial = this.originalMaterials.get(node.uuid);
                    if (originalMaterial.clone) {
                        // 如果是材质对象
                        node.material = originalMaterial.clone();
                    } else {
                        // 如果是材质属性对象
                        const material = new THREE.MeshStandardMaterial({
                            color: originalMaterial.color ? originalMaterial.color.clone() : new THREE.Color(0x7a7a7a),
                            map: originalMaterial.map,
                            normalMap: originalMaterial.normalMap,
                            roughnessMap: originalMaterial.roughnessMap,
                            metalnessMap: originalMaterial.metalnessMap,
                            aoMap: originalMaterial.aoMap,
                            emissiveMap: originalMaterial.emissiveMap,
                            metalness: originalMaterial.metalness !== undefined ? originalMaterial.metalness : 0.5,
                            roughness: originalMaterial.roughness !== undefined ? originalMaterial.roughness : 0.5,
                            transparent: originalMaterial.transparent,
                            opacity: originalMaterial.opacity !== undefined ? originalMaterial.opacity : 1.0
                        });
                        node.material = material;
                    }
                }
            }
        });

        console.log('所有材质已恢复到原始状态');
    }

    /**
     * 释放模型资源
     * @param {THREE.Object3D} model - 要释放的模型
     */
    disposeModel(model) {
        if (!model) return;

        const processNode = (node) => {
            // 释放几何体
            if (node.geometry) {
                node.geometry.dispose();
            }

            // 释放材质
            if (node.material) {
                // 处理材质数组
                if (Array.isArray(node.material)) {
                    node.material.forEach(material => this.disposeMaterial(material));
                } else {
                    this.disposeMaterial(node.material);
                }
            }

            // 移除引用
            if (node.parent) {
                node.parent.remove(node);
            }
        };

        // 深度遍历模型树并释放资源
        model.traverse(processNode);

        // 清除关联数据
        this.originalMaterials.clear();
        this.decomposeDirections.clear();
        this.originalPositions.clear();

        // 清除动画混合器
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }

        console.log('模型资源已释放');
    }

    /**
     * 释放材质及其纹理
     * @param {THREE.Material} material - 要释放的材质
     */
    disposeMaterial(material) {
        if (!material) return;

        // 释放所有纹理
        const textureKeys = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap',
            'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
            'envMap', 'lightMap', 'alphaMap'
        ];

        textureKeys.forEach(key => {
            if (material[key]) {
                material[key].dispose();
                material[key] = null;
            }
        });

        // 释放材质
        material.dispose();
    }
}

export default ModelService;