import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { API_CONFIG } from '../config/api';

export class ShipModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.models = new Map();
    }

    /**
     * 加载船舶模型
     * @param {string} modelId - 模型ID
     * @param {string} url - 模型URL
     * @returns {Promise<THREE.Group>} - 加载的模型
     */
    async loadModel(modelId, url = API_CONFIG.SHIP_MODEL.PATH) {
        try {
            if (this.models.has(modelId)) {
                return this.models.get(modelId);
            }

            // 检查URL是否有效
            if (!url || typeof url !== 'string') {
                throw new Error('无效的模型URL');
            }

            console.log(`正在加载模型: ${url}`);

            // 避免使用异步加载，改用同步加载并手动处理Promise
            return new Promise((resolve, reject) => {
                this.loader.load(
                    url,
                    // 成功回调
                    (gltf) => {
                        try {
                            if (!gltf || !gltf.scene) {
                                reject(new Error('模型加载失败：无效的模型数据'));
                                return;
                            }

                            const model = gltf.scene;

                            // 应用配置的变换
                            model.scale.set(
                                API_CONFIG.SHIP_MODEL.SCALE,
                                API_CONFIG.SHIP_MODEL.SCALE,
                                API_CONFIG.SHIP_MODEL.SCALE
                            );
                            model.position.set(
                                API_CONFIG.SHIP_MODEL.POSITION[0],
                                API_CONFIG.SHIP_MODEL.POSITION[1],
                                API_CONFIG.SHIP_MODEL.POSITION[2]
                            );
                            model.rotation.set(
                                API_CONFIG.SHIP_MODEL.ROTATION[0],
                                API_CONFIG.SHIP_MODEL.ROTATION[1],
                                API_CONFIG.SHIP_MODEL.ROTATION[2]
                            );

                            // 遍历并标记所有几何体和材质
                            model.traverse((object) => {
                                if (object.isMesh) {
                                    // 标记该模型ID，以便后续清理
                                    object.userData.modelId = modelId;

                                    // 强制更新矩阵
                                    object.updateMatrix();
                                    object.updateMatrixWorld(true);
                                }
                            });

                            // 添加动画
                            if (gltf.animations && gltf.animations.length > 0) {
                                const mixer = new THREE.AnimationMixer(model);
                                const action = mixer.clipAction(gltf.animations[0]);
                                action.play();
                                model.userData.mixer = mixer;
                            }

                            this.models.set(modelId, model);
                            console.log(`模型加载完成: ${modelId}`);
                            resolve(model);
                        } catch (processError) {
                            console.error('处理模型数据时出错:', processError);
                            reject(processError);
                        }
                    },
                    // 进度回调
                    (xhr) => {
                        console.log(`${(xhr.loaded / xhr.total * 100).toFixed(2)}% 已加载`);
                    },
                    // 错误回调
                    (error) => {
                        console.error('加载模型出错:', error);
                        reject(error);
                    }
                );
            });
        } catch (error) {
            console.error('加载船舶模型失败:', error);
            throw error;
        }
    }

    /**
     * 更新模型动画
     * @param {string} modelId - 模型ID
     * @param {number} deltaTime - 时间增量
     */
    updateAnimation(modelId, deltaTime) {
        try {
            const model = this.getModel(modelId);
            if (model && model.userData && model.userData.mixer) {
                // 使用本地变量，避免代理问题
                const mixer = model.userData.mixer;
                mixer.update(deltaTime);
            }
        } catch (error) {
            console.error('更新动画失败:', error);
        }
    }

    /**
     * 获取模型
     * @param {string} modelId - 模型ID
     * @returns {THREE.Group|undefined} - 模型
     */
    getModel(modelId) {
        try {
            return this.models.get(modelId) || null;
        } catch (error) {
            console.error('获取模型失败:', error);
            return null;
        }
    }

    /**
     * 释放模型
     * @param {string} modelId - 模型ID
     */
    disposeModel(modelId) {
        const model = this.models.get(modelId);
        if (model) {
            model.traverse((object) => {
                if (object.isMesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            if (model.userData.mixer) {
                model.userData.mixer.stopAllAction();
                model.userData.mixer = null;
            }
            this.models.delete(modelId);
        }
    }

    /**
     * 释放所有模型
     */
    disposeAll() {
        for (const modelId of this.models.keys()) {
            this.disposeModel(modelId);
        }
    }
}