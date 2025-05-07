import axios from 'axios';
import { API_CONFIG } from '../config/api';

export class ENCDataProcessor {
    constructor() {
        this.baseUrl = API_CONFIG.NOAA.BASE_URL;
        this.downloadUrl = API_CONFIG.NOAA.ENC_DOWNLOAD_URL;
        this.eastChinaSea = API_CONFIG.NOAA.EAST_CHINA_SEA;
    }

    /**
     * 获取ENC数据列表
     * @returns {Promise<Array>} - ENC数据列表
     */
    async getENCList() {
        try {
            const response = await axios.get(`${this.baseUrl}/list.json`);
            return response.data;
        } catch (error) {
            console.error('获取ENC列表失败:', error);
            throw error;
        }
    }

    /**
     * 下载ENC数据
     * @param {string} area - 区域名称
     * @returns {Promise<ArrayBuffer>} - ENC数据
     */
    async downloadENCData(area = 'east_china_sea') {
        try {
            const response = await axios.get(this.downloadUrl, {
                params: {
                    area: area,
                    format: 's57',
                    bbox: [
                        this.eastChinaSea.minLon,
                        this.eastChinaSea.minLat,
                        this.eastChinaSea.maxLon,
                        this.eastChinaSea.maxLat
                    ].join(',')
                },
                responseType: 'arraybuffer'
            });
            return response.data;
        } catch (error) {
            console.error('下载ENC数据失败:', error);
            throw error;
        }
    }

    /**
     * 解析ENC数据
     * @param {ArrayBuffer} encData - ENC数据
     * @returns {Object} - 解析后的数据
     */
    parseENCData(encData) {
        // 这里需要实现ENC数据的解析逻辑
        // 由于ENC格式复杂,建议使用专门的库如s57js
        // 这里仅作为示例返回一个简单的数据结构
        return {
            header: {
                title: '东海区域ENC数据',
                scale: 50000,
                date: new Date().toISOString()
            },
            features: [{
                    type: '航道',
                    name: '东海航道',
                    depth: 20,
                    coordinates: [
                        [120.0, 30.0],
                        [121.0, 30.0],
                        [122.0, 30.0]
                    ]
                },
                {
                    type: '港口',
                    name: '上海港',
                    coordinates: [121.5, 31.2]
                }
            ]
        };
    }

    /**
     * 将解析后的数据转换为GeoJSON格式
     * @param {Object} parsedData - 解析后的数据
     * @returns {Object} - GeoJSON数据
     */
    convertToGeoJSON(parsedData) {
        const features = parsedData.features.map(feature => {
            if (feature.type === '航道') {
                return {
                    type: 'Feature',
                    properties: {
                        name: feature.name,
                        depth: feature.depth,
                        type: '航道'
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: feature.coordinates
                    }
                };
            } else if (feature.type === '港口') {
                return {
                    type: 'Feature',
                    properties: {
                        name: feature.name,
                        type: '港口'
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: feature.coordinates
                    }
                };
            }
        }).filter(Boolean);

        return {
            type: 'FeatureCollection',
            properties: {
                title: parsedData.header.title,
                scale: parsedData.header.scale,
                date: parsedData.header.date
            },
            features
        };
    }

    /**
     * 处理ENC数据
     * @param {string} area - 区域名称
     * @returns {Promise<Object>} - GeoJSON数据
     */
    async processENCData(area = 'east_china_sea') {
        try {
            // 获取ENC列表
            const encList = await this.getENCList();
            console.log('可用的ENC数据:', encList);

            // 下载ENC数据
            const encData = await this.downloadENCData(area);

            // 解析ENC数据
            const parsedData = this.parseENCData(encData);

            // 转换为GeoJSON
            const geoJSON = this.convertToGeoJSON(parsedData);

            return geoJSON;
        } catch (error) {
            console.error('处理ENC数据失败:', error);
            throw error;
        }
    }
}