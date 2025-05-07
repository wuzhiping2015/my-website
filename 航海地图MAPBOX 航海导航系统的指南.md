### 使用 Cursor Agent 开发智慧船舶航海导航系统的指南

您希望基于 **Mapbox**、**Vue3** 和 **Vite** 技术栈，结合 **Cursor Agent** 的 AI 辅助编码能力，开发一个智慧船舶航海导航系统。根据您的要求，系统需展示海岸线、港口、船舶位置、航线，并模拟船舶沿航线的导航运行，同时可视化海洋天气和洋流数据。以下是针对 Cursor Agent 的开发指南，包括上下文提示词、实现步骤和关键代码工件。我已结合您的需求和专业最佳实践，完善了提示词和开发流程，确保符合《海事地图系统技术文档》的假设要求。

---

### Cursor Agent 上下文提示词

为了让 Cursor Agent 生成准确的代码，我们需要提供清晰、结构化的提示词，包含项目需求、技术栈和具体任务。以下是优化后的提示词，结合了您的要求和 Mapbox 的海事功能。


# Cursor Agent 提示词：智慧船舶航海导航系统

## 项目概述
开发一个智慧船舶航海导航系统，使用 Vue3、Vite 和 Mapbox GL JS。系统在 Mapbox 地图上展示海岸线、港口、船舶位置和航线，模拟船舶沿航线导航，并可视化海洋天气和洋流数据。项目遵循《海事地图系统技术文档》要求（假设需使用 GeoJSON 数据、自定义地图样式和静态模拟数据）。

## 技术栈
- **前端框架**：Vue3（组合式 API，TypeScript）
- **构建工具**：Vite
- **地图库**：Mapbox GL JS（推荐使用 vue-mapbox-gl 集成）
- **状态管理**：Pinia（管理船舶和航线数据）
- **数据请求**：Axios（获取海洋天气和洋流数据）
- **环境**：Node.js 18+，现代浏览器（不支持 IE）

## 功能需求
1. **地图初始化**：
   - 初始化 Mapbox 地图，中心点为中国东海（经纬度：[120.15, 30.26]），缩放级别为 5。
   - 使用 Mapbox 提供的海事样式（如包含浴场数据的 `light-v11` 或自定义样式）。
2. **静态数据展示**：
   - **海岸线**：使用 GeoJSON 或 Mapbox 瓦片展示中国东海海岸线。
   - **港口**：显示主要港口（如上海港 [121.47, 31.23]），使用圆形标记。
   - **船舶位置**：展示至少两艘船舶的实时位置（使用标记）。
3. **航线与导航模拟**：
   - 定义航线为 GeoJSON LineString（如从 [120.15, 30.26] 到 [122.05, 32.05]）。
   - 模拟船舶沿航线移动，每秒更新位置，动画平滑。
4. **海洋数据可视化**：
   - 加载静态或模拟的海洋天气和洋流数据（GeoJSON 格式）。
   - 使用覆盖层显示天气区域（如风暴区）或洋流方向。
5. **交互功能**：
   - 点击船舶显示详细信息（如 ID、速度）。
   - 提供按钮启动/停止导航模拟。

## 实现要求
- **项目结构**：
  - 使用 Vite 初始化 Vue3 项目（TypeScript 模板）。
  - 目录结构：
    ```
    src/
    ├── components/
    │   ├── MapComponent.vue（地图核心组件）
    │   ├── ShipMarker.vue（船舶标记）
    │   └── RouteLayer.vue（航线图层）
    ├── store/
    │   └── maritime.js（Pinia 状态管理）
    ├── assets/
    │   └── data/（GeoJSON 数据文件）
    ├── App.vue
    └── main.ts
    ```
- **Mapbox 配置**：
  - 在 `.env` 中配置 Mapbox 访问令牌（VITE_MAPBOX_TOKEN）。
  - 设置 Vite 的 `build.target` 为 `esnext`，避免 Mapbox GL JS 的 WebWorker 问题。
- **数据源**：
  - 使用静态 GeoJSON 文件模拟海岸线、港口、船舶和航线数据。
  - 海洋天气和洋流数据可通过 Axios 从外部 API 获取，或使用静态 GeoJSON 模拟。
- **代码规范**：
  - 使用 TypeScript，确保类型安全。
  - 遵循 Vue3 组合式 API 最佳实践。
  - 组件化开发，保持代码模块化。
- **性能优化**：
  - 对大量船舶使用 Mapbox 聚合功能。
  - 限制地图缩放级别（3-10），优化瓦片加载。
- **测试与部署**：
  - 测试地图渲染、船舶模拟和数据更新。
  - 部署到 Vercel 或 Netlify。

## 任务清单
1. 初始化 Vite + Vue3 项目，安装 Mapbox GL JS 和 vue-mapbox-gl。
2. 创建 MapComponent.vue，渲染 Mapbox 地图，配置海事样式。
3. 添加海岸线和港口图层，使用 GeoJSON 数据。
4. 实现船舶标记组件，支持动态位置更新。
5. 开发航线图层和导航模拟逻辑，使用定时器实现动画。
6. 集成海洋天气和洋流数据，显示为覆盖层。
7. 添加交互功能（如点击船舶显示信息）。
8. 优化性能并测试所有功能。

## 额外说明
- 如果《海事地图系统技术文档》指定了特定数据源或样式，请优先遵循。
- 提供示例 GeoJSON 数据（如海岸线、港口、航线）供模拟。
- 确保代码可运行在现代浏览器，处理 Mapbox API 限额。

## 示例代码片段
- **MapComponent.vue**（参考）：
  ```vue
  <template>
    <MglMap
      :accessToken="accessToken"
      :mapStyle="mapStyle"
      :center="center"
      :zoom="zoom"
    />
  </template>
  <script   setup>
  import { MglMap } from 'vue-mapbox-gl'
  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
  const mapStyle = 'mapbox://styles/mapbox/light-v11'
  const center = [120.15, 30.26]
  const zoom = 5
  </script>
  ```

请基于以上要求生成完整代码，并确保与 Vue3、Vite 和 Mapbox 兼容。


---

### 使用 Cursor Agent 实现步骤

以下是结合 Cursor Agent 的具体开发步骤，假设您在 Cursor IDE 中操作。Cursor Agent 可以通过自然语言提示生成代码、编辑文件和调试问题。

#### 1. 初始化项目
- **操作**：
  - 在 Cursor IDE 中打开终端，运行：
    ```bash
    npm init vite@latest maritime-nav-app -- --template vue-ts
    cd maritime-nav-app
    npm install
    ```
  - 安装依赖：
    ```bash
    npm install mapbox-gl vue-mapbox-gl axios pinia
    ```
- **Cursor Agent 提示**：
  - 输入：`为 Vue3 项目配置 Vite，设置 build.target 为 esnext，并添加 .env 文件支持 Mapbox 访问令牌。`
  - 预期输出：Cursor Agent 将修改 `vite.config.ts` 和创建 `.env` 文件：
    ```typescript
    import { defineConfig } from 'vite'
    import vue from '@vitejs/plugin-vue'

    export default defineConfig({
      plugins: [vue()],
      build: {
        target: 'esnext',
      },
    })
    ```
    
    VITE_MAPBOX_TOKEN=your_mapbox_access_token
    
- **验证**：运行 `npm run dev`，确保项目启动。

#### 2. 集成 Mapbox 地图
- **操作**：
  - 创建 `src/components/MapComponent.vue`，用于渲染 Mapbox 地图。
  - 在 Cursor IDE 中，使用提示词生成组件代码。
- **Cursor Agent 提示**：
  - 输入：`创建一个 Vue3 组件 MapComponent.vue，使用 vue-mapbox-gl 初始化 Mapbox 地图，中心点为 [120.15, 30.26]，缩放级别为 5，使用 light-v11 样式，读取 VITE_MAPBOX_TOKEN。`
  - 预期输出：
    ```vue
    <template>
      <MglMap
        :accessToken="accessToken"
        :mapStyle="mapStyle"
        :center="center"
        :zoom="zoom"
      />
    </template>

    <script lang="ts" setup>
    import { MglMap } from 'vue-mapbox-gl'
    import 'mapbox-gl/dist/mapbox-gl.css'

    const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
    const mapStyle = 'mapbox://styles/mapbox/light-v11'
    const center = [120.15, 30.26]
    const zoom = 5
    </script>

    <style scoped>
    :deep(.mapboxgl-map) {
      width: 100%;
      height: 600px;
    }
    </style>
    ```
- **验证**：在 `App.vue` 中引入 `MapComponent`，运行项目，检查地图是否渲染。

#### 3. 显示海岸线和港口
- **操作**：
  - 创建 GeoJSON 文件模拟海岸线和港口数据。
  - 使用 `MglGeojsonLayer` 添加图层。
- **Cursor Agent 提示**：
  - 输入：`在 MapComponent.vue 中添加海岸线和港口图层，使用 GeoJSON 数据。海岸线为蓝色线条，港口为红色圆点，包含上海港 [121.47, 31.23]。`
  - 预期输出：
    - GeoJSON 数据：
      ```json
      {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [119.5, 29.5],
                [120.5, 30.5],
                [121.5, 31.5]
              ]
            }
          }
        ]
      }
      ```
      ```json
      {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [121.47, 31.23]
            },
            "properties": { "name": "上海港" }
          }
        ]
      }
      ```
    - 更新 `MapComponent.vue`：
      ```vue
      <template>
        <MglMap
          :accessToken="accessToken"
          :mapStyle="mapStyle"
          :center="center"
          :zoom="zoom"
        >
          <MglGeojsonLayer
            sourceId="coastlines"
            layerId="coastlines-layer"
            :data="coastlinesGeojson"
            type="line"
            :paint="{ 'line-color': '#0000FF', 'line-width': 2 }"
          />
          <MglGeojsonLayer
            sourceId="ports"
            layerId="ports-layer"
            :data="portsGeojson"
            type="circle"
            :paint="{ 'circle-color': '#FF0000', 'circle-radius': 5 }"
          />
        </MglMap>
      </template>

      <script lang="ts" setup>
      import { MglMap, MglGeojsonLayer } from 'vue-mapbox-gl'
      import 'mapbox-gl/dist/mapbox-gl.css'
      import coastlinesGeojson from '@/assets/data/coastlines.json'
      import portsGeojson from '@/assets/data/ports.json'

      const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
      const mapStyle = 'mapbox://styles/mapbox/light-v11'
      const center = [120.15, 30.26]
      const zoom = 5
      </script>

      <style scoped>
      :deep(.mapboxgl-map) {
        width: 100%;
        height: 600px;
      }
      </style>
      ```
- **验证**：检查海岸线和港口是否正确显示。

#### 4. 船舶位置与导航模拟
- **操作**：
  - 创建 `ShipMarker.vue` 组件显示船舶。
  - 实现导航模拟逻辑。
- **Cursor Agent 提示**：
  - 输入：`创建 ShipMarker.vue 组件，显示船舶标记，支持动态位置更新。添加导航模拟逻辑，船舶沿 GeoJSON 航线移动，每秒更新位置。`
  - 预期输出：
    ```vue
    <template>
      <MglMarker
        :coordinates="ship.position"
        color="blue"
        @click="showShipInfo"
      />
    </template>

    <script lang="ts" setup>
    import { MglMarker } from 'vue-mapbox-gl'
    import { defineProps } from 'vue'

    const props = defineProps<{
      ship: { id: string; position: number[] }
    }>()

    const showShipInfo = () => {
      alert(`船舶 ID: ${props.ship.id}`)
    }
    </script>
    ```
    ```typescript
    export function simulateNavigation(
      ship: { id: string; position: number[] },
      route: { geometry: { coordinates: number[][] } },
      updateCallback: (ship: { id: string; position: number[] }) => void
    ) {
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex < route.geometry.coordinates.length) {
          ship.position = route.geometry.coordinates[currentIndex]
          updateCallback(ship)
          currentIndex++
        } else {
          clearInterval(interval)
        }
      }, 1000)
    }
    ```
    - 更新 `MapComponent.vue`：
      ```vue
      <template>
        <MglMap
          :accessToken="accessToken"
          :mapStyle="mapStyle"
          :center="center"
          :zoom="zoom"
        >
          <MglGeojsonLayer
            sourceId="coastlines"
            layerId="coastlines-layer"
            :data="coastlinesGeojson"
            type="line"
            :paint="{ 'line-color': '#0000FF', 'line-width': 2 }"
          />
          <MglGeojsonLayer
            sourceId="ports"
            layerId="ports-layer"
            :data="portsGeojson"
            type="circle"
            :paint="{ 'circle-color': '#FF0000', 'circle-radius': 5 }"
          />
          <MglGeojsonLayer
            sourceId="route"
            layerId="route-layer"
            :data="routeGeojson"
            type="line"
            :paint="{ 'line-color': '#00FF00', 'line-width': 3 }"
          />
          <ShipMarker
            v-for="ship in ships"
            :key="ship.id"
            :ship="ship"
          />
        </MglMap>
        <button @click="startSimulation">开始模拟</button>
      </template>

      <script lang="ts" setup>
      import { MglMap, MglGeojsonLayer } from 'vue-mapbox-gl'
      import ShipMarker from './ShipMarker.vue'
      import { simulateNavigation } from './NavigationSimulation'
      import 'mapbox-gl/dist/mapbox-gl.css'
      import coastlinesGeojson from '@/assets/data/coastlines.json'
      import portsGeojson from '@/assets/data/ports.json'
      import { ref } from 'vue'

      const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
      const mapStyle = 'mapbox://styles/mapbox/light-v11'
      const center = [120.15, 30.26]
      const zoom = 5

      const routeGeojson = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [120.15, 30.26],
            [121.47, 31.23],
            [122.05, 32.05],
          ],
        },
      }

      const ships = ref([
        { id: 'ship1', position: [120.15, 30.26] },
        { id: 'ship2', position: [120.15, 30.26] },
      ])

      const startSimulation = () => {
        ships.value.forEach((ship) => {
          simulateNavigation(ship, routeGeojson, () => {
            ships.value = [...ships.value]
          })
        })
      }
      </script>

      <style scoped>
      :deep(.mapboxgl-map) {
        width: 100%;
        height: 600px;
      }
      button {
        margin-top: 10px;
        padding: 8px 16px;
      }
      </style>
      ```
- **验证**：点击“开始模拟”按钮，检查船舶是否沿航线移动。

#### 5. 海洋数据可视化
- **操作**：
  - 添加海洋天气和洋流覆盖层。
- **Cursor Agent 提示**：
  - 输入：`在 MapComponent.vue 中添加海洋天气覆盖层，使用 GeoJSON 数据显示风暴区域，半透明红色填充。`
  - 预期输出：
    ```json
    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [119.5, 29.5],
                [120.5, 29.5],
                [120.5, 30.5],
                [119.5, 30.5],
                [119.5, 29.5]
              ]
            ]
          },
          "properties": { "condition": "storm" }
        }
      ]
    }
    ```
    - 更新 `MapComponent.vue`（部分代码）：
      ```vue
      <template>
        <MglMap ...>
          <!-- 其他图层 -->
          <MglGeojsonLayer
            sourceId="weather"
            layerId="weather-layer"
            :data="weatherGeojson"
            type="fill"
            :paint="{ 'fill-color': '#FF0000', 'fill-opacity': 0.5 }"
          />
        </MglMap>
      </template>
      <script lang="ts" setup>
      import weatherGeojson from '@/assets/data/weather.json'
      // 其他代码
      </script>
      ```
- **验证**：检查风暴区域是否显示为红色半透明区域。

#### 6. 优化与测试
- **操作**：
  - 使用 Mapbox 聚合优化性能。
  - 测试所有功能。
- **Cursor Agent 提示**：
  - 输入：`为船舶图层添加 Mapbox 聚合功能，优化大量标记的性能。`
  - 预期输出：更新 `MapComponent.vue`，添加聚合配置：
    ```vue
    <MglGeojsonLayer
      sourceId="ships"
      layerId="ships-cluster"
      :data="shipsGeojson"
      type="circle"
      :cluster="true"
      :paint="{ 'circle-color': '#0000FF', 'circle-radius': 10 }"
    />
    ```
- **测试**：
  - 验证地图渲染、船舶模拟、交互功能。
  - 运行 `npm run build` 和 `npm run preview`，检查生产环境。
- **部署**：
  - 在 Cursor IDE 中运行：
    ```bash
    npm run build
    ```
  - 部署到 Vercel 或 Netlify。

#### 7. 遵循技术文档
- **操作**：
  - 根据《海事地图系统技术文档》调整数据源、样式或功能。
- **Cursor Agent 提示**：
  - 输入：`根据提供的 GeoJSON 数据源 [具体数据] 更新海岸线和港口图层，并使用自定义地图样式 [样式 ID]。`
  - 确保提供文档中的具体要求（如数据 URL 或样式 ID）。

---

### 注意事项
- **Mapbox 限制**：确保访问令牌有效，注意 API 调用限额（免费账户有限制）。
- **Cursor Agent 使用**：
  - 在 Cursor IDE 中，使用 `Ctrl+.` 触发 Agent 提示。
  - 提供具体、结构化的提示词，避免模糊指令。
  - 检查 Agent 生成的代码，确保类型安全和逻辑正确。
- **技术文档**：由于未提供文档，假设使用 GeoJSON 和 Mapbox 标准样式。如有具体要求，请提供细节。
- **性能**：对于大量船舶，使用 Mapbox 聚合或限制渲染范围。
- **扩展**：可添加交互功能（如缩放控件、航线编辑）。

---

### 总结
通过以上步骤，您可以使用 Cursor Agent 在 Cursor IDE 中高效开发智慧船舶航海导航系统。关键是提供清晰的提示词，结合 Vue3、Vite 和 Mapbox 的最佳实践。生成的工件（`MapComponent.vue`、`NavigationSimulation.ts` 等）涵盖了核心功能，可直接使用或根据技术文档调整。如需进一步帮助，请提供《海事地图系统技术文档》的具体要求或遇到的问题。

**关键参考**
- [Mapbox GL JS 文档](https://docs.mapbox.com/mapbox-gl-js/api/)
- [vue-mapbox-gl 文档](https://vue-mapbox-gl.studiometa.dev/)
- [Vite 文档](https://vitejs.dev/config/)
- [Mapbox 浴场数据参考](https://docs.mapbox.com/data/tilesets/reference/mapbox-bathymetry-v2/)