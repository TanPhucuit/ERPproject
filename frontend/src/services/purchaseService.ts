import apiClient from './apiClient'
import { PurchaseOrder } from '../types'
import { API_ENDPOINTS } from '../config/api'

export const purchaseService = {
  // Purchase Orders
  getAllOrders: async (params?: { skip?: number; limit?: number; status?: string }) => {
    return apiClient.get<PurchaseOrder[]>(API_ENDPOINTS.PURCHASE_ORDERS, { params })
  },

  getOrderById: async (id: string) => {
    return apiClient.get<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDER(id))
  },

  createOrder: async (data: Omit<PurchaseOrder, 'id'>) => {
    return apiClient.post<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDERS, data)
  },

  updateOrder: async (id: string, data: Partial<PurchaseOrder>) => {
    return apiClient.put<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDER(id), data)
  },

  deleteOrder: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.PURCHASE_ORDER(id))
  },

  // RFQs
  getAllRFQs: async (params?: any) => {
    return apiClient.get<any[]>(API_ENDPOINTS.RFQS, { params })
  },

  createRFQ: async (data: any) => {
    return apiClient.post<any>(API_ENDPOINTS.RFQS, data)
  },

  // Goods Receipts
  getAllReceipts: async (params?: any) => {
    return apiClient.get<any[]>(API_ENDPOINTS.GOODS_RECEIPTS, { params })
  },

  createReceipt: async (data: any) => {
    return apiClient.post<any>(API_ENDPOINTS.GOODS_RECEIPTS, data)
  },
}
