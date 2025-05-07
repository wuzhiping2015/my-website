<template>
    <div class="loading-container" v-if="loading">
        <div class="loading-spinner"></div>
        <span class="loading-text" v-if="text">{{ text }}</span>
    </div>
</template>

<script setup>
defineProps({
    loading: {
        type: Boolean,
        default: true
    },
    text: {
        type: String,
        default: '加载中...'
    }
})
</script>

<style scoped>
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--background-secondary);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loading-text {
    margin-top: 12px;
    color: var(--text-secondary);
    font-size: 14px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style> 