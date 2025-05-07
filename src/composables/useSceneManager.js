import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export function useSceneManager(containerId = 'model-viewer') {
    // 核心Three.js组件
    const scene = ref(null);
    const camera = ref(null);
    const renderer = ref(null);
    const controls = ref(null);
    const stats = ref(null);

    // 辅助对象
    const grid = ref(null);
    const axes = ref(null);
    const boundingBoxHelper = ref(null);

    // 状态控制
    const animating = ref(true);
    const showGrid = ref(false);
    const showAxes = ref(false);
    const showBoundingBox = ref(false);
    const autoRotate = ref(false);
    const debugMode = ref(false);

    // 用户交互状态
    const userInteracting = ref(false);

    // 光照设置
    const lights = ref({
        ambient: null,
        directional: null,
        hemisphere: null,
        point: null
    });

    // 初始化Three.js环境
    const initThreeJS = () => {
        // 获取容器
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`未找到ID为 ${containerId} 的容器元素`);
            return false;
        }

        // 创建场景
        scene.value = new THREE.Scene();
        scene.value.background = new THREE.Color(0x222222);

        // 创建相机
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.value = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.value.position.set(0, 5, 10);

        // 创建渲染器
        renderer.value = new THREE.WebGLRenderer({ antialias: true });
        renderer.value.setSize(width, height);
        renderer.value.setPixelRatio(window.devicePixelRatio);
        renderer.value.shadowMap.enabled = true;
        renderer.value.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.value.domElement);

        // 创建控制器
        controls.value = new OrbitControls(camera.value, renderer.value.domElement);
        controls.value.enableDamping = true;
        controls.value.dampingFactor = 0.1;
        controls.value.rotateSpeed = 0.5;
        controls.value.panSpeed = 0.8;
        controls.value.zoomSpeed = 1.2;
        controls.value.minDistance = 1;
        controls.value.maxDistance = 100;
        controls.value.update();

        // 添加控制器事件监听
        controls.value.addEventListener('start', () => { userInteracting.value = true; });
        controls.value.addEventListener('end', () => { userInteracting.value = false; });

        // 创建灯光
        setupLights();

        // 如果开启调试模式，添加性能监视器
        if (debugMode.value) {
            stats.value = new Stats();
            document.body.appendChild(stats.value.dom);
        }

        // 开始动画循环
        startAnimationLoop();

        // 添加窗口调整事件
        window.addEventListener('resize', onWindowResize);

        return true;
    };

    // 设置灯光
    const setupLights = () => {
        // 环境光 - 提供整体柔和照明
        lights.value.ambient = new THREE.AmbientLight(0xffffff, 0.5);
        scene.value.add(lights.value.ambient);

        // 方向光 - 模拟太阳光，提供主要照明和阴影
        lights.value.directional = new THREE.DirectionalLight(0xffffff, 0.8);
        lights.value.directional.position.set(10, 10, 10);
        lights.value.directional.castShadow = true;

        // 设置阴影参数
        lights.value.directional.shadow.mapSize.width = 2048;
        lights.value.directional.shadow.mapSize.height = 2048;
        lights.value.directional.shadow.camera.near = 0.5;
        lights.value.directional.shadow.camera.far = 50;
        lights.value.directional.shadow.camera.left = -20;
        lights.value.directional.shadow.camera.right = 20;
        lights.value.directional.shadow.camera.top = 20;
        lights.value.directional.shadow.camera.bottom = -20;
        lights.value.directional.shadow.bias = -0.0005;

        scene.value.add(lights.value.directional);

        // 半球光 - 提供来自天空和地面的环境光照
        lights.value.hemisphere = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.5);
        scene.value.add(lights.value.hemisphere);

        // 点光源 - 提供额外的照明点
        lights.value.point = new THREE.PointLight(0xffffff, 0.5, 20);
        lights.value.point.position.set(-5, 5, -5);
        scene.value.add(lights.value.point);
    };

    // 添加网格地面
    const addGrid = () => {
        if (grid.value) return;

        grid.value = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
        grid.value.position.y = -0.01; // 避免z-fighting
        scene.value.add(grid.value);
        showGrid.value = true;
    };

    // 移除网格地面
    const removeGrid = () => {
        if (grid.value) {
            scene.value.remove(grid.value);
            grid.value = null;
            showGrid.value = false;
        }
    };

    // 添加坐标轴
    const addAxes = () => {
        if (axes.value) return;

        axes.value = new THREE.AxesHelper(5);
        scene.value.add(axes.value);
        showAxes.value = true;
    };

    // 移除坐标轴
    const removeAxes = () => {
        if (axes.value) {
            scene.value.remove(axes.value);
            axes.value = null;
            showAxes.value = false;
        }
    };

    // 添加包围盒
    const addBoundingBox = (object) => {
        if (!object) return;

        // 移除现有包围盒
        removeBoundingBox();

        // 创建新包围盒
        const box = new THREE.Box3().setFromObject(object);
        boundingBoxHelper.value = new THREE.Box3Helper(box, 0xff0000);
        scene.value.add(boundingBoxHelper.value);
        showBoundingBox.value = true;

        return box;
    };

    // 移除包围盒
    const removeBoundingBox = () => {
        if (boundingBoxHelper.value) {
            scene.value.remove(boundingBoxHelper.value);
            boundingBoxHelper.value = null;
            showBoundingBox.value = false;
        }
    };

    // 窗口大小调整处理
    const onWindowResize = () => {
        const container = document.getElementById(containerId);
        if (!container || !camera.value || !renderer.value) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.value.aspect = width / height;
        camera.value.updateProjectionMatrix();

        renderer.value.setSize(width, height);
    };

    // 相机控制
    const cameraActions = {
        // 重置相机位置
        reset: () => {
            if (!controls.value) return;

            controls.value.reset();
            camera.value.position.set(0, 5, 10);
            controls.value.update();
        },

        // 左右旋转
        rotateLeft: (angle = 0.1) => {
            if (!controls.value) return;

            const currentRotation = controls.value.getAzimuthalAngle();
            controls.value.setAzimuthalAngle(currentRotation - angle);
            controls.value.update();
        },

        rotateRight: (angle = 0.1) => {
            if (!controls.value) return;

            const currentRotation = controls.value.getAzimuthalAngle();
            controls.value.setAzimuthalAngle(currentRotation + angle);
            controls.value.update();
        },

        // 放大缩小
        zoomIn: (factor = 0.9) => {
            if (!controls.value) return;

            controls.value.dollyIn(1 / factor);
            controls.value.update();
        },

        zoomOut: (factor = 0.9) => {
            if (!controls.value) return;

            controls.value.dollyOut(1 / factor);
            controls.value.update();
        },

        // 设置自动旋转
        toggleAutoRotate: () => {
            if (!controls.value) return;

            autoRotate.value = !autoRotate.value;
            controls.value.autoRotate = autoRotate.value;
        }
    };

    // 动画循环
    const animate = () => {
        if (!animating.value) return;

        // 使用requestAnimationFrame调用下一帧
        requestAnimationFrame(animate);

        // 当页面不可见或用户没有交互且不是自动旋转时，跳过某些帧以节省资源
        if (document.hidden && !userInteracting.value && !autoRotate.value) {
            return;
        }

        // 更新控制器
        if (controls.value) {
            controls.value.update();
        }

        // 更新性能监视器
        if (stats.value) {
            stats.value.update();
        }

        // 渲染场景
        if (scene.value && camera.value && renderer.value) {
            renderer.value.render(scene.value, camera.value);
        }
    };

    // 开始动画循环
    const startAnimationLoop = () => {
        animating.value = true;
        animate();
    };

    // 停止动画循环
    const stopAnimationLoop = () => {
        animating.value = false;
    };

    // 清理函数 - 释放所有资源
    const cleanup = () => {
        // 停止动画
        stopAnimationLoop();

        // 移除事件监听
        window.removeEventListener('resize', onWindowResize);

        // 移除性能监视器
        if (stats.value) {
            document.body.removeChild(stats.value.dom);
            stats.value = null;
        }

        // 清理渲染器
        if (renderer.value) {
            const container = document.getElementById(containerId);
            if (container && renderer.value.domElement) {
                container.removeChild(renderer.value.domElement);
            }

            renderer.value.dispose();
            renderer.value = null;
        }

        // 清理控制器
        if (controls.value) {
            controls.value.dispose();
            controls.value = null;
        }

        // 清理场景中的所有对象
        if (scene.value) {
            // 递归函数处理所有子对象
            const disposeNode = (node) => {
                if (node.geometry) {
                    node.geometry.dispose();
                }

                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(material => material.dispose());
                    } else {
                        node.material.dispose();
                    }
                }

                // 递归处理子节点
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => disposeNode(child));
                }
            };

            // 处理场景中的所有对象
            while (scene.value.children.length > 0) {
                const object = scene.value.children[0];
                disposeNode(object);
                scene.value.remove(object);
            }

            scene.value = null;
        }

        // 清空相机引用
        camera.value = null;
    };

    // 钩子函数 - 组件挂载时初始化Three.js
    onMounted(() => {
        initThreeJS();
    });

    // 钩子函数 - 组件卸载前清理资源
    onBeforeUnmount(() => {
        cleanup();
    });

    // 导出功能和状态
    return {
        // 核心对象
        scene,
        camera,
        renderer,
        controls,
        stats,

        // 辅助对象
        grid,
        axes,
        boundingBoxHelper,

        // 状态
        animating,
        showGrid,
        showAxes,
        showBoundingBox,
        autoRotate,
        debugMode,
        userInteracting,

        // 灯光
        lights,

        // 方法
        initThreeJS,
        addGrid,
        removeGrid,
        addAxes,
        removeAxes,
        addBoundingBox,
        removeBoundingBox,
        startAnimationLoop,
        stopAnimationLoop,
        cleanup,

        // 相机控制
        cameraActions,

        // 辅助方法
        toggleGrid: () => showGrid.value ? addGrid() : removeGrid(),
        toggleAxes: () => showAxes.value ? addAxes() : removeAxes(),
        toggleBoundingBox: (object) => showBoundingBox.value ? addBoundingBox(object) : removeBoundingBox()
    };
}