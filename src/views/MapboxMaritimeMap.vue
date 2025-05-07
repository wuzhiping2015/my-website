<template>
  <div class="mapbox-maritime-map">
    <div ref="mapContainer" class="map-container"></div>

    <div class="control-panel">
      <h3>海事地图控制台</h3>
      
      <div class="control-section">
        <h4>地图控制</h4>
        <button @click="toggleMapType">
          地图类型: {{ currentMapType === 'standard' ? '标准' : '卫星' }}
        </button>
        <button @click="toggleWeather">
          天气显示: {{ weatherVisible ? "开" : "关" }}
        </button>
        <button @click="centerOnShanghaiNingboRoute" class="focus-route-btn">
          聚焦上海-宁波航线
        </button>
        <div class="zoom-control">
          <label>缩放级别: {{ zoomLevel.toFixed(1) }}</label>
          <input
            type="range"
            min="3"
            max="18"
            step="0.5"
            v-model="zoomLevel"
            @input="updateZoom"
          />
        </div>
      </div>
      
      <div class="control-section">
        <h4>船舶控制</h4>
        <button @click="toggleShips">
          船舶显示: {{ shipsVisible ? "开" : "关" }}
        </button>
        <button @click="toggleTrackHistory">
          航迹显示: {{ showTrackHistory ? "开" : "关" }}
        </button>
        <button @click="togglePlannedRoute">
          计划航线: {{ showPlannedRoute ? "开" : "关" }}
        </button>
        
        <!-- 船舶类型图例 -->
        <div class="ship-legend">
          <h5>船舶类型图例</h5>
          <div class="legend-item">
            <div class="legend-icon" style="color: #3498db;">▲</div>
            <div class="legend-text">集装箱船</div>
          </div>
          <div class="legend-item">
            <div class="legend-icon" style="color: #e74c3c;">◆</div>
            <div class="legend-text">油轮</div>
          </div>
          <div class="legend-item">
            <div class="legend-icon" style="color: #f39c12;">■</div>
            <div class="legend-text">散货船</div>
          </div>
          <div class="legend-item">
            <div class="legend-icon" style="color: #27ae60;">●</div>
            <div class="legend-text">滚装船</div>
          </div>
          <div class="legend-item">
            <div class="legend-icon" style="color: #8e44ad;">▼</div>
            <div class="legend-text">渔船</div>
          </div>
        </div>
      </div>
      
      <div class="control-section">
        <h4>模拟控制</h4>
        <button @click="startSimulation" :disabled="simulationActive">
          开始模拟航行
        </button>
        <button @click="stopSimulation" :disabled="!simulationActive">
          停止模拟
        </button>
        
        <div class="speed-control">
          <label>模拟速度:</label>
          <div class="speed-buttons">
            <button 
              v-for="option in speedOptions" 
              :key="option.value"
              @click="changeSimulationSpeed(option.value)"
              :class="{ active: simulationSpeed === option.value }"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        
        <!-- 添加历史回放模式按钮 -->
        <button @click="enterHistoryPlaybackMode" class="history-mode-btn">
          Enter History Playback Mode
        </button>
      </div>
      
      <div class="coordinates">
        <label>经度: {{ center[0].toFixed(4) }}</label>
        <label>纬度: {{ center[1].toFixed(4) }}</label>
      </div>
    </div>

    <div v-if="mapError" class="error-panel">
      <div class="error-content">
        <h3>地图加载错误</h3>
        <p class="error-message">{{ mapError }}</p>

        <!-- 关于Leaflet地图加载的问�?-->
        <div>
          <p class="error-tip">解决方案</p>
          <ol>
            <li>检查网络连接，确保能够访问 unpkg.com 获取Leaflet</li>
            <li>如果网络问题导致无法加载Leaflet，您可以下载Leaflet并本地引</li>
            <li>如果您在中国大陆，可以考虑使用国内CDN https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.js</li>
          </ol>
          <p class="error-tip">
            优势提示:
            <ul>
              <li>�?Leaflet + OpenStreetMap 无需API密钥</li>
              <li>�?不依赖第三方Cookie，避免Chrome浏览器限</li>
              <li>�?开源、轻量，加载速度</li>
            </ul>
          </p>
        </div>

        <button @click="retryMapLoad" class="retry-button">重试加载</button>
        <button @click="checkEnvironment" class="check-button">环境检</button>
      </div>
    </div>

    <div class="info-panel" v-if="selectedShip">
      <div class="info-content">
        <div class="info-header">
          <h3>船舶详细信息</h3>
          <div class="ship-name">{{ selectedShip.name }} <span>({{ selectedShip.nameEn }})</span></div>
          <div class="ship-type-badge" :class="'ship-type-'+selectedShip.type">{{ selectedShip.type }}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-card basic-info">
            <div class="card-header">
              <h4>基本信息</h4>
              <div class="card-icon">📋</div>
            </div>
            <div class="card-content">
              <div class="info-row">
                <span class="info-label">IMO:</span>
                <span class="info-value">{{ selectedShip.imo }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">MMSI:</span>
                <span class="info-value">{{ selectedShip.mmsi }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">CallSign:</span>
                <span class="info-value">{{ selectedShip.callsign }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">状态:</span>
                <span class="info-value status-badge" :class="'status-'+selectedShip.status">{{ selectedShip.status }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">船旗:</span>
                <span class="info-value">{{ selectedShip.flag }}</span>
              </div>
            </div>
          </div>
          
          <div class="info-card navigation-info">
            <div class="card-header">
              <h4>航行信息</h4>
              <div class="card-icon">🧭</div>
            </div>
            <div class="card-content">
              <div class="coord-display">
                <div class="coord-item">
                  <span class="coord-label">经度:</span>
                  <span class="coord-value">{{ selectedShip.position[0].toFixed(4) }}</span>
                </div>
                <div class="coord-item">
                  <span class="coord-label">纬度:</span>
                  <span class="coord-value">{{ selectedShip.position[1].toFixed(4) }}</span>
                </div>
              </div>
              
              <div class="speed-heading-display">
                <div class="nav-item">
                  <span class="nav-label">SOG:</span>
                  <span class="nav-value">{{ selectedShip.sog }}</span>
                </div>
                <div class="nav-item">
                  <span class="nav-label">COG:</span>
                  <span class="nav-value">{{ selectedShip.cog }}</span>
                </div>
                
                <div class="compass-wrap">
                  <div class="compass" :style="{ transform: `rotate(${selectedShip.heading}deg)` }">
                    <div class="compass-arrow"></div>
                  </div>
                  <div class="heading-value">{{ selectedShip.heading.toFixed(1) }}°</div>
                </div>
              </div>
              
              <div class="info-row">
                <span class="info-label">速度:</span>
                <span class="info-value">{{ selectedShip.speed.toFixed(1) }} </span>
              </div>
              <div class="info-row">
                <span class="info-label">目的地:</span>
                <span class="info-value destination">{{ selectedShip.destination }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">预计到达:</span>
                <span class="info-value">{{ selectedShip.eta }}</span>
              </div>
            </div>
          </div>
          
          <div class="info-card vessel-info">
            <div class="card-header">
              <h4>船舶规格</h4>
              <div class="card-icon"></div>
            </div>
            <div class="card-content">
              <div class="ship-dimensions">
                <div class="dimension-item">
                  <span class="dimension-label">长度:</span>
                  <span class="dimension-value">{{ selectedShip.length }}</span>
                </div>
                <div class="dimension-item">
                  <span class="dimension-label">宽度:</span>
                  <span class="dimension-value">{{ selectedShip.width }}</span>
                </div>
                <div class="dimension-item">
                  <span class="dimension-label">吃水:</span>
                  <span class="dimension-value">{{ selectedShip.draft }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <span class="info-label">载重量:</span>
                <span class="info-value">{{ selectedShip.capacity }}</span>
              </div>
              
              <div class="draft-display">
                <div class="draft-item">
                  <span class="draft-label">船首吃水:</span>
                  <span class="draft-value">{{ selectedShip.fore_draft }}</span>
                </div>
                <div class="draft-item">
                  <span class="draft-label">船尾吃水:</span>
                  <span class="draft-value">{{ selectedShip.aft_draft }}</span>
                </div>
                <div class="ship-profile">
                  <div class="ship-hull"></div>
                  <div class="water-level"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="info-card status-info">
            <div class="card-header">
              <h4>运行状态</h4>
              <div class="card-icon">📊</div>
            </div>
            <div class="card-content">
              <div class="gauge-container">
                <div class="gauge fuel-gauge">
                  <div class="gauge-header">
                    <div class="gauge-label">燃油剩余</div>
                    <div class="gauge-value" :class="getFuelClass(selectedShip.fuelRemaining)">
                      {{ selectedShip.fuelRemaining.toFixed(1) }}%
                    </div>
                  </div>
                  <div class="gauge-bar">
                    <div class="gauge-fill" :style="{ width: selectedShip.fuelRemaining + '%', 
                            background: getFuelGradient(selectedShip.fuelRemaining) }"></div>
                  </div>
                </div>
                
                <div class="gauge cargo-gauge">
                  <div class="gauge-header">
                    <div class="gauge-label">载货</div>
                    <div class="gauge-value">{{ selectedShip.cargoLoad }}%</div>
                  </div>
                  <div class="gauge-bar">
                    <div class="gauge-fill" :style="{ width: selectedShip.cargoLoad + '%', 
                            background: 'linear-gradient(90deg, #2ecc71, #27ae60)' }"></div>
                  </div>
                </div>
                
                <div class="gauge route-gauge">
                  <div class="gauge-header">
                    <div class="gauge-label">航程进度</div>
                    <div class="gauge-value">{{ getRouteProgress(selectedShip).toFixed(1) }}%</div>
                  </div>
                  <div class="gauge-bar">
                    <div class="gauge-fill" :style="{ width: getRouteProgress(selectedShip) + '%', 
                            background: 'linear-gradient(90deg, #3498db, #2980b9)' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="info-actions">
          <button class="action-btn center-btn" @click="centerOnShip(selectedShip)">
            <span class="btn-icon">🔍</span> 居中显示
          </button>
          <button class="action-btn close-btn" @click="closeInfoPanel">
            <span class="btn-icon"></span> 关闭
          </button>
        </div>
      </div>
    </div>

    <div v-if="showEnvironmentInfo" class="env-panel">
      <div class="env-content">
        <h3>环境信息</h3>
        <p>
          <strong>Mapbox令牌状态：</strong>
          {{ mapboxToken ? "已设" : "未设" }}
        </p>
        <p>
          <strong>令牌值：</strong> <code>{{ maskToken(mapboxToken) }}</code>
        </p>
        <p v-if="hasQuotesInToken" class="warning-text">
          ⚠️ 检测到令牌包含引号，这可能导致认证失败
        </p>
        <p><strong>浏览器：</strong> {{ getBrowserInfo() }}</p>
        <p>
          <strong>Cookie设置</strong>
          {{ areCookiesEnabled() ? "已启" : "已禁用或部分禁用" }}
        </p>
        <button @click="closeEnvironmentPanel">关闭</button>
      </div>
    </div>

    <!-- 添加历史回放日期选择浮动面板 -->
    <div v-if="historyPlaybackMode" class="history-playback-panel">
      <div class="history-panel-content">
        <h3>History Playback</h3>
        
        <div class="date-range-selector">
          <div class="date-input">
            <label>Start Time:</label>
            <input type="datetime-local" v-model="historyTimeRange.start" />
          </div>
          <div class="date-input">
            <label>End Time:</label>
            <input type="datetime-local" v-model="historyTimeRange.end" />
          </div>
          <button @click="applyTimeFilter" class="primary-button">Apply Filter</button>
        </div>
        
        <div class="playback-controls">
          <button @click="startHistoryPlayback" :disabled="isHistoryPlaying" class="play-button">
            <span class="control-icon">&#9658;</span> Play
          </button>
          <button @click="pauseHistoryPlayback" :disabled="!isHistoryPlaying" class="pause-button">
            <span class="control-icon">&#10074;&#10074;</span> Pause
          </button>
          <button @click="stopHistoryPlayback" :disabled="!historyPlaybackActive" class="stop-button">
            <span class="control-icon">&#9724;</span> Stop
          </button>
        </div>
        
        <div class="playback-progress">
          <div class="time-display">{{ formatPlaybackTime(historyPlaybackCurrentTime) }}</div>
          <input 
            type="range" 
            min="0" 
            :max="historyPlaybackTotalSteps" 
            v-model="historyPlaybackCurrentStep"
            @input="seekHistoryPlayback"
            class="time-slider"
          />
        </div>
        
        <button @click="exitHistoryPlayback" class="exit-button">
          Back to Real-time Mode
        </button>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'MapboxMaritimeMap',
  data() {
    return {
      map: null,
      mapLoaded: false,
      mapError: null,
      showEnvironmentInfo: false,
      // 尝试从环境变量获取token，如果不存在则使用默认�?
      mapboxToken: "",
      center: [121.52, 30.54], // 修改初始中心点为上海港和宁波舟山港之�?
      zoomLevel: 9, // 调整初始缩放级别以更好地查看航线
      currentMapType: 'standard', // 默认标准地图
      weatherVisible: true,
      shipsVisible: true,
      simulationActive: false,
      simulationInterval: null,
      simulationSpeed: 1, // 模拟速度倍数
      ships: [
        { 
          id: 'ship1', 
          name: '海洋明珠号', 
          position: [120.15, 30.26], 
          speed: 15, 
          heading: 45,
          routeIndex: 0,
          marker: null,
          type: '集装箱船',
          length: 300,
          width: 40,
          draft: 14.5,
          capacity: '8000 TEU',
          status: '正常航行',
          destination: '上海港',
          eta: '2023-12-28 08:00',
          // 添加航行轨迹记录
          trackHistory: [[120.15, 30.26]],
          // 模拟数据 - 剩余燃油
          fuelRemaining: 85,
          // 模拟数据 - 当前载货量
          cargoLoad: 76,
          // 船舶识别信息
          mmsi: 10086,
          imo: '1020980',
          callsign: '1020980',
          // 更多详细信息
          nameEn: 'Ocean Pearl',
          flag: 'CN',
          cog: 45, // Course Over Ground
          sog: 'NaNkn', // Speed Over Ground
          fore_draft: 13.2,
          aft_draft: 14.8
        },
        { 
          id: 'ship2', 
          name: '远洋探索号', 
          position: [121.0, 31.0], 
          speed: 12, 
          heading: 135,
          routeIndex: 0,
          marker: null,
          type: '散货船',
          length: 250,
          width: 32,
          draft: 12.8,
          capacity: '85000 DWT',
          status: '正常航行',
          destination: '宁波舟山港',
          eta: '2023-12-25 14:30',
          // 添加航行轨迹记录
          trackHistory: [[121.0, 31.0]],
          // 模拟数据 - 剩余燃油
          fuelRemaining: 72,
          // 模拟数据 - 当前载货量
          cargoLoad: 90,
          // 船舶识别信息
          mmsi: 10087,
          imo: '1020981',
          callsign: '1020981',
          // 更多详细信息
          nameEn: 'Ocean Explorer',
          flag: 'CN',
          cog: 135, // Course Over Ground
          sog: '12kn', // Speed Over Ground
          fore_draft: 11.8,
          aft_draft: 12.5
        },
        { 
          id: 'ship3', 
          name: '东方之星', 
          position: [122.05, 32.05], 
          speed: 14, 
          heading: 225,
          routeIndex: 0,
          marker: null,
          type: '油轮',
          length: 280,
          width: 38,
          draft: 13.5,
          capacity: '120000 DWT',
          status: '正常航行',
          destination: '洋山港',
          eta: '2023-12-30 18:45',
          // 添加航行轨迹记录
          trackHistory: [[122.05, 32.05]],
          // 模拟数据 - 剩余燃油
          fuelRemaining: 65,
          // 模拟数据 - 当前载货量
          cargoLoad: 82,
          // 船舶识别信息
          mmsi: 10088,
          imo: '1020982',
          callsign: '1020982',
          // 更多详细信息
          nameEn: 'Eastern Star',
          flag: 'CN',
          cog: 225, // Course Over Ground
          sog: '14kn', // Speed Over Ground
          fore_draft: 13.2,
          aft_draft: 13.8
        },
        { 
          id: 'ship4', 
          name: '金海捷运', 
          position: [121.5, 31.5], 
          speed: 16, 
          heading: 180,
          routeIndex: 0,
          marker: null,
          type: '滚装船',
          length: 210,
          width: 30,
          draft: 10.5,
          capacity: '2500 LUM',
          status: '正常航行',
          destination: '上海港',
          eta: '2023-12-27 10:15',
          // 添加航行轨迹记录
          trackHistory: [[121.5, 31.5]],
          // 模拟数据 - 剩余燃油
          fuelRemaining: 78,
          // 模拟数据 - 当前载货量
          cargoLoad: 68,
          // 船舶识别信息
          mmsi: 10089,
          imo: '1020983',
          callsign: '1020983',
          // 更多详细信息
          nameEn: 'Golden Express',
          flag: 'CN',
          cog: 180, // Course Over Ground
          sog: '16kn', // Speed Over Ground
          fore_draft: 10.2,
          aft_draft: 10.8
        },
        { 
          id: 'ship5', 
          name: '蓝鲸号', 
          position: [121.8, 30.8], 
          speed: 9, 
          heading: 90,
          routeIndex: 0,
          marker: null,
          type: '渔船',
          length: 65,
          width: 12,
          draft: 5.2,
          capacity: '150 吨',
          status: '正常航行',
          destination: '舟山港',
          eta: '2023-12-26 16:30',
          // 添加航行轨迹记录
          trackHistory: [[121.8, 30.8]],
          // 模拟数据 - 剩余燃油
          fuelRemaining: 45,
          // 模拟数据 - 当前载货量
          cargoLoad: 60,
          // 船舶识别信息
          mmsi: 10090,
          imo: '1020984',
          callsign: '1020984',
          // 更多详细信息
          nameEn: 'Blue Whale',
          flag: 'CN',
          cog: 90, // Course Over Ground
          sog: '9kn', // Speed Over Ground
          fore_draft: 5.0,
          aft_draft: 5.4
        },
        { 
          id: 'ship6', 
          name: '沪甬之星', 
          position: [121.47, 31.23], 
          speed: 18, 
          heading: 150,
          routeIndex: 0,
          marker: null,
          type: '集装箱船',
          length: 320,
          width: 43,
          draft: 15.2,
          capacity: '9500 TEU',
          status: '准备启航',
          destination: '宁波舟山港',
          eta: '2023-12-29 16:30',
          // 添加航行轨迹记录
          trackHistory: [[121.47, 31.23]],
          // 模拟数据 - 剩余燃油
          fuelRemaining: 98,
          // 模拟数据 - 当前载货量
          cargoLoad: 88,
          // 船舶识别信息
          mmsi: 10095,
          imo: '1020990',
          callsign: 'COSCO6688',
          // 更多详细信息
          nameEn: 'Shanghai-Ningbo Star',
          flag: 'CN',
          cog: 150, // Course Over Ground
          sog: '18kn', // Speed Over Ground
          fore_draft: 14.8,
          aft_draft: 15.6
        },
        { 
          id: 'ship7', 
          name: '东海快航', 
          position: [121.56, 29.86], 
          speed: 20, 
          heading: 330,
          routeIndex: 0,
          marker: null,
          type: '滚装船',
          length: 200,
          width: 28,
          draft: 9.8,
          capacity: '2300 LUM',
          status: '正常航行',
          destination: '上海港',
          eta: '2023-12-29 11:30',
          // 添加航行轨迹记录
          trackHistory: [[121.56, 29.86]],
          // 模拟数据 - 剩余燃油
          fuelRemaining: 85,
          // 模拟数据 - 当前载货量
          cargoLoad: 75,
          // 船舶识别信息
          mmsi: 10096,
          imo: '1020991',
          callsign: 'CNEXP5566',
          // 更多详细信息
          nameEn: 'East Sea Express',
          flag: 'CN',
          cog: 330, // Course Over Ground
          sog: '20kn', // Speed Over Ground
          fore_draft: 9.5,
          aft_draft: 10.1
        },
        // 新增一艘船在上海港准备前往宁波舟山�?
        { 
          id: 'ship8', 
          name: '沪甬明珠', 
          position: [121.47, 31.23], 
          speed: 0, 
          heading: 150,
          routeIndex: 0,
          marker: null,
          type: '集装箱船',
          length: 350,
          width: 45,
          draft: 15.6,
          capacity: '10200 TEU',
          status: '准备启航',
          destination: '宁波舟山港',
          eta: '2023-12-30 18:30',
          trackHistory: [[121.47, 31.23]],
          fuelRemaining: 100,
          cargoLoad: 92,
          mmsi: 10097,
          imo: '1020995',
          callsign: 'COSCO9977',
          nameEn: 'Shanghai-Ningbo Pearl',
          flag: 'CN',
          cog: 150,
          sog: '0kn',
          fore_draft: 15.2,
          aft_draft: 16.0
        }
      ],
      selectedShip: null,
      // 更丰富的航线数据
      routes: {
        ship1: [
          [120.15, 30.26],
          [120.35, 30.36],
          [120.55, 30.6],
          [120.8, 30.8],
          [121.0, 31.0],
          [121.2, 31.1],
          [121.35, 31.16],
          [121.47, 31.23]
        ],
        ship2: [
          [121.0, 31.0],
          [120.9, 30.9],
          [120.8, 30.75],
          [120.7, 30.6],
          [120.5, 30.4],
          [120.3, 30.3],
          [120.15, 30.26]
        ],
        ship3: [
          [122.05, 32.05],
          [121.95, 31.9],
          [121.85, 31.7],
          [121.75, 31.5],
          [121.65, 31.35],
          [121.56, 31.2],
          [121.47, 31.23]
        ],
        ship4: [
          [121.5, 31.5],
          [121.4, 31.4],
          [121.3, 31.3],
          [121.2, 31.2],
          [121.1, 31.1],
          [121.0, 31.0],
          [120.8, 30.8],
          [120.6, 30.6],
          [120.4, 30.4],
          [120.2, 30.3],
          [120.15, 30.26]
        ],
        ship5: [
          [121.8, 30.8],
          [121.7, 30.7],
          [121.6, 30.6],
          [121.5, 30.5],
          [121.4, 30.3],
          [121.3, 30.1],
          [121.2, 29.9],
          [121.1, 29.8],
          [121.0, 29.7],
          [120.9, 29.8],
          [120.8, 29.9]
        ],
        ship6: [
          [121.47, 31.23], // 上海�?
          [121.48, 31.20], // 黄浦江出海口
          [121.50, 31.15], // 沿黄浦江航道
          [121.53, 31.10], // 长江口段
          [121.56, 31.05], // 长江航道
          [121.60, 30.95], // 长江主航�?
          [121.68, 30.85], // 长江口出海口
          [121.76, 30.78], // 避开长江口沙洲区
          [121.85, 30.70], // 进入东海水域
          [121.92, 30.60], // 沿东海深水航�?
          [121.88, 30.45], // 避开东海渔场
          [121.82, 30.35], // 避开舟山群岛北部
          [121.75, 30.22], // 舟山水域
          [121.67, 30.10], // 舟山群岛水道
          [121.61, 29.95], // 靠近宁波港区
          [121.56, 29.86]  // 宁波舟山�?
        ],
        ship7: [
          [121.56, 29.86],  // 宁波舟山�?
          [121.61, 29.95],  // 离开港口
          [121.67, 30.10],  // 舟山群岛水道
          [121.75, 30.22],  // 舟山水域
          [121.82, 30.35],  // 避开舟山群岛北部
          [121.88, 30.45],  // 避开东海渔场
          [121.92, 30.60],  // 沿东海深水航�?
          [121.85, 30.70],  // 进入东海水域
          [121.76, 30.78],  // 避开长江口沙洲区
          [121.68, 30.85],  // 长江口出海口
          [121.60, 30.95],  // 长江主航�?
          [121.56, 31.05],  // 长江航道
          [121.53, 31.10],  // 长江口段
          [121.50, 31.15],  // 沿黄浦江航道
          [121.48, 31.20],  // 黄浦江出海口
          [121.47, 31.23]   // 上海�?
        ],
        // 新增的上海港到宁波舟山港的航线，遵循航海规则
        ship8: [
          [121.47, 31.23], // 上海�?
          [121.49, 31.19], // 黄浦江航�?
          [121.52, 31.14], // 黄浦江出海口
          [121.55, 31.08], // 长江口内航道
          [121.59, 31.02], // 长江口航�?
          [121.65, 30.95], // 长江航道
          [121.73, 30.87], // 避开南槽浅滩
          [121.82, 30.78], // 避开九段�?
          [121.90, 30.68], // 进入东海深水�?
          [121.94, 30.58], // 东海主航�?
          [121.90, 30.46], // 东海航道转向
          [121.84, 30.34], // 绕行舟山北部岛屿
          [121.77, 30.24], // 避开舟山渔场
          [121.69, 30.12], // 舟山航道
          [121.62, 30.00], // 靠近港口
          [121.58, 29.92], // 港口引航�?
          [121.56, 29.86]  // 宁波舟山�?
        ]
      },
      // 添加航线颜色
      routeColors: {
        ship1: '#00FF00', // 绿色
        ship2: '#0088FF', // 蓝色
        ship3: '#FF8800', // 橙色
        ship4: '#27ae60', // 绿色
        ship5: '#8e44ad',  // 紫色
        ship6: '#FF3300', // 上海到宁波舟山航�?- 亮红�?
        ship7: '#27ae60',  // 绿色
        ship8: '#FF3300'   // 新增的宁波舟山到上海航线 - 亮红�?
      },
      weatherArea: null,
      routePolylines: {},
      shipTracks: {},  // 存储船舶实际航迹
      ports: [
        { name: '青岛港', position: [120.316, 36.0839], country: '中国', info: '中国重要港口' },
        { name: '大连港', position: [121.6147, 38.9673], country: '中国', info: '东北地区重要港口' },
        // 添加上海港和宁波-舟山港
        { name: '上海港', position: [121.47, 31.23], country: '中国', info: '全球最大集装箱港口之一，中国第一大港' },
        { name: '宁波-舟山港', position: [121.56, 29.86], country: '中国', info: '全球最大的货物吞吐量港口，宁波港和舟山港合并而成' }
      ],
      weatherMarker: null,
      // 添加历史路径是否显示的开�?
      showTrackHistory: true,
      // 添加示范路径是否显示的开�?
      showPlannedRoute: true,
      // 添加模拟速度选项
      speedOptions: [
        { label: '0.5x', value: 0.5 },
        { label: '1x', value: 1 },
        { label: '2x', value: 2 },
        { label: '5x', value: 5 }
      ],
      // 港口数据扩展
      portData: [
        { name: '上海港', position: [31.23, 121.47], type: '集装箱港口', capacity: '4350万TEU/年', berths: 46 },
        { name: '宁波舟山港', position: [29.86, 121.56], type: '综合港口', capacity: '3100万TEU/年', berths: 39 },
        { name: '洋山港', position: [30.62, 122.09], type: '深水港', capacity: '2500万TEU/年', berths: 32 }
      ],
      // 新增历史回放相关状态
      historyPlaybackMode: false,
      historyTimeRange: {
        start: '',
        end: ''
      },
      historyPlaybackCurrentTime: null,
      historyPlaybackTotalSteps: 100,
      historyPlaybackCurrentStep: 0,
      historyPlaybackActive: false,
      isHistoryPlaying: false,
      historyPlaybackInterval: null,
      filteredHistory: {}
    };
  },
  computed: {
    hasQuotesInToken() {
      return (
        this.mapboxToken &&
        (this.mapboxToken.includes('"') || this.mapboxToken.includes("'"))
      );
    },
  },
  mounted() {
    // 修改为加载Leaflet地图
    this.loadLeafletMap();
    
    // 监听窗口大小变化以调整地图大�?
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    // 清理资源
    this.cleanupResources();
  },
  methods: {
    loadLeafletMap() {
      // 动态加载Leaflet脚本和样�?
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkElement);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        this.initMap();
      };
      script.onerror = (error) => {
        console.error('Leaflet地图加载失败:', error);
        this.mapError = 'Leaflet地图API加载失败，请检查网络连接';
      };
      document.head.appendChild(script);
    },
    
    initMap() {
      try {
        // 检查L(Leaflet)是否可用
        if (!window.L) {
          throw new Error('Leaflet地图API未正确加载，可能是网络问题');
        }
        
        // 创建Leaflet地图实例
        this.map = L.map(this.$refs.mapContainer).setView(this.center, this.zoomLevel);
        
        // 添加OpenStreetMap图层（免费，无需密钥�?
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        // 地图加载完成
        this.mapLoaded = true;
        
        // 添加港口标记
        this.addPorts();
        
        // 添加天气区域
        this.addWeatherLayer();
        
        // 添加航线
        this.addRoutesLayer();
        
        // 添加船舶
        this.addShips();
        
        // 监听地图事件
        this.map.on('moveend', this.updateCenter);
        this.map.on('zoomend', this.updateZoomLevel);
      } catch (error) {
        console.error('地图初始化失�?', error);
        this.mapError = '地图初始化失�? ' + error.message;
      }
    },
    
    addPorts() {
      if (!this.mapLoaded || !window.L) return;
      
      // 使用扩展的港口数�?
      this.portData.forEach(port => {
        // 使用自定义图�?
        const portIcon = L.divIcon({
          html: `<div class="port-icon">⚓</div>`,
          className: 'port-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        
        const marker = L.marker(port.position, {
          icon: portIcon,
          title: port.name
        }).addTo(this.map);
        
        // 添加更丰富的弹出信息
        const popupContent = `
          <div class="port-popup">
            <h4>${port.name}</h4>
            <p><strong>类型:</strong> ${port.type}</p>
            <p><strong>年吞吐量:</strong> ${port.capacity}</p>
            <p><strong>泊位数:</strong> ${port.berths}</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        this.ports.push(marker);
      });
    },
    
    addWeatherLayer() {
      if (!this.mapLoaded || !window.L) return;
      
      // 定义天气区域的坐�?(注意顺序：[lat, lng])
      const weatherCoords = [
        [29.5, 119.5],
        [29.5, 120.5],
        [30.5, 120.5],
        [30.5, 119.5]
      ];
      
      // 创建多边�?
      this.weatherArea = L.polygon(weatherCoords, {
        color: '#FF0000',
        fillColor: '#FF0000',
        fillOpacity: 0.3
      }).addTo(this.map);
      
      // 创建标记显示天气信息
      this.weatherMarker = L.marker([30, 120]).addTo(this.map);
      this.weatherMarker.bindPopup('台风预警<br>风力 25级<br>浪高: 3.5米').openPopup();
    },
    
    addRoutesLayer() {
      if (!this.mapLoaded || !window.L) return;
      
      // 添加船舶航线
      Object.keys(this.routes).forEach(shipId => {
        // 转换坐标顺序为Leaflet格式
        const routeLatLng = this.routes[shipId].map(coord => [coord[1], coord[0]]);
        
        // 使用船舶特定的颜�?
        const routeColor = this.routeColors[shipId] || '#00FF00';
        
        // 判断是否为上海到宁波舟山航线，给予特殊样�?
        const isShaNing = shipId === 'ship6' || shipId === 'ship8';
        
        // 创建折线 - 为上�?宁波航线使用粗线和不同的虚线样式
        const polyline = L.polyline(routeLatLng, {
          color: routeColor,
          weight: isShaNing ? 6 : 2, // 上海-宁波航线更粗
          dashArray: isShaNing ? '15, 10' : '5, 5', // 上海-宁波航线使用不同的蚂蚁线效果
          opacity: isShaNing ? 0.9 : 0.7 // 上海-宁波航线更明�?
        }).addTo(this.map);
        
        // 保存航线引用
        this.routePolylines[shipId] = polyline;
        
        // 创建轨迹�?- 用于记录实际航行路径
        const trackLine = L.polyline([], {
          color: routeColor,
          weight: isShaNing ? 5 : 3, // 上海-宁波航线更粗
          opacity: isShaNing ? 1.0 : 0.9 // 上海-宁波航线更明�?
        }).addTo(this.map);
        
        this.shipTracks[shipId] = trackLine;
      });
      
      // 如果上海-宁波航线存在，让地图显示适应这条航线
      if (this.routePolylines['ship6']) {
        // 将视图中心设置到上海-宁波航线中间
        const route = this.routes['ship6'];
        const midPointIndex = Math.floor(route.length / 2);
        const midPoint = route[midPointIndex];
        
        // 如果有map对象，修改视�?
        if (this.map) {
          // 设置上海-宁波航线的边界为地图显示区域
          const bounds = this.routePolylines['ship6'].getBounds();
          this.map.fitBounds(bounds, {
            padding: [50, 50], // 添加一些内边距
            maxZoom: 10        // 限制最大缩放级�?
          });
        }
      }
    },
    
    addShips() {
      if (!this.mapLoaded || !window.L) return;
      
      // 添加船舶图标
      this.ships.forEach(ship => {
        // 基于船舶类型选择不同的图标和颜色
        let shipSymbol = '▲'; // 默认三角形为集装箱船
        let iconColor = this.routeColors[ship.id] || '#2980b9';
        let iconScale = 1.2; // 默认缩放
        
        // 根据船舶类型确定图标和颜色
        if (ship.type === '集装箱船') {
          shipSymbol = '▲';
          iconColor = '#3498db'; // 蓝色
          iconScale = 1.3;
        } else if (ship.type === '油轮') {
          shipSymbol = '◆';
          iconColor = '#e74c3c'; // 红色
          iconScale = 1.4;
        } else if (ship.type === '散货船') {
          shipSymbol = '■';
          iconColor = '#f39c12'; // 黄色
          iconScale = 1.3;
        } else if (ship.type === '滚装船') {
          shipSymbol = '●';
          iconColor = '#27ae60'; // 绿色
          iconScale = 1.3;
        } else if (ship.type === '渔船') {
          shipSymbol = '▼';
          iconColor = '#8e44ad'; // 紫色
          iconScale = 1.0; // 小一些，因为渔船通常较小
        }
        
        // 创建更精美的HTML船舶图标
        const shipHtml = `
          <div class="ship-icon-wrapper ship-wrapper-${ship.type}" style="transform: rotate(${ship.heading}deg); transform-origin: center center;">
            <div class="ship-icon ship-${ship.type}" style="color: ${iconColor}; transform: scale(${iconScale});">${shipSymbol}</div>
            <div class="ship-shadow"></div>
            <div class="ship-label">${ship.name}</div>
          </div>
        `;
        
        // Leaflet使用自定义图标
        const shipIcon = L.divIcon({
          html: shipHtml,
          className: 'ship-marker',
          iconSize: [50, 50],     // 增大图标尺寸 
          iconAnchor: [25, 25]    // 锚点居中
        });
        
        // 坐标顺序转换为[lat, lng]
        const position = [ship.position[1], ship.position[0]];
        
        const marker = L.marker(position, {
          icon: shipIcon,
          title: ship.name
        }).addTo(this.map);
        
        // 绑定点击事件
        marker.on('click', () => {
          this.showShipInfo(ship.id);
        });
        
        // 保存标记引用
        ship.marker = marker;
      });
    },
    
    toggleMapType() {
      if (!this.map || !window.L) return;
      
      if (this.currentMapType === 'standard') {
        // 切换到卫星图 (使用Esri卫星图层，也是免费的)
        this.map.eachLayer(layer => {
          if (layer instanceof L.TileLayer) {
            this.map.removeLayer(layer);
          }
        });
        
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(this.map);
        
        this.currentMapType = 'satellite';
      } else {
        // 切换到标准图
        this.map.eachLayer(layer => {
          if (layer instanceof L.TileLayer) {
            this.map.removeLayer(layer);
          }
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        this.currentMapType = 'standard';
      }
    },
    
    toggleWeather() {
      this.weatherVisible = !this.weatherVisible;
      
      if (this.weatherArea) {
        if (this.weatherVisible) {
          this.weatherArea.addTo(this.map);
          this.weatherMarker.addTo(this.map);
        } else {
          this.map.removeLayer(this.weatherArea);
          this.map.removeLayer(this.weatherMarker);
        }
      }
    },
    
    toggleShips() {
      this.shipsVisible = !this.shipsVisible;
      
      // 显示/隐藏所有船�?
      this.ships.forEach(ship => {
        if (ship.marker) {
          if (this.shipsVisible) {
            ship.marker.addTo(this.map);
          } else {
            this.map.removeLayer(ship.marker);
          }
        }
      });
      
      // 显示/隐藏所有航�?
      Object.values(this.routePolylines).forEach(polyline => {
        if (this.shipsVisible) {
          polyline.addTo(this.map);
        } else {
          this.map.removeLayer(polyline);
        }
      });
    },
    
    updateZoom() {
      if (this.map) {
        this.map.setZoom(parseFloat(this.zoomLevel));
      }
    },
    
    updateZoomLevel() {
      if (this.map) {
        this.zoomLevel = this.map.getZoom();
      }
    },
    
    updateCenter() {
      if (this.map) {
        const center = this.map.getCenter();
        this.center = [center.lng, center.lat];
      }
    },
    
    handleResize() {
      if (this.map) {
        this.map.setZoom(parseFloat(this.zoomLevel));
      }
    },
    
    showShipInfo(shipId) {
      const ship = this.ships.find(s => s.id === shipId);
      if (ship) {
        this.selectedShip = ship;
      }
    },
    
    closeInfoPanel() {
      this.selectedShip = null;
    },
    
    startSimulation() {
      if (this.simulationActive) return;
      
      this.simulationActive = true;
      this.simulationInterval = setInterval(() => {
        // 更新每艘船的位置
        this.ships.forEach(ship => {
          const route = this.routes[ship.id];
          if (route && route.length > 0) {
            // 获取下一个位置点
            if (ship.routeIndex < route.length - 1) {
              // 根据模拟速度计算新的位置
              ship.routeIndex += 0.1 * this.simulationSpeed; // 细化移动，使动画更流�?
              
              // 确保routeIndex不超过数组上�?
              if (ship.routeIndex >= route.length - 1) {
                ship.routeIndex = route.length - 1;
              }
              
              // 计算当前路段中的精确位置（线性插值）
              const currentIndex = Math.floor(ship.routeIndex);
              const nextIndex = Math.min(currentIndex + 1, route.length - 1);
              const fraction = ship.routeIndex - currentIndex;
              
              const currentPos = route[currentIndex];
              const nextPos = route[nextIndex];
              
              // 线性插值计算当前位�?
              const interpolatedLng = currentPos[0] + (nextPos[0] - currentPos[0]) * fraction;
              const interpolatedLat = currentPos[1] + (nextPos[1] - currentPos[1]) * fraction;
              ship.position = [interpolatedLng, interpolatedLat];
              
              // 更新航向
              ship.heading = this.calculateHeading(currentPos, nextPos);
              
              // 更新速度（模拟变化）
              ship.speed = Math.max(10, Math.min(18, ship.speed + (Math.random() - 0.5)));
              
              // 更新船舶状�?
              if (ship.routeIndex > route.length * 0.9) {
                ship.status = '即将抵达';
              } else if (ship.routeIndex > route.length * 0.5) {
                ship.status = '正常航行';
              } else {
                ship.status = '起航';
              }
              
              // 更新ETA（模拟变化）
              const etaDate = new Date();
              const hoursToAdd = (route.length - ship.routeIndex) / (ship.speed * 0.1);
              etaDate.setHours(etaDate.getHours() + hoursToAdd);
              ship.eta = etaDate.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              // 减少燃油剩余�?
              ship.fuelRemaining = Math.max(0, ship.fuelRemaining - 0.05 * this.simulationSpeed);
              
              // 记录航迹
              ship.trackHistory.push([...ship.position]);
              
              // 更新轨迹�?
              if (this.showTrackHistory && this.shipTracks[ship.id]) {
                const trackLatLng = ship.trackHistory.map(coord => [coord[1], coord[0]]);
                this.shipTracks[ship.id].setLatLngs(trackLatLng);
              }
            } else {
              // 到达终点，重置到起点
              ship.routeIndex = 0;
              ship.position = route[0];
              ship.trackHistory = [route[0]];
              
              if (this.shipTracks[ship.id]) {
                this.shipTracks[ship.id].setLatLngs([]);
              }
              
              if (route.length > 1) {
                const nextPos = route[1];
                ship.heading = this.calculateHeading(route[0], nextPos);
              }
              
              // 重置燃油和货�?
              ship.fuelRemaining = 100;
              ship.cargoLoad = Math.floor(Math.random() * 30) + 70; // 70-100%
              ship.status = '重新起航';
            }
            
            // 更新船舶标记位置和角�?
            if (ship.marker) {
              // Leaflet使用setLatLng，注意坐标顺�?
              const latLng = [ship.position[1], ship.position[0]];
              ship.marker.setLatLng(latLng);
              
              // 基于船舶类型选择不同的图�?
              let shipSymbol = '▲'; // 默认
              let iconColor = this.routeColors[ship.id] || '#2980b9';
              let iconScale = 1.2; // 默认缩放
              
              // 根据船舶类型确定图标和颜�?
              if (ship.type === '集装箱船') {
                shipSymbol = '▲';
                iconColor = '#3498db'; // 蓝色
                iconScale = 1.3;
              } else if (ship.type === '油轮') {
                shipSymbol = '◆';
                iconColor = '#e74c3c'; // 红色
                iconScale = 1.4;
              } else if (ship.type === '散货船') {
                shipSymbol = '■';
                iconColor = '#f39c12'; // 黄色
                iconScale = 1.3;
              } else if (ship.type === '滚装船') {
                shipSymbol = '●';
                iconColor = '#27ae60'; // 绿色
                iconScale = 1.3;
              } else if (ship.type === '渔船') {
                shipSymbol = '▼';
                iconColor = '#8e44ad'; // 紫色
                iconScale = 1.0;
              }
              
              // 创建更精美的HTML船舶图标
              const shipHtml = `
                <div class="ship-icon-wrapper ship-wrapper-${ship.type}" style="transform: rotate(${ship.heading}deg); transform-origin: center center;">
                  <div class="ship-icon ship-${ship.type}" style="color: ${iconColor}; transform: scale(${iconScale});">${shipSymbol}</div>
                  <div class="ship-shadow"></div>
                  <div class="ship-label">${ship.name}</div>
                </div>
              `;
              
              // 更新图标
              const shipIcon = L.divIcon({
                html: shipHtml,
                className: 'ship-marker',
                iconSize: [50, 50],
                iconAnchor: [25, 25]
              });
              
              ship.marker.setIcon(shipIcon);
              
              // 如果这是当前选中的船舶，更新信息面板
              if (this.selectedShip && this.selectedShip.id === ship.id) {
                this.selectedShip = {...ship};
              }
            }
          }
        });
      }, 100); // 更频繁更新以使动画更流畅
    },
    
    stopSimulation() {
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }
      this.simulationActive = false;
    },
    
    calculateHeading(startPos, endPos) {
      // 计算两点之间的航向角�?
      const startLng = startPos[0];
      const startLat = startPos[1];
      const endLng = endPos[0];
      const endLat = endPos[1];
      
      const y = Math.sin(endLng - startLng) * Math.cos(endLat);
      const x = Math.cos(startLat) * Math.sin(endLat) -
                Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
      
      let bearing = Math.atan2(y, x) * 180 / Math.PI;
      if (bearing < 0) {
        bearing += 360;
      }
      
      return bearing;
    },
    
    retryMapLoad() {
      this.mapError = null;
      if (this.map) {
        try {
          this.map.remove();
        } catch (e) {
          console.error("清除地图失败:", e);
        }
        this.map = null;
      }
      this.loadLeafletMap();
    },
    
    cleanupResources() {
      // 清理所有定时器和事件监听器
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }
      
      // 清理地图实例
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
      
      // 移除窗口事件监听
      window.removeEventListener('resize', this.handleResize);
    },
    
    maskToken(token) {
      if (!token) return "未设置";
      const tokenStr = token.toString();
      if (tokenStr.length < 10) return tokenStr;
      // 只显示开头和结尾的部分，中间用星号代替
      return `${tokenStr.substring(0, 8)}...${tokenStr.substring(
        tokenStr.length - 8
      )}`;
    },
    
    getBrowserInfo() {
      const userAgent = navigator.userAgent;
      let browserName = "未知浏览器";

      if (
        userAgent.indexOf("Chrome") > -1 &&
        userAgent.indexOf("Edge") === -1
      ) {
        browserName = "Chrome";
      } else if (userAgent.indexOf("Firefox") > -1) {
        browserName = "Firefox";
      } else if (userAgent.indexOf("Edge") > -1) {
        browserName = "Edge";
      } else if (userAgent.indexOf("Safari") > -1) {
        browserName = "Safari";
      }

      return `${browserName} (${navigator.userAgent})`;
    },
    
    areCookiesEnabled() {
      try {
        document.cookie = "testcookie=1";
        const hasCookie = document.cookie.indexOf("testcookie=") !== -1;
        document.cookie = "testcookie=1; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        return hasCookie;
      } catch (e) {
        return false;
      }
    },
    
    checkEnvironment() {
      // 检查Leaflet地图API加载状�?
      const leafletLoaded = window.L !== undefined;
      
      this.showEnvironmentInfo = true;
      
      // 在环境信息中添加Leaflet地图状�?
      this.$nextTick(() => {
        const envContent = document.querySelector('.env-content');
        if (envContent) {
          const mapStatus = document.createElement('p');
          mapStatus.innerHTML = `<strong>Leaflet地图API状态：</strong> ${leafletLoaded ? '已加载' : '<span style="color: red">未加载</span>'}`;
          
          const openSourceInfo = document.createElement('p');
          openSourceInfo.innerHTML = '<strong>地图信息</strong> <span style="color: green">使用开源Leaflet + OpenStreetMap，无需API密钥</span>';
          
          const cookieWarning = document.createElement('p');
          cookieWarning.innerHTML = '<strong>提示</strong> <span style="color: green">OpenStreetMap不依赖第三方Cookie，避免了Chrome浏览器限制问</span>';
          
          envContent.appendChild(mapStatus);
          envContent.appendChild(openSourceInfo);
          envContent.appendChild(cookieWarning);
        }
      });
    },
    
    closeEnvironmentPanel() {
      this.showEnvironmentInfo = false;
    },
    
    toggleTrackHistory() {
      this.showTrackHistory = !this.showTrackHistory;
    },
    
    togglePlannedRoute() {
      this.showPlannedRoute = !this.showPlannedRoute;
    },
    
    changeSimulationSpeed(speed) {
      this.simulationSpeed = speed;
    },
    
    getRouteProgress(ship) {
      const route = this.routes[ship.id];
      if (!route || route.length <= 1) return 0;
      
      // 使用当前路径索引计算进度
      return (ship.routeIndex / (route.length - 1)) * 100;
    },
    
    centerOnShip(ship) {
      if (this.map && ship && ship.position) {
        // 注意坐标转换：Leaflet使用[lat, lng]格式
        const latLng = [ship.position[1], ship.position[0]];
        this.map.setView(latLng, 10); // 10是一个适合查看船舶的缩放级�?
      }
    },
    
    getFuelClass(fuelRemaining) {
      if (fuelRemaining < 30) return 'fuel-low';
      if (fuelRemaining < 60) return 'fuel-medium';
      return 'fuel-high';
    },
    
    getFuelGradient(fuelRemaining) {
      if (fuelRemaining < 30) {
        return 'linear-gradient(90deg, #e74c3c, #c0392b)';
      } else if (fuelRemaining < 60) {
        return 'linear-gradient(90deg, #f39c12, #d35400)';
      } else {
        return 'linear-gradient(90deg, #2ecc71, #27ae60)';
      }
    },
    
    // 添加新方法：聚焦到上�?宁波舟山航线
    centerOnShanghaiNingboRoute() {
      if (!this.map || !this.routePolylines['ship6']) return;
      
      // 获取上海-宁波舟山航线的边�?
      const bounds = this.routePolylines['ship6'].getBounds();
      
      // 设置地图视图以适应该边�?
      this.map.fitBounds(bounds, {
        padding: [50, 50], // 添加边距
        maxZoom: 10        // 限制最大缩放级�?
      });
      
      // 添加航海信息弹窗
      // 在路线中间点显示航线信息弹窗
      const route = this.routes['ship6'];
      const midPointIndex = Math.floor(route.length / 2);
      const midPoint = route[midPointIndex];
      
      // 创建自定义内容弹�?
      const popupContent = `
        <div class="route-info-popup">
          <h3>上海-宁波舟山航线</h3>
          <p><strong>航距:</strong> �?65海里</p>
          <p><strong>航行时间:</strong> �?-10小时(18�?</p>
          <p><strong>航线特点:</strong></p>
          <ul>
            <li>沿黄浦江、长江口主航道航</li>
            <li>避开长江口南槽浅滩和九段</li>
            <li>遵循东海航运规则，避开渔场</li>
            <li>绕行舟山群岛北部水域</li>
            <li>沿舟山航道进入宁波舟山港</li>
          </ul>
          <p><strong>注意:</strong> 受涨�?落潮、季风等影响，实际航线可能略有调</p>
        </div>
      `;
      
      // 显示弹窗
      L.popup()
        .setLatLng([midPoint[1], midPoint[0]])
        .setContent(popupContent)
        .openOn(this.map);
    },
    startHistoryPlayback() {
      this.isHistoryPlaying = true;
      this.historyPlaybackActive = true;
      
      // 获取所选时间范围
      const startTime = new Date(this.historyTimeRange.start).getTime();
      const endTime = new Date(this.historyTimeRange.end).getTime();
      const timeRange = endTime - startTime;
      
      // 清除任何现有的播放计时器
      if (this.historyPlaybackInterval) {
        clearInterval(this.historyPlaybackInterval);
      }
      
      // 开始新的播放循环
      this.historyPlaybackInterval = setInterval(() => {
        if (this.historyPlaybackCurrentStep >= this.historyPlaybackTotalSteps) {
          // 完成播放，停止
          this.pauseHistoryPlayback();
          return;
        }
        
        // 更新步数
        this.historyPlaybackCurrentStep++;
        
        // 计算当前时间点
        const progress = this.historyPlaybackCurrentStep / this.historyPlaybackTotalSteps;
        const currentTime = startTime + (timeRange * progress);
        this.historyPlaybackCurrentTime = currentTime;
        
        // 更新船舶位置和状态
        this.updateShipsAtTime(currentTime);
      }, 100); // 每100毫秒更新一次，控制播放速度
    },
    
    pauseHistoryPlayback() {
      if (this.historyPlaybackInterval) {
        clearInterval(this.historyPlaybackInterval);
        this.historyPlaybackInterval = null;
      }
      this.isHistoryPlaying = false;
    },
    
    stopHistoryPlayback() {
      this.pauseHistoryPlayback();
      this.historyPlaybackCurrentStep = 0;
      this.historyPlaybackActive = false;
      
      // 重置船舶位置
      this.resetShipsToInitialPosition();
    },
    
    // 根据时间更新船舶位置
    updateShipsAtTime(targetTime) {
      this.ships.forEach(ship => {
        if (!ship.historyData || ship.historyData.length === 0) {
          return;
        }
        
        // 找到最接近时间点的记录
        let closestRecord = null;
        let minTimeDiff = Infinity;
        
        for (const record of ship.historyData) {
          const timeDiff = Math.abs(record.timestamp - targetTime);
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestRecord = record;
          }
        }
        
        if (closestRecord) {
          // 更新船舶属性
          ship.position = [...closestRecord.position];
          ship.heading = closestRecord.heading;
          ship.speed = closestRecord.speed;
          ship.status = closestRecord.status;
          ship.fuelRemaining = closestRecord.fuelRemaining;
          ship.cargoLoad = closestRecord.cargoLoad;
          
          // 更新船舶在地图上的位置和朝向
          if (ship.marker) {
            const latLng = [ship.position[1], ship.position[0]];
            ship.marker.setLatLng(latLng);
            
            // 更新船舶图标
            const shipIcon = this.createShipIcon(ship);
            ship.marker.setIcon(shipIcon);
          }
        }
      });
      
      // 如果当前有选中的船舶，更新信息面板
      if (this.selectedShip) {
        const updatedShip = this.ships.find(s => s.id === this.selectedShip.id);
        if (updatedShip) {
          this.selectedShip = {...updatedShip};
        }
      }
    },
    
    // 重置船舶到初始位置
    resetShipsToInitialPosition() {
      this.ships.forEach(ship => {
        const route = this.routes[ship.id];
        if (route && route.length > 0) {
          // 重置到航线起点
          ship.position = [...route[0]];
          ship.routeIndex = 0;
          
          // 计算初始航向
          if (route.length > 1) {
            ship.heading = this.calculateHeading(route[0], route[1]);
          }
          
          // 重置其他属性
          ship.status = '准备启航';
          ship.fuelRemaining = 100;
          ship.cargoLoad = 70 + Math.floor(Math.random() * 30);
          
          // 更新船舶在地图上的位置
          if (ship.marker) {
            const latLng = [ship.position[1], ship.position[0]];
            ship.marker.setLatLng(latLng);
            
            // 更新船舶图标
            const shipIcon = this.createShipIcon(ship);
            ship.marker.setIcon(shipIcon);
          }
        }
      });
    },
    
    // 创建船舶图标
    createShipIcon(ship) {
      // 基于船舶类型选择不同的图标和颜色
      let shipSymbol = '▲'; // 默认三角形为集装箱船
      let iconColor = this.routeColors[ship.id] || '#2980b9';
      let iconScale = 1.2; // 默认缩放
      
      // 根据船舶类型确定图标和颜色
      if (ship.type === '集装箱船') {
        shipSymbol = '▲';
        iconColor = '#3498db'; // 蓝色
        iconScale = 1.3;
      } else if (ship.type === '油轮') {
        shipSymbol = '◆';
        iconColor = '#e74c3c'; // 红色
        iconScale = 1.4;
      } else if (ship.type === '散货船') {
        shipSymbol = '■';
        iconColor = '#f39c12'; // 黄色
        iconScale = 1.3;
      } else if (ship.type === '滚装船') {
        shipSymbol = '●';
        iconColor = '#27ae60'; // 绿色
        iconScale = 1.3;
      } else if (ship.type === '渔船') {
        shipSymbol = '▼';
        iconColor = '#8e44ad'; // 紫色
        iconScale = 1.0;
      }
      
      // 创建HTML船舶图标
      const shipHtml = `
        <div class="ship-icon-wrapper ship-wrapper-${ship.type}" style="transform: rotate(${ship.heading}deg); transform-origin: center center;">
          <div class="ship-icon ship-${ship.type}" style="color: ${iconColor}; transform: scale(${iconScale});">${shipSymbol}</div>
          <div class="ship-shadow"></div>
          <div class="ship-label">${ship.name}</div>
        </div>
      `;
      
      // 返回Leaflet DivIcon
      return L.divIcon({
        html: shipHtml,
        className: 'ship-marker',
        iconSize: [50, 50],
        iconAnchor: [25, 25]
      });
    },
    applyTimeFilter() {
      // 在这里添加时间过滤的逻辑
      console.log('Applying time filter:', this.historyTimeRange);
    },
    exitHistoryPlayback() {
      this.historyPlaybackMode = false;
    },
    formatPlaybackTime(step) {
      // 这里可以添加格式化时间显示的逻辑
      return `Time: ${step}%`;
    },
    seekHistoryPlayback(event) {
      this.historyPlaybackCurrentTime = event.target.value;
    },
    enterHistoryPlaybackMode() {
      this.historyPlaybackMode = true;
      
      // 生成模拟的历史数据
      this.generateHistoryData();
    },
    
    // 生成历史航行数据
    generateHistoryData() {
      // 为每艘船生成过去7天的历史数据
      this.ships.forEach(ship => {
        const route = this.routes[ship.id];
        if (route && route.length > 0) {
          // 创建一个具有7天历史记录的数组
          const historyData = [];
          const now = new Date();
          
          // 每隔一小时生成一条记录，共168条(7天*24小时)
          for (let i = 0; i < 168; i++) {
            // 生成时间，从当前时间向前推
            const recordTime = new Date(now);
            recordTime.setHours(now.getHours() - (168 - i));
            
            // 计算船舶在路线上的位置(简化模型：每天完成一个往返)
            // 每24小时一个完整循环
            const cycleHours = 24; 
            const cycleProgress = (i % cycleHours) / cycleHours;
            let routeIndex;
            
            if (cycleProgress <= 0.5) {
              // 前半程：从起点到终点
              routeIndex = Math.floor(cycleProgress * 2 * (route.length - 1));
            } else {
              // 后半程：从终点返回起点
              routeIndex = Math.floor((2 - cycleProgress * 2) * (route.length - 1));
            }
            
            // 确保索引在有效范围内
            routeIndex = Math.max(0, Math.min(route.length - 1, routeIndex));
            
            // 计算航向
            let heading = 0;
            if (routeIndex < route.length - 1) {
              const currentPos = route[routeIndex];
              const nextPos = route[Math.min(routeIndex + 1, route.length - 1)];
              heading = this.calculateHeading(currentPos, nextPos);
              
              // 如果是返回路径，航向需要反向
              if (cycleProgress > 0.5) {
                heading = (heading + 180) % 360;
              }
            }
            
            // 生成速度(基础速度上下浮动10%)
            const speed = ship.speed * (0.9 + Math.random() * 0.2);
            
            // 生成燃油量(假设每天消耗20%，然后补充)
            const dailyCycle = Math.floor(i / 24);
            const hourInDay = i % 24;
            let fuel = 100 - ((hourInDay / 24) * 20);
            
            // 每天的最后一小时补充燃油
            if (hourInDay === 23) {
              fuel = 100;
            }
            
            // 生成记录
            historyData.push({
              timestamp: recordTime.getTime(),
              position: [...route[routeIndex]],
              heading: heading,
              speed: speed,
              fuelRemaining: fuel,
              cargoLoad: 70 + Math.floor(Math.random() * 30), // 70-100%的随机载货量
              status: cycleProgress <= 0.05 ? '启航' : 
                      cycleProgress >= 0.45 && cycleProgress <= 0.55 ? '靠港' : 
                      '正常航行'
            });
          }
          
          // 存储生成的历史数据
          ship.historyData = historyData;
        }
      });
      
      // 设置默认的时间范围
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      
      this.historyTimeRange.start = this.formatDateForInput(oneWeekAgo);
      this.historyTimeRange.end = this.formatDateForInput(now);
    },
    
    // 格式化日期为datetime-local输入框所需的格式
    formatDateForInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  }
};
</script>

<style scoped>
.mapbox-maritime-map {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  max-width: 280px;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

.control-panel h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
  text-align: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.control-section {

  border-bottom: 1px solid #eee;

}

.control-section:last-child {
  border-bottom: none;
}

.control-section h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #2c3e50;
  font-size: 16px;
}

.control-panel button {
  display: block;
  width: 100%;
  margin: 8px 0;
  padding: 8px 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.control-panel button:hover {
  background: #2980b9;
}

.control-panel button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.zoom-control {
  margin: 12px 0;
}

.zoom-control label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
}

.zoom-control input {
  width: 100%;
}

.coordinates {
  margin-top: 12px;
  font-size: 13px;
}

.coordinates label {
  display: block;
  margin-bottom: 5px;
}

.error-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  max-width: 300px;
}

.error-panel h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
}

.error-panel p {
  margin: 5px 0;
  font-size: 14px;
}

.error-tip {
  font-weight: bold;
  margin-top: 10px;
  color: #e74c3c;
}

.error-panel ol {
  margin: 5px 0 10px 20px;
  padding: 0;
  font-size: 13px;
}

.error-panel li {
  margin-bottom: 3px;
}

.error-panel a {
  color: #3498db;
  text-decoration: none;
}

.error-panel a:hover {
  text-decoration: underline;
}

.error-panel button {
  margin-top: 10px;
  padding: 6px 12px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-panel button:hover {
  background: #c0392b;
}

.info-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(245, 250, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 600px;
  max-width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid rgba(30, 144, 255, 0.2);
  backdrop-filter: blur(10px);
}

 
.info-header {
  border-bottom: 2px solid rgba(52, 152, 219, 0.3);
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.info-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 22px;
  font-weight: 600;
}

.ship-name {
  font-size: 18px;
  color: #34495e;
  margin: 5px 0;
}

.ship-name span {
  font-size: 16px;
  color: #7f8c8d;
  font-style: italic;
}

.ship-type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  margin-top: 5px;
  color: white;
}

.ship-type-集装箱船 {
  background-color: #3498db;
}

.ship-type-油轮 {
  background-color: #e74c3c;
}

.ship-type-散货船 {
  background-color: #f39c12;
}

.ship-type-滚装船 {
  background-color: #27ae60;
}

.ship-type-渔船 {
  background-color: #8e44ad;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.info-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.info-card:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  background: rgba(236, 240, 245, 0.5);
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
}

.card-header h4 {
  margin: 0;
  color: #34495e;
  font-size: 16px;
  font-weight: 600;
}

.card-icon {
  font-size: 18px;
}

.card-content {
  padding: 15px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-label {
  color: #7f8c8d;
  font-weight: 500;
}

.info-value {
  color: #2c3e50;
  font-weight: 500;
  font-family: 'Consolas', monospace;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
}

.status-正常航行 {
  background-color: #2ecc71;
}

.status-准备启航, .status-重新起航 {
  background-color: #3498db;
}

.status-即将抵达 {
  background-color: #f39c12;
}

.coord-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 6px;
}

.coord-item, .nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.coord-label, .nav-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 3px;
}

.coord-value, .nav-value {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  font-family: 'Consolas', monospace;
}

.speed-heading-display {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-bottom: 15px;
  background-color: #f8f9fa;
  padding: 12px 8px;
  border-radius: 6px;
}

.compass-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.compass {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ecf0f1;
  position: relative;
  border: 2px solid #bdc3c7;
  transition: transform 0.5s ease;
}

.compass-arrow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 20px;
  background: linear-gradient(to bottom, #e74c3c 0%, #e74c3c 50%, #3498db 50%, #3498db 100%);
  transform: translate(-50%, -50%);
}

.compass-arrow:after {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #e74c3c;
}

.heading-value {
  margin-top: 5px;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.destination {
  font-weight: 600;
  color: #16a085;
}

.ship-dimensions {
  display: flex;
  justify-content: space-around;
  margin-bottom: 12px;
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 6px;
}

.dimension-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dimension-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 3px;
}

.dimension-value {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.draft-display {
  margin-top: 12px;
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
}

.draft-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.draft-label {
  font-size: 13px;
  color: #7f8c8d;
}

.draft-value {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
}

.ship-profile {
  height: 30px;
  position: relative;
  margin-top: 8px;
}

.ship-hull {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 15px;
  background-color: #34495e;
  border-radius: 5px 5px 0 0;
}

.water-level {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 15px;
  background: linear-gradient(to bottom, #3498db, #2980b9);
  border-radius: 0 0 5px 5px;
}

.gauge-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.gauge {
  width: 100%;
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.gauge-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.gauge-value {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.info-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  gap: 10px;
}

.action-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-icon {
  margin-right: 6px;
}

.center-btn {
  background-color: #3498db;
  color: white;
}

.center-btn:hover {
  background-color: #2980b9;
}

.close-btn {
  background-color: #e74c3c;
  color: white;
}

.close-btn:hover {
  background-color: #c0392b;
}

.port-icon {
  font-size: 20px;
  color: #8e44ad;
}

.port-popup {
  padding: 5px;
}

.port-popup h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.port-popup p {
  margin: 2px 0;
  font-size: 12px;
}

.ship-icon-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ship-icon {
  font-size: 30px;  /* 增大字体大小 */
  font-weight: bold;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.ship-shadow {
  position: absolute;
  width: 24px;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  bottom: -8px;
  z-index: 1;
}

.ship-label {
  position: absolute;
  bottom: -20px;
  font-size: 10px;
  white-space: nowrap;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 1px 3px;
  border-radius: 2px;
  z-index: 3;
}

/* 为不同船舶类型设置特定样�?*/
.ship-集装箱船 {
  transform: scale(1.3);
}

.ship-油轮 {
  transform: scale(1.4);
}

.ship-散货船 {
  transform: scale(1.3);
}

.ship-滚装船 {
  transform: scale(1.3);
}

.ship-渔船 {
  transform: scale(1.0);
}

/* 调整信息面板样式 */
.ship-id-block {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
}

.info-section {
  margin-bottom: 15px;
}

.info-section h4 {
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 5px;
  margin-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.info-panel {
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
}

.info-content {
  padding: 20px 20px 40px 20px;
}

/* 添加船舶类型图例样式 */
.ship-legend {
  margin-top: 15px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 8px;
  border: 1px solid #e9ecef;
}

.ship-legend h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  text-align: center;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.legend-icon {
  font-size: 20px;
  margin-right: 8px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.legend-text {
  font-size: 12px;
}

.focus-route-btn {
  background-color: #FF3300; /* 使用与航线相同的颜色 */
  color: white;
  margin-top: 10px;
  margin-bottom: 10px;
  font-weight: bold;
  border: 2px solid #FF5500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.focus-route-btn:hover {
  background-color: #FF5500;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* 航线信息弹窗样式 */
:global(.route-info-popup h3) {
  color: #FF3300;
  margin: 0 0 8px 0;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
  font-size: 16px;
  text-align: center;
}

:global(.route-info-popup p) {
  margin: 5px 0;
  font-size: 13px;
  line-height: 1.4;
}

:global(.route-info-popup ul) {
  margin: 5px 0;
  padding-left: 20px;
  font-size: 12px;
}

:global(.route-info-popup li) {
  margin-bottom: 3px;
  line-height: 1.3;
}

:global(.route-info-popup strong) {
  color: #2980b9;
}

:global(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  border-left: 4px solid #FF3300;
}

/* 添加历史回放面板样式 */
.history-playback-panel {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 15px;
  width: 320px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.history-panel-content h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  text-align: center;
  font-size: 18px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.date-range-selector {
  margin-bottom: 15px;
}

.date-input {
  margin-bottom: 10px;
}

.date-input label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #34495e;
}

.date-input input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.primary-button {
  width: 100%;
  padding: 10px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 5px;
}

.primary-button:hover {
  background-color: #2980b9;
}

.playback-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.playback-controls button {
  flex: 1;
  margin: 0 5px;
  padding: 8px 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: white;
}

.playback-controls button:first-child {
  margin-left: 0;
}

.playback-controls button:last-child {
  margin-right: 0;
}

.play-button {
  background-color: #2ecc71;
}

.play-button:hover {
  background-color: #27ae60;
}

.pause-button {
  background-color: #f39c12;
}

.pause-button:hover {
  background-color: #e67e22;
}

.stop-button {
  background-color: #e74c3c;
}

.stop-button:hover {
  background-color: #c0392b;
}

.playback-controls button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.control-icon {
  margin-right: 5px;
}

.playback-progress {
  margin-bottom: 15px;
}

.time-display {
  text-align: center;
  margin-bottom: 5px;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  color: #2c3e50;
}

.time-slider {
  width: 100%;
  margin-top: 5px;
}

.exit-button {
  width: 100%;
  padding: 10px;
  background-color: #95a5a6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.exit-button:hover {
  background-color: #7f8c8d;
}

.history-mode-btn {
  background-color: #FF3300; /* 使用与航线相同的颜色 */
  color: white;
  margin-top: 10px;
  margin-bottom: 10px;
  font-weight: bold;
  border: 2px solid #FF5500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.history-mode-btn:hover {
  background-color: #FF5500;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>

