/**
 * 模型处理工具类
 * 用于优化大型模型的加载和处理流程
 */
import * as THREE from 'three';

export default class ModelProcessor {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.processing = false;
        this.progress = 0;
        this.totalMeshes = 0;
        this.processedMeshes = 0;
    }

    /**
     * 分批处理模型，避免阻塞主线程
     * @param {THREE.Object3D} model 要处理的模型
     * @param {Function} meshCallback 处理每个网格的回调函数
     * @param {number} chunkSize 每批处理的网格数量
     * @param {Function} onProgress 进度回调
     * @param {Function} onComplete 完成回调
     */
    processModelInChunks(model, meshCallback, chunkSize = 50, onProgress, onComplete) {
        if (this.processing) {
            console.warn('模型处理任务已在进行中');
            return;
        }

        this.processing = true;
        this.progress = 0;

        // 计算模型中的总网格数
        this.totalMeshes = 0;
        model.traverse(obj => {
            if (obj.isMesh) this.totalMeshes++;
        });

        this.processedMeshes = 0;

        const meshQueue = [model];

        const processNextChunk = () => {
            const startTime = performance.now();
            let count = 0;

            while (meshQueue.length > 0 && count < chunkSize) {
                const current = meshQueue.shift();

                if (current.isMesh) {
                    meshCallback(current);
                    this.processedMeshes++;
                    this.progress = this.processedMeshes / this.totalMeshes;

                    if (onProgress) {
                        onProgress(this.progress);
                    }
                }

                if (current.children && current.children.length > 0) {
                    meshQueue.push(...current.children);
                }

                count++;
                // 如果处理时间超过16ms（保持60fps），休息一帧
                if (performance.now() - startTime > 16) {
                    break;
                }
            }

            if (meshQueue.length > 0) {
                // 下一帧继续处理剩余内容
                requestAnimationFrame(processNextChunk);
            } else {
                this.processing = false;
                if (onComplete) {
                    onComplete();
                }
                console.log(`模型处理完成，共处理 ${this.processedMeshes} 个网格`);
            }
        };

        requestAnimationFrame(processNextChunk);
    }

    /**
     * 优化模型，设置默认材质和计算必要的属性
     * @param {THREE.Object3D} model 要优化的模型
     * @param {boolean} vertexColors 是否启用顶点颜色
     * @param {Function} onProgress 进度回调
     * @param {Function} onComplete 完成回调
     */
    optimizeModel(model, vertexColors = false, onProgress, onComplete) {
        if (!model) return;

        // 预先计算边界盒
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        const defaultMaterial = this.resourceManager.getMaterial('phong', {
            transparent: true,
            side: THREE.DoubleSide,
            vertexColors: vertexColors,
            shininess: 30
        });

        this.processModelInChunks(
            model,
            (mesh) => {
                // 为每个网格设置材质
                if (mesh.material) {
                    // 缓存原始颜色
                    const originalColor = mesh.material.color ?
                        mesh.material.color.clone() :
                        new THREE.Color(0x808080);

                    // 创建新材质
                    const newMaterial = defaultMaterial.clone();
                    newMaterial.color.copy(originalColor);

                    // 保存原始材质和颜色
                    mesh.color_0 = originalColor;
                    mesh.material_0 = newMaterial;

                    // 应用新材质
                    if (mesh.material !== mesh.material_0) {
                        if (mesh.material.map) {
                            newMaterial.map = mesh.material.map;
                        }
                        mesh.material.dispose();
                        mesh.material = newMaterial;
                    }
                }

                // 缓存初始位置和计算分解方向
                mesh.position_0 = mesh.position.clone();

                // 计算相对于模型中心的方向（用于模型分解）
                const meshBox = new THREE.Box3().setFromObject(mesh);
                const meshCenter = new THREE.Vector3();
                meshBox.getCenter(meshCenter);
                mesh.decomposeDirection = new THREE.Vector3()
                    .subVectors(meshCenter, center)
                    .normalize()
                    .multiplyScalar(size.length() * 0.01); // 分解距离缩放因子
            },
            30, // 每批处理30个网格
            onProgress,
            onComplete
        );

        return { box, center, size };
    }

    /**
     * 创建简化版本的LOD模型
     * @param {THREE.Object3D} model 原始模型
     * @param {Function} onComplete 完成回调
     */
    createLODModel(model, onComplete) {
        // 由于SimplifyModifier需要额外导入，这里仅提供LOD创建的框架逻辑
        // 实际项目中可使用THREE.SimplifyModifier或其他简化库
        const lodModel = model.clone();

        // 这里应该对模型的几何体进行简化处理
        // ...

        if (onComplete) {
            onComplete(lodModel);
        }

        return lodModel;
    }

    /**
     * 计算模型统计信息
     * @param {THREE.Object3D} model 模型对象
     * @returns {Object} 包含顶点数、面数等统计信息
     */
    calculateModelStats(model) {
        if (!model) return { meshCount: 0, vertexCount: 0, triangleCount: 0 };

        let meshCount = 0;
        let vertexCount = 0;
        let triangleCount = 0;

        model.traverse(obj => {
            if (obj.isMesh) {
                meshCount++;
                if (obj.geometry) {
                    if (obj.geometry.attributes.position) {
                        vertexCount += obj.geometry.attributes.position.count;
                    }
                    if (obj.geometry.index) {
                        triangleCount += obj.geometry.index.count / 3;
                    } else if (obj.geometry.attributes.position) {
                        triangleCount += obj.geometry.attributes.position.count / 3;
                    }
                }
            }
        });

        return { meshCount, vertexCount, triangleCount };
    }
}