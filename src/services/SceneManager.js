/**
 * SceneManager.js
 * 负责Three.js场景、相机、渲染器的初始化和管理
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.stats = null;
        this.animationFrameId = null;
        this.clock = new THREE.Clock();
        this.renderCallbacks = [];
        this.nonReactiveObjects = {
            scene: null,
            camera: null,
            renderer: null,
            controls: null
        };
    }

    /**
     * 初始化场景、相机和渲染器
     * @param {Object} options - 初始化选项
     */
    init(options = {}) {
        console.log('Initializing SceneManager...');
        const {
            cameraPosition = { x: 0, y: 0, z: 5 },
                backgroundColor = 0x222222,
                enableStats = false,
                antialias = true,
                shadows = true
        } = options;

        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(backgroundColor);
        this.nonReactiveObjects.scene = this.scene;
        console.log('Scene created:', this.scene);

        // 获取容器尺寸
        const { width, height } = this.getContainerDimensions();

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        this.camera.lookAt(0, 0, 0);
        this.nonReactiveObjects.camera = this.camera;
        console.log('Camera created:', this.camera);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias,
            alpha: true,
            logarithmicDepthBuffer: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = shadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.nonReactiveObjects.renderer = this.renderer;
        console.log('Renderer created:', this.renderer);

        // 添加到容器
        if (!this.container) {
            console.error("容器元素无效，无法附加渲染器");
            throw new Error("容器元素无效");
        }

        console.log('添加渲染器到容器元素', {
            container: this.container,
            width: this.container.clientWidth,
            height: this.container.clientHeight
        });

        try {
            // 清除可能存在的旧渲染器
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }

            // 添加新渲染器
            this.container.appendChild(this.renderer.domElement);
            console.log('渲染器DOM元素已添加到容器');
        } catch (error) {
            console.error("添加渲染器到容器时出错:", error);
            throw new Error(`添加渲染器失败: ${error.message}`);
        }

        // 创建控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 1.5;
        this.controls.update();
        this.nonReactiveObjects.controls = this.controls;

        // 添加基础光照
        this.setupLights();

        // 添加事件监听
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // 创建性能监视器（可选）
        if (enableStats) {
            this.stats = new Stats();
            this.container.appendChild(this.stats.dom);
        }
    }

    /**
     * 设置场景光照
     */
    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // 主平行光
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 7.5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 500;
        this.scene.add(mainLight);

        // 填充光
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-5, 5, -7.5);
        this.scene.add(fillLight);

        // 环境半球光
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
    }

    /**
     * 获取容器尺寸
     * @returns {Object} 容器的宽高
     */
    getContainerDimensions() {
        return {
            width: this.container.clientWidth,
            height: this.container.clientHeight
        };
    }

    /**
     * 窗口大小改变时调整渲染器和相机
     */
    onWindowResize() {
        const { width, height } = this.getContainerDimensions();

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * 开始动画循环
     */
    startAnimationLoop() {
        console.log('开始动画循环...');

        // 检查必要对象是否存在
        if (!this.nonReactiveObjects.scene || !this.nonReactiveObjects.camera || !this.nonReactiveObjects.renderer) {
            console.error('无法启动动画循环：场景、相机或渲染器未初始化', {
                scene: !!this.nonReactiveObjects.scene,
                camera: !!this.nonReactiveObjects.camera,
                renderer: !!this.nonReactiveObjects.renderer
            });
            return;
        }

        // 如果已经在运行动画，先停止
        if (this.animationFrameId) {
            console.log('动画循环已存在，先停止当前循环');
            this.stopAnimationLoop();
        }

        // 使用闭包捕获非响应式对象的引用
        const scene = this.nonReactiveObjects.scene;
        const camera = this.nonReactiveObjects.camera;
        const renderer = this.nonReactiveObjects.renderer;
        const controls = this.nonReactiveObjects.controls;
        const stats = this.stats;
        const clock = this.clock;

        // 创建renderCallbacks的本地副本，防止在渲染过程中被修改
        let renderCallbacksLocal = [...this.renderCallbacks];

        // 更新回调列表的方法
        const updateCallbacks = () => {
            renderCallbacksLocal = [...this.renderCallbacks];
        };

        // 添加回调更新监听
        this.addRenderCallbackUpdateListener = updateCallbacks;

        console.log('动画循环已配置，开始渲染');

        const animate = () => {
            try {
                this.animationFrameId = requestAnimationFrame(animate);

                // 更新控制器
                if (controls) {
                    try {
                        controls.update();
                    } catch (controlError) {
                        console.error("更新控制器时出错:", controlError);
                    }
                }

                // 计算时间增量
                let delta;
                try {
                    delta = clock.getDelta();
                } catch (clockError) {
                    console.error("获取时间增量时出错:", clockError);
                    delta = 0.016; // 假设60fps
                }

                // 调用渲染回调
                try {
                    for (const callback of renderCallbacksLocal) {
                        if (typeof callback === 'function') {
                            callback(delta);
                        }
                    }
                } catch (callbackError) {
                    console.error("执行渲染回调时出错:", callbackError);
                }

                // 渲染场景
                try {
                    renderer.render(scene, camera);
                } catch (renderError) {
                    console.error("渲染场景时出错:", renderError);
                }

                // 更新性能统计
                if (stats) {
                    try {
                        stats.update();
                    } catch (statsError) {
                        console.error("更新性能统计时出错:", statsError);
                    }
                }
            } catch (animateError) {
                console.error("动画循环出现严重错误:", animateError);
                // 发生严重错误时取消动画循环防止浏览器崩溃
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        };

        // 开始动画循环
        animate();
    }

    /**
     * 停止动画循环
     */
    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 注册渲染回调函数
     * @param {Function} callback - 回调函数，接收delta参数
     */
    addRenderCallback(callback) {
        if (typeof callback === 'function' && !this.renderCallbacks.includes(callback)) {
            this.renderCallbacks.push(callback);
            // 更新本地回调列表副本
            if (this.addRenderCallbackUpdateListener) {
                this.addRenderCallbackUpdateListener();
            }
        }
    }

    /**
     * 移除渲染回调函数
     * @param {Function} callback - 要移除的回调函数
     */
    removeRenderCallback(callback) {
        const index = this.renderCallbacks.indexOf(callback);
        if (index !== -1) {
            this.renderCallbacks.splice(index, 1);
            // 更新本地回调列表副本
            if (this.addRenderCallbackUpdateListener) {
                this.addRenderCallbackUpdateListener();
            }
        }
    }

    /**
     * 添加辅助工具到场景
     * @param {Object} options - 辅助工具选项
     */
    addHelpers(options = {}) {
        const {
            grid = true,
                axes = true,
                gridSize = 20,
                gridDivisions = 20,
                axesSize = 5
        } = options;

        // 添加网格辅助
        if (grid) {
            const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x555555, 0x333333);
            gridHelper.name = 'gridHelper';
            this.scene.add(gridHelper);
        }

        // 添加坐标轴辅助
        if (axes) {
            const axesHelper = new THREE.AxesHelper(axesSize);
            axesHelper.name = 'axesHelper';
            this.scene.add(axesHelper);
        }
    }

    /**
     * 切换辅助工具显示状态
     * @param {string} helperName - 辅助工具名称 (grid, axes)
     * @param {boolean} visible - 显示状态
     */
    toggleHelper(helperName, visible) {
        const helper = this.scene.getObjectByName(
            helperName === 'grid' ? 'gridHelper' :
            helperName === 'axes' ? 'axesHelper' : null
        );

        if (helper) {
            helper.visible = visible;
        }
    }

    /**
     * 清理资源
     */
    dispose() {
        // 停止动画循环
        this.stopAnimationLoop();

        // 移除窗口大小改变事件监听
        window.removeEventListener('resize', this.onWindowResize);

        // 清理回调更新监听
        this.addRenderCallbackUpdateListener = null;

        // 清理渲染器
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // 清理控制器
        if (this.controls) {
            this.controls.dispose();
        }

        // 清理性能监视器
        if (this.stats && this.stats.dom && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
        }

        // 清理渲染回调
        this.renderCallbacks = [];

        // 清理非响应式对象引用
        this.nonReactiveObjects = {
            scene: null,
            camera: null,
            renderer: null,
            controls: null
        };

        console.log('SceneManager资源已清理');
    }

    /**
     * 适配相机视角到指定对象
     * @param {THREE.Object3D} object - 目标对象
     * @param {number} offset - 偏移系数
     */
    fitCameraToObject(object, offset = 1.5) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * offset;

        this.camera.position.set(center.x, center.y, center.z + cameraZ);
        this.camera.lookAt(center);
        this.camera.updateProjectionMatrix();

        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
        }
    }

    /**
     * 添加对象到场景
     * @param {THREE.Object3D} object - 要添加的对象
     */
    addToScene(object) {
        if (this.scene && object) {
            this.scene.add(object);
            console.log(`对象已添加到场景: ${object.name || 'unnamed'}`);
        } else {
            console.warn('无法添加对象到场景: 场景或对象不存在');
        }
    }

    /**
     * 从场景中移除对象
     * @param {THREE.Object3D} object - 要移除的对象
     */
    removeFromScene(object) {
        if (this.scene && object) {
            this.scene.remove(object);
            console.log(`对象已从场景移除: ${object.name || 'unnamed'}`);
        }
    }

    /**
     * 切换边界框显示
     * @param {THREE.Object3D} object - 目标对象
     * @param {boolean} visible - 是否显示
     */
    toggleBoundingBox(object, visible) {
        if (!object) return;

        // 移除已存在的边界框
        const existingBox = this.scene.getObjectByName('boundingBox');
        if (existingBox) {
            this.scene.remove(existingBox);
        }

        // 如果要显示，创建新的边界框
        if (visible) {
            const box = new THREE.Box3().setFromObject(object);
            const boxHelper = new THREE.BoxHelper(object, 0xffff00);
            boxHelper.name = 'boundingBox';
            this.scene.add(boxHelper);
        }
    }

    /**
     * 切换网格显示
     * @param {boolean} visible - 显示状态
     */
    toggleGrid(visible) {
        this.toggleHelper('grid', visible);
    }

    /**
     * 切换坐标轴显示
     * @param {boolean} visible - 显示状态
     */
    toggleAxes(visible) {
        this.toggleHelper('axes', visible);
    }

    /**
     * 设置背景颜色
     * @param {number|string} color - 颜色值
     */
    setBackgroundColor(color) {
        if (this.scene) {
            this.scene.background = new THREE.Color(color);
        }
    }

    /**
     * 重置相机位置和视角
     * @param {THREE.Vector3} position - 可选的相机目标位置
     */
    resetCamera(position = null) {
        if (!this.camera || !this.controls) return;

        if (position) {
            // 使用提供的位置
            this.camera.position.copy(position);
        } else {
            // 默认位置
            this.camera.position.set(0, 5, 10);
        }

        // 重置相机朝向
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();

        // 重置控制器
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
}

export default SceneManager;