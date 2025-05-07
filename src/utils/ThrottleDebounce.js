/**
 * 事件处理优化工具
 * 提供节流和防抖函数，优化事件处理
 */

/**
 * 节流函数 - 限制函数在一定时间内只执行一次
 * @param {Function} func 要执行的函数
 * @param {number} limit 时间限制(ms)
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    let lastResult;

    return function(...args) {
        const context = this;

        if (!inThrottle) {
            lastResult = func.apply(context, args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }

        return lastResult;
    };
}

/**
 * 防抖函数 - 延迟执行函数，如果在延迟时间内再次调用则重新计时
 * @param {Function} func 要执行的函数
 * @param {number} delay 延迟时间(ms)
 * @param {boolean} immediate 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay = 300, immediate = false) {
    let timeout;

    return function(...args) {
        const context = this;

        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        const callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, delay);

        if (callNow) return func.apply(context, args);
    };
}

/**
 * 创建RAF防抖函数 - 使用requestAnimationFrame实现防抖，对于视觉更新效果更好
 * @param {Function} func 要执行的函数
 * @returns {Function} RAF防抖后的函数
 */
export function rafDebounce(func) {
    let ticking = false;

    return function(...args) {
        const context = this;

        if (!ticking) {
            requestAnimationFrame(() => {
                func.apply(context, args);
                ticking = false;
            });

            ticking = true;
        }
    };
}