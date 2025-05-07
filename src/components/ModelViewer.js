import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_CONFIG } from '../config/api';
import { ShipModelLoader } from '../utils/shipModelLoader';

// 避免Vue代理
const createRawObject = () => Object.preventExtensions({});

export class ModelViewer {
    constructor(container) {
        // 使用原始对象创建
        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this._renderer = null;
        this._controls = null;
        this._clock = new THREE.Clock();
        this._modelLoader = new ShipModelLoader();
        this._currentModelId = null;
        this._container = container;
        this._isDisposed = false;
        this._renderLoopActive = false;
        this._frameId = null;
        this._renderLoopBound = this._renderLoop.bind(this);

        this.init();
    }

    // 提供安全的getter
    get scene() { return this._scene; }
    get camera() { return this._camera; }
    get renderer() { return this._renderer; }
    get container() { return this._container; }
    get clock() { return this._clock; }

    init() {
        try {
            // 创建渲染器
            this._renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });
            this._renderer.setSize(window.innerWidth, window.innerHeight);
            this._renderer.setClearColor(0x000000, 0);
            this._container.appendChild(this._renderer.domElement);

            // 设置相机
            this._camera.position.z = 5;
            this._camera.matrixAutoUpdate = true;

            // 创建控制器
            this._controls = new OrbitControls(this._camera, this._container);
            this._controls.enableDamping = true;
            this._controls.dampingFactor = 0.05;

            // 添加灯光
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this._scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(1, 1, 1);
            this._scene.add(directionalLight);

            // 事件监听
            this._onResizeBound = this._onResize.bind(this);
            window.addEventListener('resize', this._onResizeBound);

            console.log('模型查看器初始化完成');
        } catch (error) {
            console.error('初始化模型查看器失败:', error);
        }
    }

    async loadModel(modelPath) {
        if (this._isDisposed) return null;

        try {
            // 清理现有模型
            if (this._currentModelId) {
                this._modelLoader.disposeModel(this._currentModelId);
                this._currentModelId = null;
            }

            // 生成新ID
            const modelId = 'ship-' + Date.now();
            console.log(`开始加载模型 (${modelId}): ${modelPath}`);

            // 加载模型
            const model = await this._modelLoader.loadModel(modelId, modelPath);
            if (!model) {
                throw new Error('模型加载返回空');
            }

            // 添加到场景
            this._scene.add(model);
            this._currentModelId = modelId;

            // 启动渲染循环
            if (!this._renderLoopActive) {
                this._startRenderLoop();
            }

            console.log(`模型 ${modelId}
加载完成并添加到场景`);
            return model;
        } catch (error) {
            console.error('加载模型失败:', error);
            throw error;
        }
    }

    _startRenderLoop() {
        if (this._isDisposed || this._renderLoopActive) return;

        this._renderLoopActive = true;
        this._renderLoop();
        console.log('渲染循环已启动');
    }

    _stopRenderLoop() {
        if (this._frameId) {
            cancelAnimationFrame(this._frameId);
            this._frameId = null;
        }
        this._renderLoopActive = false;
        console.log('渲染循环已停止');
    }

    _renderLoop() {
        if (!this._renderLoopActive || this._isDisposed) return;

        try {
            // 更新控制器
            if (this._controls) {
                this._controls.update();
            }

            // 更新模型动画
            if (this._currentModelId) {
                try {
                    this._modelLoader.updateAnimation(this._currentModelId, this._clock.getDelta());
                } catch (animError) {
                    // 仅记录动画错误
                    console.warn('模型动画更新失败', animError);
                }
            }

            // 避免代理问题的渲染方式
            if (this._renderer && this._scene && this._camera) {
                // 直接使用本地变量
                const renderer = this._renderer;
                const scene = this._scene;
                const camera = this._camera;

                // 执行渲染
                renderer.render(scene, camera);
            }
        } catch (error) {
            console.error('渲染循环错误:', error);
            // 错误计数，过多时停止循环
            this._errorCount = (this._errorCount || 0) + 1;
            if (this._errorCount > 20) {
                console.warn('渲染错误次数过多，停止渲染循环');
                this._stopRenderLoop();
                return;
            }
        }

        // 继续循环
        this._frameId = requestAnimationFrame(this._renderLoopBound);
    }

    _onResize() {
        if (this._isDisposed) return;

        try {
            const width = window.innerWidth;
            const height = window.innerHeight;

            if (this._camera) {
                this._camera.aspect = width / height;
                this._camera.updateProjectionMatrix();
            }

            if (this._renderer) {
                this._renderer.setSize(width, height);
            }
        } catch (error) {
            console.error('窗口大小变化处理失败:', error);
        }
    }

    resize() {
        this._onResize();
    }

    // 提供一个公共的更新方法以保持API兼容
    update() {
        // 实际不做任何事，渲染循环已经独立运行
    }

    dispose() {
        try {
            this._isDisposed = true;
            this._stopRenderLoop();

            // 清理模型
            if (this._currentModelId) {
                this._modelLoader.disposeModel(this._currentModelId);
                this._currentModelId = null;
            }

            // 清理场景
            if (this._scene) {
                while (this._scene.children.length > 0) {
                    const object = this._scene.children[0];
                    this._scene.remove(object);
                }
            }

            // 清理控制器
            if (this._controls) {
                this._controls.dispose();
                this._controls = null;
            }

            // 清理渲染器
            if (this._renderer) {
                if (this._renderer.domElement && this._renderer.domElement.parentNode) {
                    this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
                }
                this._renderer.dispose();
                this._renderer.forceContextLoss();
                this._renderer = null;
            }

            // 移除事件监听
            if (this._onResizeBound) {
                window.removeEventListener('resize', this._onResizeBound);
                this._onResizeBound = null;
            }

            // 清理引用
            this._container = null;
            this._scene = null;
            this._camera = null;
            this._clock = null;
            this._renderLoopBound = null;

            console.log('模型查看器资源已完全释放');
        } catch (error) {
            console.error('模型查看器资源释放失败:', error);
        }
    }
}