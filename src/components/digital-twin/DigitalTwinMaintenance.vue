<template>
  <div class="digital-twin-maintenance">
    <div class="page-header">
      <h2>预测性维护</h2>
      <div class="action-buttons">
        <el-button type="primary" size="small">添加维护计划</el-button>
        <el-button type="success" size="small">导出报告</el-button>
      </div>
    </div>
    
    <!-- 设备健康状态卡片 -->
    <div class="health-status-cards">
      <el-card class="health-card" v-for="device in deviceHealth" :key="device.id">
        <div class="device-health-info">
          <div class="health-status">
            <el-progress type="dashboard" 
              :percentage="device.healthScore" 
              :color="getHealthColor(device.healthScore)"
              :stroke-width="8"
            ></el-progress>
            <div class="health-label">健康评分</div>
          </div>
          <div class="device-info">
            <h3>{{ device.name }}</h3>
            <div class="device-detail">
              <span class="detail-label">剩余寿命:</span>
              <span class="detail-value">{{ device.remainingLife }} 天</span>
            </div>
            <div class="device-detail">
              <span class="detail-label">下次维护:</span>
              <span class="detail-value">{{ device.nextMaintenance }}</span>
            </div>
            <div class="device-detail">
              <span class="detail-label">风险等级:</span>
              <span class="detail-value" :class="'risk-' + device.riskLevel">
                {{ device.riskLevelText }}
              </span>
            </div>
          </div>
        </div>
        <div class="device-actions">
          <el-button type="primary" size="small" @click="viewDeviceDetails(device)">详情</el-button>
          <el-button type="success" size="small" @click="scheduleMaintenance(device)">安排维护</el-button>
        </div>
      </el-card>
    </div>
    
    <!-- 维护计划 -->
    <el-card class="maintenance-schedule-card">
      <template #header>
        <div class="card-header">
          <span>维护计划安排</span>
          <div class="view-controls">
            <el-radio-group v-model="scheduleView" size="small">
              <el-radio-button label="month">月视图</el-radio-button>
              <el-radio-button label="week">周视图</el-radio-button>
              <el-radio-button label="day">日视图</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>
      
      <div class="schedule-chart-wrapper" ref="scheduleChart"></div>
    </el-card>
    
    <!-- 部件寿命预测 -->
    <el-card class="component-prediction-card">
      <template #header>
        <div class="card-header">
          <span>关键部件寿命预测</span>
          <el-select v-model="selectedDevice" placeholder="选择设备" size="small">
            <el-option 
              v-for="device in deviceOptions" 
              :key="device.value" 
              :label="device.label" 
              :value="device.value">
            </el-option>
          </el-select>
        </div>
      </template>
      
      <div class="prediction-chart-wrapper" ref="predictionChart"></div>
    </el-card>
    
    <!-- 维护任务列表 -->
    <el-card class="maintenance-tasks-card">
      <template #header>
        <div class="card-header">
          <span>维护任务</span>
          <div class="task-filter">
            <el-select v-model="taskFilter" placeholder="筛选状态" size="small">
              <el-option label="全部" value="all"></el-option>
              <el-option label="待处理" value="pending"></el-option>
              <el-option label="进行中" value="inProgress"></el-option>
              <el-option label="已完成" value="completed"></el-option>
              <el-option label="已延期" value="delayed"></el-option>
            </el-select>
          </div>
        </div>
      </template>
      
      <el-table :data="filteredTasks" style="width: 100%">
        <el-table-column prop="date" label="计划日期" width="120"></el-table-column>
        <el-table-column prop="device" label="设备" width="150"></el-table-column>
        <el-table-column prop="task" label="任务描述"></el-table-column>
        <el-table-column prop="assignee" label="负责人" width="100"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'pending'"
              type="primary"
              size="mini"
              @click="startTask(scope.row)"
            >开始</el-button>
            <el-button
              v-if="scope.row.status === 'inProgress'"
              type="success"
              size="mini"
              @click="completeTask(scope.row)"
            >完成</el-button>
            <el-button
              v-if="['pending', 'inProgress'].includes(scope.row.status)"
              type="warning"
              size="mini"
              @click="delayTask(scope.row)"
            >延期</el-button>
            <el-button
              type="info"
              size="mini"
              @click="viewTaskDetails(scope.row)"
            >详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 维护效果分析 -->
    <el-card class="maintenance-effect-card">
      <template #header>
        <div class="card-header">
          <span>维护效果分析</span>
          <el-select v-model="selectedPeriod" placeholder="选择时间段" size="small">
            <el-option label="最近30天" value="30"></el-option>
            <el-option label="最近90天" value="90"></el-option>
            <el-option label="最近180天" value="180"></el-option>
            <el-option label="今年" value="year"></el-option>
          </el-select>
        </div>
      </template>
      
      <div class="effect-chart-wrapper" ref="effectChart"></div>
      
      <el-descriptions class="effect-metrics" :column="4" border>
        <el-descriptions-item label="平均故障间隔">
          <span class="metric-value">28.5天</span>
          <span class="metric-change positive">+15.2%</span>
        </el-descriptions-item>
        <el-descriptions-item label="故障率">
          <span class="metric-value">2.4%</span>
          <span class="metric-change positive">-1.8%</span>
        </el-descriptions-item>
        <el-descriptions-item label="维护成本">
          <span class="metric-value">￥23,450</span>
          <span class="metric-change positive">-8.3%</span>
        </el-descriptions-item>
        <el-descriptions-item label="设备可用率">
          <span class="metric-value">97.8%</span>
          <span class="metric-change positive">+2.1%</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, GaugeChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent,
  CalendarComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册echarts组件
echarts.use([
  BarChart,
  LineChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent,
  CalendarComponent,
  CanvasRenderer
]);

// 状态变量
const scheduleView = ref('month');
const selectedDevice = ref('');
const taskFilter = ref('all');
const selectedPeriod = ref('30');

// 图表引用
const scheduleChart = ref(null);
const predictionChart = ref(null);
const effectChart = ref(null);

// 设备健康状态数据
const deviceHealth = ref([
  {
    id: 1,
    name: 'K60发电机-001',
    healthScore: 86,
    remainingLife: 125,
    nextMaintenance: '2023-11-15',
    riskLevel: 'low',
    riskLevelText: '低'
  },
  {
    id: 2,
    name: '热交换器-103',
    healthScore: 72,
    remainingLife: 65,
    nextMaintenance: '2023-10-30',
    riskLevel: 'medium',
    riskLevelText: '中'
  },
  {
    id: 3,
    name: '阀门系统-205',
    healthScore: 58,
    remainingLife: 23,
    nextMaintenance: '2023-10-25',
    riskLevel: 'high',
    riskLevelText: '高'
  },
  {
    id: 4,
    name: '液压泵-054',
    healthScore: 92,
    remainingLife: 180,
    nextMaintenance: '2023-12-18',
    riskLevel: 'low',
    riskLevelText: '低'
  }
]);

// 设备选项
const deviceOptions = [
  { value: 'k60-001', label: 'K60发电机-001' },
  { value: 'heat-103', label: '热交换器-103' },
  { value: 'valve-205', label: '阀门系统-205' },
  { value: 'pump-054', label: '液压泵-054' },
  { value: 'rudder-a12', label: '舵机系统-A12' }
];

// 维护任务数据
const maintenanceTasks = ref([
  {
    id: 1,
    date: '2023-10-25',
    device: '阀门系统-205',
    task: '更换密封圈并清洁阀门内部',
    assignee: '张工',
    status: 'pending'
  },
  {
    id: 2,
    date: '2023-10-28',
    device: '热交换器-103',
    task: '清洗换热管路并检查连接点',
    assignee: '李工',
    status: 'pending'
  },
  {
    id: 3,
    date: '2023-10-15',
    device: 'K60发电机-001',
    task: '更换轴承并润滑传动装置',
    assignee: '王工',
    status: 'completed'
  },
  {
    id: 4,
    date: '2023-10-20',
    device: '液压泵-054',
    task: '检查泵压力并更换液压油',
    assignee: '刘工',
    status: 'inProgress'
  },
  {
    id: 5,
    date: '2023-10-10',
    device: '舵机系统-A12',
    task: '清洁控制器并测试响应时间',
    assignee: '赵工',
    status: 'delayed'
  }
]);

// 过滤后的任务列表
const filteredTasks = computed(() => {
  if (taskFilter.value === 'all') {
    return maintenanceTasks.value;
  }
  return maintenanceTasks.value.filter(task => task.status === taskFilter.value);
});

// 获取健康状态颜色
const getHealthColor = (score) => {
  if (score >= 80) return '#67c23a';  // 绿色
  if (score >= 60) return '#e6a23c';  // 黄色
  return '#f56c6c';  // 红色
};

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'inProgress': return 'primary';
    case 'pending': return 'info';
    case 'delayed': return 'warning';
    default: return '';
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'completed': return '已完成';
    case 'inProgress': return '进行中';
    case 'pending': return '待处理';
    case 'delayed': return '已延期';
    default: return status;
  }
};

// 查看设备详情
const viewDeviceDetails = (device) => {
  console.log('查看设备详情:', device.name);
  // 实际应用中会导航到设备详情页或弹出详情对话框
};

// 安排维护
const scheduleMaintenance = (device) => {
  console.log('安排维护:', device.name);
  // 实际应用中会弹出维护计划表单
};

// 开始任务
const startTask = (task) => {
  console.log('开始任务:', task.id);
  // 实际应用中会调用API更新任务状态
  task.status = 'inProgress';
};

// 完成任务
const completeTask = (task) => {
  console.log('完成任务:', task.id);
  // 实际应用中会调用API更新任务状态
  task.status = 'completed';
};

// 延期任务
const delayTask = (task) => {
  console.log('延期任务:', task.id);
  // 实际应用中会弹出延期原因表单
  task.status = 'delayed';
};

// 查看任务详情
const viewTaskDetails = (task) => {
  console.log('查看任务详情:', task.id);
  // 实际应用中会弹出任务详情对话框
};

// 初始化维护计划图表
const initScheduleChart = () => {
  if (!scheduleChart.value) return;
  
  const chart = echarts.init(scheduleChart.value);
  
  // 模拟数据
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // 生成当月的日期范围
  for (let i = 1; i <= endDate.getDate(); i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), i);
    
    // 随机生成维护任务数量
    const value = Math.floor(Math.random() * 3);
    
    if (value > 0) {
      data.push([
        date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0'),
        value
      ]);
    }
  }
  
  const option = {
    tooltip: {
      position: 'top',
      formatter: function (p) {
        return p.data[0] + ': ' + p.data[1] + ' 个任务';
      }
    },
    visualMap: {
      min: 0,
      max: 3,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      textStyle: {
        color: '#e2e8f0'
      },
      inRange: {
        color: ['#4299e1', '#805ad5', '#e53e3e']
      }
    },
    calendar: {
      top: 50,
      left: 40,
      right: 40,
      cellSize: ['auto', 30],
      range: startDate.getFullYear() + '-' + (startDate.getMonth() + 1),
      itemStyle: {
        borderWidth: 1,
        borderColor: '#334155'
      },
      yearLabel: { show: false },
      dayLabel: {
        nameMap: 'cn',
        color: '#e2e8f0'
      },
      monthLabel: {
        nameMap: 'cn',
        color: '#e2e8f0'
      }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: data
    }
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 初始化部件寿命预测图表
const initPredictionChart = () => {
  if (!predictionChart.value) return;
  
  const chart = echarts.init(predictionChart.value);
  
  // 生成未来12个月的日期标签
  const months = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push(date.getFullYear() + '/' + (date.getMonth() + 1));
  }
  
  const option = {
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
      data: ['轴承', '密封圈', '控制器', '冷却系统', '液压系统'],
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
      boundaryGap: false,
      data: months,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '剩余寿命(%)',
      min: 0,
      max: 100,
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
    series: [
      {
        name: '轴承',
        type: 'line',
        data: [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35],
        lineStyle: {
          width: 3
        },
        symbolSize: 8
      },
      {
        name: '密封圈',
        type: 'line',
        data: [95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40],
        lineStyle: {
          width: 3
        },
        symbolSize: 8
      },
      {
        name: '控制器',
        type: 'line',
        data: [98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87],
        lineStyle: {
          width: 3
        },
        symbolSize: 8
      },
      {
        name: '冷却系统',
        type: 'line',
        data: [85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30],
        lineStyle: {
          width: 3
        },
        symbolSize: 8
      },
      {
        name: '液压系统',
        type: 'line',
        data: [92, 89, 86, 83, 80, 77, 74, 71, 68, 65, 62, 59],
        lineStyle: {
          width: 3
        },
        symbolSize: 8
      }
    ]
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 初始化维护效果分析图表
const initEffectChart = () => {
  if (!effectChart.value) return;
  
  const chart = echarts.init(effectChart.value);
  
  // 生成过去6个月的日期标签
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(date.getFullYear() + '/' + (date.getMonth() + 1));
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['维护前故障率(%)', '维护后故障率(%)'],
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
      data: months,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '故障率(%)',
      min: 0,
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
    series: [
      {
        name: '维护前故障率(%)',
        type: 'bar',
        data: [5.2, 4.8, 5.5, 5.9, 4.6, 5.1],
        itemStyle: {
          color: '#e53e3e'
        }
      },
      {
        name: '维护后故障率(%)',
        type: 'bar',
        data: [3.1, 2.8, 3.2, 2.9, 2.5, 2.4],
        itemStyle: {
          color: '#48bb78'
        }
      }
    ]
  };
  
  chart.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

// 组件挂载
onMounted(() => {
  // 等待DOM更新后再初始化图表
  nextTick(() => {
    initScheduleChart();
    initPredictionChart();
    initEffectChart();
  });
});
</script>

<style scoped>
.digital-twin-maintenance {
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

.action-buttons {
  display: flex;
  gap: 10px;
}

.health-status-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.health-card {
  background-color: #1e293b;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.device-health-info {
  display: flex;
  padding: 10px;
}

.health-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 15px;
}

.health-label {
  margin-top: 5px;
  font-size: 12px;
  color: #a0aec0;
}

.device-info {
  flex: 1;
}

.device-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #e2e8f0;
}

.device-detail {
  display: flex;
  margin-bottom: 5px;
}

.detail-label {
  width: 80px;
  color: #a0aec0;
}

.detail-value {
  color: #e2e8f0;
}

.risk-low {
  color: #48bb78;
}

.risk-medium {
  color: #ecc94b;
}

.risk-high {
  color: #e53e3e;
}

.device-actions {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  gap: 10px;
}

.maintenance-schedule-card,
.component-prediction-card,
.maintenance-tasks-card,
.maintenance-effect-card {
  background-color: #1e293b;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e2e8f0;
}

.schedule-chart-wrapper,
.prediction-chart-wrapper,
.effect-chart-wrapper {
  height: 300px;
}

.effect-metrics {
  margin-top: 20px;
}

.metric-value {
  font-weight: bold;
  color: #e2e8f0;
  margin-right: 10px;
}

.metric-change {
  font-size: 12px;
}

.metric-change.positive {
  color: #48bb78;
}

.metric-change.negative {
  color: #e53e3e;
}

/* 深色主题适配 */
:deep(.el-descriptions) {
  --el-descriptions-item-bordered-label-background: #2d3748;
  --el-descriptions-item-label-text-color: #a0aec0;
  --el-descriptions-item-bordered-content-background: #1e293b;
  --el-descriptions-item-content-text-color: #e2e8f0;
  --el-border-color-lighter: #334155;
}

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

:deep(.el-table--enable-row-hover .el-table__body tr:hover>td) {
  background-color: #2c3e50;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .health-status-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .health-status-cards {
    grid-template-columns: 1fr;
  }
}
</style> 