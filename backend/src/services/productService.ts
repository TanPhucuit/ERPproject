import { supabaseClient } from '../config/supabase'
import { ApiError } from '../middleware/errorHandler'
import { Product } from '../types'

export class ProductService {
  async getAllProducts(skip = 0, limit = 100, search?: string) {
    try {
      let query = supabaseClient.from('products').select('*')

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
      }

      const { data, error, count } = await query.range(skip, skip + limit - 1)

      if (error) throw error

      return { data: data || [], total: count || 0 }
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch products: ${error.message}`)
    }
  }

  async getProductById(id: string) {
    try {
      const { data, error } = await supabaseClient.from('products').select('*').eq('id', id).single()

      if (error) throw error
      if (!data) throw new ApiError(404, 'Product not found')

      return data as Product
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, `Failed to fetch product: ${error.message}`)
    }
  }

  async createProduct(payload: Omit<Product, 'id' | 'profit_margin_percent'>) {
    try {
      const profitMargin = ((payload.list_price - payload.cost_price) / payload.list_price) * 100

      const { data, error } = await supabaseClient
        .from('products')
        .insert([
          {
            ...payload,
            profit_margin_percent: profitMargin,
          },
        ])
        .select()
        .single()

      if (error) throw error

      return data as Product
    } catch (error: any) {
      throw new ApiError(400, `Failed to create product: ${error.message}`)
    }
  }

  async updateProduct(id: string, payload: Partial<Product>) {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new ApiError(404, 'Product not found')

      return data as Product
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, `Failed to update product: ${error.message}`)
    }
  }

  async deleteProduct(id: string) {
    try {
      const { error } = await supabaseClient.from('products').delete().eq('id', id)

      if (error) throw error
    } catch (error: any) {
      throw new ApiError(400, `Failed to delete product: ${error.message}`)
    }
  }

  async getProductCategories() {
    try {
      const { data, error } = await supabaseClient.from('product_categories').select('*')

      if (error) throw error

      return data || []
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch categories: ${error.message}`)
    }
  }
}

export const productService = new ProductService()
