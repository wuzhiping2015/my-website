import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * 模型管理器 - 处理模型的加载、卸载和LOD管理
 */
export class ModelManager {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            dracoPath: options.dracoPath || './public/draco/',
            dracoType: options.dracoType || 'js',
            defaultModelPath: options.defaultModelPath || '',
            fallbackModelPaths: options.fallbackModelPaths || [],
            useLOD: options.useLOD !== false,
            lodLevels: options.lodLevels || {
                HIGH: 0.0, // 原始模型
                MEDIUM: 0.5, // 中等简化
                LOW: 0.8 // 高度简化
            }
        };

        // 状态
        this.loadingManager = new THREE.LoadingManager();
        this.gltfLoader = null;
        this.dracoLoader = null;
        this.currentModel = null;
        this.modelCache = new Map(); // 缓存不同LOD级别的模型
        this.isLoading = false;
        this.currentLoadingPath = '';
        this.loadingProgress = 0;
        this.currentLODLevel = 'HIGH';

        // 回调函数
        this.onProgress = options.onProgress || null;
        this.onLoad = options.onLoad || null;
        this.onError = options.onError || null;
        this.onLODChange = options.onLODChange || null;

        // 初始化加载器
        this.initLoaders();
    }

    /**
     * 初始化加载器
     */
    initLoaders() {
        // 设置加载管理器的回调
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            this.loadingProgress = Math.round((itemsLoaded / itemsTotal) * 100);
            if (this.onProgress) {
                this.onProgress(url, itemsLoaded, itemsTotal, this.loadingProgress);
            }
        };

        this.loadingManager.onError = (url) => {
            console.error("资源加载出错:", url);
            if (this.onError) {
                this.onError(url, 'resource_error');
            }
        };

        this.loadingManager.onLoad = () => {
            console.log("所有资源加载完成");
        };

        // 创建DRACO加载器
        this.dracoLoader = new DRACOLoader(this.loadingManager);
        this.dracoLoader.setDecoderPath(this.config.dracoPath);
        this.dracoLoader.setDecoderConfig({ type: this.config.dracoType });

        // 预加载DRACO解码器
        try {
            this.dracoLoader.preload();
        } catch (e) {
            console.warn("DRACO解码器预加载失败:", e);
        }

        // 创建GLTF加载器
        this.gltfLoader = new GLTFLoader(this.loadingManager);
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    /**
     * 加载模型
     * @param {string} modelPath - 模型路径
     * @param {string} [lodLevel='HIGH'] - LOD级别
     * @returns {Promise} - 加载完成的Promise
     */
    loadModel(modelPath = null, lodLevel = 'HIGH') {
        const path = modelPath || this.config.defaultModelPath;
        if (!path) {
            return Promise.reject(new Error("未提供模型路径"));
        }

        this.isLoading = true;
        this.currentLoadingPath = path;
        this.currentLODLevel = lodLevel;
        this.loadingProgress = 0;

        // 检查缓存
        const cacheKey = `${path}:${lodLevel}`;
        if (this.modelCache.has(cacheKey)) {
            console.log(`使用缓存的模型 (${cacheKey})`);
            const cachedModel = this.modelCache.get(cacheKey);

            // 如果有onLoad回调，延迟调用它
            if (this.onLoad) {
                setTimeout(() => {
                    this.onLoad(cachedModel, this.currentLoadingPath, this.currentLODLevel);
                }, 0);
            }

            return Promise.resolve(cachedModel);
        }

        console.log(`开始加载模型: ${path}, LOD级别: ${lodLevel}`);

        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    try {
                        console.log(`模型 ${path} 加载成功`);

                        // 使用markRaw防止Vue的响应式系统代理Three.js对象
                        const model = gltf.scene;

                        // 应用LOD简化
                        if (this.config.useLOD && lodLevel !== 'HIGH') {
                            const simplificationRatio = this.config.lodLevels[lodLevel] || 0;
                            this.simplifyModel(model, simplificationRatio).then(simplifiedModel => {
                                this.finalizeModel(cacheKey, simplifiedModel, resolve);
                            }).catch(err => {
                                console.error("模型简化错误:", err);
                                // 如果简化失败，使用原始模型
                                this.finalizeModel(cacheKey, model, resolve);
                            });
                        } else {
                            this.finalizeModel(cacheKey, model, resolve);
                        }
                    } catch (err) {
                        console.error(`模型处理错误:`, err);
                        this.isLoading = false;
                        if (this.onError) {
                            this.onError(path, 'processing_error', err);
                        }
                        reject(err);
                    }
                },
                // 进度回调
                (xhr) => {
                    if (xhr.lengthComputable) {
                        const progressPercentage = Math.round((xhr.loaded / xhr.total) * 100);
                        // 已经有loadingManager在处理总体进度，这里不再重复调用进度回调
                    }
                },
                // 错误回调
                (error) => {
                    console.error(`模型 ${path} 加载错误:`, error);
                    this.isLoading = false;

                    // 如果有后备模型路径，尝试加载
                    if (this.config.fallbackModelPaths.length > 0) {
                        const fallbackPath = this.config.fallbackModelPaths.shift();
                        console.log(`尝试加载后备模型: ${fallbackPath}`);
                        this.loadModel(fallbackPath, lodLevel).then(resolve).catch(reject);
                    } else {
                        if (this.onError) {
                            this.onError(path, 'loading_error', error);
                        }
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * 完成模型加载处理
     * @private
     */
    finalizeModel(cacheKey, model, resolve) {
        // 存入缓存
        this.modelCache.set(cacheKey, model);

        // 更新状态
        this.currentModel = model;
        this.isLoading = false;

        // 触发加载完成回调
        if (this.onLoad) {
            this.onLoad(model, this.currentLoadingPath, this.currentLODLevel);
        }

        // 解析Promise
        resolve(model);
    }

    /**
     * 切换LOD级别
     * @param {string} lodLevel - 目标LOD级别
     * @returns {Promise} - 切换完成的Promise
     */
    switchLOD(lodLevel) {
        if (!this.currentLoadingPath || lodLevel === this.currentLODLevel) {
            return Promise.resolve(this.currentModel);
        }

        console.log(`切换LOD级别: ${this.currentLODLevel} -> ${lodLevel}`);

        // 触发LOD变更回调
        if (this.onLODChange) {
            this.onLODChange(this.currentLODLevel, lodLevel);
        }

        this.currentLODLevel = lodLevel;
        return this.loadModel(this.currentLoadingPath, lodLevel);
    }

    /**
     * 简化模型
     * @private
     */
    simplifyModel(model, ratio) {
        // 该方法已在Web Worker实现，此处作为回退方法
        console.log(`使用比例 ${ratio} 简化模型`);
        return Promise.resolve(model);
    }

    /**
     * 卸载并清理特定模型
     * @param {string} path - 模型路径，如不提供则清除当前模型
     * @param {string} [lodLevel] - LOD级别，如不提供则清除所有LOD
     */
    unloadModel(path = null, lodLevel = null) {
        const targetPath = path || this.currentLoadingPath;
        if (!targetPath) return;

        if (lodLevel) {
            // 清除特定LOD级别的模型
            const cacheKey = `${targetPath}:${lodLevel}`;
            if (this.modelCache.has(cacheKey)) {
                this.disposeModel(this.modelCache.get(cacheKey));
                this.modelCache.delete(cacheKey);
                console.log(`已卸载模型 ${cacheKey}`);
            }
        } else {
            // 清除所有LOD级别的模型
            for (const key of this.modelCache.keys()) {
                if (key.startsWith(`${targetPath}:`)) {
                    this.disposeModel(this.modelCache.get(key));
                    this.modelCache.delete(key);
                }
            }
            console.log(`已卸载所有 ${targetPath} 模型`);
        }

        // 如果清除的是当前模型，重置状态
        if (targetPath === this.currentLoadingPath &&
            (!lodLevel || lodLevel === this.currentLODLevel)) {
            this.currentModel = null;
            this.currentLoadingPath = '';
        }
    }

    /**
     * 释放模型资源
     * @private
     */
    disposeModel(model) {
        if (!model) return;

        model.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }

                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) => this.disposeMaterial(material));
                    } else {
                        this.disposeMaterial(object.material);
                    }
                }
            }
        });
    }

    /**
     * 释放材质资源
     * @private
     */
    disposeMaterial(material) {
        if (!material) return;

        // 处理材质纹理
        const maps = [
            'map', 'lightMap', 'bumpMap', 'normalMap', 'displacementMap', 'specularMap',
            'emissiveMap', 'metalnessMap', 'roughnessMap', 'alphaMap', 'aoMap', 'envMap'
        ];

        maps.forEach(mapName => {
            if (material[mapName]) {
                material[mapName].dispose();
            }
        });

        material.dispose();
    }

    /**
     * 清理所有资源
     */
    dispose() {
        // 清理所有缓存的模型
        for (const model of this.modelCache.values()) {
            this.disposeModel(model);
        }

        this.modelCache.clear();
        this.currentModel = null;
        this.currentLoadingPath = '';
        this.isLoading = false;

        console.log("模型管理器已清理所有资源");
    }
}