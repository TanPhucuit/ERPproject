import { supabaseClient, supabaseServiceClient } from '../config/supabase'
import { ApiError } from '../middleware/errorHandler'
import { Customer } from '../types'

export class CustomerService {
  async getAllCustomers(skip = 0, limit = 100, search?: string) {
    try {
      let query = supabaseClient.from('customers').select('*')

      if (search) {
        query = query.or(`name.ilike.%${search}%,customer_number.ilike.%${search}%`)
      }

      const { data, error, count } = await query.range(skip, skip + limit - 1)

      if (error) throw error

      return { data: data || [], total: count || 0 }
    } catch (error: any) {
      throw new ApiError(400, `Failed to fetch customers: ${error.message}`)
    }
  }

  async getCustomerById(id: string) {
    try {
      const { data, error } = await supabaseClient.from('customers').select('*').eq('id', id).single()

      if (error) throw error
      if (!data) throw new ApiError(404, 'Customer not found')

      return data as Customer
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, `Failed to fetch customer: ${error.message}`)
    }
  }

  async createCustomer(payload: Omit<Customer, 'id' | 'credit_used'>) {
    try {
      // Generate customer number if not provided
      const customerNumber = payload.customer_number || `CUST-${Date.now()}`

      const { data, error } = await supabaseClient.from('customers').insert([
        {
          ...payload,
          customer_number: customerNumber,
          credit_used: 0,
        },
      ]).select().single()

      if (error) throw error

      return data as Customer
    } catch (error: any) {
      throw new ApiError(400, `Failed to create customer: ${error.message}`)
    }
  }

  async updateCustomer(id: string, payload: Partial<Customer>) {
    try {
      const { data, error } = await supabaseClient
        .from('customers')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new ApiError(404, 'Customer not found')

      return data as Customer
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, `Failed to update customer: ${error.message}`)
    }
  }

  async deleteCustomer(id: string) {
    try {
      const { error } = await supabaseClient.from('customers').delete().eq('id', id)

      if (error) throw error
    } catch (error: any) {
      throw new ApiError(400, `Failed to delete customer: ${error.message}`)
    }
  }
}

export const customerService = new CustomerService()
