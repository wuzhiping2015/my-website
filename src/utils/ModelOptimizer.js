/**
 * ModelOptimizer.js
 * 用于优化大型模型的性能
 */

import * as THREE from 'three';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 模型优化工具
 */
class ModelOptimizer {
    /**
     * 简化模型几何体
     * @param {THREE.Object3D} model - 要优化的模型
     * @param {Object} options - 优化选项
     * @returns {THREE.Object3D} 优化后的模型
     */
    static simplifyGeometry(model, options = {}) {
        const {
            ratio = 0.5,
                preserveTextures = true,
                onProgress = null
        } = options;

        // 几何体简化器
        const modifier = new SimplifyModifier();

        // 计数器
        let processedCount = 0;
        let totalCount = 0;

        // 统计需要处理的网格数量
        model.traverse(node => {
            if (node.isMesh && node.geometry) {
                totalCount++;
            }
        });

        // 遍历模型中的所有网格
        model.traverse(node => {
            if (node.isMesh && node.geometry) {
                try {
                    // 计算简化后的顶点数
                    const geometry = node.geometry;
                    const vertexCount = geometry.attributes.position.count;
                    const targetCount = Math.floor(vertexCount * (1 - ratio));

                    // 仅当目标顶点数大于0且小于原始顶点数时进行简化
                    if (targetCount > 0 && targetCount < vertexCount) {
                        // 保存原始UV和颜色属性
                        const originalUVs = geometry.attributes.uv ?
                            geometry.attributes.uv.array.slice() : null;
                        const originalColors = geometry.attributes.color ?
                            geometry.attributes.color.array.slice() : null;

                        // 应用几何体简化
                        node.geometry = modifier.modify(geometry, targetCount);

                        // 重新计算边界信息
                        node.geometry.computeBoundingSphere();
                        node.geometry.computeBoundingBox();

                        // 调用进度回调
                        processedCount++;
                        if (onProgress) {
                            onProgress(processedCount / totalCount);
                        }
                    }
                } catch (error) {
                    console.warn(`简化几何体时出错 (${node.name}):`, error);
                }
            }
        });

        return model;
    }

    /**
     * 合并共享材质的几何体以减少draw calls
     * @param {THREE.Object3D} model - 要优化的模型
     * @param {Object} options - 优化选项
     * @returns {THREE.Object3D} 优化后的模型
     */
    static mergeGeometries(model, options = {}) {
        const {
            materialGroups = true,
                preserveNames = true
        } = options;

        // 按材质分组的几何体
        const geometriesByMaterial = new Map();
        const meshesToRemove = [];

        // 第一遍：收集几何体和材质信息
        model.traverse(node => {
            if (node.isMesh && node.geometry) {
                // 跳过实例化网格
                if (node.isInstancedMesh) return;

                // 获取世界矩阵
                node.updateWorldMatrix(true, false);
                const worldMatrix = node.matrixWorld.clone();

                // 创建带世界变换的新几何体
                const geometry = node.geometry.clone();
                geometry.applyMatrix4(worldMatrix);

                // 保存网格名称（用于调试）
                if (preserveNames) {
                    geometry.userData.originalName = node.name;
                }

                // 按材质分组
                if (materialGroups) {
                    const materialKey = node.material.uuid;

                    if (!geometriesByMaterial.has(materialKey)) {
                        geometriesByMaterial.set(materialKey, {
                            material: node.material,
                            geometries: [],
                            names: []
                        });
                    }

                    geometriesByMaterial.get(materialKey).geometries.push(geometry);
                    geometriesByMaterial.get(materialKey).names.push(node.name);

                    // 标记原始网格以移除
                    meshesToRemove.push(node);
                }
            }
        });

        // 创建合并网格
        if (materialGroups) {
            // 为每个材质组创建一个合并的网格
            for (const [materialKey, group] of geometriesByMaterial.entries()) {
                if (group.geometries.length > 1) {
                    try {
                        // 合并几何体
                        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
                            group.geometries
                        );

                        // 创建新网格
                        const mergedMesh = new THREE.Mesh(mergedGeometry, group.material);
                        mergedMesh.name = `MergedMesh_${materialKey.substring(0, 8)}`;

                        // 保存原始网格名称
                        mergedMesh.userData.originalMeshes = group.names;

                        // 添加到模型
                        model.add(mergedMesh);
                    } catch (error) {
                        console.warn(`合并几何体时出错 (${materialKey}):`, error);
                    }
                }
            }

            // 移除原始网格
            for (const mesh of meshesToRemove) {
                mesh.parent.remove(mesh);
            }
        }

        return model;
    }

    /**
     * 优化材质以提高性能
     * @param {THREE.Object3D} model - 要优化的模型
     * @param {Object} options - 优化选项
     * @returns {THREE.Object3D} 优化后的模型
     */
    static optimizeMaterials(model, options = {}) {
        const {
            textureSize = 512,
                compressTextures = true,
                simplifyMaterials = false
        } = options;

        // 已处理材质的缓存
        const processedMaterials = new Map();

        // 遍历模型中的所有材质
        model.traverse(node => {
            if (node.isMesh) {
                const materials = Array.isArray(node.material) ?
                    node.material : [node.material];

                for (let i = 0; i < materials.length; i++) {
                    const material = materials[i];

                    // 跳过已处理的材质
                    if (processedMaterials.has(material.uuid)) {
                        if (Array.isArray(node.material)) {
                            node.material[i] = processedMaterials.get(material.uuid);
                        } else {
                            node.material = processedMaterials.get(material.uuid);
                        }
                        continue;
                    }

                    // 优化材质
                    if (simplifyMaterials) {
                        // 对于复杂场景，将材质简化为标准材质
                        const newMaterial = new THREE.MeshStandardMaterial({
                            color: material.color || new THREE.Color(0x7a7a7a),
                            metalness: material.metalness || 0.5,
                            roughness: material.roughness || 0.5,
                            map: material.map,
                            normalMap: material.normalMap,
                            aoMap: material.aoMap,
                            emissive: material.emissive,
                            emissiveMap: material.emissiveMap,
                            emissiveIntensity: material.emissiveIntensity || 1,
                            side: material.side || THREE.FrontSide
                        });

                        // 优化纹理
                        this.optimizeTexture(newMaterial.map, textureSize, compressTextures);
                        this.optimizeTexture(newMaterial.normalMap, textureSize, compressTextures);
                        this.optimizeTexture(newMaterial.aoMap, textureSize, compressTextures);
                        this.optimizeTexture(newMaterial.emissiveMap, textureSize, compressTextures);

                        // 缓存优化后的材质
                        processedMaterials.set(material.uuid, newMaterial);

                        // 更新网格材质
                        if (Array.isArray(node.material)) {
                            node.material[i] = newMaterial;
                        } else {
                            node.material = newMaterial;
                        }
                    } else {
                        // 优化现有材质的纹理
                        this.optimizeTexture(material.map, textureSize, compressTextures);
                        this.optimizeTexture(material.normalMap, textureSize, compressTextures);
                        this.optimizeTexture(material.aoMap, textureSize, compressTextures);
                        this.optimizeTexture(material.emissiveMap, textureSize, compressTextures);

                        // 缓存优化后的材质
                        processedMaterials.set(material.uuid, material);
                    }
                }
            }
        });

        return model;
    }

    /**
     * 优化纹理
     * @param {THREE.Texture} texture - 要优化的纹理
     * @param {number} maxSize - 最大纹理尺寸
     * @param {boolean} compress - 是否压缩纹理
     */
    static optimizeTexture(texture, maxSize = 512, compress = true) {
        if (!texture || !texture.image) return;

        // 已经优化过的纹理不再处理
        if (texture.userData && texture.userData.optimized) return;

        // 启用纹理mipmap
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 4; // 提高质量但保持适度的性能开销

        // 在Three.js 0.150.0中，不需要手动设置压缩格式
        // 移除创建临时WebGLRenderer的代码，避免资源浪费
        if (compress) {
            texture.format = THREE.RGBAFormat;
            texture.type = THREE.UnsignedByteType;
        }

        // 标记为已优化
        texture.userData = texture.userData || {};
        texture.userData.optimized = true;
        texture.needsUpdate = true;
    }

    /**
     * 创建LOD（Level of Detail）版本的模型
     * @param {THREE.Object3D} model - 原始模型
     * @param {Array} levels - LOD级别配置
     * @returns {THREE.LOD} LOD模型
     */
    static createLODModel(model, levels = []) {
        // 默认LOD级别
        const defaultLevels = [
            { distance: 0, ratio: 0 },
            { distance: 50, ratio: 0.5 },
            { distance: 100, ratio: 0.8 }
        ];

        // 使用提供的级别或默认值
        const lodLevels = levels.length > 0 ? levels : defaultLevels;

        // 创建LOD对象
        const lod = new THREE.LOD();

        // 添加原始未经简化的模型作为最高级别
        const originalModel = model.clone();
        lod.addLevel(originalModel, lodLevels[0].distance);

        // 为每个其他级别创建简化版本
        for (let i = 1; i < lodLevels.length; i++) {
            const level = lodLevels[i];
            const simplifiedModel = model.clone();

            // 简化几何体
            this.simplifyGeometry(simplifiedModel, { ratio: level.ratio });

            // 添加到LOD
            lod.addLevel(simplifiedModel, level.distance);
        }

        return lod;
    }

    /**
     * 应用综合优化到模型
     * @param {THREE.Object3D} model - 要优化的模型
     * @param {Object} options - 优化选项
     * @returns {THREE.Object3D} 优化后的模型
     */
    static optimize(model, options = {}) {
        // 参数验证
        if (!model) {
            console.error('优化失败: 未提供模型');
            return null;
        }

        if (!model.traverse || typeof model.traverse !== 'function') {
            console.error('优化失败: 提供的模型不是有效的 THREE.Object3D 对象');
            console.warn('提供的模型类型:', model ? (model.constructor ? model.constructor.name : typeof model) : 'null');
            return model; // 直接返回原始模型，避免后续处理
        }

        const {
            simplifyGeometry = true,
                simplificationRatio = 0.5,
                mergeGeometries = true,
                optimizeMaterials = true,
                createLOD = false,
                lodLevels = [],
                enableInstancing = true,
                maxTextureSize = 1024,
                aggressiveMode = false,
                onProgress = null
        } = options;

        let optimizedModel = model;
        let progressCount = 0;
        const updateProgress = (stage, value) => {
            progressCount++;
            if (onProgress) {
                // 每个阶段权重均等，总值累加到1
                const totalWeight = simplifyGeometry + mergeGeometries + optimizeMaterials + createLOD;
                const weight = 1 / totalWeight;
                const progress = (progressCount - 1) / totalWeight + value * weight;
                onProgress(stage, Math.min(progress, 1));
            }
        };

        // 针对大型模型的优化: 优先设置更小的贴图尺寸
        this.limitTextureSizes(optimizedModel, maxTextureSize);

        // 几何体简化 - 大型模型使用更激进的简化
        if (simplifyGeometry) {
            try {
                console.log('开始几何体简化，简化率:', simplificationRatio);
                const startTime = Date.now();

                // 对于超大模型启用更激进的简化
                const actualRatio = aggressiveMode ? Math.min(0.8, simplificationRatio * 1.5) : simplificationRatio;

                optimizedModel = this.simplifyGeometry(optimizedModel, {
                    ratio: actualRatio,
                    onProgress: (progress) => {
                        if (onProgress) onProgress('simplify', progress);
                    }
                });

                console.log(`几何体简化完成，耗时: ${(Date.now() - startTime) / 1000}秒`);
                updateProgress('simplify', 1);
            } catch (error) {
                console.error('几何体简化时出错:', error);
                // 继续执行其他优化步骤
                updateProgress('simplify', 0);
            }
        }

        // 实例化处理 - 对相似几何体使用InstancedMesh优化
        if (enableInstancing) {
            try {
                console.log('开始实例化优化');
                const startTime = Date.now();

                optimizedModel = this.createInstancedMeshes(optimizedModel);

                console.log(`实例化优化完成，耗时: ${(Date.now() - startTime) / 1000}秒`);
                updateProgress('instancing', 1);
            } catch (error) {
                console.error('实例化优化时出错:', error);
                updateProgress('instancing', 0);
            }
        }

        // 材质优化
        if (optimizeMaterials) {
            try {
                console.log('开始材质优化');
                const startTime = Date.now();

                optimizedModel = this.optimizeMaterials(optimizedModel, {
                    textureSize: maxTextureSize,
                    compressTextures: true,
                    simplifyMaterials: aggressiveMode // 大型模型启用材质简化
                });

                console.log(`材质优化完成，耗时: ${(Date.now() - startTime) / 1000}秒`);
                updateProgress('materials', 1);
            } catch (error) {
                console.error('材质优化时出错:', error);
                // 继续执行其他优化步骤
                updateProgress('materials', 0);
            }
        }

        // 几何体合并
        if (mergeGeometries) {
            try {
                console.log('开始几何体合并');
                const startTime = Date.now();

                optimizedModel = this.mergeGeometries(optimizedModel, {
                    materialGroups: true,
                    preserveNames: true
                });

                console.log(`几何体合并完成，耗时: ${(Date.now() - startTime) / 1000}秒`);
                updateProgress('merge', 1);
            } catch (error) {
                console.error('几何体合并时出错:', error);
                console.warn('几何体合并失败，将使用未合并的模型继续后续步骤');
                // 这个错误不应该阻止后续步骤
                updateProgress('merge', 0);
            }
        }

        // 创建LOD版本
        if (createLOD) {
            try {
                console.log('开始创建LOD模型');
                const startTime = Date.now();

                // 为大型模型创建更多LOD级别
                const actualLodLevels = lodLevels.length > 0 ? lodLevels :
                    aggressiveMode ? [
                        { distance: 0, ratio: 0 },
                        { distance: 10, ratio: 0.3 },
                        { distance: 30, ratio: 0.6 },
                        { distance: 60, ratio: 0.85 },
                        { distance: 100, ratio: 0.95 }
                    ] : [
                        { distance: 0, ratio: 0 },
                        { distance: 50, ratio: 0.5 },
                        { distance: 100, ratio: 0.8 }
                    ];

                optimizedModel = this.createLODModel(
                    optimizedModel,
                    actualLodLevels
                );

                console.log(`LOD优化完成，耗时: ${(Date.now() - startTime) / 1000}秒`);
                updateProgress('lod', 1);
            } catch (error) {
                console.error('创建LOD版本时出错:', error);
                // 返回之前优化的模型
                updateProgress('lod', 0);
            }
        }

        updateProgress('complete', 1);
        return optimizedModel;
    }

    /**
     * 限制模型中所有纹理的大小
     * @param {THREE.Object3D} model - 要处理的模型
     * @param {number} maxSize - 最大纹理尺寸
     */
    static limitTextureSizes(model, maxSize = 1024) {
        // 已处理纹理的缓存
        const processedTextures = new Set();

        model.traverse(node => {
            if (node.isMesh && node.material) {
                const materials = Array.isArray(node.material) ? node.material : [node.material];

                materials.forEach(material => {
                    // 处理所有纹理类型
                    const textureTypes = [
                        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
                        'emissiveMap', 'aoMap', 'displacementMap', 'alphaMap'
                    ];

                    textureTypes.forEach(type => {
                        const texture = material[type];

                        if (texture && texture.image && !processedTextures.has(texture.uuid)) {
                            // 标记为已处理
                            processedTextures.add(texture.uuid);

                            // 检查图像大小
                            const img = texture.image;
                            if (img.width > maxSize || img.height > maxSize) {
                                console.log(`限制纹理大小: ${img.width}x${img.height} -> ${maxSize}x${maxSize}`);

                                // 强制设置纹理参数以减少内存占用
                                texture.minFilter = THREE.LinearFilter;
                                texture.magFilter = THREE.LinearFilter;
                                texture.generateMipmaps = false;

                                // 如果是HTML图像元素，可以调整大小
                                if (img instanceof HTMLImageElement) {
                                    // 这里我们无法直接调整图像大小，但可以设置较低质量的过滤
                                    texture.anisotropy = 1;
                                }
                            }
                        }
                    });
                });
            }
        });
    }

    /**
     * 创建实例化网格以提高性能
     * @param {THREE.Object3D} model - 要优化的模型
     * @returns {THREE.Object3D} 优化后的模型
     */
    static createInstancedMeshes(model) {
        // 按几何体和材质分组
        const geometryMap = new Map();
        const meshesToRemove = [];

        // 收集潜在的可实例化网格
        model.traverse(node => {
            if (node.isMesh && !(node.isInstancedMesh)) {
                const geo = node.geometry;
                if (!geo) return;

                // 创建几何体和材质的组合键
                const geoKey = geo.uuid;
                const matKey = Array.isArray(node.material) ?
                    node.material.map(m => m.uuid).join('_') :
                    node.material.uuid;
                const key = `${geoKey}_${matKey}`;

                if (!geometryMap.has(key)) {
                    geometryMap.set(key, {
                        geometry: geo,
                        material: node.material,
                        instances: [],
                        totalCount: 0
                    });
                }

                // 保存实例信息
                geometryMap.get(key).instances.push({
                    node,
                    matrix: node.matrixWorld.clone()
                });
                geometryMap.get(key).totalCount++;
            }
        });

        // 创建实例化网格
        for (const [key, group] of geometryMap.entries()) {
            // 只有当实例数量大于1时才实例化
            if (group.totalCount > 1) {
                try {
                    // 创建实例化网格
                    const instancedMesh = new THREE.InstancedMesh(
                        group.geometry,
                        group.material,
                        group.totalCount
                    );
                    instancedMesh.name = `InstancedMesh_${key.substring(0, 8)}`;

                    // 设置实例变换矩阵
                    let instanceIdx = 0;
                    for (const instance of group.instances) {
                        instancedMesh.setMatrixAt(instanceIdx, instance.matrix);
                        meshesToRemove.push(instance.node);
                        instanceIdx++;
                    }

                    // 更新实例化网格
                    instancedMesh.instanceMatrix.needsUpdate = true;
                    instancedMesh.updateMatrix();

                    // 添加到模型
                    model.add(instancedMesh);

                    console.log(`创建实例化网格: ${instancedMesh.name}，实例数: ${group.totalCount}`);
                } catch (error) {
                    console.warn(`创建实例化网格失败: ${key}`, error);
                }
            }
        }

        // 移除原始网格
        for (const mesh of meshesToRemove) {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
        }

        return model;
    }

    /**
     * 异步优化模型
     * @param {THREE.Object3D} model - 要优化的模型
     * @param {Object} options - 优化选项
     * @returns {Promise<THREE.Object3D>} 优化后的模型
     */
    static async optimizeAsync(model, options = {}) {
        return new Promise((resolve, reject) => {
            // 使用 Web Worker 或 setTimeout 进行异步处理
            setTimeout(() => {
                try {
                    const optimizedModel = this.optimize(model, options);
                    resolve(optimizedModel);
                } catch (error) {
                    console.error('异步优化失败:', error);
                    reject(error);
                }
            }, 0);
        });
    }
}

// 提供命名导出和默认导出
export { ModelOptimizer };
export default ModelOptimizer;