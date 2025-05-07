import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router' // 导入路由配置

// 创建Pinia实例
const pinia = createPinia()

// 创建Vue应用
const app = createApp(App)

// 使用插件
app.use(pinia)
app.use(ElementPlus)
app.use(router) // 使用路由

// 挂载应用
app.mount('#app')