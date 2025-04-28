import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import * as THREE from 'three';

// 防止在worker内使用DOM API导致错误
self.document = { createElementNS: () => { return {} } };
self.window = self; // 确保Three.js中的某些依赖window的代码可以工作

// 初始化简化器
const modifier = new SimplifyModifier();

// 处理来自主线程的消息
self.onmessage = function(e) {
    try {
        const { geometryData, ratio, originalVertices } = e.data;

        console.log('[Worker] 收到简化请求，原始顶点数:', originalVertices);

        if (!geometryData || !geometryData.attributes || !geometryData.attributes.position) {
            throw new Error('几何体数据无效');
        }

        // 创建几何体
        const geometry = new THREE.BufferGeometry();

        // 恢复几何体属性
        for (const key in geometryData.attributes) {
            const attribute = geometryData.attributes[key];
            const typedArray = new Float32Array(attribute.array);
            geometry.setAttribute(key, new THREE.BufferAttribute(typedArray, attribute.itemSize));
        }

        // 恢复索引
        if (geometryData.index) {
            geometry.setIndex(new THREE.BufferAttribute(
                new Uint16Array(geometryData.index.array),
                1
            ));
        } else {
            // 非索引几何体无法简化
            throw new Error('非索引几何体无法简化');
        }

        // 计算要保留的顶点数
        const targetCount = Math.max(50, Math.floor(originalVertices * (1 - ratio)));

        // 执行简化
        console.log(`[Worker] 开始简化，目标顶点数: ${targetCount}`);
        const start = performance.now();

        try {
            const simplifiedGeometry = modifier.modify(geometry, targetCount);
            const end = performance.now();
            console.log(`[Worker] 简化完成，耗时: ${(end - start).toFixed(2)}ms`);

            // 获取结果几何体数据
            const result = {
                attributes: {},
                index: null
            };

            // 处理属性
            for (const key in simplifiedGeometry.attributes) {
                const attribute = simplifiedGeometry.attributes[key];
                result.attributes[key] = {
                    array: Array.from(attribute.array),
                    itemSize: attribute.itemSize
                };
            }

            // 处理索引
            if (simplifiedGeometry.index) {
                result.index = {
                    array: Array.from(simplifiedGeometry.index.array)
                };
            }

            // 发送结果回主线程
            self.postMessage({
                status: 'success',
                geometryData: result,
                vertexCount: simplifiedGeometry.attributes.position.count,
                originalVertices
            });

            // 释放内存
            geometry.dispose();
            simplifiedGeometry.dispose();

        } catch (simplifyError) {
            console.error('[Worker] 简化过程出错:', simplifyError);
            self.postMessage({
                status: 'error',
                error: simplifyError.message,
                originalGeometryData: geometryData
            });
        }

    } catch (error) {
        console.error('[Worker] 处理过程出错:', error);
        self.postMessage({
            status: 'error',
            error: error.message
        });
    }
};