import apiClient from './apiClient'
import { Customer } from '../types'
import { API_ENDPOINTS } from '../config/api'

export const customerService = {
  // Get all customers
  getAll: async (params?: { skip?: number; limit?: number; search?: string }) => {
    return apiClient.get<Customer[]>(API_ENDPOINTS.CUSTOMERS, { params })
  },

  // Get single customer
  getById: async (id: string) => {
    return apiClient.get<Customer>(API_ENDPOINTS.CUSTOMER(id))
  },

  // Create customer
  create: async (data: Omit<Customer, 'id' | 'credit_used'>) => {
    return apiClient.post<Customer>(API_ENDPOINTS.CUSTOMERS, data)
  },

  // Update customer
  update: async (id: string, data: Partial<Customer>) => {
    return apiClient.put<Customer>(API_ENDPOINTS.CUSTOMER(id), data)
  },

  // Delete customer
  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.CUSTOMER(id))
  },

  // Get customer metrics
  getMetrics: async () => {
    return apiClient.get<any>(API_ENDPOINTS.CUSTOMER_METRICS)
  },
}
