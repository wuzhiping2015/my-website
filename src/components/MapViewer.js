import { Map, config } from '@maptiler/sdk';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { ENCDataProcessor } from '../utils/encDataProcessor';
import 'leaflet/dist/leaflet.css';

export class MapTilerMap {
    constructor(container, options) {
        this.container = container;
        this.apiKey = options.apiKey || API_CONFIG.MAPTILER.API_KEY;
        this.center = options.center || API_CONFIG.MAP.DEFAULT_CENTER;
        this.zoom = options.zoom || API_CONFIG.MAP.DEFAULT_ZOOM;
        this.style = options.style;
        this.map = null;
        this.weatherLayer = null;
        this.aisLayer = null;
        this.encProcessor = new ENCDataProcessor();
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async init() {
        try {
            // 判断是否使用离线模式
            if (this.useOfflineMode()) {
                await this.initOfflineMode();
                return;
            }

            // 配置MapTiler SDK
            config.apiKey = this.apiKey;
            config.retryCount = this.maxRetries;
            config.retryDelay = 1000; // 1秒重试间隔

            // 设置超时
            const timeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('初始化超时')), 10000);
            });

            // 处理样式文件中的URL，添加API密钥
            let styleWithKey = this.style;
            if (typeof styleWithKey === 'object' && styleWithKey.sources) {
                // 深拷贝样式对象以避免修改原始对象
                styleWithKey = JSON.parse(JSON.stringify(styleWithKey));

                // 遍历所有数据源，为URL添加API密钥
                Object.keys(styleWithKey.sources).forEach(sourceKey => {
                    const source = styleWithKey.sources[sourceKey];
                    if (source.url && source.url.includes('api.maptiler.com')) {
                        // 添加API密钥
                        if (!source.url.includes('key=')) {
                            source.url = this.addKeyToUrl(source.url, this.apiKey);
                        }
                    }
                });

                // 处理精灵图URL
                if (styleWithKey.sprite && styleWithKey.sprite.includes('api.maptiler.com') && !styleWithKey.sprite.includes('key=')) {
                    styleWithKey.sprite = this.addKeyToUrl(styleWithKey.sprite, this.apiKey);
                }

                // 处理字体URL
                if (styleWithKey.glyphs && styleWithKey.glyphs.includes('api.maptiler.com') && !styleWithKey.glyphs.includes('key=')) {
                    styleWithKey.glyphs = this.addKeyToUrl(styleWithKey.glyphs, this.apiKey);
                }
            } else if (typeof styleWithKey === 'string' && styleWithKey.includes('api.maptiler.com') && !styleWithKey.includes('key=')) {
                // 如果样式是字符串URL，添加API密钥
                styleWithKey = this.addKeyToUrl(styleWithKey, this.apiKey);
            }

            try {
                console.log('初始化地图，使用API密钥:', this.apiKey);

                this.map = new Map({
                    container: this.container,
                    style: styleWithKey,
                    center: this.center,
                    zoom: this.zoom,
                    minZoom: API_CONFIG.MAP.MIN_ZOOM,
                    maxZoom: API_CONFIG.MAP.MAX_ZOOM,
                    geolocate: 'point'
                });

                // 添加API密钥验证事件处理
                this.map.on('styleimagemissing', (e) => {
                    console.warn('样式图像缺失:', e.id);
                });

                // 等待地图加载完成
                await Promise.race([
                    new Promise((resolve, reject) => {
                        this.map.on('load', resolve);
                        this.map.on('error', (e) => {
                            // 检查是否是API密钥错误
                            if (e && e.error && ((e.error.message || '').includes('Invalid key') ||
                                    (e.error.message || '').includes('403') ||
                                    (e.error.message || '').includes('Forbidden'))) {
                                console.error('API密钥错误:', e.error);
                                this.switchToOfflineMode('API密钥无效，已切换到离线模式');
                                reject(new Error('API密钥无效: ' + (e.error.message || '未知错误')));
                            } else {
                                reject(e);
                            }
                        });
                    }),
                    timeout
                ]);

                // 尝试加载数据
                await Promise.race([
                    Promise.all([
                        this.loadENCData(),
                        this.loadWeatherData(),
                        this.addAISLayer(API_CONFIG.MARINETRAFFIC.AIS_URL)
                    ]),
                    timeout
                ]);
            } catch (mapError) {
                console.error('地图初始化失败:', mapError);
                // 如果地图初始化失败，切换到离线模式
                if ((mapError.message || '').includes('Invalid key') ||
                    (mapError.message || '').includes('403') ||
                    (mapError.message || '').includes('Forbidden')) {
                    return this.switchToOfflineMode('API密钥无效或网络连接失败，已切换到离线模式');
                }
                throw mapError;
            }

        } catch (error) {
            console.error('MapTiler 初始化失败:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`重试初始化 (${this.retryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.init();
            }
            // 最后一次尝试失败，切换到离线模式
            this.switchToOfflineMode('多次尝试连接MapTiler API失败，已切换到离线模式');
        }
    }

    async loadENCData() {
        try {
            const encData = await this.encProcessor.processENCData();

            this.map.addSource('enc', {
                type: 'geojson',
                data: encData
            });

            this.map.addLayer({
                id: 'enc-layer',
                type: 'line',
                source: 'enc',
                paint: {
                    'line-color': '#00f',
                    'line-width': 2
                }
            });

        } catch (error) {
            console.error('加载 ENC 数据失败:', error);
        }
    }

    async loadWeatherData() {
        try {
            const url = this.addKeyToUrl(`${API_CONFIG.MAPTILER.WEATHER_URL}/wind.json`, this.apiKey);
            const response = await axios.get(url);
            const weatherData = response.data;

            this.map.addSource('weather', {
                type: 'geojson',
                data: weatherData
            });

            this.weatherLayer = this.map.addLayer({
                id: 'weather-layer',
                type: 'fill',
                source: 'weather',
                paint: {
                    'fill-color': '#0f0',
                    'fill-opacity': 0.5
                }
            });

        } catch (error) {
            console.error('加载天气数据失败:', error);
        }
    }

    async addAISLayer(apiUrl) {
        try {
            const response = await axios.get(apiUrl, {
                headers: { 'Authorization': API_CONFIG.MARINETRAFFIC.API_KEY },
                params: {
                    v: 3,
                    protocol: 'jsono',
                    msgtype: 'simple'
                }
            });
            const aisData = response.data;

            this.map.addSource('ais', {
                type: 'geojson',
                data: aisData
            });

            this.aisLayer = this.map.addLayer({
                id: 'ais-layer',
                type: 'symbol',
                source: 'ais',
                layout: {
                    'icon-image': 'ship-icon',
                    'icon-size': 0.5
                }
            });

            // 定期更新AIS数据
            setInterval(async() => {
                const updatedData = await axios.get(apiUrl, {
                    headers: { 'Authorization': API_CONFIG.MARINETRAFFIC.API_KEY },
                    params: {
                        v: 3,
                        protocol: 'jsono',
                        msgtype: 'simple'
                    }
                });
                this.map.getSource('ais').setData(updatedData.data);
            }, 1000);

        } catch (error) {
            console.error('加载 AIS 数据失败:', error);
        }
    }

    setStyle(styleUrl) {
        // 确保样式URL包含API密钥
        if (typeof styleUrl === 'string' && styleUrl.includes('api.maptiler.com') && !styleUrl.includes('key=')) {
            styleUrl = this.addKeyToUrl(styleUrl, this.apiKey);
        }
        this.map.setStyle(styleUrl);
    }

    setWeatherVisibility(visible) {
        if (this.weatherLayer) {
            this.map.setLayoutProperty('weather-layer', 'visibility', visible ? 'visible' : 'none');
        }
    }

    setAISVisibility(visible) {
        if (this.aisLayer) {
            this.map.setLayoutProperty('ais-layer', 'visibility', visible ? 'visible' : 'none');
        }
    }

    setZoom(zoom) {
        this.map.setZoom(zoom);
    }

    getZoom() {
        return this.map.getZoom();
    }

    getCenter() {
        return this.map.getCenter();
    }

    on(event, callback) {
        this.map.on(event, callback);
    }

    resize() {
        this.map.resize();
    }

    remove() {
        if (this.map) {
            this.map.remove();
        }
    }

    // 工具方法：为URL添加API密钥
    addKeyToUrl(url, key) {
        if (!url || !key) return url;
        // 移除可能存在的旧密钥
        let cleanUrl = url;
        if (url.includes('key=')) {
            // 从URL中移除现有的key参数
            const keyRegex = /([?&])key=[^&]*(&|$)/;
            cleanUrl = url.replace(keyRegex, (match, p1, p2) => {
                return p2 === '&' ? p1 : '';
            });
        }

        const separator = cleanUrl.includes('?') ? '&' : '?';
        return `${cleanUrl}${separator}key=${key}`;
    }

    // 切换到离线模式
    async switchToOfflineMode(message) {
        console.warn(message);
        localStorage.setItem('useOfflineMode', 'true');
        return this.initOfflineMode();
    }

    // 检查是否使用离线模式
    useOfflineMode() {
        return localStorage.getItem('useOfflineMode') === 'true';
    }

    // 初始化离线模式
    async initOfflineMode() {
        try {
            // 创建一个简单的离线地图
            const offlineStyle = {
                version: 8,
                sources: {
                    'offline-background': {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            geometry: {
                                type: 'Polygon',
                                coordinates: [
                                    [
                                        [-180, -90],
                                        [180, -90],
                                        [180, 90],
                                        [-180, 90],
                                        [-180, -90]
                                    ]
                                ]
                            }
                        }
                    }
                },
                layers: [{
                    id: 'background',
                    type: 'fill',
                    source: 'offline-background',
                    paint: {
                        'fill-color': '#e0f7fa'
                    }
                }]
            };

            this.map = new Map({
                container: this.container,
                style: offlineStyle,
                center: this.center,
                zoom: this.zoom,
                minZoom: API_CONFIG.MAP.MIN_ZOOM,
                maxZoom: API_CONFIG.MAP.MAX_ZOOM
            });

            // 等待地图加载完成
            await new Promise(resolve => {
                this.map.on('load', resolve);
            });

            // 添加离线模式说明文本
            this.map.addSource('offline-text', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0]
                    },
                    properties: {
                        message: '当前处于离线模式 - MapTiler API不可用'
                    }
                }
            });

            this.map.addLayer({
                id: 'offline-text-layer',
                type: 'symbol',
                source: 'offline-text',
                layout: {
                    'text-field': ['get', 'message'],
                    'text-size': 20,
                    'text-anchor': 'center'
                },
                paint: {
                    'text-color': '#455a64'
                }
            });

            // 触发状态更新事件
            if (this.container) {
                this.container.dispatchEvent(new CustomEvent('offline-mode', {
                    detail: { message: '当前处于离线模式' }
                }));
            }

            return true;
        } catch (error) {
            console.error('离线模式初始化失败:', error);
            throw error;
        }
    }

    // 退出离线模式
    exitOfflineMode() {
        localStorage.removeItem('useOfflineMode');
        this.retryCount = 0;
        return this.init();
    }
}