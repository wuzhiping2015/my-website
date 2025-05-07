<template>
  <div class="digital-twin-data">
    <div class="page-header">
      <h2>数据分析</h2>
      <div class="time-controls">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          size="small"
        ></el-date-picker>
        <el-button type="primary" size="small" @click="fetchData">查询</el-button>
      </div>
    </div>
    
    <!-- 参数选择器 -->
    <el-card class="parameter-selector-card">
      <template #header>
        <div class="card-header">
          <span>参数选择</span>
          <el-button type="text" @click="resetParameters">重置</el-button>
        </div>
      </template>
      <div class="parameter-form">
        <div class="form-item">
          <span class="label">设备：</span>
          <el-select v-model="selectedDevice" placeholder="选择设备" size="small">
            <el-option
              v-for="device in deviceOptions"
              :key="device.value"
              :label="device.label"
              :value="device.value"
            ></el-option>
          </el-select>
        </div>
        
        <div class="form-item">
          <span class="label">参数：</span>
          <el-select 
            v-model="selectedParameters" 
            multiple 
            collapse-tags 
            placeholder="选择参数" 
            size="small"
          >
            <el-option
              v-for="param in parameterOptions"
              :key="param.value"
              :label="param.label"
              :value="param.value"
            ></el-option>
          </el-select>
        </div>
        
        <div class="form-item">
          <span class="label">时间精度：</span>
          <el-radio-group v-model="timeAccuracy" size="small">
            <el-radio-button label="minute">分钟</el-radio-button>
            <el-radio-button label="hour">小时</el-radio-button>
            <el-radio-button label="day">天</el-radio-button>
          </el-radio-group>
        </div>
        
        <div class="form-item">
          <span class="label">数据类型：</span>
          <el-radio-group v-model="dataType" size="small">
            <el-radio-button label="raw">原始数据</el-radio-button>
            <el-radio-button label="avg">平均值</el-radio-button>
            <el-radio-button label="min-max">最大/最小值</el-radio-button>
          </el-radio-group>
        </div>
        
        <div class="form-buttons">
          <el-button type="primary" @click="generateChart">生成图表</el-button>
          <el-button @click="exportData">导出数据</el-button>
        </div>
      </div>
    </el-card>
    
    <!-- 数据图表 -->
    <el-card class="data-chart-card">
      <template #header>
        <div class="card-header">
          <span>数据趋势图</span>
          <div class="chart-controls">
            <el-button-group size="small">
              <el-button 
                :type="chartType === 'line' ? 'primary' : ''" 
                @click="switchChartType('line')"
                icon="el-icon-line-chart"
              >线图</el-button>
              <el-button 
                :type="chartType === 'bar' ? 'primary' : ''" 
                @click="switchChartType('bar')"
                icon="el-icon-bar-chart"
              >柱图</el-button>
            </el-button-group>
            <el-button 
              size="small" 
              icon="el-icon-download" 
              @click="saveChart"
            >保存图表</el-button>
          </div>
        </div>
      </template>
      <div class="chart-wrapper" ref="dataChart"></div>
    </el-card>
    
    <!-- 相关性分析 -->
    <el-card class="correlation-card" v-if="selectedParameters.length > 1">
      <template #header>
        <div class="card-header">
          <span>参数相关性分析</span>
        </div>
      </template>
      <div class="correlation-wrapper" ref="correlationChart"></div>
    </el-card>
    
    <!-- 数据表格 -->
    <el-card class="data-table-card">
      <template #header>
        <div class="card-header">
          <span>数据明细</span>
          <div class="table-controls">
            <el-input
              v-model="searchQuery"
              placeholder="搜索"
              size="small"
              clearable
              style="width: 200px;"
            ></el-input>
            <el-button 
              size="small" 
              type="success" 
              icon="el-icon-download" 
              @click="exportTable"
            >导出表格</el-button>
          </div>
        </div>
      </template>
      <el-table 
        :data="filteredTableData" 
        stripe 
        border 
        style="width: 100%"
        height="350"
      >
        <el-table-column type="index" width="50"></el-table-column>
        <el-table-column prop="timestamp" label="时间" width="180"></el-table-column>
        <el-table-column 
          v-for="param in selectedParameters" 
          :key="param"
          :prop="param" 
          :label="getParameterLabel(param)"
        ></el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalItems"
        ></el-pagination>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, ScatterChart, HeatmapChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  DataZoomComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册echarts组件
echarts.use([
  LineChart,
  BarChart,
  ScatterChart,
  HeatmapChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  DataZoomComponent,
  CanvasRenderer
]);

// 状态变量
const dateRange = ref([new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()]);
const selectedDevice = ref('device-001');
const selectedParameters = ref(['temperature', 'pressure']);
const timeAccuracy = ref('hour');
const dataType = ref('raw');
const chartType = ref('line');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(100);

// 图表引用
const dataChart = ref(null);
const correlationChart = ref(null);

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
      return [start, end];
    }
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
      return [start, end];
    }
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
      return [start, end];
    }
  }
];

// 设备选项
const deviceOptions = [
  { value: 'device-001', label: 'K60发电机-001' },
  { value: 'device-002', label: '热交换器-103' },
  { value: 'device-003', label: '阀门系统-205' },
  { value: 'device-004', label: '液压泵-054' },
  { value: 'device-005', label: '舵机系统-A12' }
];

// 参数选项
const parameterOptions = [
  { value: 'temperature', label: '温度 (°C)' },
  { value: 'pressure', label: '压力 (MPa)' },
  { value: 'vibration', label: '振动 (Hz)' },
  { value: 'flow', label: '流量 (L/min)' },
  { value: 'rotation', label: '转速 (rpm)' },
  { value: 'voltage', label: '电压 (V)' },
  { value: 'current', label: '电流 (A)' },
  { value: 'oil-level', label: '油位 (%)' }
];

// 模拟数据
const tableData = ref([]);

// 生成模拟数据
const generateMockData = () => {
  tableData.value = [];
  
  const startDate = dateRange.value[0];
  const endDate = dateRange.value[1];
  
  let interval;
  switch (timeAccuracy.value) {
    case 'minute':
      interval = 60 * 1000; // 1分钟
      break;
    case 'hour':
      interval = 60 * 60 * 1000; // 1小时
      break;
    case 'day':
      interval = 24 * 60 * 60 * 1000; // 1天
      break;
  }
  
  // 生成时间序列数据
  for (let time = startDate.getTime(); time <= endDate.getTime(); time += interval) {
    const item = {
      timestamp: new Date(time).toLocaleString(),
      temperature: Math.round((Math.random() * 10 + 65) * 10) / 10,
      pressure: Math.round((Math.random() * 0.5 + 1.8) * 100) / 100,
      vibration: Math.round((Math.random() * 2 + 1) * 100) / 100,
      flow: Math.round(Math.random() * 50 + 150),
      rotation: Math.round(Math.random() * 200 + 1800),
      voltage: Math.round(Math.random() * 5 + 220),
      current: Math.round((Math.random() * 2 + 10) * 10) / 10,
      'oil-level': Math.round(Math.random() * 20 + 80)
    };
    
    // 为selected device添加一些异常值
    if (selectedDevice.value === 'device-001' && Math.random() > 0.9) {
      item.temperature += 15;
      item.vibration += 2;
    }
    
    tableData.value.push(item);
  }
  
  totalItems.value = tableData.value.length;
};

// 过滤后的表格数据
const filteredTableData = computed(() => {
  let data = tableData.value;
  
  // 搜索过滤
  if (searchQuery.value) {
    data = data.filter(item => {
      return Object.values(item).some(val => 
        val.toString().toLowerCase().includes(searchQuery.value.toLowerCase())
      );
    });
  }
  
  // 分页
  const startIndex = (currentPage.value - 1) * pageSize.value;
  return data.slice(startIndex, startIndex + pageSize.value);
});

// 获取参数标签
const getParameterLabel = (paramValue) => {
  const param = parameterOptions.find(p => p.value === paramValue);
  return param ? param.label : paramValue;
};

// 重置参数
const resetParameters = () => {
  selectedParameters.value = ['temperature', 'pressure'];
  timeAccuracy.value = 'hour';
  dataType.value = 'raw';
};

// 获取数据
const fetchData = () => {
  generateMockData();
  currentPage.value = 1;
};

// 生成图表
const generateChart = () => {
  if (!dataChart.value) return;
  
  const chart = echarts.init(dataChart.value);
  
  // 准备数据
  const timestamps = tableData.value.map(item => item.timestamp);
  const series = selectedParameters.value.map(param => {
    return {
      name: getParameterLabel(param),
      type: chartType.value,
      data: tableData.value.map(item => item[param]),
      itemStyle: {
        // 对于异常值高亮显示
        color: function(params) {
          let value = params.value;
          let threshold;
          
          // 根据参数类型设置阈值
          switch(param) {
            case 'temperature':
              threshold = 75;
              break;
            case 'vibration':
              threshold = 2.5;
              break;
            case 'pressure':
              threshold = 2.2;
              break;
            default:
              return undefined; // 使用默认颜色
          }
          
          return value > threshold ? '#f56c6c' : undefined;
        }
      }
    };
  });
  
  const option = {
    title: {
      text: `${deviceOptions.find(d => d.value === selectedDevice.value).label} 参数趋势图`,
      left: 'center',
      textStyle: {
        color: '#e2e8f0'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      data: selectedParameters.value.map(getParameterLabel),
      bottom: 10,
      textStyle: {
        color: '#e2e8f0'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    toolbox: {
      feature: {
        saveAsImage: { title: '保存图片' },
        dataZoom: { title: '数据缩放' },
        restore: { title: '还原' }
      },
      iconStyle: {
        borderColor: '#e2e8f0'
      }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        start: 0,
        end: 100
      }
    ],
    xAxis: {
      type: 'category',
      boundaryGap: chartType.value === 'bar',
      data: timestamps,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    yAxis: selectedParameters.value.map((param, index) => {
      const unit = getParameterLabel(param).match(/\((.*?)\)/)?.[1] || '';
      return {
        type: 'value',
        name: unit,
        position: index % 2 === 0 ? 'left' : 'right',
        offset: index > 1 ? 80 : 0,
        axisLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      };
    }),
    series: series
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
  
  // 生成相关性分析
  if (selectedParameters.value.length > 1) {
    generateCorrelationChart();
  }
};

// 生成相关性分析图表
const generateCorrelationChart = () => {
  if (!correlationChart.value) return;
  
  const chart = echarts.init(correlationChart.value);
  
  // 计算相关性矩阵
  const paramLabels = selectedParameters.value.map(getParameterLabel);
  const correlationData = [];
  
  // 计算相关系数
  for (let i = 0; i < selectedParameters.value.length; i++) {
    for (let j = 0; j < selectedParameters.value.length; j++) {
      const param1 = selectedParameters.value[i];
      const param2 = selectedParameters.value[j];
      
      // 简单实现，实际应用中应该用更复杂的算法
      const correlation = calculateCorrelation(
        tableData.value.map(item => item[param1]),
        tableData.value.map(item => item[param2])
      );
      
      correlationData.push([i, j, correlation.toFixed(2)]);
    }
  }
  
  const option = {
    title: {
      text: '参数相关性热力图',
      left: 'center',
      textStyle: {
        color: '#e2e8f0'
      }
    },
    tooltip: {
      position: 'top',
      formatter: function (params) {
        return `${paramLabels[params.data[0]]} 与 ${paramLabels[params.data[1]]} 相关性: ${params.data[2]}`;
      }
    },
    grid: {
      left: '3%',
      right: '7%',
      bottom: '10%',
      top: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: paramLabels,
      splitArea: {
        show: true
      },
      axisLabel: {
        color: '#e2e8f0',
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'category',
      data: paramLabels,
      splitArea: {
        show: true
      },
      axisLabel: {
        color: '#e2e8f0'
      }
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#f56c6c', '#ffffff', '#67c23a']
      },
      textStyle: {
        color: '#e2e8f0'
      }
    },
    series: [{
      name: '相关性',
      type: 'heatmap',
      data: correlationData,
      label: {
        show: true
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 计算相关系数
const calculateCorrelation = (array1, array2) => {
  if (array1.length !== array2.length) {
    return 0;
  }
  
  const n = array1.length;
  
  // 计算平均值
  const avg1 = array1.reduce((sum, val) => sum + val, 0) / n;
  const avg2 = array2.reduce((sum, val) => sum + val, 0) / n;
  
  // 计算协方差和标准差
  let covariance = 0;
  let stdDev1 = 0;
  let stdDev2 = 0;
  
  for (let i = 0; i < n; i++) {
    covariance += (array1[i] - avg1) * (array2[i] - avg2);
    stdDev1 += Math.pow(array1[i] - avg1, 2);
    stdDev2 += Math.pow(array2[i] - avg2, 2);
  }
  
  // 计算相关系数
  return covariance / (Math.sqrt(stdDev1) * Math.sqrt(stdDev2));
};

// 切换图表类型
const switchChartType = (type) => {
  chartType.value = type;
  generateChart();
};

// 保存图表
const saveChart = () => {
  if (!dataChart.value) return;
  
  const chart = echarts.getInstanceByDom(dataChart.value);
  if (chart) {
    const base64 = chart.getDataURL();
    const a = document.createElement('a');
    a.href = base64;
    a.download = `${selectedDevice.value}_data_chart.png`;
    a.click();
  }
};

// 导出数据
const exportData = () => {
  // 实际应用中可以对接后端导出服务
  console.log('导出数据:', {
    device: selectedDevice.value,
    parameters: selectedParameters.value,
    timeRange: dateRange.value,
    accuracy: timeAccuracy.value,
    dataType: dataType.value
  });
};

// 导出表格
const exportTable = () => {
  // 实际应用中可以对接导出服务
  console.log('导出表格数据', tableData.value);
};

// 页面大小变化处理
const handleSizeChange = (size) => {
  pageSize.value = size;
};

// 页码变化处理
const handleCurrentChange = (page) => {
  currentPage.value = page;
};

// 监听参数变化
watch([selectedDevice, dateRange, timeAccuracy], () => {
  // 如果关键参数变化，重新生成数据
  fetchData();
});

// 组件挂载
onMounted(() => {
  // 生成初始数据
  fetchData();
  
  // 生成初始图表
  setTimeout(() => {
    generateChart();
  }, 100);
});
</script>

<style scoped>
.digital-twin-data {
  padding: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #e2e8f0;
}

.time-controls {
  display: flex;
  gap: 10px;
}

.parameter-selector-card,
.data-chart-card,
.correlation-card,
.data-table-card {
  background-color: #1e293b;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e2e8f0;
}

.parameter-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.form-item {
  display: flex;
  align-items: center;
}

.label {
  width: 80px;
  color: #a0aec0;
}

.form-buttons {
  grid-column: span 2;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.chart-wrapper {
  height: 400px;
  width: 100%;
}

.correlation-wrapper {
  height: 300px;
  width: 100%;
}

.chart-controls,
.table-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}

/* 自定义图标 */
.el-icon-line-chart:before {
  content: "📈";
}

.el-icon-bar-chart:before {
  content: "📊";
}

.el-icon-download:before {
  content: "💾";
}

/* 深色主题适配 */
:deep(.el-table) {
  background-color: #1e293b;
  color: #e2e8f0;
}

:deep(.el-table tr),
:deep(.el-table th) {
  background-color: #1e293b;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #2d3748;
}

:deep(.el-table td),
:deep(.el-table th.is-leaf) {
  border-color: #2d3748;
}

:deep(.el-table--border) {
  border-color: #2d3748;
}

:deep(.el-pagination) {
  color: #e2e8f0;
}

:deep(.el-pagination button:disabled) {
  background-color: #1e293b;
}

:deep(.el-pager li) {
  background-color: #2d3748;
  color: #e2e8f0;
}

:deep(.el-pager li.active) {
  color: #409eff;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .parameter-form {
    grid-template-columns: 1fr;
  }
  
  .form-buttons {
    grid-column: 1;
  }
}
</style> 