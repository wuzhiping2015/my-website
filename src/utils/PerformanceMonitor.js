/**
 * 性能监控器 - 监控FPS和内存使用，提供自动调整渲染质量的功能
 */
export class PerformanceMonitor {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            sampleSize: options.sampleSize || 60, // 采样数量
            targetFPS: options.targetFPS || 30, // 目标FPS
            criticalFPS: options.criticalFPS || 20, // 临界FPS，低于此值触发紧急优化
            interval: options.interval || 1000, // 监控间隔(ms)
            memoryWarningLevel: options.memoryWarningLevel || 500, // 内存警告阈值(MB)
            memoryErrorLevel: options.memoryErrorLevel || 800, // 内存错误阈值(MB)
            autoAdjust: options.autoAdjust !== false, // 是否自动调整
        };

        // 状态
        this.fpsHistory = [];
        this.memoryHistory = [];
        this.lastTime = 0;
        this.frameCount = 0;
        this.running = false;
        this.qualityLevel = 1.0; // 质量级别: 0.0-1.0
        this.adjustmentStrength = 0.1; // 调整力度

        // 回调函数
        this.onFPSUpdate = options.onFPSUpdate || null;
        this.onMemoryUpdate = options.onMemoryUpdate || null;
        this.onQualityChange = options.onQualityChange || null;
        this.onThresholdExceeded = options.onThresholdExceeded || null;

        // 绑定方法
        this.update = this.update.bind(this);
        this.analyzePerformance = this.analyzePerformance.bind(this);
    }

    /**
     * 启动监控
     */
    start() {
        if (this.running) return;

        this.running = true;
        this.lastTime = performance.now();
        this.frameCount = 0;

        // 启动分析定时器
        this.analysisInterval = setInterval(this.analyzePerformance, this.config.interval);

        // 安排下一帧更新
        requestAnimationFrame(this.update);

        console.log('性能监控已启动');
    }

    /**
     * 停止监控
     */
    stop() {
        this.running = false;
        clearInterval(this.analysisInterval);
        console.log('性能监控已停止');
    }

    /**
     * 更新帧计数
     */
    update() {
        if (!this.running) return;

        this.frameCount++;
        requestAnimationFrame(this.update);
    }

    /**
     * 分析性能并触发回调
     */
    analyzePerformance() {
        if (!this.running) return;

        const now = performance.now();
        const elapsed = now - this.lastTime;

        // 计算当前FPS
        const currentFPS = Math.round((this.frameCount * 1000) / elapsed);

        // 更新历史记录
        this.fpsHistory.push(currentFPS);
        if (this.fpsHistory.length > this.config.sampleSize) {
            this.fpsHistory.shift();
        }

        // 如果支持内存监控
        if (window.performance && performance.memory) {
            const memoryUsage = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
            this.memoryHistory.push(memoryUsage);

            if (this.memoryHistory.length > this.config.sampleSize) {
                this.memoryHistory.shift();
            }

            // 触发内存更新回调
            if (this.onMemoryUpdate) {
                this.onMemoryUpdate(memoryUsage);
            }

            // 检查内存警告
            this.checkMemoryThresholds(memoryUsage);
        }

        // 重置计数器
        this.lastTime = now;
        this.frameCount = 0;

        // 计算平均FPS
        const averageFPS = Math.round(
            this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
        );

        // 触发FPS更新回调
        if (this.onFPSUpdate) {
            this.onFPSUpdate(averageFPS);
        }

        // 自动调整质量
        if (this.config.autoAdjust) {
            this.adjustQuality(averageFPS);
        }

        // 检查FPS是否低于临界值
        if (averageFPS < this.config.criticalFPS && this.onThresholdExceeded) {
            this.onThresholdExceeded(averageFPS);
        }
    }

    /**
     * 检查内存使用阈值
     */
    checkMemoryThresholds(memoryUsage) {
        if (memoryUsage > this.config.memoryErrorLevel) {
            console.error(`内存使用超过错误阈值: ${memoryUsage}MB > ${this.config.memoryErrorLevel}MB`);
            this.qualityLevel = Math.max(0.2, this.qualityLevel - 0.3); // 紧急大幅降低质量
            this.triggerQualityChange();

            if (this.onThresholdExceeded) {
                this.onThresholdExceeded(0, memoryUsage);
            }
        } else if (memoryUsage > this.config.memoryWarningLevel) {
            console.warn(`内存使用超过警告阈值: ${memoryUsage}MB > ${this.config.memoryWarningLevel}MB`);
            this.qualityLevel = Math.max(0.3, this.qualityLevel - 0.1); // 中等降低质量
            this.triggerQualityChange();
        }
    }

    /**
     * 自动调整渲染质量
     */
    adjustQuality(currentFPS) {
        // 比较当前FPS与目标FPS
        const fpsDiff = currentFPS - this.config.targetFPS;

        if (fpsDiff < -10) {
            // FPS明显低于目标，大幅降低质量
            this.qualityLevel = Math.max(0.2, this.qualityLevel - this.adjustmentStrength);
            this.triggerQualityChange();
        } else if (fpsDiff < -5) {
            // FPS低于目标，稍微降低质量
            this.qualityLevel = Math.max(0.3, this.qualityLevel - (this.adjustmentStrength / 2));
            this.triggerQualityChange();
        } else if (fpsDiff > 15 && this.qualityLevel < 1.0) {
            // FPS远高于目标，可以提高质量
            this.qualityLevel = Math.min(1.0, this.qualityLevel + (this.adjustmentStrength / 3));
            this.triggerQualityChange();
        }
    }

    /**
     * 触发质量变更回调
     */
    triggerQualityChange() {
        if (this.onQualityChange) {
            this.onQualityChange(this.qualityLevel);
        }
    }

    /**
     * 手动设置质量级别
     */
    setQualityLevel(level) {
        this.qualityLevel = Math.max(0.1, Math.min(1.0, level));
        this.triggerQualityChange();
        return this.qualityLevel;
    }

    /**
     * 获取当前性能状态
     */
    getStatus() {
        const averageFPS = this.fpsHistory.length ?
            Math.round(this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length) : 0;

        const averageMemory = this.memoryHistory.length ?
            Math.round(this.memoryHistory.reduce((sum, mem) => sum + mem, 0) / this.memoryHistory.length) : 0;

        return {
            fps: averageFPS,
            memory: averageMemory,
            qualityLevel: this.qualityLevel,
            isLowPerformance: averageFPS < this.config.targetFPS,
            isCritical: averageFPS < this.config.criticalFPS,
            memoryWarning: averageMemory > this.config.memoryWarningLevel
        };
    }
}