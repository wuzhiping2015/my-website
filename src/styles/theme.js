export const lightTheme = {
    // 基础颜色
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',

    // 背景色
    background: '#ffffff',
    backgroundSecondary: '#f1f5f9',
    backgroundTertiary: '#e2e8f0',

    // 文字颜色
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',

    // 边框颜色
    border: '#e2e8f0',
    borderLight: '#f1f5f9',

    // 阴影
    shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    shadowHover: '0 4px 6px rgba(0, 0, 0, 0.1)',

    // 动画
    transition: 'all 0.3s ease',

    // 布局
    headerHeight: '60px',
    sidebarWidth: '220px',
    borderRadius: '4px'
}

export const darkTheme = {
    // 基础颜色
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',

    // 背景色
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',

    // 文字颜色
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textTertiary: '#94a3b8',

    // 边框颜色
    border: '#334155',
    borderLight: '#1e293b',

    // 阴影
    shadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    shadowHover: '0 4px 6px rgba(0, 0, 0, 0.3)',

    // 动画
    transition: 'all 0.3s ease',

    // 布局
    headerHeight: '60px',
    sidebarWidth: '220px',
    borderRadius: '4px'
}

// 主题切换函数
export const applyTheme = (theme) => {
    const root = document.documentElement
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme

    Object.entries(currentTheme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
    })
}