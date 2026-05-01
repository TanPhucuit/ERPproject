import axios, { AxiosInstance, AxiosError } from 'axios'
import { API_BASE_URL } from '../config/api'
import * as mockData from './mockData'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Use real backend by default. Set VITE_USE_MOCK_API=true only for offline UI demos.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

class ApiClient {
  private client: AxiosInstance
  private useMockApi: boolean

  constructor(baseURL: string = API_BASE_URL) {
    this.useMockApi = USE_MOCK_API
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    // Add interceptor for auth tokens
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Only redirect to home if backend is enabled and we get 401
        if (error.response?.status === 401 && !this.useMockApi) {
          localStorage.removeItem('auth_token')
          window.location.href = '/'
        }
        return Promise.reject(error)
      }
    )
  }

  private getMockResponse<T>(url: string, method: string = 'GET', data?: any): T | null {
    // Normalize endpoint: remove leading/trailing slashes and /api/ prefix
    const endpoint = url
      .replace(/^\/api\//, '')
      .replace(/^\//, '')
      .toLowerCase()
      .split('?')[0] // Remove query params

    // Auth endpoints
    if (endpoint.includes('auth/login')) {
      return {
        success: true,
        token: mockData.mockToken,
        user: mockData.mockUser,
      } as any
    }
    if (endpoint.includes('auth/user')) {
      return mockData.mockUser as any
    }
    if (endpoint.includes('auth/logout')) {
      return { success: true } as any
    }

    // Customer endpoints
    if (endpoint === 'customers' && method === 'GET') {
      return mockData.mockCustomers as any
    }
    if (endpoint.match(/^customers\/\w+/) && method === 'GET') {
      return mockData.mockCustomers[0] as any
    }

    // Product endpoints
    if (endpoint === 'products' && method === 'GET') {
      return mockData.mockProducts as any
    }
    if (endpoint === 'product-categories' && method === 'GET') {
      return ['Software', 'Service', 'Consulting'] as any
    }
    if (endpoint.match(/^products\/\w+/) && method === 'GET') {
      return mockData.mockProducts[0] as any
    }

    // Sales order endpoints
    if (endpoint === 'sales-orders' && method === 'GET') {
      return mockData.mockSalesOrders as any
    }
    if (endpoint.match(/^sales-orders\/\w+/) && method === 'GET') {
      return mockData.mockSalesOrders[0] as any
    }

    // Inventory endpoints
    if (endpoint === 'inventory' && method === 'GET') {
      return mockData.mockInventoryItems as any
    }
    if (endpoint.includes('stock-levels')) {
      return mockData.mockInventoryItems as any
    }
    if (endpoint.includes('warehouses')) {
      return [
        { id: 'wh-1', name: 'Main Warehouse', location: 'Ho Chi Minh City' },
        { id: 'wh-2', name: 'Secondary Warehouse', location: 'Binh Duong' },
      ] as any
    }

    // Metrics endpoints
    if (endpoint === 'metrics/dashboard' || endpoint === 'metrics' || endpoint.includes('metrics')) {
      return mockData.mockMetrics as any
    }

    // Quotation endpoints
    if (endpoint.includes('quotation')) {
      return mockData.mockQuotations as any
    }

    // Purchase order endpoints
    if (endpoint.includes('purchase-order')) {
      return mockData.mockPurchaseOrders as any
    }

    // Lead endpoints (CRM)
    if (endpoint === 'crm/leads' || endpoint === 'leads') {
      return mockData.mockLeads as any
    }
    if (endpoint === 'leads/by-stage') {
      return {
        qualified: mockData.mockLeads.filter((lead) => lead.status === 'qualified'),
        contacted: mockData.mockLeads.filter((lead) => lead.status === 'contacted'),
      } as any
    }
    if (endpoint.includes('accounting/invoices')) {
      return method === 'GET' ? { data: mockData.mockInvoices } as any : data as any
    }
    if (endpoint.includes('accounting/payments')) {
      return method === 'GET' ? { data: mockData.mockPayments } as any : data as any
    }

    // Mutations stay local in mock mode. Return the submitted payload instead of
    // falling through to the network.
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      return (data || { success: true }) as any
    }
    if (method === 'DELETE') {
      return { success: true } as any
    }

    return null
  }

  async get<T>(url: string, config?: any): Promise<T> {
    if (this.useMockApi) {
      const mockResponse = this.getMockResponse<T>(url, 'GET')
      if (mockResponse !== null) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 300) // Simulate network delay
        })
      }
      return Promise.resolve([] as T)
    }
    const response = await this.client.get<ApiResponse<T>>(url, config)
    return response.data.data as T
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    if (this.useMockApi) {
      const mockResponse = this.getMockResponse<T>(url, 'POST', data)
      if (mockResponse !== null) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 300) // Simulate network delay
        })
      }
      return Promise.resolve((data || { success: true }) as T)
    }
    const response = await this.client.post<ApiResponse<T>>(url, data, config)
    return response.data.data as T
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    if (this.useMockApi) {
      const mockResponse = this.getMockResponse<T>(url, 'PUT', data)
      if (mockResponse !== null) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 300) // Simulate network delay
        })
      }
      return Promise.resolve((data || { success: true }) as T)
    }
    const response = await this.client.put<ApiResponse<T>>(url, data, config)
    return response.data.data as T
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    if (this.useMockApi) {
      const mockResponse = this.getMockResponse<T>(url, 'PATCH', data)
      if (mockResponse !== null) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 300) // Simulate network delay
        })
      }
      return Promise.resolve((data || { success: true }) as T)
    }
    const response = await this.client.patch<ApiResponse<T>>(url, data, config)
    return response.data.data as T
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    if (this.useMockApi) {
      const mockResponse = this.getMockResponse<T>(url, 'DELETE')
      if (mockResponse !== null) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse), 300) // Simulate network delay
        })
      }
      return Promise.resolve({ success: true } as T)
    }
    const response = await this.client.delete<ApiResponse<T>>(url, config)
    return response.data.data as T
  }
}

export default new ApiClient()
