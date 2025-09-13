<template>
  <div class="home-view">
    <div v-if="authStore.loading" class="loading">
      載入中...
    </div>
    
    <div v-else-if="!authStore.isAuthenticated" class="auth-container">
      <div class="auth-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          登錄
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          註冊
        </button>
      </div>
      
      <div class="auth-form-container">
        <component :is="activeComponent" />
      </div>
    </div>
    
    <div v-else class="dashboard">
      <header class="dashboard-header">
        <h1>個人服務管理器</h1>
        <div class="user-info">
          <span class="welcome">歡迎，{{ authStore.userDisplayName }}</span>
          <button @click="handleLogout" class="logout-btn">
            登出
          </button>
        </div>
      </header>
      
      <div class="dashboard-content">
        <div class="quick-actions">
          <h3>快速操作</h3>
          <div class="action-buttons">
            <button 
              @click="currentView = 'services'"
              :class="['action-btn', { active: currentView === 'services' }]"
            >
              <span class="btn-icon">📱</span>
              <span>服務管理</span>
            </button>
            <button 
              @click="currentView = 'notifications'"
              :class="['action-btn', { active: currentView === 'notifications' }]"
            >
              <span class="btn-icon">🔔</span>
              <span>通知管理</span>
            </button>
            <button 
              @click="currentView = 'settings'"
              :class="['action-btn', { active: currentView === 'settings' }]"
            >
              <span class="btn-icon">⚙️</span>
              <span>用戶設置</span>
            </button>
          </div>
        </div>
        
        <!-- Service Management View -->
        <div v-if="currentView === 'services'" class="view-content">
          <ServiceManagement />
        </div>
        
        <!-- Notifications View -->
        <div v-else-if="currentView === 'notifications'" class="view-content">
          <div class="coming-soon">
            <div class="icon">🔔</div>
            <h3>通知管理</h3>
            <p>通知功能開發中，敬請期待...</p>
          </div>
        </div>
        
        <!-- Settings View -->
        <div v-else-if="currentView === 'settings'" class="view-content">
          <div class="coming-soon">
            <div class="icon">⚙️</div>
            <h3>用戶設置</h3>
            <p>用戶設置功能開發中，敬請期待...</p>
          </div>
        </div>
        
        <!-- Default Dashboard View -->
        <div v-else class="view-content">
          <div class="recent-services">
            <h3>最近服務</h3>
            <div class="services-list">
              <div v-if="servicesStore.services.length === 0" class="service-item placeholder">
                <div class="service-icon">📱</div>
                <div class="service-info">
                  <h4>暫無服務</h4>
                  <p>點擊"服務管理"開始添加您的第一個服務</p>
                </div>
              </div>
              
              <div 
                v-for="service in servicesStore.services.slice(0, 5)" 
                :key="service.id"
                :class="['service-item', `status-${service.status}`]"
                @click="currentView = 'services'"
              >
                <div class="service-icon">
                  {{ getServiceIcon(service.type) }}
                </div>
                <div class="service-info">
                  <h4>{{ service.name }}</h4>
                  <p>{{ service.description || '無描述' }}</p>
                </div>
                <span :class="['status-badge', service.status]">
                  {{ getStatusText(service.status) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="dashboard-stats">
            <h3>服務統計</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">{{ servicesStore.totalServices }}</div>
                <div class="stat-label">總服務</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">{{ servicesStore.activeServices }}</div>
                <div class="stat-label">運行中</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">{{ servicesStore.inactiveServices }}</div>
                <div class="stat-label">已停止</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">{{ servicesStore.servicesByStatus.completed || 0 }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useServicesStore } from '@/stores/services'
import LoginForm from '@/components/auth/LoginForm.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import ServiceManagement from '@/components/ServiceManagement.vue'

const authStore = useAuthStore()
const servicesStore = useServicesStore()

const activeTab = ref<'login' | 'register'>('login')
const currentView = ref<'dashboard' | 'services' | 'notifications' | 'settings'>('dashboard')

const activeComponent = computed(() => {
  return activeTab.value === 'login' ? LoginForm : RegisterForm
})

const handleLogout = async () => {
  await authStore.logout()
  currentView.value = 'dashboard'
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

// Watch for authentication changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
    currentView.value = 'dashboard'
  } else {
    currentView.value = 'dashboard'
  }
})

// Initialize auth state when component mounts
onMounted(() => {
  authStore.initializeAuth()
})

// Fetch services when authenticated and on services view
watch([() => authStore.isAuthenticated, () => currentView.value], ([isAuthenticated, view]) => {
  if (isAuthenticated && (view === 'services' || view === 'dashboard')) {
    servicesStore.fetchServices()
  }
})
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.auth-container {
  max-width: 450px;
  margin: 0 auto;
  margin-top: 4rem;
}

.auth-tabs {
  display: flex;
  background: white;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: #f8f9fa;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: white;
  color: #007bff;
}

.tab-btn:hover:not(.active) {
  background: #e9ecef;
}

.auth-form-container {
  background: white;
  border-radius: 0 0 8px 8px;
}

.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.dashboard-header {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.welcome {
  font-size: 1.1rem;
  font-weight: 500;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.dashboard-content {
  padding: 2rem;
}

.quick-actions {
  margin-bottom: 2rem;
}

.quick-actions h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.3rem;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  color: #333;
}

.action-btn:hover {
  background: #e9ecef;
  border-color: #007bff;
  color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-icon {
  font-size: 2rem;
}

.recent-services {
  margin-bottom: 2rem;
}

.recent-services h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.3rem;
}

.services-list {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.service-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
  cursor: pointer;
  border-left: 4px solid #007bff;
}

.service-item:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.service-item.status-inactive {
  border-left-color: #6c757d;
}

.service-item.status-completed {
  border-left-color: #28a745;
}

.service-item.status-error {
  border-left-color: #dc3545;
}

.service-icon {
  font-size: 2.5rem;
}

.service-info h4 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.service-info p {
  margin: 0.25rem 0 0 0;
  color: #666;
  font-size: 0.9rem;
}

.status-badge {
  margin-left: auto;
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

.placeholder {
  opacity: 0.7;
}

.dashboard-stats {
  margin-bottom: 2rem;
}

.dashboard-stats h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #007bff;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.view-content {
  min-height: 400px;
}

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  text-align: center;
}

.coming-soon .icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.coming-soon h3 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.coming-soon p {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

.loading {
  text-align: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: white;
}
</style>