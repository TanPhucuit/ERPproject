import apiClient from './apiClient'
import { SalesOrder } from '../types'
import { API_ENDPOINTS } from '../config/api'

export interface CreateSalesOrderPayload {
  customer_id: string
  order_date: string
  required_delivery_date: string
  lines: Array<{
    product_id: string
    quantity_ordered: number
    unit_price: number
  }>
}

export const salesService = {
  // Sales Orders
  getAllOrders: async (params?: { skip?: number; limit?: number; status?: string }) => {
    return apiClient.get<SalesOrder[]>(API_ENDPOINTS.SALES_ORDERS, { params })
  },

  getOrderById: async (id: string) => {
    return apiClient.get<SalesOrder>(API_ENDPOINTS.SALES_ORDER(id))
  },

  createOrder: async (data: CreateSalesOrderPayload) => {
    return apiClient.post<SalesOrder>(API_ENDPOINTS.SALES_ORDERS, data)
  },

  updateOrder: async (id: string, data: Partial<SalesOrder>) => {
    return apiClient.put<SalesOrder>(API_ENDPOINTS.SALES_ORDER(id), data)
  },

  deleteOrder: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.SALES_ORDER(id))
  },

  // Quotations
  getAllQuotations: async (params?: any) => {
    return apiClient.get<any[]>(API_ENDPOINTS.QUOTATIONS, { params })
  },

  getQuotationById: async (id: string) => {
    return apiClient.get<any>(API_ENDPOINTS.QUOTATION(id))
  },

  createQuotation: async (data: any) => {
    return apiClient.post<any>(API_ENDPOINTS.QUOTATIONS, data)
  },

  updateQuotation: async (id: string, data: Partial<any>) => {
    return apiClient.put<any>(API_ENDPOINTS.QUOTATION(id), data)
  },

  deleteQuotation: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.QUOTATION(id))
  },

  // Delivery Orders
  getAllDeliveries: async (params?: any) => {
    return apiClient.get<any[]>(API_ENDPOINTS.DELIVERY_ORDERS, { params })
  },

  getDeliveryById: async () => {
    return apiClient.get<any>(API_ENDPOINTS.DELIVERY_ORDERS)
  },

  createDelivery: async (data: any) => {
    return apiClient.post<any>(API_ENDPOINTS.DELIVERY_ORDERS, data)
  },
}
