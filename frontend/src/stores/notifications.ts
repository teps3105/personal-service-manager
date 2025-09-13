import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Notification {
  id: string
  user_id: string
  service_id: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  provider: string
  status: 'unread' | 'read' | 'pending' | 'sent' | 'failed'
  response_data?: Record<string, any>
  error_message?: string
  metadata: Record<string, any>
  created_at: string
  read_at?: string
}

interface NotificationStats {
  total: number
  unread: number
  read: number
  pending: number
  sent: number
  failed: number
  high_priority: number
  medium_priority: number
  low_priority: number
  by_service: Record<string, number>
}

interface CreateNotificationRequest {
  service_id: string
  title: string
  message: string
  priority?: Notification['priority']
  metadata?: Record<string, any>
}

interface SendNotificationRequest {
  service_id: string
  title: string
  message: string
  priority?: Notification['priority']
  config?: Record<string, any>
}

interface NtfyConfig {
  url: string
  topic: string
  defaultPriority: Notification['priority']
  rateLimit: number
  timeout: number
  username?: string
  password?: string
}

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    notifications: [] as Notification[],
    stats: {
      total: 0,
      unread: 0,
      read: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      high_priority: 0,
      medium_priority: 0,
      low_priority: 0,
      by_service: {}
    } as NotificationStats,
    ntfyConfig: null as NtfyConfig | null,
    loading: false,
    error: null as string | null
  }),

  getters: {
    unreadNotifications: (state) => 
      state.notifications.filter((n) => n.status === 'unread'),
    
    recentNotifications: (state) => 
      state.notifications.slice(0, 10),
    
    notificationsByService: (state) => (serviceId: string) =>
      state.notifications.filter((n) => n.service_id === serviceId),
    
    highPriorityNotifications: (state) =>
      state.notifications.filter((n) => n.priority === 'high' || n.priority === 'critical'),
    
    failedNotifications: (state) =>
      state.notifications.filter((n) => n.status === 'failed'),
    
    hasUnread: (state) => state.stats.unread > 0,
    
    hasFailed: (state) => state.stats.failed > 0
  },

  actions: {
    setLoading() {
      this.loading = true
      this.error = null
    },

    setError(error: string) {
      this.error = error
      this.loading = false
    },

    setNotifications(notifications: Notification[]) {
      this.notifications = notifications
    },

    setStats(stats: NotificationStats) {
      this.stats = stats
    },

    setNtfyConfig(config: NtfyConfig) {
      this.ntfyConfig = config
    },

    async fetchNotifications(options: {
      limit?: number
      offset?: number
      status?: string
      priority?: string
      service_id?: string
    } = {}) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const params = new URLSearchParams()
        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value))
          }
        })

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch notifications')
        }

        this.setNotifications(data)
        await this.fetchStats()
      } catch (error: any) {
        this.setError(error.message || 'Failed to fetch notifications')
        throw error
      }
    },

    async fetchStats() {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch notification statistics')
        }

        this.setStats(data)
      } catch (error: any) {
        console.error('Failed to fetch notification stats:', error)
      }
    },

    async fetchNtfyConfig() {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ntfy-config`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          // Config might not exist, will create default
          return
        }

        this.setNtfyConfig(data.config)
      } catch (error: any) {
        console.error('Failed to fetch ntfy config:', error)
      }
    },

    async createNotification(notificationData: CreateNotificationRequest) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(notificationData)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create notification')
        }

        // Add new notification to top of list
        this.notifications.unshift(data.notification)
        
        // Update stats
        this.stats.total++
        if (data.notification.status === 'unread') {
          this.stats.unread++
        } else if (data.notification.status === 'pending') {
          this.stats.pending++
        }

        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to create notification')
        throw error
      }
    },

    async sendNotification(notificationData: SendNotificationRequest) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(notificationData)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send notification')
        }

        // Add notification to list
        this.notifications.unshift(data.notification)
        
        // Update stats
        this.stats.total++
        if (data.notification.status === 'sent') {
          this.stats.sent++
        } else if (data.notification.status === 'failed') {
          this.stats.failed++
        }

        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to send notification')
        throw error
      }
    },

    async updateNotification(notificationId: string, updateData: {
      title?: string
      message?: string
      priority?: Notification['priority']
      status?: Notification['status']
      metadata?: Record<string, any>
    }) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/${notificationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update notification')
        }

        // Update notification in list
        const index = this.notifications.findIndex((n) => n.id === notificationId)
        if (index !== -1) {
          const oldNotification = this.notifications[index]
          const updatedNotification = { ...oldNotification, ...data.notification }
          this.notifications[index] = updatedNotification

          // Update stats based on status change
          if (updateData.status && updateData.status !== oldNotification.status) {
            if (oldNotification.status === 'unread') {
              this.stats.unread--
            } else if (oldNotification.status === 'pending') {
              this.stats.pending--
            } else if (oldNotification.status === 'sent') {
              this.stats.sent--
            } else if (oldNotification.status === 'failed') {
              this.stats.failed--
            }

            if (updateData.status === 'unread') {
              this.stats.unread++
            } else if (updateData.status === 'pending') {
              this.stats.pending++
            } else if (updateData.status === 'sent') {
              this.stats.sent++
            } else if (updateData.status === 'failed') {
              this.stats.failed++
            }
          }
        }

        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to update notification')
        throw error
      }
    },

    async deleteNotification(notificationId: string) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete notification')
        }

        // Remove notification from list
        const index = this.notifications.findIndex((n) => n.id === notificationId)
        if (index !== -1) {
          const notification = this.notifications[index]
          this.notifications.splice(index, 1)

          // Update stats
          this.stats.total--
          if (notification.status === 'unread') {
            this.stats.unread--
          } else if (notification.status === 'pending') {
            this.stats.pending--
          } else if (notification.status === 'sent') {
            this.stats.sent--
          } else if (notification.status === 'failed') {
            this.stats.failed--
          }
        }

        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to delete notification')
        throw error
      }
    },

    async markAsRead(notificationId: string) {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to mark notification as read')
        }

        // Update notification in list
        const index = this.notifications.findIndex((n) => n.id === notificationId)
        if (index !== -1) {
          this.notifications[index] = { ...this.notifications[index], status: 'read', read_at: new Date().toISOString() }
          this.stats.unread--
          this.stats.read++
        }

        return data
      } catch (error: any) {
        console.error('Failed to mark notification as read:', error)
        throw error
      }
    },

    async markAllAsRead() {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/read-all`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to mark all notifications as read')
        }

        // Update all unread notifications
        const unreadCount = this.stats.unread
        this.notifications.forEach((notification, index) => {
          if (notification.status === 'unread') {
            this.notifications[index] = { 
              ...notification, 
              status: 'read', 
              read_at: new Date().toISOString() 
            }
          }
        })

        this.stats.unread = 0
        this.stats.read += unreadCount

        return data
      } catch (error: any) {
        console.error('Failed to mark all notifications as read:', error)
        throw error
      }
    },

    async updateNtfyConfig(config: Partial<NtfyConfig>) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ntfy-config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ config })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update ntfy config')
        }

        this.setNtfyConfig({ ...this.ntfyConfig, ...config } as NtfyConfig)
        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to update ntfy config')
        throw error
      }
    },

    filterNotifications(options: {
      status?: string
      priority?: string
      service_id?: string
      search?: string
    } = {}) {
      return this.notifications.filter((notification) => {
        // Status filter
        const matchesStatus = options.status 
          ? notification.status === options.status 
          : true

        // Priority filter
        const matchesPriority = options.priority 
          ? notification.priority === options.priority 
          : true

        // Service filter
        const matchesService = options.service_id 
          ? notification.service_id === options.service_id 
          : true

        // Search filter
        const matchesSearch = options.search?.trim()
          ? notification.title.toLowerCase().includes(options.search.toLowerCase()) ||
            notification.message.toLowerCase().includes(options.search.toLowerCase())
          : true

        return matchesStatus && matchesPriority && matchesService && matchesSearch
      })
    },

    clearError() {
      this.error = null
    }
  }
})