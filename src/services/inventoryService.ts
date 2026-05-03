import apiClient from './apiClient'
import { StockLevel, DailyMetrics } from '../types'
import { API_ENDPOINTS } from '../config/api'

export const inventoryService = {
  // Stock Levels
  getStockLevels: async (params?: { warehouseId?: string; search?: string }) => {
    return apiClient.get<StockLevel[]>(API_ENDPOINTS.STOCK_LEVELS, { params })
  },

  getStockByWarehouse: async (warehouseId: string) => {
    return apiClient.get<StockLevel[]>(`${API_ENDPOINTS.STOCK_LEVELS}?warehouse_id=${warehouseId}`)
  },

  // Warehouses
  getAllWarehouses: async () => {
    return apiClient.get<any[]>(API_ENDPOINTS.WAREHOUSES)
  },

  getWarehouseById: async (id: string) => {
    return apiClient.get<any>(API_ENDPOINTS.WAREHOUSE(id))
  },

  // Delivery Orders
  getAllDeliveryOrders: async (params?: any) => {
    return apiClient.get<any[]>(API_ENDPOINTS.DELIVERY_ORDERS, { params })
  },

  // Goods Receipts
  getAllGoodsReceipts: async (params?: any) => {
    return apiClient.get<any[]>(API_ENDPOINTS.GOODS_RECEIPTS, { params })
  },

  // Daily Metrics for Inventory Dashboard
  getDailyMetrics: async (days: number = 30) => {
    return apiClient.get<DailyMetrics[]>(`${API_ENDPOINTS.DAILY_METRICS}?days=${days}`)
  },

  // Product metrics
  getProductMetrics: async () => {
    return apiClient.get<any[]>(API_ENDPOINTS.PRODUCT_METRICS)
  },
}
