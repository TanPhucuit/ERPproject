import { create } from 'zustand'
import { Product } from '../types'
import { productService } from '../services/productService'

interface ProductStore {
  products: Product[]
  categories: any[]
  isLoading: boolean
  error: string | null
  fetchProducts: (params?: any) => Promise<void>
  fetchCategories: () => Promise<void>
  getProductById: (id: string) => Product | undefined
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  setError: (error: string | null) => void
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchProducts: async (params?: any) => {
    try {
      set({ isLoading: true, error: null })
      const data = await productService.getAll(params)
      set({ products: data })
    } catch (error) {
      set({ error: 'Failed to fetch products' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const data = await productService.getCategories()
      set({ categories: data })
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  },

  getProductById: (id: string) => {
    return get().products.find((p) => p.id === id)
  },

  addProduct: async (product: Omit<Product, 'id'>) => {
    try {
      set({ isLoading: true, error: null })
      const newProduct = await productService.create(product)
      set((state) => ({
        products: [...state.products, newProduct],
      }))
    } catch (error) {
      set({ error: 'Failed to add product' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updateProduct: async (id: string, product: Partial<Product>) => {
    try {
      set({ isLoading: true, error: null })
      const updated = await productService.update(id, product)
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updated : p)),
      }))
    } catch (error) {
      set({ error: 'Failed to update product' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  deleteProduct: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await productService.delete(id)
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }))
    } catch (error) {
      set({ error: 'Failed to delete product' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  setError: (error) => set({ error }),
}))
