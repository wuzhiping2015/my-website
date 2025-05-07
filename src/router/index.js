import { createRouter, createWebHashHistory } from "vue-router";

// 导入视图组件
import Demo3 from "../components/Demo3.vue";
import Demo2 from "../components/Demo2.vue";
import Demo from "../components/Demo.vue";
// 导入数字孪生平台组件
import DigitalTwinPlatform from "../views/DigitalTwinPlatform.vue";
// 导入海事地图组件
import MaritimeMap from "../views/MaritimeMap.vue";
// 导入Mapbox海事地图组件
import MapboxMaritimeMap from "../views/MapboxMaritimeMap.vue";

// 定义路由
const routes = [{
        path: "/",
        redirect: "/Demo2",
    },
    {
        path: "/digital-twin",
        name: "DigitalTwin",
        component: DigitalTwinPlatform,
        meta: {
            title: "数字孪生监控平台",
        },
    },
    {
        path: "/maritime-map",
        name: "MaritimeMap",
        component: MaritimeMap,
        meta: {
            title: "海事地图系统",
        },
    },
    {
        path: "/mapbox-maritime",
        name: "MapboxMaritime",
        component: MapboxMaritimeMap,
        meta: {
            title: "Mapbox海事导航系统",
        },
    },
    {
        path: "/Demo2",
        name: "Demo2",
        component: Demo2,
        meta: {
            title: "模型查看器",
        },
    },
    {
        path: "/Demo",
        name: "Demo",
        component: Demo,
        meta: {
            title: "模型查看器",
        },
    },
    {
        path: "/model-viewer",
        name: "ModelViewer",
        component: Demo3,
        meta: {
            title: "3D模型查看器",
        },
    },



    // 捕获所有未匹配的路由，重定向到首页
    {
        path: "/:pathMatch(.*)*",
        redirect: "/",
    },
];

// 创建路由实例
const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

// 全局前置守卫，设置页面标题
router.beforeEach((to, from, next) => {
    // 设置页面标题
    document.title = to.meta.title ?
        `${to.meta.title} - 船舶/工业设备监控平台` :
        "船舶/工业设备数字孪生监控平台";
    next();
});

export default router;