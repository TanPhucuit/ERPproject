import { supabaseClient } from '../config/supabase'
import { ApiError } from '../middleware/errorHandler'
import { SalesOrder, SalesOrderLine } from '../types'

export class SalesService {
  async getAllSalesOrders(skip = 0, limit = 100, status?: string) {
    try {
      let query = supabaseClient.from('sales_orders').select('*')

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error, count } = await query.range(skip, skip + limit - 1)

      if (error) throw error

      return { data: data || [], total: count || 0 }
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch sales orders: ${error.message}`)
    }
  }

  async getSalesOrderById(id: string) {
    try {
      const { data, error } = await supabaseClient
        .from('sales_orders')
        .select('*, sales_order_lines(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new ApiError(404, 'Sales order not found')

      return data as SalesOrder
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, `Failed to fetch sales order: ${error.message}`)
    }
  }

  async createSalesOrder(payload: Omit<SalesOrder, 'id' | 'total_amount' | 'total_cost' | 'estimated_profit' | 'profit_margin_percent'>) {
    try {
      const soNumber = `SO-${Date.now()}`

      const { data, error } = await supabaseClient
        .from('sales_orders')
        .insert([
          {
            ...payload,
            sales_order_number: soNumber,
          },
        ])
        .select()
        .single()

      if (error) throw error

      // Add lines if provided
      if (payload.lines && payload.lines.length > 0) {
        const lines = payload.lines.map((line) => ({
          ...line,
          sales_order_id: data.id,
        }))

        const { error: linesError } = await supabaseClient.from('sales_order_lines').insert(lines)

        if (linesError) throw linesError
      }

      return data as SalesOrder
    } catch (error: any) {
      throw new ApiError(400, `Failed to create sales order: ${error.message}`)
    }
  }

  async updateSalesOrder(id: string, payload: Partial<SalesOrder>) {
    try {
      const { data, error } = await supabaseClient
        .from('sales_orders')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new ApiError(404, 'Sales order not found')

      return data as SalesOrder
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, `Failed to update sales order: ${error.message}`)
    }
  }

  async deleteSalesOrder(id: string) {
    try {
      const { error } = await supabaseClient.from('sales_orders').delete().eq('id', id)

      if (error) throw error
    } catch (error: any) {
      throw new ApiError(400, `Failed to delete sales order: ${error.message}`)
    }
  }
}

export const salesService = new SalesService()
