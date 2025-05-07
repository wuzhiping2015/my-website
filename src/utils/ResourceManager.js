/**
 * 资源管理工具类
 * 用于缓存和管理Three.js材质、纹理等资源
 */
import * as THREE from 'three';

export default class ResourceManager {
    constructor() {
        this.materialCache = new Map();
        this.textureCache = new Map();
        this.geometryCache = new Map();
    }

    /**
     * 获取或创建缓存的材质
     * @param {string} type 材质类型：'basic', 'standard', 'phong', 'shader'
     * @param {Object} parameters 材质参数
     * @returns {THREE.Material} 材质实例
     */
    getMaterial(type, parameters) {
        const key = type + JSON.stringify(parameters);

        if (!this.materialCache.has(key)) {
            let material;
            switch (type) {
                case 'standard':
                    material = new THREE.MeshStandardMaterial(parameters);
                    break;
                case 'phong':
                    material = new THREE.MeshPhongMaterial(parameters);
                    break;
                case 'shader':
                    material = new THREE.ShaderMaterial(parameters);
                    break;
                default:
                    material = new THREE.MeshBasicMaterial(parameters);
            }

            this.materialCache.set(key, material);
        }

        return this.materialCache.get(key).clone();
    }

    /**
     * 创建或获取渐变纹理
     * @param {...string} colors 渐变颜色数组
     * @returns {THREE.Texture} Three.js纹理对象
     */
    getGradientTexture(...colors) {
        const key = colors.join('-') || 'default';

        if (!this.textureCache.has(key)) {
            const texture = this.createGradientTexture(...colors);
            this.textureCache.set(key, texture);
        }

        return this.textureCache.get(key);
    }

    /**
     * 创建渐变纹理
     * @private
     * @param {...string} colors 渐变颜色数组
     * @returns {THREE.Texture} Three.js纹理对象
     */
    createGradientTexture(...colors) {
        const canvas = document.createElement('canvas');
        const size = 512; // 降低纹理尺寸以提高性能
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');

        const v1 = [0, 0];
        const v2 = [0, 1];
        const gradient = ctx.createLinearGradient(
            v1[0] * size,
            v1[1] * size,
            v2[0] * size,
            v2[1] * size
        );

        if (!colors.length) {
            // 没有传参数，默认渐变颜色为天空蓝
            gradient.addColorStop(0, 'rgba(50, 150, 255, 1)');
            gradient.addColorStop(0.5, 'rgba(100, 150, 200, 1)');
            gradient.addColorStop(1, 'rgba(150, 150, 150, 1)');
        } else if (colors.length === 1) {
            // 参数中只有一种颜色时
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[0]);
        } else {
            let step = 1 / (colors.length - 1);
            let progress = 0;
            for (let color of colors) {
                gradient.addColorStop(progress, color);
                progress += step;
            }
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * 销毁模型资源，防止内存泄漏
     * @param {THREE.Object3D} model 要清理的模型
     */
    disposeModel(model) {
        if (!model) return;

        model.traverse(object => {
            if (object.isMesh) {
                // 清理几何体
                if (object.geometry) {
                    object.geometry.dispose();
                }

                // 清理材质及其纹理
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => this.disposeMaterial(material));
                    } else {
                        this.disposeMaterial(object.material);
                    }
                }
            }
        });
    }

    /**
     * 销毁单个材质及其纹理
     * @private
     * @param {THREE.Material} material 要销毁的材质
     */
    disposeMaterial(material) {
        // 清理材质上的所有纹理
        for (const key in material) {
            const value = material[key];
            if (value && value.isTexture) {
                value.dispose();
            }
        }

        // 清理材质本身
        material.dispose();
    }

    /**
     * 清理所有缓存
     */
    clearAllCaches() {
        // 清理材质缓存
        this.materialCache.forEach(material => {
            this.disposeMaterial(material);
        });
        this.materialCache.clear();

        // 清理纹理缓存
        this.textureCache.forEach(texture => {
            texture.dispose();
        });
        this.textureCache.clear();

        // 清理几何体缓存
        this.geometryCache.forEach(geometry => {
            geometry.dispose();
        });
        this.geometryCache.clear();
    }
}