import { create } from 'zustand'
import { SalesOrder, DailyMetrics } from '../types'
import { salesService } from '../services/salesService'
import { inventoryService } from '../services/inventoryService'

interface SalesStore {
  orders: SalesOrder[]
  dailyMetrics: DailyMetrics[]
  isLoading: boolean
  error: string | null
  fetchOrders: (params?: any) => Promise<void>
  fetchMetrics: (days?: number) => Promise<void>
  getOrderById: (id: string) => SalesOrder | undefined
  createOrder: (data: any) => Promise<void>
  updateOrder: (id: string, data: Partial<SalesOrder>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  setError: (error: string | null) => void
}

export const useSalesStore = create<SalesStore>((set, get) => ({
  orders: [],
  dailyMetrics: [],
  isLoading: false,
  error: null,

  fetchOrders: async (params?: any) => {
    try {
      set({ isLoading: true, error: null })
      const data = await salesService.getAllOrders(params)
      set({ orders: data })
    } catch (error) {
      set({ error: 'Failed to fetch sales orders' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMetrics: async (days?: number) => {
    try {
      const data = await inventoryService.getDailyMetrics(days)
      set({ dailyMetrics: data })
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  },

  getOrderById: (id: string) => {
    return get().orders.find((o) => o.id === id)
  },

  createOrder: async (data: any) => {
    try {
      set({ isLoading: true, error: null })
      await salesService.createOrder(data)
      await get().fetchOrders()
    } catch (error) {
      set({ error: 'Failed to create sales order' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updateOrder: async (id: string, data: Partial<SalesOrder>) => {
    try {
      set({ isLoading: true, error: null })
      await salesService.updateOrder(id, data)
      await get().fetchOrders()
    } catch (error) {
      set({ error: 'Failed to update sales order' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  deleteOrder: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await salesService.deleteOrder(id)
      set((state) => ({
        orders: state.orders.filter((o) => o.id !== id),
      }))
    } catch (error) {
      set({ error: 'Failed to delete sales order' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  setError: (error) => set({ error }),
}))
