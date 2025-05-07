<template>
    <div class="status-indicator" :class="status">
        <span class="status-dot" :class="status"></span>
        <span class="status-text">{{ text }}</span>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    status: {
        type: String,
        default: 'normal',
        validator: (value) => ['normal', 'warning', 'error'].includes(value)
    },
    text: {
        type: String,
        default: ''
    }
})

const statusText = computed(() => {
    switch (props.status) {
        case 'normal':
            return '正常'
        case 'warning':
            return '警告'
        case 'error':
            return '错误'
        default:
            return props.text
    }
})
</script>

<style scoped>
.status-indicator {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: var(--border-radius);
    font-size: 12px;
    transition: var(--transition);
}

.status-indicator.normal {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--success);
}

.status-indicator.warning {
    background-color: rgba(245, 158, 11, 0.1);
    color: var(--warning);
}

.status-indicator.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--danger);
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 6px;
}

.status-text {
    font-weight: 500;
}
</style> 