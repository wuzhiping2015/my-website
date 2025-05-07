import { ref } from 'vue';

export function useScreenshot() {
    // 截图结果
    const screenshotData = ref('');
    const isCapturing = ref(false);

    // 从渲染器捕获截图
    const captureScreenshot = (renderer, scene, camera, options = {}) => {
        if (!renderer || !scene || !camera) {
            console.error('截图失败：渲染器、场景或相机未初始化');
            return null;
        }

        try {
            isCapturing.value = true;

            // 保存原始尺寸
            const originalSize = {
                width: renderer.domElement.width,
                height: renderer.domElement.height
            };

            // 使用自定义尺寸进行渲染
            const width = options.width || originalSize.width;
            const height = options.height || originalSize.height;

            // 临时调整渲染器尺寸（如果需要）
            if (width !== originalSize.width || height !== originalSize.height) {
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }

            // 临时关闭自动清除，以便在多次渲染后获取完整场景
            const originalAutoClear = renderer.autoClear;
            renderer.autoClear = true;

            // 渲染场景
            renderer.render(scene, camera);

            // 获取图像数据
            screenshotData.value = renderer.domElement.toDataURL('image/png');

            // 恢复原始设置
            if (width !== originalSize.width || height !== originalSize.height) {
                renderer.setSize(originalSize.width, originalSize.height, false);
                camera.aspect = originalSize.width / originalSize.height;
                camera.updateProjectionMatrix();
            }

            renderer.autoClear = originalAutoClear;

            // 重新渲染一次以恢复视图
            renderer.render(scene, camera);

            return screenshotData.value;
        } catch (error) {
            console.error('截图过程中出错:', error);
            return null;
        } finally {
            isCapturing.value = false;
        }
    };

    // 下载截图
    const downloadScreenshot = (fileName = 'model-screenshot.png') => {
        if (!screenshotData.value) {
            console.warn('没有可用的截图数据');
            return false;
        }

        try {
            // 创建下载链接
            const link = document.createElement('a');
            link.href = screenshotData.value;
            link.download = fileName;

            // 添加到文档并触发点击
            document.body.appendChild(link);
            link.click();

            // 清理
            document.body.removeChild(link);
            return true;
        } catch (error) {
            console.error('下载截图时出错:', error);
            return false;
        }
    };

    // 复制截图到剪贴板
    const copyScreenshot = async() => {
        if (!screenshotData.value) {
            console.warn('没有可用的截图数据');
            return false;
        }

        try {
            // 从数据URL创建Blob
            const response = await fetch(screenshotData.value);
            const blob = await response.blob();

            // 复制到剪贴板
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);

            return true;
        } catch (error) {
            console.error('复制截图到剪贴板时出错:', error);
            return false;
        }
    };

    // 生成分享链接 - 包含当前模型和视角信息
    const generateShareLink = (modelPath, camera, additionalParams = {}) => {
        if (!modelPath || !camera) {
            console.warn('无法生成分享链接：缺少模型路径或相机信息');
            return null;
        }

        try {
            // 生成基础URL
            const url = new URL(window.location.href);

            // 添加模型路径
            url.searchParams.set('model', modelPath);

            // 添加相机信息
            url.searchParams.set('camPosX', camera.position.x.toFixed(2));
            url.searchParams.set('camPosY', camera.position.y.toFixed(2));
            url.searchParams.set('camPosZ', camera.position.z.toFixed(2));

            // 如果相机有目标点，也添加
            if (camera.target) {
                url.searchParams.set('targetX', camera.target.x.toFixed(2));
                url.searchParams.set('targetY', camera.target.y.toFixed(2));
                url.searchParams.set('targetZ', camera.target.z.toFixed(2));
            }

            // 添加其他参数
            Object.entries(additionalParams).forEach(([key, value]) => {
                url.searchParams.set(key, value.toString());
            });

            return url.toString();
        } catch (error) {
            console.error('生成分享链接时出错:', error);
            return null;
        }
    };

    // 解析分享链接的参数
    const parseShareLink = () => {
        try {
            const url = new URL(window.location.href);
            const params = Object.fromEntries(url.searchParams.entries());

            // 提取常用参数
            const result = {
                modelPath: params.model || null,
                cameraPosition: null,
                cameraTarget: null,
                additionalParams: {}
            };

            // 提取相机位置
            if (params.camPosX && params.camPosY && params.camPosZ) {
                result.cameraPosition = {
                    x: parseFloat(params.camPosX),
                    y: parseFloat(params.camPosY),
                    z: parseFloat(params.camPosZ)
                };
            }

            // 提取目标位置
            if (params.targetX && params.targetY && params.targetZ) {
                result.cameraTarget = {
                    x: parseFloat(params.targetX),
                    y: parseFloat(params.targetY),
                    z: parseFloat(params.targetZ)
                };
            }

            // 收集其他参数
            Object.entries(params).forEach(([key, value]) => {
                if (!['model', 'camPosX', 'camPosY', 'camPosZ', 'targetX', 'targetY', 'targetZ'].includes(key)) {
                    result.additionalParams[key] = value;
                }
            });

            return result;
        } catch (error) {
            console.error('解析分享链接时出错:', error);
            return {
                modelPath: null,
                cameraPosition: null,
                cameraTarget: null,
                additionalParams: {}
            };
        }
    };

    // 将分享链接复制到剪贴板
    const copyShareLink = async(link) => {
        if (!link) {
            console.warn('没有可用的分享链接');
            return false;
        }

        try {
            await navigator.clipboard.writeText(link);
            return true;
        } catch (error) {
            console.error('复制分享链接时出错:', error);
            return false;
        }
    };

    return {
        screenshotData,
        isCapturing,
        captureScreenshot,
        downloadScreenshot,
        copyScreenshot,
        generateShareLink,
        parseShareLink,
        copyShareLink
    };
}