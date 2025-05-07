import { ref, computed } from 'vue';

export function useModelHistory(maxHistorySize = 10) {
    // 历史记录
    const modelHistory = ref([]);
    // 当前在历史记录中的位置
    const currentHistoryIndex = ref(-1);

    // 计算属性：是否可以后退
    const canGoBack = computed(() => currentHistoryIndex.value > 0);

    // 计算属性：是否可以前进
    const canGoForward = computed(() => currentHistoryIndex.value < modelHistory.value.length - 1);

    // 添加模型到历史记录
    const addToHistory = (modelPath) => {
        // 如果当前不是最新历史，截断之后的记录
        if (currentHistoryIndex.value < modelHistory.value.length - 1) {
            modelHistory.value = modelHistory.value.slice(0, currentHistoryIndex.value + 1);
        }

        // 如果是重复的模型，不添加到历史
        if (modelHistory.value.length > 0 && modelHistory.value[modelHistory.value.length - 1] === modelPath) {
            return;
        }

        // 添加新记录
        modelHistory.value.push(modelPath);

        // 如果历史记录超过最大长度，删除最早的记录
        if (modelHistory.value.length > maxHistorySize) {
            modelHistory.value.shift();
        }

        // 更新当前位置
        currentHistoryIndex.value = modelHistory.value.length - 1;
    };

    // 后退
    const goBack = () => {
        if (canGoBack.value) {
            currentHistoryIndex.value--;
            return modelHistory.value[currentHistoryIndex.value];
        }
        return null;
    };

    // 前进
    const goForward = () => {
        if (canGoForward.value) {
            currentHistoryIndex.value++;
            return modelHistory.value[currentHistoryIndex.value];
        }
        return null;
    };

    // 获取当前模型路径
    const getCurrentModel = () => {
        if (currentHistoryIndex.value >= 0 && currentHistoryIndex.value < modelHistory.value.length) {
            return modelHistory.value[currentHistoryIndex.value];
        }
        return null;
    };

    // 清除历史记录
    const clearHistory = () => {
        modelHistory.value = [];
        currentHistoryIndex.value = -1;
    };

    return {
        modelHistory,
        currentHistoryIndex,
        canGoBack,
        canGoForward,
        addToHistory,
        goBack,
        goForward,
        getCurrentModel,
        clearHistory
    };
}