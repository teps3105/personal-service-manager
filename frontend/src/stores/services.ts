import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Service {
  id: string
  user_id: string
  name: string
  description?: string
  type: 'general' | 'http' | 'tcp' | 'script' | 'process' | 'api'
  status: 'active' | 'inactive' | 'completed' | 'error'
  priority: 'low' | 'medium' | 'high'
  config: Record<string, any>
  metadata: Record<string, any>
  tags: string[]
  created_at: string
  updated_at: string
}

interface ServiceStats {
  total: number
  active: number
  inactive: number
  completed: number
  high_priority: number
  medium_priority: number
  low_priority: number
  by_type: Record<string, number>
}

interface CreateServiceRequest {
  name: string
  description?: string
  type?: Service['type']
  status?: Service['status']
  priority?: Service['priority']
  config?: Record<string, any>
  metadata?: Record<string, any>
  tags?: string[]
}

interface UpdateServiceRequest {
  name?: string
  description?: string
  type?: Service['type']
  status?: Service['status']
  priority?: Service['priority']
  config?: Record<string, any>
  metadata?: Record<string, any>
  tags?: string[]
}

export const useServicesStore = defineStore('services', {
  state: () => ({
    services: [] as Service[],
    stats: {
      total: 0,
      active: 0,
      inactive: 0,
      completed: 0,
      high_priority: 0,
      medium_priority: 0,
      low_priority: 0,
      by_type: {}
    } as ServiceStats,
    loading: false,
    error: null as string | null
  }),

  getters: {
    totalServices: (state) => state.stats.total,
    activeServices: (state) => state.stats.active,
    inactiveServices: (state) => state.stats.inactive,
    servicesByType: (state) => state.stats.by_type,
    servicesByStatus: (state) => ({
      active: state.stats.active,
      inactive: state.stats.inactive,
      completed: state.stats.completed,
      error: state.services.filter((s) => s.status === 'error').length
    })
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

    setServices(services: Service[]) {
      this.services = services
    },

    setStats(stats: ServiceStats) {
      this.stats = stats
    },

    async fetchServices() {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch services')
        }

        this.setServices(data)
        await this.fetchStats()
      } catch (error: any) {
        this.setError(error.message || 'Failed to fetch services')
        throw error
      }
    },

    async fetchStats() {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch service statistics')
        }

        this.setStats(data)
      } catch (error: any) {
        console.error('Failed to fetch service stats:', error)
      }
    },

    async createService(serviceData: CreateServiceRequest) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(serviceData)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create service')
        }

        // Add new service to the list
        this.services.unshift(data.service)
        
        // Update stats
        this.stats.total++
        if (data.service.status === 'active') {
          this.stats.active++
        } else if (data.service.status === 'inactive') {
          this.stats.inactive++
        } else if (data.service.status === 'completed') {
          this.stats.completed++
        }

        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to create service')
        throw error
      }
    },

    async updateService(serviceId: string, updateData: UpdateServiceRequest) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/${serviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update service')
        }

        // Update service in the list
        const index = this.services.findIndex((s) => s.id === serviceId)
        if (index !== -1) {
          const oldService = this.services[index]
          const updatedService = { ...oldService, ...data.service }
          this.services[index] = updatedService

          // Update stats based on status change
          if (updateData.status && updateData.status !== oldService.status) {
            if (oldService.status === 'active') {
              this.stats.active--
            } else if (oldService.status === 'inactive') {
              this.stats.inactive--
            } else if (oldService.status === 'completed') {
              this.stats.completed--
            }

            if (updateData.status === 'active') {
              this.stats.active++
            } else if (updateData.status === 'inactive') {
              this.stats.inactive++
            } else if (updateData.status === 'completed') {
              this.stats.completed++
            }
          }
        }

        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to update service')
        throw error
      }
    },

    async deleteService(serviceId: string) {
      this.setLoading()

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/${serviceId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete service')
        }

        // Remove service from the list
        const index = this.services.findIndex((s) => s.id === serviceId)
        if (index !== -1) {
          const service = this.services[index]
          this.services.splice(index, 1)

          // Update stats
          this.stats.total--
          if (service.status === 'active') {
            this.stats.active--
          } else if (service.status === 'inactive') {
            this.stats.inactive--
          } else if (service.status === 'completed') {
            this.stats.completed--
          }
        }

        this.loading = false
        return data
      } catch (error: any) {
        this.setError(error.message || 'Failed to delete service')
        throw error
      }
    },

    async addMonitoringLog(serviceId: string, logData: {
      status: 'success' | 'failed' | 'timeout' | 'error'
      response_time?: number
      error_message?: string
      metadata?: Record<string, any>
    }) {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/${serviceId}/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(logData)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add monitoring log')
        }

        return data
      } catch (error: any) {
        console.error('Failed to add monitoring log:', error)
        throw error
      }
    },

    searchServices(query: string, filters: {
      type?: string
      status?: string
      priority?: string
      tags?: string[]
    }) {
      if (!query.trim() && !Object.values(filters).some(Boolean)) {
        return this.services
      }

      return this.services.filter((service) => {
        // Text search
        const matchesSearch = query.trim()
          ? service.name.toLowerCase().includes(query.toLowerCase()) ||
            service.description?.toLowerCase().includes(query.toLowerCase())
          : true

        // Type filter
        const matchesType = filters.type ? service.type === filters.type : true

        // Status filter
        const matchesStatus = filters.status ? service.status === filters.status : true

        // Priority filter
        const matchesPriority = filters.priority ? service.priority === filters.priority : true

        // Tags filter
        const matchesTags = filters.tags && filters.tags.length > 0
          ? filters.tags.some((tag) => service.tags.includes(tag))
          : true

        return matchesSearch && matchesType && matchesStatus && matchesPriority && matchesTags
      })
    },

    clearError() {
      this.error = null
    }
  }
})