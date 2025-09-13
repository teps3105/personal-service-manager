<template>
  <div class="service-management">
    <!-- Header with stats and actions -->
    <header class="management-header">
      <h2>服務管理</h2>
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-number">{{ servicesStore.totalServices }}</span>
          <span class="stat-label">總服務</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ servicesStore.activeServices }}</span>
          <span class="stat-label">運行中</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ servicesStore.inactiveServices }}</span>
          <span class="stat-label">已停止</span>
        </div>
      </div>
      <button @click="showCreateModal = true" class="add-service-btn">
        <span class="btn-icon">➕</span>
        <span>新增服務</span>
      </button>
    </header>

    <!-- Filters and Search -->
    <div class="controls-section">
      <div class="filters">
        <select v-model="statusFilter" class="filter-select">
          <option value="">所有狀態</option>
          <option value="active">運行中</option>
          <option value="inactive">已停止</option>
          <option value="completed">已完成</option>
          <option value="error">錯誤</option>
        </select>
        
        <select v-model="typeFilter" class="filter-select">
          <option value="">所有類型</option>
          <option value="general">一般</option>
          <option value="http">HTTP</option>
          <option value="tcp">TCP</option>
          <option value="script">腳本</option>
          <option value="process">進程</option>
          <option value="api">API</option>
        </select>
        
        <select v-model="priorityFilter" class="filter-select">
          <option value="">所有優先級</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </div>
      
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索服務名稱或描述..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Services List -->
    <div class="services-container">
      <div v-if="servicesStore.loading" class="loading-state">
        <div class="loading-spinner">🔄</div>
        <p>加載中...</p>
      </div>
      
      <div v-else-if="servicesStore.error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ servicesStore.error }}</p>
      </div>
      
      <div v-else-if="filteredServices.length === 0" class="empty-state">
        <div class="empty-icon">📱</div>
        <h3>暫無服務</h3>
        <p>點擊"新增服務"按鈕創建您的第一個服務</p>
      </div>
      
      <div v-else class="services-grid">
        <div
          v-for="service in filteredServices"
          :key="service.id"
          :class="['service-card', `status-${service.status}`]"
          @click="selectService(service)"
        >
          <div class="service-header">
            <div class="service-icon">
              {{ getServiceIcon(service.type) }}
            </div>
            <div class="service-title">
              <h3>{{ service.name }}</h3>
              <p class="service-description">{{ service.description || '無描述' }}</p>
            </div>
          </div>
          
          <div class="service-meta">
            <span :class="['status-badge', service.status]">
              {{ getStatusText(service.status) }}
            </span>
            <span :class="['priority-badge', service.priority]">
              {{ getPriorityText(service.priority) }}
            </span>
          </div>
          
          <div class="service-actions">
            <button
              @click.stop="toggleServiceStatus(service)"
              :class="['action-btn', service.status === 'active' ? 'stop' : 'start']"
              :title="service.status === 'active' ? '停止服務' : '啟動服務'"
            >
              {{ service.status === 'active' ? '⏹' : '▶' }}
            </button>
            <button
              @click.stop="editService(service)"
              class="action-btn edit"
              title="編輯服務"
            >
              ✏️
            </button>
            <button
              @click.stop="deleteService(service)"
              class="action-btn delete"
              title="刪除服務"
            >
              🗑️
            </button>
          </div>
          
          <div v-if="service.tags.length > 0" class="service-tags">
            <span
              v-for="tag in service.tags"
              :key="tag"
              class="tag"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Service Modal -->
    <div v-if="showCreateModal || selectedService" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedService ? '編輯服務' : '新增服務' }}</h2>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        
        <form @submit.prevent="saveService" class="service-form">
          <div class="form-group">
            <label for="serviceName">服務名稱 *</label>
            <input
              id="serviceName"
              v-model="formData.name"
              type="text"
              placeholder="請輸入服務名稱"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="serviceDescription">服務描述</label>
            <textarea
              id="serviceDescription"
              v-model="formData.description"
              placeholder="請輸入服務描述（可選）"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="serviceType">服務類型</label>
              <select id="serviceType" v-model="formData.type">
                <option value="general">一般</option>
                <option value="http">HTTP</option>
                <option value="tcp">TCP</option>
                <option value="script">腳本</option>
                <option value="process">進程</option>
                <option value="api">API</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="serviceStatus">服務狀態</label>
              <select id="serviceStatus" v-model="formData.status">
                <option value="active">運行中</option>
                <option value="inactive">已停止</option>
                <option value="completed">已完成</option>
                <option value="error">錯誤</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="servicePriority">優先級</label>
            <select id="servicePriority" v-model="formData.priority">
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="serviceTags">標籤（用逗號分隔）</label>
            <input
              id="serviceTags"
              v-model="formData.tagsString"
              type="text"
              placeholder="例如: web, api, 監控"
            />
          </div>
          
          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn">
              取消
            </button>
            <button type="submit" :disabled="!formData.name" class="save-btn">
              {{ selectedService ? '更新服務' : '創建服務' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useServicesStore } from '@/stores/services'

const servicesStore = useServicesStore()

// Modal state
const showCreateModal = ref(false)
const selectedService = ref<any>(null)

// Form data
const formData = reactive({
  name: '',
  description: '',
  type: 'general',
  status: 'active',
  priority: 'medium',
  tags: [] as string[],
  tagsString: ''
})

// Filters
const statusFilter = ref('')
const typeFilter = ref('')
const priorityFilter = ref('')
const searchQuery = ref('')

// Computed properties
const filteredServices = computed(() => {
  let filtered = servicesStore.services

  // Apply filters
  if (statusFilter.value) {
    filtered = filtered.filter((service) => service.status === statusFilter.value)
  }
  
  if (typeFilter.value) {
    filtered = filtered.filter((service) => service.type === typeFilter.value)
  }
  
  if (priorityFilter.value) {
    filtered = filtered.filter((service) => service.priority === priorityFilter.value)
  }
  
  // Apply search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((service) =>
      service.name.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

// Methods
const selectService = (service: any) => {
  // Navigate to service details (will be implemented later)
  console.log('Selected service:', service)
}

const toggleServiceStatus = async (service: any) => {
  try {
    const newStatus = service.status === 'active' ? 'inactive' : 'active'
    await servicesStore.updateService(service.id, { status: newStatus })
  } catch (error) {
    console.error('Failed to toggle service status:', error)
  }
}

const editService = (service: any) => {
  selectedService.value = service
  Object.assign(formData, {
    ...service,
    tagsString: service.tags.join(', ')
  })
}

const deleteService = async (service: any) => {
  if (!confirm(`確定要刪除服務"${service.name}"嗎？`)) {
    return
  }
  
  try {
    await servicesStore.deleteService(service.id)
  } catch (error) {
    console.error('Failed to delete service:', error)
  }
}

const saveService = async () => {
  try {
    // Parse tags
    const tags = formData.tagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    
    const serviceData = {
      ...formData,
      tags
    }
    
    if (selectedService.value) {
      await servicesStore.updateService(selectedService.value.id, serviceData)
    } else {
      await servicesStore.createService(serviceData)
    }
    
    closeModal()
  } catch (error) {
    console.error('Failed to save service:', error)
  }
}

const closeModal = () => {
  selectedService.value = null
  showCreateModal.value = false
  resetForm()
}

const resetForm = () => {
  Object.assign(formData, {
    name: '',
    description: '',
    type: 'general',
    status: 'active',
    priority: 'medium',
    tags: [],
    tagsString: ''
  })
}

// Helper functions
const getServiceIcon = (type: string) => {
  const icons = {
    general: '📱',
    http: '🌐',
    tcp: '🔌',
    script: '📜',
    process: '⚙️',
    api: '🔗',
    default: '❓'
  }
  return icons[type as keyof typeof icons] || icons.default
}

const getStatusText = (status: string) => {
  const statusMap = {
    active: '運行中',
    inactive: '已停止',
    completed: '已完成',
    error: '錯誤'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getPriorityText = (priority: string) => {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority as keyof typeof priorityMap] || priority
}

// Lifecycle
onMounted(() => {
  servicesStore.fetchServices()
})
</script>

<style scoped>
.service-management {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
}

.management-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.8rem;
  font-weight: 700;
}

.stats-summary {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  min-width: 80px;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #007bff;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
}

.add-service-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-service-btn:hover {
  background: #0056b3;
}

.controls-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.filters {
  display: flex;
  gap: 1rem;
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
}

.services-container {
  min-height: 400px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  text-align: center;
}

.loading-spinner,
.error-icon,
.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.loading-state p,
.error-state p,
.empty-state p {
  color: #666;
  font-size: 1.1rem;
  margin: 0;
}

.error-state p {
  color: #dc3545;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.service-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 4px solid #007bff;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.service-card.status-inactive {
  border-left-color: #6c757d;
}

.service-card.status-completed {
  border-left-color: #28a745;
}

.service-card.status-error {
  border-left-color: #dc3545;
}

.service-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.service-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.service-title h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
}

.service-description {
  margin: 0.25rem 0 0 0;
  color: #666;
  font-size: 0.9rem;
}

.service-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-badge,
.priority-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge {
  background: #e3f2fd;
  color: #004085;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #856404;
}

.status-badge.completed {
  background: #d1e7dd;
  color: #0f5132;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.priority-badge {
  background: #fff3cd;
  color: #856404;
}

.priority-badge.high {
  background: #f8d7da;
  color: #721c24;
}

.priority-badge.medium {
  background: #fff3cd;
  color: #856404;
}

.priority-badge.low {
  background: #d1e7dd;
  color: #0f5132;
}

.service-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8f9fa;
}

.action-btn.stop {
  border-color: #dc3545;
  color: #dc3545;
}

.action-btn.stop:hover {
  background: #dc3545;
  color: white;
}

.action-btn.start {
  border-color: #28a745;
  color: #28a745;
}

.action-btn.start:hover {
  background: #28a745;
  color: white;
}

.action-btn.edit:hover {
  background: #007bff;
  color: white;
}

.action-btn.delete:hover {
  background: #dc3545;
  color: white;
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.tag {
  background: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
}

.service-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.cancel-btn,
.save-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn {
  background: #f8f9fa;
  color: #333;
}

.cancel-btn:hover {
  background: #e9ecef;
}

.save-btn {
  background: #007bff;
  color: white;
}

.save-btn:hover {
  background: #0056b3;
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>