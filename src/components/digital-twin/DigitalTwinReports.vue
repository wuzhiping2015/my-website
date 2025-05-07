<template>
  <div class="digital-twin-reports">
    <div class="page-header">
      <h2>报表中心</h2>
      <div class="action-buttons">
        <el-button type="primary" size="small">创建报表</el-button>
        <el-button type="success" size="small">导出数据</el-button>
      </div>
    </div>
    
    <!-- 报表筛选条件 -->
    <el-card class="filter-card">
      <div class="filter-form">
        <el-form :inline="true" :model="filterForm" size="small">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            ></el-date-picker>
          </el-form-item>
          
          <el-form-item label="设备">
            <el-select v-model="filterForm.device" placeholder="选择设备" clearable>
              <el-option 
                v-for="item in deviceOptions" 
                :key="item.value" 
                :label="item.label" 
                :value="item.value">
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="报表类型">
            <el-select v-model="filterForm.reportType" placeholder="选择类型" clearable>
              <el-option label="运行报表" value="operation"></el-option>
              <el-option label="维护报表" value="maintenance"></el-option>
              <el-option label="故障报表" value="fault"></el-option>
              <el-option label="性能报表" value="performance"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="applyFilter">应用筛选</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <!-- 报表预览卡片 -->
    <div class="reports-list">
      <el-card class="report-card" v-for="report in filteredReports" :key="report.id">
        <div class="report-header">
          <h3>{{ report.title }}</h3>
          <div class="report-actions">
            <el-dropdown trigger="click">
              <span class="el-dropdown-link">
                <i class="el-icon-more"></i>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="viewReport(report)">查看</el-dropdown-item>
                  <el-dropdown-item @click="downloadReport(report)">下载</el-dropdown-item>
                  <el-dropdown-item @click="shareReport(report)">分享</el-dropdown-item>
                  <el-dropdown-item @click="deleteReport(report)" class="text-danger">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        <div class="report-info">
          <div class="info-item">
            <span class="info-label">设备:</span>
            <span class="info-value">{{ getDeviceName(report.device) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">类型:</span>
            <span class="info-value">{{ getReportTypeName(report.type) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">生成时间:</span>
            <span class="info-value">{{ report.createTime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">时间范围:</span>
            <span class="info-value">{{ report.dateRange }}</span>
          </div>
        </div>
        
        <div class="report-thumbnail">
          <div class="thumbnail-placeholder" :class="'type-' + report.type">
            <i class="el-icon-document"></i>
            <span>{{ getReportTypeName(report.type) }}</span>
          </div>
        </div>
        
        <div class="report-footer">
          <el-button type="primary" size="small" @click="viewReport(report)">查看报表</el-button>
        </div>
      </el-card>
    </div>
    
    <!-- 报表统计面板 -->
    <el-card class="statistics-card">
      <template #header>
        <div class="card-header">
          <span>报表统计</span>
        </div>
      </template>
      
      <div class="statistics-content">
        <div class="statistics-chart-wrapper" ref="statisticsChart"></div>
        
        <div class="statistics-summary">
          <div class="summary-item">
            <div class="summary-label">总报表数</div>
            <div class="summary-value">{{ totalReports }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">运行报表</div>
            <div class="summary-value">{{ operationReports }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">维护报表</div>
            <div class="summary-value">{{ maintenanceReports }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">故障报表</div>
            <div class="summary-value">{{ faultReports }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">性能报表</div>
            <div class="summary-value">{{ performanceReports }}</div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 最近生成的报表 -->
    <el-card class="recent-reports-card">
      <template #header>
        <div class="card-header">
          <span>最近生成的报表</span>
          <el-button type="text" @click="refreshRecentReports">刷新</el-button>
        </div>
      </template>
      
      <el-table :data="recentReports" style="width: 100%">
        <el-table-column prop="title" label="报表名称" width="250"></el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            {{ getReportTypeName(scope.row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="device" label="设备" width="180">
          <template #default="scope">
            {{ getDeviceName(scope.row.device) }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="生成时间" width="180"></el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button type="text" size="small" @click="viewReport(scope.row)">查看</el-button>
            <el-button type="text" size="small" @click="downloadReport(scope.row)">下载</el-button>
            <el-button type="text" size="small" @click="shareReport(scope.row)">分享</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册echarts组件
echarts.use([
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
]);

// 状态变量
const filterForm = ref({
  dateRange: null,
  device: '',
  reportType: ''
});

// 设备选项
const deviceOptions = [
  { value: 'k60-001', label: 'K60发电机-001' },
  { value: 'heat-103', label: '热交换器-103' },
  { value: 'valve-205', label: '阀门系统-205' },
  { value: 'pump-054', label: '液压泵-054' },
  { value: 'rudder-a12', label: '舵机系统-A12' }
];

// 报表数据
const reports = ref([
  {
    id: 1,
    title: 'K60发电机性能报表',
    type: 'performance',
    device: 'k60-001',
    createTime: '2023-10-20 15:30',
    dateRange: '2023-10-01 至 2023-10-20'
  },
  {
    id: 2,
    title: '热交换器维护报表',
    type: 'maintenance',
    device: 'heat-103',
    createTime: '2023-10-18 09:45',
    dateRange: '2023-10-01 至 2023-10-18'
  },
  {
    id: 3,
    title: '阀门系统故障分析',
    type: 'fault',
    device: 'valve-205',
    createTime: '2023-10-15 14:20',
    dateRange: '2023-10-01 至 2023-10-15'
  },
  {
    id: 4,
    title: '液压泵运行状态报表',
    type: 'operation',
    device: 'pump-054',
    createTime: '2023-10-12 11:10',
    dateRange: '2023-10-01 至 2023-10-12'
  },
  {
    id: 5,
    title: '舵机系统性能分析',
    type: 'performance',
    device: 'rudder-a12',
    createTime: '2023-10-10 16:05',
    dateRange: '2023-10-01 至 2023-10-10'
  },
  {
    id: 6,
    title: 'K60发电机故障诊断',
    type: 'fault',
    device: 'k60-001',
    createTime: '2023-10-05 10:30',
    dateRange: '2023-09-20 至 2023-10-05'
  }
]);

// 图表引用
const statisticsChart = ref(null);

// 过滤后的报表列表
const filteredReports = computed(() => {
  let result = reports.value;
  
  if (filterForm.value.device) {
    result = result.filter(report => report.device === filterForm.value.device);
  }
  
  if (filterForm.value.reportType) {
    result = result.filter(report => report.type === filterForm.value.reportType);
  }
  
  if (filterForm.value.dateRange && filterForm.value.dateRange.length === 2) {
    const startDate = new Date(filterForm.value.dateRange[0]);
    const endDate = new Date(filterForm.value.dateRange[1]);
    
    result = result.filter(report => {
      const createDate = new Date(report.createTime);
      return createDate >= startDate && createDate <= endDate;
    });
  }
  
  return result;
});

// 最近生成的报表
const recentReports = computed(() => {
  return [...reports.value].sort((a, b) => {
    return new Date(b.createTime) - new Date(a.createTime);
  }).slice(0, 5);
});

// 报表统计
const totalReports = computed(() => reports.value.length);
const operationReports = computed(() => reports.value.filter(report => report.type === 'operation').length);
const maintenanceReports = computed(() => reports.value.filter(report => report.type === 'maintenance').length);
const faultReports = computed(() => reports.value.filter(report => report.type === 'fault').length);
const performanceReports = computed(() => reports.value.filter(report => report.type === 'performance').length);

// 应用筛选
const applyFilter = () => {
  console.log('应用筛选:', filterForm.value);
  // 实际应用中会调用API重新获取数据
};

// 重置筛选
const resetFilter = () => {
  filterForm.value = {
    dateRange: null,
    device: '',
    reportType: ''
  };
};

// 获取设备名称
const getDeviceName = (deviceId) => {
  const device = deviceOptions.find(item => item.value === deviceId);
  return device ? device.label : deviceId;
};

// 获取报表类型名称
const getReportTypeName = (type) => {
  switch (type) {
    case 'operation': return '运行报表';
    case 'maintenance': return '维护报表';
    case 'fault': return '故障报表';
    case 'performance': return '性能报表';
    default: return type;
  }
};

// 查看报表
const viewReport = (report) => {
  console.log('查看报表:', report.id);
  // 实际应用中会导航到报表详情页或打开预览对话框
};

// 下载报表
const downloadReport = (report) => {
  console.log('下载报表:', report.id);
  // 实际应用中会调用下载API
};

// 分享报表
const shareReport = (report) => {
  console.log('分享报表:', report.id);
  // 实际应用中会打开分享对话框
};

// 删除报表
const deleteReport = (report) => {
  console.log('删除报表:', report.id);
  // 实际应用中会弹出确认对话框
  reports.value = reports.value.filter(r => r.id !== report.id);
};

// 刷新最近报表
const refreshRecentReports = () => {
  console.log('刷新最近报表');
  // 实际应用中会调用API获取最新数据
};

// 初始化统计图表
const initStatisticsChart = () => {
  if (!statisticsChart.value) return;
  
  const chart = echarts.init(statisticsChart.value);
  
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
    series: [
      {
        name: '报表类型',
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
          { value: operationReports.value, name: '运行报表', itemStyle: { color: '#3182ce' } },
          { value: maintenanceReports.value, name: '维护报表', itemStyle: { color: '#38a169' } },
          { value: faultReports.value, name: '故障报表', itemStyle: { color: '#e53e3e' } },
          { value: performanceReports.value, name: '性能报表', itemStyle: { color: '#805ad5' } }
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

// 组件挂载
onMounted(() => {
  nextTick(() => {
    initStatisticsChart();
  });
});
</script>

<style scoped>
.digital-twin-reports {
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

.filter-card {
  background-color: #1e293b;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filter-form {
  padding: 10px;
}

.reports-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.report-card {
  background-color: #1e293b;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.report-header h3 {
  margin: 0;
  color: #e2e8f0;
  font-size: 16px;
}

.report-actions {
  cursor: pointer;
}

.el-icon-more:before {
  content: "⋮";
  font-size: 20px;
  color: #a0aec0;
}

.report-info {
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  margin-bottom: 5px;
}

.info-label {
  width: 80px;
  color: #a0aec0;
}

.info-value {
  color: #e2e8f0;
}

.report-thumbnail {
  margin-bottom: 15px;
}

.thumbnail-placeholder {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: white;
}

.thumbnail-placeholder i {
  font-size: 36px;
  margin-bottom: 10px;
}

.type-operation {
  background-color: rgba(49, 130, 206, 0.2);
  border: 1px solid #3182ce;
}

.type-maintenance {
  background-color: rgba(56, 161, 105, 0.2);
  border: 1px solid #38a169;
}

.type-fault {
  background-color: rgba(229, 62, 62, 0.2);
  border: 1px solid #e53e3e;
}

.type-performance {
  background-color: rgba(128, 90, 213, 0.2);
  border: 1px solid #805ad5;
}

.report-footer {
  display: flex;
  justify-content: center;
}

.statistics-card,
.recent-reports-card {
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

.statistics-content {
  display: flex;
}

.statistics-chart-wrapper {
  flex: 1;
  height: 250px;
}

.statistics-summary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 20px;
}

.summary-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.summary-label {
  width: 80px;
  color: #a0aec0;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
}

.text-danger {
  color: #e53e3e;
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

:deep(.el-table--enable-row-hover .el-table__body tr:hover>td) {
  background-color: #2c3e50;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .reports-list {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .statistics-content {
    flex-direction: column;
  }
  
  .statistics-summary {
    padding: 20px 0;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  
  .summary-item {
    width: 48%;
  }
}

@media (max-width: 768px) {
  .reports-list {
    grid-template-columns: 1fr;
  }
  
  .summary-item {
    width: 100%;
  }
}
</style> 