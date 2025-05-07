<template>
  <div class="digital-twin-overview">
    <div class="dashboard-header">
      <h2>系统概览</h2>
      <div class="time-selector">
        <el-radio-group v-model="timeRange" size="small">
          <el-radio-button label="day">今日</el-radio-button>
          <el-radio-button label="week">本周</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <!-- 状态卡片 -->
    <div class="status-cards">
      <el-card class="status-card">
        <div class="card-content">
          <div class="card-icon system-status">
            <i class="icon-status"></i>
          </div>
          <div class="card-info">
            <div class="card-title">系统状态</div>
            <div class="card-value" :class="systemStatusClass">{{ systemStatus }}</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="status-card">
        <div class="card-content">
          <div class="card-icon device-count">
            <i class="icon-device"></i>
          </div>
          <div class="card-info">
            <div class="card-title">设备总数</div>
            <div class="card-value">{{ deviceCount }}</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="status-card">
        <div class="card-content">
          <div class="card-icon alarm-count">
            <i class="icon-alarm"></i>
          </div>
          <div class="card-info">
            <div class="card-title">当前告警</div>
            <div class="card-value" :class="{ 'text-danger': alarmCount > 0 }">
              {{ alarmCount }}
            </div>
          </div>
        </div>
      </el-card>
      
      <el-card class="status-card">
        <div class="card-content">
          <div class="card-icon efficiency">
            <i class="icon-efficiency"></i>
          </div>
          <div class="card-info">
            <div class="card-title">运行效率</div>
            <div class="card-value">{{ efficiency }}%</div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 运行数据图表 -->
    <div class="charts-container">
      <el-card class="chart-card">
        <template #header>
          <div class="chart-header">
            <span>设备健康状态分布</span>
          </div>
        </template>
        <div class="chart-wrapper" ref="healthDistributionChart"></div>
      </el-card>
      
      <el-card class="chart-card">
        <template #header>
          <div class="chart-header">
            <span>告警趋势分析</span>
          </div>
        </template>
        <div class="chart-wrapper" ref="alarmTrendChart"></div>
      </el-card>
    </div>
    
    <!-- 设备健康列表 -->
    <el-card class="device-health-card">
      <template #header>
        <div class="card-header">
          <span>关键设备健康状态</span>
          <el-button type="text" @click="refreshDeviceList">刷新</el-button>
        </div>
      </template>
      <el-table :data="deviceList" style="width: 100%">
        <el-table-column prop="name" label="设备名称" width="180"></el-table-column>
        <el-table-column prop="location" label="位置" width="150"></el-table-column>
        <el-table-column prop="healthScore" label="健康评分">
          <template #default="scope">
            <div class="health-score-wrapper">
              <el-progress
                :percentage="scope.row.healthScore"
                :color="getHealthScoreColor(scope.row.healthScore)"
              ></el-progress>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastMaintenance" label="上次维护"></el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button @click="viewDeviceDetails(scope.row)" type="text" size="small">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 最近告警 -->
    <el-card class="recent-alarms-card">
      <template #header>
        <div class="card-header">
          <span>最近告警</span>
          <el-button type="text" @click="viewAllAlarms">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentAlarms" style="width: 100%">
        <el-table-column prop="time" label="时间" width="180"></el-table-column>
        <el-table-column prop="device" label="设备" width="150"></el-table-column>
        <el-table-column prop="level" label="等级">
          <template #default="scope">
            <el-tag :type="getAlarmLevelType(scope.row.level)">
              {{ scope.row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="告警信息"></el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button @click="handleAlarm(scope.row)" type="text" size="small">
              处理
            </el-button>
            <el-button @click="ignoreAlarm(scope.row)" type="text" size="small">
              忽略
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import * as echarts from 'echarts/core';
import { PieChart, LineChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册echarts组件
echarts.use([
  PieChart,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
]);

// 状态变量
const timeRange = ref('day');
const systemStatus = ref('正常运行中');
const systemStatusClass = ref('text-success');
const deviceCount = ref(128);
const alarmCount = ref(3);
const efficiency = ref(92);

// 图表引用
const healthDistributionChart = ref(null);
const alarmTrendChart = ref(null);

// 设备列表数据
const deviceList = ref([
  {
    name: 'K60发电机-001',
    location: '机房A区',
    healthScore: 96,
    status: '正常',
    lastMaintenance: '2023-10-15'
  },
  {
    name: '热交换器-103',
    location: '机房B区',
    healthScore: 87,
    status: '良好',
    lastMaintenance: '2023-09-28'
  },
  {
    name: '阀门系统-205',
    location: '管道区域',
    healthScore: 64,
    status: '需要关注',
    lastMaintenance: '2023-08-12'
  },
  {
    name: '液压泵-054',
    location: '主甲板',
    healthScore: 78,
    status: '良好',
    lastMaintenance: '2023-10-05'
  },
  {
    name: '舵机系统-A12',
    location: '船尾区域',
    healthScore: 91,
    status: '正常',
    lastMaintenance: '2023-09-20'
  }
]);

// 最近告警数据
const recentAlarms = ref([
  {
    id: 1,
    time: '2023-10-25 08:32:15',
    device: '阀门系统-205',
    level: '警告',
    message: '压力波动超出正常范围'
  },
  {
    id: 2,
    time: '2023-10-25 06:15:22',
    device: '热交换器-103',
    level: '注意',
    message: '温度上升速率异常'
  },
  {
    id: 3,
    time: '2023-10-24 23:45:18',
    device: 'K60发电机-001',
    level: '严重',
    message: '轴承温度过高'
  }
]);

// 刷新设备列表
const refreshDeviceList = () => {
  // 实际应用中会调用API获取最新数据
  // 这里模拟刷新效果
  deviceList.value = deviceList.value.map(device => ({
    ...device,
    healthScore: Math.min(100, Math.max(50, device.healthScore + Math.floor(Math.random() * 11) - 5))
  }));
};

// 查看设备详情
const viewDeviceDetails = (device) => {
  console.log('查看设备详情:', device.name);
  // 实际应用中会导航到设备详情页或弹出详情对话框
};

// 查看所有告警
const viewAllAlarms = () => {
  console.log('查看所有告警');
  // 实际应用中会导航到告警页面
};

// 处理告警
const handleAlarm = (alarm) => {
  console.log('处理告警:', alarm.id);
  // 实际应用中会弹出处理对话框或导航到处理页面
};

// 忽略告警
const ignoreAlarm = (alarm) => {
  console.log('忽略告警:', alarm.id);
  // 实际应用中会调用API更新告警状态
  recentAlarms.value = recentAlarms.value.filter(a => a.id !== alarm.id);
  alarmCount.value = Math.max(0, alarmCount.value - 1);
};

// 获取健康评分颜色
const getHealthScoreColor = (score) => {
  if (score >= 90) return '#67c23a';  // 绿色
  if (score >= 70) return '#e6a23c';  // 黄色
  return '#f56c6c';  // 红色
};

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case '正常': return 'success';
    case '良好': return 'success';
    case '需要关注': return 'warning';
    case '异常': return 'danger';
    default: return 'info';
  }
};

// 获取告警等级类型
const getAlarmLevelType = (level) => {
  switch (level) {
    case '严重': return 'danger';
    case '警告': return 'warning';
    case '注意': return 'info';
    default: return '';
  }
};

// 初始化健康状态分布图表
const initHealthDistributionChart = () => {
  if (!healthDistributionChart.value) return;
  
  const chart = echarts.init(healthDistributionChart.value);
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        color: '#e2e8f0'
      }
    },
    color: ['#67c23a', '#e6a23c', '#f56c6c'],
    series: [
      {
        name: '设备健康状态',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '14',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 85, name: '健康' },
          { value: 12, name: '需要关注' },
          { value: 3, name: '异常' }
        ]
      }
    ]
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 初始化告警趋势图表
const initAlarmTrendChart = () => {
  if (!alarmTrendChart.value) return;
  
  const chart = echarts.init(alarmTrendChart.value);
  
  // 生成日期数组
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6 + i);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['严重', '警告', '注意'],
      textStyle: {
        color: '#e2e8f0'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    yAxis: {
      type: 'value',
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
    },
    color: ['#f56c6c', '#e6a23c', '#909399'],
    series: [
      {
        name: '严重',
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series'
        },
        data: [0, 1, 0, 2, 0, 1, 1]
      },
      {
        name: '警告',
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series'
        },
        data: [2, 1, 3, 1, 2, 3, 1]
      },
      {
        name: '注意',
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series'
        },
        data: [3, 4, 2, 3, 4, 2, 1]
      }
    ]
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 监听时间范围变化
watch(timeRange, (newRange) => {
  console.log('时间范围切换:', newRange);
  // 实际应用中会根据选择的时间范围重新加载数据
});

// 组件挂载
onMounted(() => {
  // 初始化图表
  initHealthDistributionChart();
  initAlarmTrendChart();
});
</script>

<style scoped>
.digital-twin-overview {
  padding: 10px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  margin: 0;
  color: #e2e8f0;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.status-card {
  background-color: #1e293b;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.card-icon i {
  font-size: 28px;
  color: white;
}

.icon-status:before {
  content: "⚙️";
}

.icon-device:before {
  content: "🔌";
}

.icon-alarm:before {
  content: "🔔";
}

.icon-efficiency:before {
  content: "📊";
}

.system-status {
  background-color: #4299e1;
}

.device-count {
  background-color: #805ad5;
}

.alarm-count {
  background-color: #ed8936;
}

.efficiency {
  background-color: #48bb78;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #a0aec0;
  margin-bottom: 5px;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  color: white;
}

.text-success {
  color: #48bb78;
}

.text-warning {
  color: #ecc94b;
}

.text-danger {
  color: #f56565;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  background-color: #1e293b;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.chart-wrapper {
  height: 300px;
}

.chart-header {
  color: #e2e8f0;
  font-weight: 600;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e2e8f0;
}

.device-health-card,
.recent-alarms-card {
  background-color: #1e293b;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.health-score-wrapper {
  width: 100%;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .status-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .status-cards {
    grid-template-columns: 1fr;
  }
}
</style> 