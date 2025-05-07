import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useConfigStore = defineStore('config', () => {
    // 界面设置
    const theme = ref('dark'); // dark 或 light
    const language = ref('zh'); // zh, en
    const debugMode = ref(false);

    // 视图设置
    const showGrid = ref(false);
    const showAxes = ref(false);
    const showBoundingBox = ref(false);
    const showWireframe = ref(false);
    const autoRotate = ref(false);

    // 相机设置
    const defaultCameraPosition = ref({ x: 0, y: 5, z: 10 });
    const rotateSpeed = ref(0.5);
    const zoomSpeed = ref(1.2);
    const panSpeed = ref(0.8);

    // 渲染设置
    const antialias = ref(true);
    const shadows = ref(true);
    const shadowResolution = ref(2048);
    const backgroundColor = ref('#222222');

    // 性能设置
    const useSimplifiedModel = ref(false);
    const simplificationRatio = ref(0.5);
    const renderQuality = ref('high'); // low, medium, high

    // 材质设置
    const defaultMaterial = ref({
        metalness: 0.3,
        roughness: 0.7
    });

    // 保存所有设置到本地存储
    const saveSettings = () => {
        try {
            const settings = {
                theme: theme.value,
                language: language.value,
                debugMode: debugMode.value,
                showGrid: showGrid.value,
                showAxes: showAxes.value,
                showBoundingBox: showBoundingBox.value,
                showWireframe: showWireframe.value,
                autoRotate: autoRotate.value,
                defaultCameraPosition: defaultCameraPosition.value,
                rotateSpeed: rotateSpeed.value,
                zoomSpeed: zoomSpeed.value,
                panSpeed: panSpeed.value,
                antialias: antialias.value,
                shadows: shadows.value,
                shadowResolution: shadowResolution.value,
                backgroundColor: backgroundColor.value,
                useSimplifiedModel: useSimplifiedModel.value,
                simplificationRatio: simplificationRatio.value,
                renderQuality: renderQuality.value,
                defaultMaterial: defaultMaterial.value
            };

            localStorage.setItem('model-viewer-settings', JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    };

    // 从本地存储加载设置
    const loadSettings = () => {
        try {
            const settingsJson = localStorage.getItem('model-viewer-settings');
            if (!settingsJson) return false;

            const settings = JSON.parse(settingsJson);

            // 更新所有设置
            if (settings.theme) theme.value = settings.theme;
            if (settings.language) language.value = settings.language;
            if (settings.debugMode !== undefined) debugMode.value = settings.debugMode;
            if (settings.showGrid !== undefined) showGrid.value = settings.showGrid;
            if (settings.showAxes !== undefined) showAxes.value = settings.showAxes;
            if (settings.showBoundingBox !== undefined) showBoundingBox.value = settings.showBoundingBox;
            if (settings.showWireframe !== undefined) showWireframe.value = settings.showWireframe;
            if (settings.autoRotate !== undefined) autoRotate.value = settings.autoRotate;
            if (settings.defaultCameraPosition) defaultCameraPosition.value = settings.defaultCameraPosition;
            if (settings.rotateSpeed) rotateSpeed.value = settings.rotateSpeed;
            if (settings.zoomSpeed) zoomSpeed.value = settings.zoomSpeed;
            if (settings.panSpeed) panSpeed.value = settings.panSpeed;
            if (settings.antialias !== undefined) antialias.value = settings.antialias;
            if (settings.shadows !== undefined) shadows.value = settings.shadows;
            if (settings.shadowResolution) shadowResolution.value = settings.shadowResolution;
            if (settings.backgroundColor) backgroundColor.value = settings.backgroundColor;
            if (settings.useSimplifiedModel !== undefined) useSimplifiedModel.value = settings.useSimplifiedModel;
            if (settings.simplificationRatio) simplificationRatio.value = settings.simplificationRatio;
            if (settings.renderQuality) renderQuality.value = settings.renderQuality;
            if (settings.defaultMaterial) defaultMaterial.value = settings.defaultMaterial;

            return true;
        } catch (error) {
            console.error('加载设置失败:', error);
            return false;
        }
    };

    // 重置所有设置为默认值
    const resetSettings = () => {
        theme.value = 'dark';
        language.value = 'zh';
        debugMode.value = false;
        showGrid.value = false;
        showAxes.value = false;
        showBoundingBox.value = false;
        showWireframe.value = false;
        autoRotate.value = false;
        defaultCameraPosition.value = { x: 0, y: 5, z: 10 };
        rotateSpeed.value = 0.5;
        zoomSpeed.value = 1.2;
        panSpeed.value = 0.8;
        antialias.value = true;
        shadows.value = true;
        shadowResolution.value = 2048;
        backgroundColor.value = '#222222';
        useSimplifiedModel.value = false;
        simplificationRatio.value = 0.5;
        renderQuality.value = 'high';
        defaultMaterial.value = {
            metalness: 0.3,
            roughness: 0.7
        };

        // 保存重置后的设置
        saveSettings();

        return true;
    };

    // 初始化时加载设置
    loadSettings();

    return {
        // 界面设置
        theme,
        language,
        debugMode,

        // 视图设置
        showGrid,
        showAxes,
        showBoundingBox,
        showWireframe,
        autoRotate,

        // 相机设置
        defaultCameraPosition,
        rotateSpeed,
        zoomSpeed,
        panSpeed,

        // 渲染设置
        antialias,
        shadows,
        shadowResolution,
        backgroundColor,

        // 性能设置
        useSimplifiedModel,
        simplificationRatio,
        renderQuality,

        // 材质设置
        defaultMaterial,

        // 方法
        saveSettings,
        loadSettings,
        resetSettings
    };
});