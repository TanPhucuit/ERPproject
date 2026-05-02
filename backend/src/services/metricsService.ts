import { supabaseClient } from '../config/supabase'
import { ApiError } from '../middleware/errorHandler'
import { DailyMetrics } from '../types'

export class MetricsService {
  async getDailyMetrics(days = 30) {
    try {
      const { data, error } = await supabaseClient
        .from('daily_metrics')
        .select('*')
        .gte('metric_date', this.getDaysAgo(days))
        .order('metric_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch daily metrics: ${error.message}`)
    }
  }

  async getProductMetrics() {
    try {
      const { data, error } = await supabaseClient
        .from('product_sales_metrics')
        .select('*')
        .order('total_quantity_sold', { ascending: false })
        .limit(20)

      if (error) throw error

      return data || []
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch product metrics: ${error.message}`)
    }
  }

  async getCustomerMetrics() {
    try {
      const { data, error } = await supabaseClient
        .from('customer_metrics')
        .select('*')
        .order('total_spent', { ascending: false })
        .limit(20)

      if (error) throw error

      return data || []
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch customer metrics: ${error.message}`)
    }
  }

  async getSupplierMetrics() {
    try {
      const { data, error } = await supabaseClient
        .from('supplier_metrics')
        .select('*')
        .order('total_spent', { ascending: false })
        .limit(20)

      if (error) throw error

      return data || []
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch supplier metrics: ${error.message}`)
    }
  }

  private getDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }
}

export const metricsService = new MetricsService()
