import { create } from 'zustand'
import { StockLevel } from '../types'
import { inventoryService } from '../services/inventoryService'

interface InventoryStore {
  stockLevels: StockLevel[]
  warehouses: any[]
  isLoading: boolean
  error: string | null
  fetchStockLevels: (params?: any) => Promise<void>
  fetchWarehouses: () => Promise<void>
  setError: (error: string | null) => void
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  stockLevels: [],
  warehouses: [],
  isLoading: false,
  error: null,

  fetchStockLevels: async (params?: any) => {
    try {
      set({ isLoading: true, error: null })
      const data = await inventoryService.getStockLevels(params)
      set({ stockLevels: data })
    } catch (error) {
      set({ error: 'Failed to fetch stock levels' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchWarehouses: async () => {
    try {
      const data = await inventoryService.getAllWarehouses()
      set({ warehouses: data })
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  },

  setError: (error) => set({ error }),
}))
