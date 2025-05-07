### 智慧船舶航海导航系统开发指南

- **主要功能**：使用 Mapbox、Vue3 和 Vite 开发一个智慧船舶航海导航系统，展示海岸线、港口、船舶位置、航线，并模拟船舶导航。
- **技术栈**：Vue3（前端框架）、Vite（构建工具）、Mapbox GL JS（地图渲染）。
- **数据展示**：支持静态模拟数据，显示海洋天气和洋流等信息。
- **注意事项**：需遵循《海事地图系统技术文档》的具体要求，可能需要自定义地图样式和外部数据源。

#### 项目概述

您希望开发一个智慧船舶航海导航系统，用于展示船舶导航和海洋数据的可视化。该系统将使用 Mapbox 作为地图服务，结合 Vue3 和 Vite 技术栈，基于《海事地图系统技术文档》的要求实现功能。系统需要显示海岸线、港口、船舶位置，设置航线并模拟船舶沿航线移动，同时整合海洋天气和洋流数据。由于我无法访问技术文档，以下指南基于 Mapbox 的通用功能和最佳实践，您可能需要根据文档调整具体实现。

#### 开发步骤

1. **初始化项目**：使用 Vite 创建 Vue3 项目，安装 Mapbox GL JS 和相关依赖。
2. **配置环境**：设置 Mapbox 访问令牌，调整 Vite 配置以兼容 Mapbox。
3. **集成地图**：在 Vue3 组件中渲染 Mapbox 地图，使用海事样式显示海洋深度等数据。
4. **展示静态数据**：添加海岸线、港口等图层，基于 GeoJSON 或 Mapbox 瓦片。
5. **船舶导航模拟**：使用标记显示船舶位置，通过动画模拟沿航线移动。
6. **海洋数据整合**：通过 API 加载海洋天气和洋流数据，显示为地图覆盖层。
7. **优化与测试**：确保性能良好，测试所有功能并部署。

#### 下一步

按照以下详细步骤开始开发，参考提供的代码示例和资源。根据技术文档的具体要求，调整数据源、地图样式或功能实现。如果需要进一步帮助，请提供文档细节或具体问题。

---

### 详细开发报告

#### 项目背景与目标

智慧船舶航海导航系统旨在为船舶提供直观的导航和数据可视化功能，基于 Mapbox 的强大地图服务，结合 Vue3 和 Vite 的现代前端技术栈。系统需展示静态模拟数据，包括海岸线、港口、船舶位置和航线，并支持船舶沿航线的模拟移动。此外，系统需整合海洋天气和洋流数据，增强导航的实用性。由于未提供《海事地图系统技术文档》，本报告基于 Mapbox 的海事功能（如浴场数据和船舶跟踪）以及 Vue3 和 Vite 的最佳实践，提供通用开发指南。

#### 技术栈选择

- **Vue3**：现代前端框架，支持组件化开发，适合构建交互式界面。
- **Vite**：快速构建工具，支持热模块替换（HMR），优化开发体验。
- **Mapbox GL JS**：强大的地图渲染库，支持海事地图样式和自定义数据。
- **vue-mapbox-gl**（可选）：Vue3 的 Mapbox 组件库，简化地图集成。

#### 开发步骤

##### 1. 项目初始化

- **创建 Vue3 项目**：
  使用 Vite 初始化项目：
  ```bash
  npm init vite@latest maritime-nav-app --template vue
  cd maritime-nav-app
  npm install
  ```
- **安装依赖**：
  安装 Mapbox GL JS 和可选的`vue-mapbox-gl`：
  ```bash
  npm install mapbox-gl vue-mapbox-gl axios
  ```
  - `mapbox-gl`：核心地图库。
  - `vue-mapbox-gl`：提供 Vue 组件，简化开发。
  - `axios`：用于调用外部 API 获取海洋数据。

##### 2. 配置 Vite 与 Mapbox

- **设置 Mapbox 访问令牌**：
  在项目根目录创建`.env`文件，添加 Mapbox 访问令牌：
  ```plaintext
  VITE_MAPBOX_TOKEN=your_mapbox_access_token
  ```
  获取令牌：[Mapbox Account](https://account.mapbox.com/).
- **配置 Vite**：
  Mapbox GL JS v2+使用 ES6 语法，可能因转译问题导致 WebWorker 错误。设置`build.target`为`'esnext'`以最小化转译：

  ```javascript
  // vite.config.js
  import { defineConfig } from "vite";
  import vue from "@vitejs/plugin-vue";

  export default defineConfig({
    plugins: [vue()],
    build: {
      target: "esnext",
    },
  });
  ```

  这确保 Mapbox GL JS 在现代浏览器中正常运行，避免转译问题。

##### 3. 集成 Mapbox 地图

- **初始化地图**：
  在 Vue 组件中使用`vue-mapbox-gl`或直接使用 Mapbox GL JS。以下是使用`vue-mapbox-gl`的示例：

  ```vue
  <template>
    <MglMap
      :accessToken="accessToken"
      :mapStyle="mapStyle"
      :center="center"
      :zoom="zoom"
    >
      <!-- 添加图层和标记 -->
    </MglMap>
  </template>

  <script>
  import { MglMap } from "vue-mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";

  export default {
    name: "MapComponent",
    components: { MglMap },
    data() {
      return {
        accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
        mapStyle: "mapbox://styles/mapbox/light-v11", // 可替换为海事样式
        center: [120.15, 30.26], // 上海附近
        zoom: 5,
      };
    },
  };
  </script>

  <style scoped>
  :deep(.mapboxgl-map) {
    width: 100%;
    height: 600px;
  }
  </style>
  ```

- **海事地图样式**：
  Mapbox 提供浴场数据（bathymetry）用于显示海洋深度，推荐使用`Mapbox Bathymetry v2`瓦片集：[Bathymetry Tileset](https://docs.mapbox.com/data/tilesets/reference/mapbox-bathymetry-v2/). 可在 Mapbox Studio 中启用浴场数据或使用自定义样式：
  ```javascript
  mapStyle: "mapbox://styles/mapbox-public/ckngin2db09as17p84ejhe24y";
  ```

##### 4. 显示静态数据

- **海岸线**：
  海岸线通常包含在 Mapbox 的基础样式中（如`light-v11`）。若需自定义，可使用 GeoJSON 数据：
  ```javascript
  const coastlinesGeojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [119.5, 29.5],
            [120.5, 30.5],
            // 更多坐标
          ],
        },
      },
    ],
  };
  ```
  添加到地图：
  ```vue
  <MglGeojsonLayer
    :sourceId="coastlines"
    :layerId="coastlines - layer"
    :data="coastlinesGeojson"
    type="line"
    :paint="{ 'line-color': '#0000FF', 'line-width': 2 }"
  />
  ```
- **港口**：
  使用 GeoJSON 点数据表示港口位置：
  ```javascript
  const portsGeojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [121.47, 31.23], // 上海港
        },
        properties: { name: "上海港" },
      },
      // 更多港口
    ],
  };
  ```
  添加到地图：
  ```vue
  <MglGeojsonLayer
    :sourceId="ports"
    :layerId="ports - layer"
    :data="portsGeojson"
    type="circle"
    :paint="{ 'circle-color': '#FF0000', 'circle-radius': 5 }"
  />
  ```

##### 5. 船舶位置与导航模拟

- **船舶位置**：
  使用标记（Markers）显示船舶：
  ```javascript
  data() {
    return {
      ships: [
        { id: 'ship1', position: [120.15, 30.26] },
        { id: 'ship2', position: [121.47, 31.23] },
      ],
    }
  }
  ```
  ```vue
  <MglMarker
    v-for="ship in ships"
    :key="ship.id"
    :coordinates="ship.position"
    color="blue"
  />
  ```
- **导航模拟**：
  定义航线为 GeoJSON LineString：

  ```javascript
  const route = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [120.15, 30.26],
        [121.47, 31.23],
        [122.05, 32.05],
      ],
    },
  };
  ```

  使用定时器模拟船舶沿航线移动：

  ```javascript
  export function simulateNavigation(ship, route, updateCallback) {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < route.geometry.coordinates.length) {
        ship.position = route.geometry.coordinates[currentIndex];
        updateCallback(ship);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 1000); // 每秒移动
  }
  ```

  在组件中使用：

  ```javascript
  import { simulateNavigation } from './NavigationSimulation'

  methods: {
    startSimulation() {
      this.ships.forEach((ship) => {
        simulateNavigation(ship, route, () => {
          this.$forceUpdate() // 更新视图
        })
      })
    },
  }
  ```

##### 6. 海洋数据整合

- **海洋天气和洋流**：
  使用外部 API（如 NOAA 或海事气象服务）获取数据。示例 API 返回 GeoJSON 格式：

  ```javascript
  const weatherData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [119.5, 29.5],
              [120.5, 29.5],
              [120.5, 30.5],
              [119.5, 30.5],
              [119.5, 29.5],
            ],
          ],
        },
        properties: { condition: "storm" },
      },
    ],
  };
  ```

  显示为地图覆盖层：

  ```vue
  <MglGeojsonLayer
    :sourceId="weather"
    :layerId="weather - layer"
    :data="weatherData"
    type="fill"
    :paint="{ 'fill-color': '#FF0000', 'fill-opacity': 0.5 }"
  />
  ```

  使用`axios`定期更新数据：

  ```javascript
  import axios from 'axios'

  methods: {
    async fetchWeatherData() {
      const response = await axios.get(' AscendingAPI.get('weather-api')
      this.weatherData = response.data
    },
  }
  ```

##### 7. 优化与测试

- **性能优化**：
  - 使用 Mapbox 的聚合功能处理大量船舶标记：
    ```vue
    <MglGeojsonLayer
      :sourceId="ships"
      :layerId="ships - cluster"
      :data="shipsGeojson"
      type="circle"
      :cluster="true"
    />
    ```
  - 优化瓦片加载，限制地图缩放级别。
- **测试**：
  - 测试地图渲染、船舶模拟、数据更新。
  - 验证导航模拟的准确性。
  - 检查海洋数据的实时性和正确性。
- **部署**：
  - 构建项目：`npm run build`
  - 部署到 Vercel、Netlify 等平台。

##### 8. 遵循技术文档

- **数据源**：根据文档指定的数据源（如 GeoJSON 文件、API）加载海岸线、港口等数据。
- **地图样式**：若文档要求特定样式，使用 Mapbox Studio 自定义。
- **模拟逻辑**：实现文档指定的导航模拟算法（如速度、时间间隔）。
- **海洋数据**：整合文档要求的天气和洋流数据源。

#### 功能对比表

| **功能**      | **实现方式**                    | **技术支持**                |
| ------------- | ------------------------------- | --------------------------- |
| 海岸线显示    | GeoJSON 或 Mapbox 瓦片          | Mapbox GL JS, vue-mapbox-gl |
| 港口显示      | GeoJSON 点数据                  | Mapbox GL JS, vue-mapbox-gl |
| 船舶位置      | 动态标记                        | Mapbox Markers              |
| 航线模拟      | GeoJSON LineString + 定时器动画 | Custom JavaScript           |
| 海洋天气/洋流 | 外部 API + GeoJSON 覆盖层       | Axios, Mapbox GL JS         |
| 性能优化      | 聚合、瓦片优化                  | Mapbox Clustering           |

#### 注意事项

- **Mapbox 限制**：确保访问令牌有效，注意 API 调用限额。
- **浏览器兼容性**：Mapbox GL JS v2+不支持 Internet Explorer，需现代浏览器。
- **数据模拟**：若无实时数据，使用静态 GeoJSON 模拟船舶和航线。
- **扩展功能**：根据文档，可能需添加交互功能（如点击船舶显示信息）。

#### 总结

通过以上步骤，您可以开发一个功能完善的智慧船舶航海导航系统。使用 Vue3 和 Vite 确保高效开发体验，Mapbox 提供强大的海事地图支持。关键是遵循《海事地图系统技术文档》的要求，调整数据源、样式和功能实现。如需进一步帮助，请提供文档细节或具体问题。

**Key Citations**

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/api/)
- [vue-mapbox-gl Documentation](https://vue-mapbox-gl.studiometa.dev/)
- [Vite Configuration Documentation](https://vitejs.dev/config/)
- [Mapbox Bathymetry Tileset Reference](https://docs.mapbox.com/data/tilesets/reference/mapbox-bathymetry-v2/)
- [Mapbox Maritime Maps Blog](https://www.mapbox.com/blog/new-bathymetry-tileset-and-style-for-marine-maps)
- [Mapbox Vessel Tracking Blog](https://blog.mapbox.com/better-tracking-for-marine-vessels-815a074a6417)
