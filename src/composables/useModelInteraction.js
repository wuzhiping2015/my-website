/**
 * useModelInteraction.js
 * Vue Composition API钩子，用于处理模型交互
 */

import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';

/**
 * 模型交互钩子
 * @param {Object} options - 配置选项
 * @returns {Object} 包含模型交互相关状态和方法的对象
 */
export default function useModelInteraction(options = {}) {
    // 配置选项
    const {
        sceneManager = null,
            modelService = null,
            enableRaycaster = true,
            enableOutline = true,
            enableTooltips = true
    } = options;

    // 状态
    const hoveredPart = ref(null);
    const selectedPart = ref(null);
    const mousePosition = reactive({ x: 0, y: 0, clientX: 0, clientY: 0 });
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 射线检测目标列表
    let intersectTargets = [];

    // 鼠标事件防抖定时器
    let mouseDebounceTimer = null;
    const MOUSE_DEBOUNCE = 50; // 毫秒

    /**
     * 初始化交互
     * @param {HTMLElement} container - 容器元素
     */
    const initInteraction = (container) => {
        if (!container || !sceneManager) return;

        // 添加鼠标事件监听
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('click', onMouseClick);
        container.addEventListener('dblclick', onMouseDoubleClick);

        // 初始化射线检测目标
        updateIntersectTargets();
    };

    /**
     * 更新射线检测目标列表
     */
    const updateIntersectTargets = () => {
        if (!sceneManager || !modelService || !modelService.currentModel) return;

        intersectTargets = [];

        // 收集所有网格
        modelService.currentModel.model.traverse(node => {
            if (node.isMesh) {
                intersectTargets.push(node);
            }
        });
    };

    /**
     * 鼠标移动事件处理
     * @param {MouseEvent} event - 鼠标事件
     */
    const onMouseMove = (event) => {
        // 更新鼠标位置
        mousePosition.clientX = event.clientX;
        mousePosition.clientY = event.clientY;

        // 计算标准化设备坐标
        const container = event.currentTarget;
        const rect = container.getBoundingClientRect();

        mousePosition.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mousePosition.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        // 使用防抖处理射线检测
        if (mouseDebounceTimer) clearTimeout(mouseDebounceTimer);

        mouseDebounceTimer = setTimeout(() => {
            if (enableRaycaster) {
                checkIntersection();
            }
        }, MOUSE_DEBOUNCE);
    };

    /**
     * 鼠标点击事件处理
     * @param {MouseEvent} event - 鼠标事件
     */
    const onMouseClick = (event) => {
        if (!enableRaycaster || !sceneManager || !modelService) return;

        // 如果当前有悬停部件，选中它
        if (hoveredPart.value) {
            selectPart(hoveredPart.value);
        } else {
            // 否则清除选择
            clearSelection();
        }
    };

    /**
     * 鼠标双击事件处理
     * @param {MouseEvent} event - 鼠标事件
     */
    const onMouseDoubleClick = (event) => {
        if (!enableRaycaster || !sceneManager || !modelService) return;

        // 如果当前有悬停部件，聚焦到它
        if (hoveredPart.value && hoveredPart.value.node) {
            focusOnPart(hoveredPart.value.node);
        }
    };

    /**
     * 检查射线与模型的交点
     */
    const checkIntersection = () => {
        if (!sceneManager || !modelService || intersectTargets.length === 0) return;

        // 设置射线
        raycaster.setFromCamera(
            new THREE.Vector2(mousePosition.x, mousePosition.y),
            sceneManager.camera
        );

        // 计算交点
        const intersects = raycaster.intersectObjects(intersectTargets, false);

        if (intersects.length > 0) {
            // 获取第一个交点对象
            const intersected = intersects[0].object;

            // 如果与当前悬停对象不同，处理悬停变化
            if (!hoveredPart.value || hoveredPart.value.id !== intersected.uuid) {
                // 恢复之前悬停的部件
                if (hoveredPart.value && hoveredPart.value.node) {
                    if (!selectedPart.value || hoveredPart.value.id !== selectedPart.value.id) {
                        modelService.resetPartMaterial(hoveredPart.value.node);
                    }
                }

                // 设置新的悬停部件
                const parts = modelService.getPartsList();
                const partInfo = parts.find(p => p.id === intersected.uuid);

                if (partInfo) {
                    hoveredPart.value = partInfo;

                    // 如果不是当前选中部件，高亮显示
                    if (!selectedPart.value || hoveredPart.value.id !== selectedPart.value.id) {
                        modelService.highlightPart(intersected);
                    }
                }
            }
        } else {
            // 如果没有交点，恢复之前悬停的部件
            if (hoveredPart.value && hoveredPart.value.node) {
                if (!selectedPart.value || hoveredPart.value.id !== selectedPart.value.id) {
                    modelService.resetPartMaterial(hoveredPart.value.node);
                }
                hoveredPart.value = null;
            }
        }
    };

    /**
     * 选中部件
     * @param {Object} part - 部件信息
     */
    const selectPart = (part) => {
        if (!part || !part.node || !modelService) return;

        // 如果当前有选中的部件且不是同一个，恢复其材质
        if (selectedPart.value && selectedPart.value.id !== part.id && selectedPart.value.node) {
            modelService.resetPartMaterial(selectedPart.value.node);
        }

        // 设置新的选中部件
        selectedPart.value = part;

        // 应用选中材质
        modelService.selectPart(part.node);
    };

    /**
     * 清除选中状态
     */
    const clearSelection = () => {
        if (selectedPart.value && selectedPart.value.node && modelService) {
            modelService.resetPartMaterial(selectedPart.value.node);
        }
        selectedPart.value = null;
    };

    /**
     * 聚焦到部件
     * @param {THREE.Object3D} part - 要聚焦的部件
     */
    const focusOnPart = (part) => {
        if (!part || !sceneManager) return;

        // 计算部件边界盒
        const box = new THREE.Box3().setFromObject(part);
        const center = box.getCenter(new THREE.Vector3());

        // 使用场景管理器的适配相机方法
        sceneManager.fitCameraToObject(part, 1.5);
    };

    /**
     * 旋转相机
     * @param {string} direction - 旋转方向 ('left', 'right', 'up', 'down')
     * @param {number} angle - 旋转角度（弧度）
     */
    const rotateCamera = (direction, angle = Math.PI / 12) => {
        if (!sceneManager || !sceneManager.controls) return;

        const controls = sceneManager.controls;
        const camera = sceneManager.camera;

        // 保存当前相机位置和目标
        const position = camera.position.clone();
        const target = controls.target.clone();

        // 计算相对于目标的位置向量
        const relativePosition = position.clone().sub(target);

        // 根据方向旋转位置向量
        switch (direction) {
            case 'left':
                relativePosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                break;
            case 'right':
                relativePosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
                break;
            case 'up':
                // 计算水平旋转轴
                const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
                relativePosition.applyAxisAngle(right, angle);
                break;
            case 'down':
                const right2 = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
                relativePosition.applyAxisAngle(right2, -angle);
                break;
        }

        // 应用新位置
        camera.position.copy(target.clone().add(relativePosition));
        camera.lookAt(target);

        // 更新控制器
        controls.update();
    };

    /**
     * 缩放相机
     * @param {string} direction - 缩放方向 ('in', 'out')
     * @param {number} factor - 缩放因子
     */
    const zoomCamera = (direction, factor = 1.2) => {
        if (!sceneManager || !sceneManager.controls) return;

        const controls = sceneManager.controls;
        const camera = sceneManager.camera;

        // 保存当前相机位置和目标
        const position = camera.position.clone();
        const target = controls.target.clone();

        // 计算相对于目标的位置向量
        const relativePosition = position.clone().sub(target);

        // 根据方向缩放位置向量
        if (direction === 'in') {
            relativePosition.multiplyScalar(1 / factor);
        } else {
            relativePosition.multiplyScalar(factor);
        }

        // 应用新位置
        camera.position.copy(target.clone().add(relativePosition));

        // 更新控制器
        controls.update();
    };

    /**
     * 重置相机视角
     */
    const resetCamera = () => {
        if (!sceneManager || !modelService || !modelService.currentModel) return;

        const model = modelService.currentModel.model;

        // 使用场景管理器的适配相机方法
        sceneManager.fitCameraToObject(model, 1.2);
    };

    /**
     * 截取当前视图
     * @param {Object} options - 截图选项
     * @returns {string} 图片数据URL
     */
    const captureScreenshot = (options = {}) => {
        if (!sceneManager || !sceneManager.renderer) return null;

        const {
            width = 0,
                height = 0,
                mimeType = 'image/png',
                fileName = 'screenshot.png'
        } = options;

        // 保存当前渲染器尺寸
        const currentSize = {
            width: sceneManager.renderer.domElement.width,
            height: sceneManager.renderer.domElement.height
        };

        // 如果指定了尺寸，临时调整渲染器尺寸
        if (width > 0 && height > 0) {
            sceneManager.renderer.setSize(width, height);
            sceneManager.camera.aspect = width / height;
            sceneManager.camera.updateProjectionMatrix();
        }

        // 渲染场景
        sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);

        // 获取图像数据
        const dataURL = sceneManager.renderer.domElement.toDataURL(mimeType);

        // 如果调整了尺寸，恢复原始尺寸
        if (width > 0 && height > 0) {
            sceneManager.renderer.setSize(currentSize.width, currentSize.height);
            sceneManager.camera.aspect = currentSize.width / currentSize.height;
            sceneManager.camera.updateProjectionMatrix();
            sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
        }

        // 如果指定了文件名，下载图像
        if (fileName) {
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = fileName;
            link.click();
        }

        return dataURL;
    };

    // 组件挂载时初始化
    onMounted(() => {
        // 初始化将在调用initInteraction时进行
    });

    // 组件卸载时清理
    onBeforeUnmount(() => {
        // 清除定时器
        if (mouseDebounceTimer) {
            clearTimeout(mouseDebounceTimer);
        }

        // 清除状态
        hoveredPart.value = null;
        selectedPart.value = null;

        // 清除事件监听
        let container = null;
        if (sceneManager && sceneManager.renderer && sceneManager.renderer.domElement) {
            container = sceneManager.renderer.domElement.parentElement;
        }
        if (container) {
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('click', onMouseClick);
            container.removeEventListener('dblclick', onMouseDoubleClick);
        }
    });

    return {
        // 状态
        hoveredPart,
        selectedPart,
        mousePosition,

        // 方法
        initInteraction,
        updateIntersectTargets,
        selectPart,
        clearSelection,
        focusOnPart,
        rotateCamera,
        zoomCamera,
        resetCamera,
        captureScreenshot
    };
}