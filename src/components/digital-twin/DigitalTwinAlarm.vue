<template>
  <div class="digital-twin-alarm">
    <div class="page-header">
      <h2>告警管理</h2>
      <div class="action-buttons">
        <el-button type="primary" size="small" @click="refreshAlarms">刷新数据</el-button>
        <el-button type="success" size="small" @click="exportAlarms">导出记录</el-button>
      </div>
    </div>
    
    <!-- 告警统计 -->
    <div class="alarm-stats">
      <el-card class="stat-card">
        <div class="stat-content">
          <span class="stat-label">严重告警</span>
          <span class="stat-value error">{{ alarmStats.critical }}</span>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <span class="stat-label">警告告警</span>
          <span class="stat-value warning">{{ alarmStats.warning }}</span>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <span class="stat-label">注意告警</span>
          <span class="stat-value notice">{{ alarmStats.notice }}</span>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <span class="stat-label">总告警数</span>
          <span class="stat-value">{{ totalAlarms }}</span>
        </div>
      </el-card>
    </div>
    
    <!-- 告警过滤器 -->
    <el-card class="filter-card">
      <div class="filter-form">
        <el-form :inline="true" :model="filterForm" size="small">
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
          
          <el-form-item label="告警级别">
            <el-select v-model="filterForm.level" placeholder="选择级别" clearable>
              <el-option label="严重" value="critical"></el-option>
              <el-option label="警告" value="warning"></el-option>
              <el-option label="注意" value="notice"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="选择状态" clearable>
              <el-option label="未处理" value="unhandled"></el-option>
              <el-option label="处理中" value="processing"></el-option>
              <el-option label="已解决" value="resolved"></el-option>
              <el-option label="已忽略" value="ignored"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filterForm.timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间">
            </el-date-picker>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="applyFilter">应用筛选</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <!-- 告警列表 -->
    <el-card class="alarm-table-card">
      <template #header>
        <div class="card-header">
          <span>告警列表</span>
          <div class="table-controls">
            <el-input
              v-model="searchQuery"
              placeholder="搜索告警信息"
              prefix-icon="el-icon-search"
              clearable
              size="small"
              style="width: 220px"
            ></el-input>
            <el-button-group>
              <el-button 
                size="small" 
                type="primary" 
                @click="handleBatchProcess" 
                :disabled="!hasSelectedAlarms"
              >批量处理</el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click="handleBatchIgnore" 
                :disabled="!hasSelectedAlarms"
              >批量忽略</el-button>
            </el-button-group>
          </div>
        </div>
      </template>
      
      <el-table
        ref="alarmTable"
        :data="filteredAlarms"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        border
      >
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column type="expand">
          <template #default="props">
            <div class="alarm-detail">
              <div class="detail-item">
                <span class="detail-label">设备信息:</span>
                <span class="detail-value">{{ deviceInfo(props.row.device) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">详细描述:</span>
                <span class="detail-value">{{ props.row.description }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">推荐操作:</span>
                <span class="detail-value">{{ props.row.recommendation }}</span>
              </div>
              <div class="detail-item" v-if="props.row.solution">
                <span class="detail-label">解决方案:</span>
                <span class="detail-value">{{ props.row.solution }}</span>
              </div>
              <div class="detail-buttons">
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="viewDeviceDetails(props.row.device)"
                >查看设备</el-button>
                <el-button 
                  type="success" 
                  size="small" 
                  @click="viewHistoryAlarms(props.row.device)"
                >历史告警</el-button>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="时间" width="180"></el-table-column>
        <el-table-column prop="device" label="设备" width="150"></el-table-column>
        <el-table-column prop="level" label="级别" width="100">
          <template #default="scope">
            <el-tag 
              :type="getAlarmLevelType(scope.row.level)"
              effect="dark"
            >{{ scope.row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="告警信息"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag 
              :type="getAlarmStatusType(scope.row.status)"
            >{{ getAlarmStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button 
              v-if="scope.row.status === 'unhandled'"
              type="primary" 
              size="mini" 
              @click="handleAlarm(scope.row)"
            >处理</el-button>
            <el-button 
              v-if="scope.row.status === 'processing'"
              type="success" 
              size="mini" 
              @click="resolveAlarm(scope.row)"
            >解决</el-button>
            <el-button 
              v-if="['unhandled', 'processing'].includes(scope.row.status)"
              type="info" 
              size="mini" 
              @click="ignoreAlarm(scope.row)"
            >忽略</el-button>
            <el-button 
              type="danger" 
              size="mini" 
              @click="deleteAlarm(scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalFilteredAlarms"
        ></el-pagination>
      </div>
    </el-card>
    
    <!-- 处理告警对话框 -->
    <el-dialog
      title="处理告警"
      v-model="processDialogVisible"
      width="500px"
    >
      <el-form :model="processForm" label-width="100px">
        <el-form-item label="告警信息">
          <span>{{ currentAlarm ? currentAlarm.message : '' }}</span>
        </el-form-item>
        <el-form-item label="处理方案">
          <el-select v-model="processForm.solution" placeholder="选择解决方案">
            <el-option
              v-for="item in solutionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            type="textarea"
            v-model="processForm.comment"
            :rows="3"
            placeholder="请输入处理备注">
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="processDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitProcessForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// 告警统计数据
const alarmStats = ref({
  critical: 5,
  warning: 12,
  notice: 8
});

// 设备选项
const deviceOptions = [
  { value: 'device-001', label: 'K60发电机-001' },
  { value: 'device-002', label: '热交换器-103' },
  { value: 'device-003', label: '阀门系统-205' },
  { value: 'device-004', label: '液压泵-054' },
  { value: 'device-005', label: '舵机系统-A12' }
];

// 解决方案选项
const solutionOptions = [
  { value: 'restart', label: '重启设备' },
  { value: 'replace', label: '更换部件' },
  { value: 'adjust', label: '调整参数' },
  { value: 'maintenance', label: '安排维护' },
  { value: 'monitor', label: '持续监控' },
  { value: 'other', label: '其他方案' }
];

// 计算总告警数
const totalAlarms = computed(() => {
  return alarmStats.value.critical + alarmStats.value.warning + alarmStats.value.notice;
});

// 告警列表
const alarms = ref([]);
const selectedAlarms = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref('');

// 过滤表单
const filterForm = ref({
  device: '',
  level: '',
  status: '',
  timeRange: null
});

// 处理表单
const processDialogVisible = ref(false);
const processForm = ref({
  solution: '',
  comment: ''
});
const currentAlarm = ref(null);

// 计算是否有选中的告警
const hasSelectedAlarms = computed(() => {
  return selectedAlarms.value.length > 0;
});

// 过滤后的告警列表
const filteredAlarms = computed(() => {
  let result = alarms.value;
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(alarm => {
      return alarm.message.toLowerCase().includes(query) || 
             alarm.device.toLowerCase().includes(query) ||
             alarm.level.toLowerCase().includes(query);
    });
  }
  
  // 应用过滤条件
  if (filterForm.value.device) {
    result = result.filter(alarm => alarm.device === filterForm.value.device);
  }
  
  if (filterForm.value.level) {
    result = result.filter(alarm => alarm.level === filterForm.value.level);
  }
  
  if (filterForm.value.status) {
    result = result.filter(alarm => alarm.status === filterForm.value.status);
  }
  
  if (filterForm.value.timeRange && filterForm.value.timeRange.length === 2) {
    const startTime = filterForm.value.timeRange[0].getTime();
    const endTime = filterForm.value.timeRange[1].getTime();
    
    result = result.filter(alarm => {
      const alarmTime = new Date(alarm.timestamp).getTime();
      return alarmTime >= startTime && alarmTime <= endTime;
    });
  }
  
  // 分页处理
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  
  return result.slice(start, end);
});

// 过滤后的总告警数
const totalFilteredAlarms = computed(() => {
  return alarms.value.length;
});

// 获取设备详细信息
const deviceInfo = (deviceId) => {
  const device = deviceOptions.find(d => d.value === deviceId);
  return device ? `${device.label} (ID: ${deviceId})` : deviceId;
};

// 获取告警级别对应的类型
const getAlarmLevelType = (level) => {
  switch (level) {
    case 'critical': return 'danger';
    case 'warning': return 'warning';
    case 'notice': return 'info';
    default: return '';
  }
};

// 获取告警状态对应的类型
const getAlarmStatusType = (status) => {
  switch (status) {
    case 'unhandled': return 'danger';
    case 'processing': return 'warning';
    case 'resolved': return 'success';
    case 'ignored': return 'info';
    default: return '';
  }
};

// 获取告警状态对应的文本
const getAlarmStatusText = (status) => {
  switch (status) {
    case 'unhandled': return '未处理';
    case 'processing': return '处理中';
    case 'resolved': return '已解决';
    case 'ignored': return '已忽略';
    default: return status;
  }
};

// 刷新告警数据
const refreshAlarms = () => {
  // 实际应用中会调用API获取数据
  generateMockAlarms();
};

// 生成模拟告警数据
const generateMockAlarms = () => {
  const mockAlarms = [];
  const levels = ['critical', 'warning', 'notice'];
  const statuses = ['unhandled', 'processing', 'resolved', 'ignored'];
  const messages = [
    '温度过高',
    '压力异常',
    '振动超标',
    '油位过低',
    '电压波动',
    '数据通信中断',
    '传感器故障',
    '控制系统异常',
    '冷却系统效率下降',
    '运行参数偏离正常范围'
  ];
  
  // 生成50条模拟数据
  for (let i = 0; i < 50; i++) {
    const deviceIndex = Math.floor(Math.random() * deviceOptions.length);
    const levelIndex = Math.floor(Math.random() * levels.length);
    const statusIndex = Math.floor(Math.random() * statuses.length);
    const messageIndex = Math.floor(Math.random() * messages.length);
    
    // 生成过去30天内的随机时间
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    mockAlarms.push({
      id: `alarm-${i + 1}`,
      device: deviceOptions[deviceIndex].value,
      level: levels[levelIndex],
      status: statuses[statusIndex],
      message: `${deviceOptions[deviceIndex].label}: ${messages[messageIndex]}`,
      timestamp: date.toLocaleString(),
      description: `详细描述: ${deviceOptions[deviceIndex].label}设备${messages[messageIndex]}，可能导致设备性能下降或安全隐患。`,
      recommendation: '建议立即检查设备，排查故障原因，必要时联系技术支持。',
      solution: statuses[statusIndex] === 'resolved' ? '已重启设备并调整参数，设备恢复正常运行。' : ''
    });
  }
  
  alarms.value = mockAlarms;
  
  // 更新统计数据
  updateAlarmStats();
};

// 更新告警统计
const updateAlarmStats = () => {
  const stats = {
    critical: 0,
    warning: 0,
    notice: 0
  };
  
  alarms.value.forEach(alarm => {
    if (alarm.status !== 'resolved' && alarm.status !== 'ignored') {
      stats[alarm.level]++;
    }
  });
  
  alarmStats.value = stats;
};

// 导出告警记录
const exportAlarms = () => {
  console.log('导出告警记录');
  // 实际应用中会调用导出API
};

// 应用筛选
const applyFilter = () => {
  currentPage.value = 1;
  // 实际应用中可能会调用API重新获取数据
};

// 重置筛选
const resetFilter = () => {
  filterForm.value = {
    device: '',
    level: '',
    status: '',
    timeRange: null
  };
  currentPage.value = 1;
};

// 表格选择变化
const handleSelectionChange = (selection) => {
  selectedAlarms.value = selection;
};

// 处理告警
const handleAlarm = (alarm) => {
  currentAlarm.value = alarm;
  processForm.value = {
    solution: '',
    comment: ''
  };
  processDialogVisible.value = true;
};

// 提交处理表单
const submitProcessForm = () => {
  if (!currentAlarm.value) return;
  
  // 更新告警状态
  const alarm = alarms.value.find(a => a.id === currentAlarm.value.id);
  if (alarm) {
    alarm.status = 'processing';
    // 实际应用中会调用API更新状态
    
    // 更新统计数据
    updateAlarmStats();
  }
  
  processDialogVisible.value = false;
};

// 解决告警
const resolveAlarm = (alarm) => {
  const target = alarms.value.find(a => a.id === alarm.id);
  if (target) {
    target.status = 'resolved';
    target.solution = '已确认解决，设备恢复正常运行。';
    // 实际应用中会调用API更新状态
    
    // 更新统计数据
    updateAlarmStats();
  }
};

// 忽略告警
const ignoreAlarm = (alarm) => {
  const target = alarms.value.find(a => a.id === alarm.id);
  if (target) {
    target.status = 'ignored';
    // 实际应用中会调用API更新状态
    
    // 更新统计数据
    updateAlarmStats();
  }
};

// 删除告警
const deleteAlarm = (alarm) => {
  // 实际应用中会弹出确认对话框
  alarms.value = alarms.value.filter(a => a.id !== alarm.id);
  
  // 更新统计数据
  updateAlarmStats();
};

// 批量处理告警
const handleBatchProcess = () => {
  // 实际应用中会弹出批量处理对话框
  selectedAlarms.value.forEach(alarm => {
    const target = alarms.value.find(a => a.id === alarm.id);
    if (target && target.status === 'unhandled') {
      target.status = 'processing';
    }
  });
  
  // 更新统计数据
  updateAlarmStats();
};

// 批量忽略告警
const handleBatchIgnore = () => {
  // 实际应用中会弹出确认对话框
  selectedAlarms.value.forEach(alarm => {
    const target = alarms.value.find(a => a.id === alarm.id);
    if (target && ['unhandled', 'processing'].includes(target.status)) {
      target.status = 'ignored';
    }
  });
  
  // 更新统计数据
  updateAlarmStats();
};

// 查看设备详情
const viewDeviceDetails = (deviceId) => {
  console.log('查看设备详情:', deviceId);
  // 实际应用中会导航到设备详情页
};

// 查看历史告警
const viewHistoryAlarms = (deviceId) => {
  console.log('查看历史告警:', deviceId);
  // 实际应用中会弹出历史告警对话框或导航到历史页面
};

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size;
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
};

// 组件挂载时生成初始数据
onMounted(() => {
  generateMockAlarms();
});
</script>

<style scoped>
.digital-twin-alarm {
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

.alarm-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background-color: #1e293b;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
}

.stat-label {
  font-size: 14px;
  color: #a0aec0;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #ffffff;
}

.stat-value.error {
  color: #f56c6c;
}

.stat-value.warning {
  color: #e6a23c;
}

.stat-value.notice {
  color: #909399;
}

.filter-card,
.alarm-table-card {
  background-color: #1e293b;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filter-form {
  padding: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e2e8f0;
}

.table-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.alarm-detail {
  padding: 15px;
  background-color: #2d3748;
  border-radius: 4px;
}

.detail-item {
  margin-bottom: 10px;
}

.detail-label {
  font-weight: bold;
  margin-right: 10px;
  color: #a0aec0;
}

.detail-value {
  color: #e2e8f0;
}

.detail-buttons {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
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

:deep(.el-table--expand-icon-expanded) {
  transform: rotate(90deg);
}

:deep(.el-form-item__label) {
  color: #a0aec0;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  background-color: #2d3748;
  border-color: #4a5568;
  color: #e2e8f0;
}

:deep(.el-select-dropdown) {
  background-color: #2d3748;
  border-color: #4a5568;
}

:deep(.el-select-dropdown__item) {
  color: #e2e8f0;
}

:deep(.el-select-dropdown__item.hover, .el-select-dropdown__item:hover) {
  background-color: #3a4556;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .alarm-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .alarm-stats {
    grid-template-columns: 1fr;
  }
}
</style> 