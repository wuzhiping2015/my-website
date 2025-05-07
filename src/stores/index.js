// 导入所有Pinia存储
import { useMaterialStore } from './materialStore'
import { useModelStore } from './modelStore'
import { useSceneStore } from './sceneStore'
import { useScreenshotStore } from './screenshotStore'
import { useUIStore } from './uiStore'

// 导出所有存储
export {
    useMaterialStore,
    useModelStore,
    useSceneStore,
    useScreenshotStore,
    useUIStore
}

/**
 * 初始化所有存储
 * 此函数应在应用启动时调用一次，确保所有存储都正确初始化
 */
export function initializeStores() {
    // 创建存储实例并调用初始化方法
    const materialStore = useMaterialStore()
    const modelStore = useModelStore()
    const sceneStore = useSceneStore()
    const screenshotStore = useScreenshotStore()
    const uiStore = useUIStore()

    // 按顺序初始化各存储
    // UI存储应该首先初始化，因为它包含全局设置
    uiStore.initStore()
    materialStore.initStore()
    sceneStore.initStore()
    modelStore.initStore()
    screenshotStore.initStore()

    return {
        materialStore,
        modelStore,
        sceneStore,
        screenshotStore,
        uiStore
    }
}

/**
 * 重置所有存储到初始状态
 * 可用于用户清除数据、退出登录等场景
 */
export function resetAllStores() {
    const materialStore = useMaterialStore()
    const modelStore = useModelStore()
    const sceneStore = useSceneStore()
    const screenshotStore = useScreenshotStore()
    const uiStore = useUIStore()

    // 清空各存储数据
    materialStore.clearAllMaterials()
    modelStore.clearAllModels()
    screenshotStore.clearAllScreenshots()

    // 将场景重置为默认状态
    sceneStore.resetToDefaultScene()

    // 重置UI设置（可选，通常UI设置不需要重置）
    // uiStore.resetAllUISettings()

    return true
}