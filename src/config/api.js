// API配置
export const API_CONFIG = {
    // MapTiler API配置
    MAPTILER: {
        // 使用API密钥尝试顺序：
        // 1. 先检查localStorage中是否有用户自定义的密钥
        // 2. 然后尝试此处配置的密钥
        // 3. 如果都失败，则切换到离线模式
        API_KEY: getMapTilerApiKey(),
        BASE_URL: 'https://api.maptiler.com',
        TILES_URL: 'https://api.maptiler.com/tiles',
        WEATHER_URL: 'https://api.maptiler.com/weather',
        ALLOWED_DOMAINS: ['localhost', '127.0.0.1', 'yourdomain.com'] // 添加允许的域名
    },

    // MarineTraffic API配置
    MARINETRAFFIC: {
        API_KEY: 'PhFHDKIG3klNinkl6RrR', // 需要替换为实际的API密钥
        BASE_URL: 'https://services.marinetraffic.com',
        AIS_URL: 'https://services.marinetraffic.com/api/exportvessel',
        VESSEL_DETAILS_URL: 'https://services.marinetraffic.com/api/vesseldetails',
        PORT_CALLS_URL: 'https://services.marinetraffic.com/api/portcalls'
    },

    // NOAA ENC数据配置
    NOAA: {
        BASE_URL: 'https://charts.noaa.gov/ENCs',
        ENC_DOWNLOAD_URL: 'https://charts.noaa.gov/ENCs/ENCs.shtml',
        // 东海区域ENC数据范围
        EAST_CHINA_SEA: {
            minLon: 120.0,
            maxLon: 130.0,
            minLat: 25.0,
            maxLat: 35.0
        }
    },

    // 地图默认配置
    MAP: {
        DEFAULT_CENTER: [120.0, 30.0],
        DEFAULT_ZOOM: 8,
        MIN_ZOOM: 1,
        MAX_ZOOM: 20
    },

    // 船舶模型配置
    SHIP_MODEL: {
        PATH: '/models/PrimaryIonDrive.glb', // 使用public目录下的模型
        SCALE: 0.1,
        POSITION: [0, 0, 0],
        ROTATION: [0, 0, 0]
    }
};

// 获取MapTiler API密钥，优先使用用户设置的密钥
function getMapTilerApiKey() {
    // 首先尝试从localStorage获取用户设置的密钥
    const userKey = localStorage.getItem('userMapTilerApiKey');
    if (userKey) {
        return userKey;
    }

    // 备选密钥列表 - 实际使用时应该替换为有效的密钥
    const backupKeys = [
        'Y5BOehAEhqtSaqY6LlSk', // 新添加的主要密钥
        'GqHdMGQEb9SiNYLTUYCN',
        'SWYi4yf3QO1MaLr9nZQ9',
        'xrF8bEyP3xvdLcr9F3vU'
    ];

    // 如果有备选密钥，始终使用第一个密钥（新密钥）
    if (backupKeys.length > 0) {
        return backupKeys[0];
    }

    // 默认密钥
    return 'Y5BOehAEhqtSaqY6LlSk';
}

// 允许用户设置自己的API密钥
export function setUserMapTilerApiKey(key) {
    if (key && typeof key === 'string') {
        localStorage.setItem('userMapTilerApiKey', key);
        return true;
    }
    return false;
}

// 清除用户设置的API密钥
export function clearUserMapTilerApiKey() {
    localStorage.removeItem('userMapTilerApiKey');
}