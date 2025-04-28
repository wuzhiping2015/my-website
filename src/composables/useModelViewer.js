/**
 * useModelViewer.js
 * 模型查看器统一入口Composable
 * 整合了场景管理、模型加载与交互等功能
 */

import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, markRaw } from 'vue';
import SceneManager from '../services/SceneManager';
import ModelService from '../services/ModelService';
import useModelLoader from './useModelLoader';
import useModelInteraction from './useModelInteraction';
import ModelOptimizer from '../utils/ModelOptimizer';

/**
 * 模型查看器钩子
 * @param {Object} options - 配置选项
 * @returns {Object} - 模型查看器状态和方法
 */
export default function useModelViewer(options = {}) {
    // 默认选项
    const {
        container = null,
            autoLoad = false,
            modelPath = '',
            showStats = false,
            enableShadows = true,
            backgroundColor = 0x222222,
            useHDR = false,
            optimize = true,
            simplificationRatio = 0.5,
            useDraco = true,
            onProgress = null,
            onError = null,
            onLoad = null
    } = options;

    // 状态
    const isInitialized = ref(false);
    const containerRef = ref(container);
    const viewerState = reactive({
        ready: false,
        loading: false,
        error: null,
        showGrid: true,
        showAxes: true,
        wireframe: false,
        showBoundingBox: false
    });

    // 服务实例
    const sceneManager = ref(null);
    const modelService = ref(null);

    // 初始化服务
    const initServices = () => {
        console.log('Initializing services...');
        try {
            // 初始化场景管理器 - 使用markRaw包装，防止Vue代理
            const sceneManagerInstance = markRaw(new SceneManager(containerRef.value));
            sceneManager.value = sceneManagerInstance;

            // 调用 init 方法初始化场景
            sceneManagerInstance.init({
                backgroundColor,
                enableStats: showStats,
                shadows: enableShadows,
                cameraPosition: { x: 0, y: 5, z: 10 }
            });
            console.log('SceneManager initialized:', sceneManagerInstance);

            // 添加辅助工具
            sceneManagerInstance.addHelpers({
                grid: true,
                axes: true
            });

            // 初始化模型服务 - 使用markRaw包装，防止Vue代理
            const modelServiceInstance = markRaw(new ModelService({
                sceneManager: sceneManagerInstance,
                useDraco
            }));
            modelService.value = modelServiceInstance;
            console.log('ModelService initialized:', modelServiceInstance);

            // 注册动画更新回调
            sceneManagerInstance.addRenderCallback((delta) => {
                try {
                    if (modelServiceInstance) {
                        modelServiceInstance.updateAnimations(delta);
                    }
                } catch (error) {
                    console.error("动画更新回调出错:", error);
                }
            });

            // 标记初始化完成
            isInitialized.value = true;
            viewerState.ready = true;
        } catch (error) {
            console.error("初始化服务时出错:", error);
            viewerState.error = `初始化失败: ${error.message}`;
        }
    };

    // 初始化模型加载器
    const {
        loadModel,
        loadProgress,
        loadError,
        currentModel,
        isLoading,
        updatePartsList,
        getPartsList,
        decomposeModel,
        mergeModel,
        updateMaterial,
        optimizeModel
    } = useModelLoader({
        autoLoad,
        modelPath,
        optimize,
        simplificationRatio,
        useDraco
    });

    // 监听并转发加载状态
    watch(loadProgress, (progress) => {
        viewerState.loading = isLoading.value;
        if (onProgress && typeof onProgress === 'function') {
            onProgress(progress);
        }
    });

    // 监听并转发错误
    watch(loadError, (error) => {
        if (error) {
            viewerState.error = error;
            if (onError && typeof onError === 'function') {
                onError(error);
            }
        }
    });

    // 监听模型加载完成
    watch(currentModel, (model) => {
        // 添加额外的空值检查，确保所有对象都存在
        if (!model || !model.model || !sceneManager.value || !sceneManager.value.scene) {
            console.warn('模型加载完成但对象不完整:', {
                modelExists: !!model,
                modelModelExists: model ? !!model.model : false,
                sceneManagerExists: !!sceneManager.value,
                sceneExists: sceneManager.value ? !!sceneManager.value.scene : false
            });
            return;
        }

        try {
            // 确保模型已被markRaw处理，防止Vue代理
            const safeModel = markRaw(model.model);

            // 将模型添加到场景
            if (!sceneManager.value.scene.children.includes(safeModel)) {
                console.log('将模型添加到场景中');
                sceneManager.value.addToScene(safeModel);
            } else {
                console.log('模型已经在场景中');
            }

            // 更新部件列表
            updatePartsList();

            // 适配相机视角
            try {
                sceneManager.value.fitCameraToObject(safeModel);
            } catch (cameraError) {
                console.error("适配相机视角时出错:", cameraError);
            }

            // 启动渲染循环
            try {
                sceneManager.value.startAnimationLoop();
            } catch (loopError) {
                console.error("启动渲染循环时出错:", loopError);
            }

            // 更新交互目标
            try {
                modelInteraction.updateIntersectTargets();
            } catch (interactionError) {
                console.error("更新交互目标时出错:", interactionError);
            }

            // 调用加载完成回调
            if (onLoad && typeof onLoad === 'function') {
                try {
                    onLoad(model);
                } catch (callbackError) {
                    console.error("执行加载完成回调时出错:", callbackError);
                }
            }
        } catch (error) {
            console.error("处理加载完成的模型时出错:", error);
            viewerState.error = `处理模型失败: ${error.message}`;
        }
    });

    // 初始化交互
    const modelInteraction = useModelInteraction({
        sceneManager: computed(() => sceneManager.value),
        modelService: computed(() => modelService.value)
    });

    /**
     * 初始化查看器
     * @param {HTMLElement} el - 容器元素
     */
    const initViewer = (el = null) => {
        if (el) {
            containerRef.value = el;
        }

        if (!containerRef.value) {
            console.error('模型查看器初始化失败: 未提供容器元素');
            viewerState.error = '初始化失败: 未提供容器元素';
            return;
        }

        // 初始化服务
        initServices();

        // 初始化交互
        modelInteraction.initInteraction(containerRef.value);

        // 如果提供了模型路径且启用自动加载
        if (modelPath && autoLoad) {
            loadModelToScene(modelPath);
        }
    };

    /**
     * 加载模型到场景
     * @param {string} path - 模型路径
     * @param {Object} options - 加载选项
     */
    const loadModelToScene = async(path, options = {}) => {
        console.log('Loading model to scene:', path);
        // 检查初始化状态
        if (!isInitialized.value) {
            try {
                await new Promise((resolve, reject) => {
                    let attempts = 0;
                    const maxAttempts = 50; // 5秒超时 (100ms * 50)

                    const checkInit = () => {
                        attempts++;
                        console.log(`Initialization attempt ${attempts}`);
                        if (isInitialized.value && sceneManager.value && modelService.value) {
                            resolve();
                        } else if (attempts >= maxAttempts) {
                            reject(new Error('初始化超时，请刷新页面重试'));
                        } else {
                            setTimeout(checkInit, 100);
                        }
                    };
                    checkInit();
                });
            } catch (error) {
                console.error('初始化等待失败:', error);
                viewerState.error = error.message || '初始化失败，请刷新页面重试';
                throw error;
            }
        }

        // 确保必要的服务已经初始化
        if (!sceneManager.value || !modelService.value) {
            const error = new Error('必要的服务未初始化，无法加载模型');
            viewerState.error = error.message;
            throw error;
        }

        viewerState.loading = true;
        viewerState.error = null;

        try {
            // 合并默认选项和用户传入的选项
            const loadOptions = {
                optimizeModel: optimize,
                simplificationRatio,
                useDraco,
                onProgress: (progress) => {
                    loadProgress.value = progress;
                    if (options.onProgress) {
                        options.onProgress(progress);
                    }
                },
                ...options
            };

            await loadModel(path, modelService.value, loadOptions);
            viewerState.loading = false;
        } catch (error) {
            viewerState.loading = false;
            viewerState.error = error.message || '加载模型失败';
            console.error('加载模型失败:', error);
            throw error;
        }
    };

    /**
     * 设置场景背景色
     * @param {number|string} color - 颜色值
     */
    const setBackgroundColor = (color) => {
        if (sceneManager.value) {
            sceneManager.value.setBackgroundColor(color);
        }
    };

    /**
     * 切换网格线显示
     * @param {boolean} [show] - 是否显示
     */
    const toggleGrid = (show = !viewerState.showGrid) => {
        viewerState.showGrid = show;
        if (sceneManager.value) {
            sceneManager.value.toggleGrid(show);
        }
    };

    /**
     * 切换坐标轴显示
     * @param {boolean} [show] - 是否显示
     */
    const toggleAxes = (show = !viewerState.showAxes) => {
        viewerState.showAxes = show;
        if (sceneManager.value) {
            sceneManager.value.toggleAxes(show);
        }
    };

    /**
     * 切换线框模式
     * @param {boolean} [show] - 是否显示
     */
    const toggleWireframe = (show = !viewerState.wireframe) => {
        viewerState.wireframe = show;
        if (currentModel.value && currentModel.value.model) {
            const wireframeOptions = {
                wireframe: show
            };

            currentModel.value.model.traverse(node => {
                if (node.isMesh && node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => {
                            mat.wireframe = show;
                        });
                    } else {
                        node.material.wireframe = show;
                    }
                }
            });
        }
    };

    /**
     * 切换边界框显示
     * @param {boolean} [show] - 是否显示
     */
    const toggleBoundingBox = (show = !viewerState.showBoundingBox) => {
        viewerState.showBoundingBox = show;
        if (sceneManager.value && currentModel.value && currentModel.value.model) {
            sceneManager.value.toggleBoundingBox(currentModel.value.model, show);
        }
    };

    /**
     * 重置查看器
     */
    const resetViewer = () => {
        // 重置相机
        if (sceneManager.value) {
            sceneManager.value.resetCamera();
        }

        // 重置交互状态
        modelInteraction.clearSelection();

        // 重置视图状态
        toggleGrid(true);
        toggleAxes(true);
        toggleWireframe(false);
        toggleBoundingBox(false);
    };

    /**
     * 销毁查看器
     */
    const destroyViewer = () => {
        // 停止渲染循环
        if (sceneManager.value) {
            sceneManager.value.stopAnimationLoop();
        }

        // 清除模型
        if (currentModel.value && currentModel.value.model) {
            if (sceneManager.value) {
                sceneManager.value.removeFromScene(currentModel.value.model);
            }

            // 释放模型资源
            if (modelService.value) {
                modelService.value.disposeModel(currentModel.value.model);
            }
        }

        // 清除场景资源
        if (sceneManager.value) {
            sceneManager.value.dispose();
        }

        // 重置状态
        isInitialized.value = false;
        viewerState.ready = false;
        viewerState.loading = false;
        viewerState.error = null;
    };

    // 组件挂载时初始化
    onMounted(() => {
        if (containerRef.value) {
            initViewer();
        }
    });

    // 组件卸载时清理
    onBeforeUnmount(() => {
        destroyViewer();
    });

    // 返回状态和方法
    return {
        // 状态
        isInitialized,
        viewerState,
        containerRef,
        sceneManager: computed(() => sceneManager.value),
        modelService: computed(() => modelService.value),
        currentModel,
        loadProgress,
        loadError,
        isLoading,
        hoveredPart: modelInteraction.hoveredPart,
        selectedPart: modelInteraction.selectedPart,

        // 初始化方法
        initViewer,
        initServices,

        // 模型加载方法
        loadModelToScene,

        // 场景控制方法
        setBackgroundColor,
        toggleGrid,
        toggleAxes,
        toggleWireframe,
        toggleBoundingBox,

        // 模型操作方法
        getPartsList,
        decomposeModel,
        mergeModel,
        updateMaterial,
        optimizeModel,

        // 交互方法
        ...modelInteraction,

        // 资源管理方法
        resetViewer,
        destroyViewer
    };
}