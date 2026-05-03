import apiClient from './apiClient'
import { Product } from '../types'
import { API_ENDPOINTS } from '../config/api'

export const productService = {
  // Get all products
  getAll: async (params?: { skip?: number; limit?: number; search?: string }) => {
    return apiClient.get<Product[]>(API_ENDPOINTS.PRODUCTS, { params })
  },

  // Get single product
  getById: async (id: string) => {
    return apiClient.get<Product>(API_ENDPOINTS.PRODUCT(id))
  },

  // Create product
  create: async (data: Omit<Product, 'id'>) => {
    return apiClient.post<Product>(API_ENDPOINTS.PRODUCTS, data)
  },

  // Update product
  update: async (id: string, data: Partial<Product>) => {
    return apiClient.put<Product>(API_ENDPOINTS.PRODUCT(id), data)
  },

  // Delete product
  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.PRODUCT(id))
  },

  // Get product categories
  getCategories: async () => {
    return apiClient.get<any[]>(API_ENDPOINTS.PRODUCT_CATEGORIES)
  },
}
