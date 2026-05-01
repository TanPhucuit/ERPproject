import { supabase } from '../config/supabase'

export const warehouseService = {
  // ============= WAREHOUSE MANAGEMENT =============

  async getAllWarehouses() {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*, bin_locations(count)')
      .order('name')

    if (error) throw new Error(`Failed to fetch warehouses: ${error.message}`)
    return data || []
  },

  async getWarehouseById(id: string) {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*, binLocations:bin_locations(*), stockLevels:stock_levels(*, product:products(*))')
      .eq('id', id)
      .single()

    if (error) throw new Error(`Failed to fetch warehouse: ${error.message}`)
    return data
  },

  async getWarehouseCapacity(warehouseId: string) {
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('total_capacity')
      .eq('id', warehouseId)
      .single()

    const { data: bins } = await supabase
      .from('bin_locations')
      .select('', { count: 'exact' })
      .eq('warehouse_id', warehouseId)

    const { data: stockLevels } = await supabase
      .from('stock_levels')
      .select('quantity_on_hand, quantity_reserved')
      .eq('warehouse_id', warehouseId)

    const totalUnits =
      stockLevels?.reduce((sum, sl) => sum + (sl.quantity_on_hand + sl.quantity_reserved), 0) || 0

    return {
      warehouse_id: warehouseId,
      total_capacity: warehouse?.total_capacity,
      bins_count: bins?.length || 0,
      current_units: totalUnits,
      utilization_percent: warehouse ? (totalUnits / warehouse.total_capacity) * 100 : 0,
    }
  },

  // ============= BIN LOCATIONS =============

  async createBinLocation(payload: any) {
    const { data, error } = await supabase
      .from('bin_locations')
      .insert([payload])
      .select()
      .single()

    if (error) throw new Error(`Failed to create bin location: ${error.message}`)
    return data
  },

  async getBinLocationsByWarehouse(warehouseId: string) {
    const { data, error } = await supabase
      .from('bin_locations')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('aisle')
      .order('rack')
      .order('bin_number')

    if (error) throw new Error(`Failed to fetch bin locations: ${error.message}`)
    return data || []
  },

  async findAvailableBin(warehouseId: string, productId: string, quantityNeeded: number) {
    // Get bin locations with current stock for this product
    const { data: bins, error } = await supabase
      .from('bin_locations')
      .select('*, stock_levels(*)')
      .eq('warehouse_id', warehouseId)
      .order('aisle')
      .order('rack')
      .order('bin_number')

    if (error) throw new Error(`Failed to find available bins: ${error.message}`)

    // Filter bins with product and available quantity
    for (const bin of bins || []) {
      const stock = bin.stock_levels?.find((s: any) => s.product_id === productId)
      if (stock && stock.quantity_on_hand >= quantityNeeded) {
        return bin
      }
    }

    // If not found in existing bins, return a new/empty bin
    return bins ? bins[0] : null
  },

  async updateBinLocation(id: string, payload: any) {
    const { data, error } = await supabase
      .from('bin_locations')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update bin location: ${error.message}`)
    return data
  },

  // ============= PUTAWAY & PICKING =============

  async createPutawayTask(payload: any) {
    const { data, error } = await supabase
      .from('putaway_tasks')
      .insert([
        {
          status: 'pending',
          created_at: new Date().toISOString(),
          ...payload,
        },
      ])
      .select()
      .single()

    if (error) throw new Error(`Failed to create putaway task: ${error.message}`)
    return data
  },

  async getPutawayTasksForUser(userId: string, warehouseId?: string) {
    let query = supabase
      .from('putaway_tasks')
      .select('*, goods_receipt_line:goods_receipt_lines(*, product:products(*)), bin:bin_locations(*)')
      .eq('assigned_to_id', userId)
      .eq('status', 'pending')
      .order('created_at')

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch putaway tasks: ${error.message}`)
    return data || []
  },

  async completePutawayTask(taskId: string) {
    const { error } = await supabase
      .from('putaway_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) throw new Error(`Failed to complete putaway task: ${error.message}`)
    return { success: true }
  },

  async createPickingTask(payload: any) {
    const { data, error } = await supabase
      .from('picking_tasks')
      .insert([
        {
          status: 'pending',
          created_at: new Date().toISOString(),
          ...payload,
        },
      ])
      .select()
      .single()

    if (error) throw new Error(`Failed to create picking task: ${error.message}`)
    return data
  },

  async getPickingTasksForUser(userId: string, warehouseId?: string) {
    let query = supabase
      .from('picking_tasks')
      .select('*, delivery_order_line:delivery_order_lines(*, product:products(*)), bin:bin_locations(*)')
      .eq('assigned_to_id', userId)
      .eq('status', 'pending')
      .order('created_at')

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch picking tasks: ${error.message}`)
    return data || []
  },

  async completePickingTask(taskId: string) {
    const { error } = await supabase
      .from('picking_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) throw new Error(`Failed to complete picking task: ${error.message}`)
    return { success: true }
  },

  // ============= STOCK TRANSFER =============

  async createStockTransfer(payload: any) {
    const { data: transfer, error: transferError } = await supabase
      .from('stock_transfers')
      .insert([
        {
          transfer_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          ...payload,
        },
      ])
      .select()
      .single()

    if (transferError) throw new Error(`Failed to create stock transfer: ${transferError.message}`)

    // Create transfer lines
    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any) => ({
        ...line,
        transfer_id: transfer.id,
      }))

      const { error: linesError } = await supabase.from('stock_transfer_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create transfer lines: ${linesError.message}`)
    }

    return transfer
  },

  async confirmStockTransfer(transferId: string) {
    const { data: transfer } = await supabase
      .from('stock_transfers')
      .select('stock_transfer_lines(*)')
      .eq('id', transferId)
      .single()

    if (transfer && transfer.stock_transfer_lines) {
      // Update source and destination stock levels
      for (const line of transfer.stock_transfer_lines) {
        // Get transfer header to know source and destination warehouses
        const { data: transferHeader } = await supabase
          .from('stock_transfers')
          .select('from_warehouse_id, to_warehouse_id')
          .eq('id', transferId)
          .single()

        // Reduce source warehouse
        const { data: sourceStock } = await supabase
          .from('stock_levels')
          .select('*')
          .match({
            product_id: line.product_id,
            warehouse_id: transferHeader?.from_warehouse_id,
          })
          .single()

        if (sourceStock) {
          await supabase
            .from('stock_levels')
            .update({
              quantity_on_hand: Math.max(0, (sourceStock.quantity_on_hand || 0) - line.quantity),
            })
            .eq('id', sourceStock.id)
        }

        // Increase destination warehouse
        const { data: destStock } = await supabase
          .from('stock_levels')
          .select('*')
          .match({
            product_id: line.product_id,
            warehouse_id: transferHeader?.to_warehouse_id,
          })
          .single()

        if (destStock) {
          await supabase
            .from('stock_levels')
            .update({
              quantity_on_hand: (destStock.quantity_on_hand || 0) + line.quantity,
            })
            .eq('id', destStock.id)
        }
      }
    }

    const { data, error } = await supabase
      .from('stock_transfers')
      .update({ status: 'completed' })
      .eq('id', transferId)
      .select()

    if (error) throw new Error(`Failed to confirm stock transfer: ${error.message}`)
    return data
  },

  // ============= WAREHOUSE METRICS =============

  async getWarehouseUtilization(warehouseId?: string) {
    let query = supabase
      .from('warehouses')
      .select('id, name, total_capacity')

    if (warehouseId) {
      query = query.eq('id', warehouseId)
    }

    const { data: warehouses } = await query

    const utilization = await Promise.all(
      (warehouses || []).map(async (w: any) => {
        const capacity = await this.getWarehouseCapacity(w.id)
        return capacity
      })
    )

    return utilization
  },

  async getWarehouseActivityLog(warehouseId: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch activity log: ${error.message}`)
    return data || []
  },

  async getReceivingMetrics(warehouseId: string, startDate: string, endDate: string) {
    const { data: receipts, error } = await supabase
      .from('goods_receipts')
      .select('*, goods_receipt_lines(quantity_received)')
      .eq('warehouse_id', warehouseId)
      .gte('received_date', startDate)
      .lte('received_date', endDate)

    if (error) throw new Error(`Failed to fetch receiving metrics: ${error.message}`)

    const totalReceipts = receipts?.length || 0
    const totalItems = receipts?.reduce((sum, r) => sum + r.goods_receipt_lines.length, 0) || 0
    const totalUnits = receipts?.reduce(
      (sum, r) => sum + (r.goods_receipt_lines?.reduce((s: number, l: any) => s + l.quantity_received, 0) || 0),
      0
    ) // 0
    return {
      warehouse_id: warehouseId,
      period: { start: startDate, end: endDate },
      total_receipts: totalReceipts,
      total_items: totalItems,
      total_units: totalUnits,
      avg_items_per_receipt: totalReceipts > 0 ? totalItems / totalReceipts : 0,
    }
  },

  async getShippingMetrics(warehouseId: string, startDate: string, endDate: string) {
    const { data: deliveries, error } = await supabase
      .from('delivery_orders')
      .select('*, delivery_order_lines(quantity_delivered)')
      .eq('warehouse_id', warehouseId)
      .eq('status', 'delivered')
      .gte('actual_delivery_date', startDate)
      .lte('actual_delivery_date', endDate)

    if (error) throw new Error(`Failed to fetch shipping metrics: ${error.message}`)

    const totalDeliveries = deliveries?.length || 0
    const totalItems = deliveries?.reduce((sum, d) => sum + d.delivery_order_lines.length, 0) || 0
    const totalUnits = deliveries?.reduce(
      (sum, d) => sum + (d.delivery_order_lines?.reduce((s: number, l: any) => s + l.quantity_delivered, 0) || 0),
      0
    ) || 0

    return {
      warehouse_id: warehouseId,
      period: { start: startDate, end: endDate },
      total_deliveries: totalDeliveries,
      total_items: totalItems,
      total_units: totalUnits,
      avg_items_per_delivery: totalDeliveries > 0 ? totalItems / totalDeliveries : 0,
    }
  },

  async getTaskCompletionMetrics(warehouseId: string, userId?: string) {
    let putawayQuery = supabase
      .from('putaway_tasks')
      .select('status')
      .eq('warehouse_id', warehouseId)

    if (userId) {
      putawayQuery = putawayQuery.eq('assigned_to_id', userId)
    }

    const { data: putawayTasks } = await putawayQuery

    let pickingQuery = supabase
      .from('picking_tasks')
      .select('status')
      .eq('warehouse_id', warehouseId)

    if (userId) {
      pickingQuery = pickingQuery.eq('assigned_to_id', userId)
    }

    const { data: pickingTasks } = await pickingQuery

    const putawayCompleted = putawayTasks?.filter((t: any) => t.status === 'completed').length || 0
    const pickingCompleted = pickingTasks?.filter((t: any) => t.status === 'completed').length || 0
    const putawayPending = putawayTasks?.filter((t: any) => t.status === 'pending').length || 0
    const pickingPending = pickingTasks?.filter((t: any) => t.status === 'pending').length || 0

    return {
      warehouse_id: warehouseId,
      user_id: userId || null,
      putaway: {
        completed: putawayCompleted,
        pending: putawayPending,
        completion_rate: putawayCompleted + putawayPending > 0 ? (putawayCompleted / (putawayCompleted + putawayPending)) * 100 : 0,
      },
      picking: {
        completed: pickingCompleted,
        pending: pickingPending,
        completion_rate: pickingCompleted + pickingPending > 0 ? (pickingCompleted / (pickingCompleted + pickingPending)) * 100 : 0,
      },
    }
  },
}
