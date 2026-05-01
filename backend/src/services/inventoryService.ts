import { supabase } from '../config/supabase'

export const inventoryService = {
  // ============= GOODS RECEIPTS =============

  async createGoodsReceipt(payload: any) {
    const { data: gr, error: grError } = await supabase
      .from('goods_receipts')
      .insert([
        {
          received_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          ...payload,
        },
      ])
      .select()
      .single()

    if (grError) throw new Error(`Failed to create goods receipt: ${grError.message}`)

    // Create GR lines
    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any, idx: number) => ({
        ...line,
        goods_receipt_id: gr.id,
      }))

      const { error: linesError } = await supabase.from('goods_receipt_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create GR lines: ${linesError.message}`)
    }

    return gr
  },

  async getGoodsReceiptById(id: string) {
    const { data, error } = await supabase
      .from('goods_receipts')
      .select('*, lines:goods_receipt_lines(*, product:products(*))')
      .eq('id', id)
      .single()

    if (error) throw new Error(`Failed to fetch goods receipt: ${error.message}`)
    return data
  },

  async recordGoodsReceiptLine(lineId: string, quantityReceived: number, binLocationId: string, serialNumbers?: string[]) {
    // Update line
    const { error: lineError } = await supabase
      .from('goods_receipt_lines')
      .update({
        quantity_received: quantityReceived,
        quantity_accepted: quantityReceived,
        bin_location_id: binLocationId,
      })
      .eq('id', lineId)

    if (lineError) throw new Error(`Failed to record receipt line: ${lineError.message}`)

    // If serial numbers provided, create serial number records
    if (serialNumbers && serialNumbers.length > 0) {
      const { data: line } = await supabase
        .from('goods_receipt_lines')
        .select('purchase_order_line_id, product_id')
        .eq('id', lineId)
        .single()

      const serialRecords = serialNumbers.map((sn) => ({
        serial_number: sn,
        product_id: line?.product_id,
        purchase_order_line_id: line?.purchase_order_line_id,
        goods_receipt_line_id: lineId,
        status: 'in_stock',
        date_received: new Date().toISOString().split('T')[0],
      }))

      const { error: serialError } = await supabase.from('serial_numbers').insert(serialRecords)

      if (serialError) throw new Error(`Failed to create serial numbers: ${serialError.message}`)
    }

    return { success: true }
  },

  async completeGoodsReceipt(id: string) {
    // Get all lines
    const { data: lines } = await supabase.from('goods_receipt_lines').select('*').eq('goods_receipt_id', id)

    if (lines) {
      // Update stock levels for each product
      for (const line of lines) {
        const { data: receipt } = await supabase.from('goods_receipts').select('warehouse_id').eq('id', id).single()
        if (!receipt) continue

        const { data: stockLevel } = await supabase
          .from('stock_levels')
          .select('*')
          .match({
            product_id: line.product_id,
            warehouse_id: receipt.warehouse_id,
          })
          .single()

        if (stockLevel) {
          const newQuantity = (stockLevel.quantity_on_hand || 0) + line.quantity_accepted
          await supabase
            .from('stock_levels')
            .update({ quantity_on_hand: newQuantity })
            .eq('id', stockLevel.id)
        }
      }
    }

    // Update GR status
    const { data, error } = await supabase
      .from('goods_receipts')
      .update({
        status: 'completed',
        verified_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()

    if (error) throw new Error(`Failed to complete goods receipt: ${error.message}`)
    return data
  },

  // ============= DELIVERY ORDERS =============

  async createDeliveryOrder(payload: any) {
    const { data: do_, error: doError } = await supabase
      .from('delivery_orders')
      .insert([
        {
          status: 'draft',
          ...payload,
        },
      ])
      .select()
      .single()

    if (doError) throw new Error(`Failed to create delivery order: ${doError.message}`)

    // Create DO lines from SO lines
    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any, idx: number) => ({
        ...line,
        delivery_order_id: do_.id,
      }))

      const { error: linesError } = await supabase.from('delivery_order_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create DO lines: ${linesError.message}`)
    }

    return do_
  },

  async pickItemsForDelivery(doLineId: string, binLocationId: string, quantity: number) {
    const { error } = await supabase
      .from('delivery_order_lines')
      .update({
        bin_location_id: binLocationId,
        quantity_delivered: quantity,
      })
      .eq('id', doLineId)

    if (error) throw new Error(`Failed to pick items: ${error.message}`)

    // Update stock reserved
    const { data: line } = await supabase.from('delivery_order_lines').select('*').eq('id', doLineId).single()

    if (line) {
      const { data: delivery } = await supabase
        .from('delivery_orders')
        .select('warehouse_id')
        .eq('id', line.delivery_order_id)
        .single()
      if (!delivery) return { success: true }

      const { data: stockLevel } = await supabase
        .from('stock_levels')
        .select('*')
        .match({
          product_id: line.product_id,
          warehouse_id: delivery.warehouse_id,
        })
        .single()

      if (stockLevel) {
        await supabase
          .from('stock_levels')
          .update({
            quantity_reserved: Math.max(0, (stockLevel.quantity_reserved || 0) - quantity),
          })
          .eq('id', stockLevel.id)
      }
    }

    return { success: true }
  },

  async completeDelivery(doId: string, trackingNumber?: string) {
    const { data, error } = await supabase
      .from('delivery_orders')
      .update({
        status: 'delivered',
        actual_delivery_date: new Date().toISOString().split('T')[0],
        tracking_number: trackingNumber,
      })
      .eq('id', doId)
      .select()

    if (error) throw new Error(`Failed to complete delivery: ${error.message}`)

    // Update Sales Order status
    const { data: doData } = await supabase.from('delivery_orders').select('sales_order_id').eq('id', doId).single()

    if (doData) {
      await supabase
        .from('sales_orders')
        .update({ status: 'delivered' })
        .eq('id', doData.sales_order_id)
    }

    return data
  },

  // ============= INVENTORY ADJUSTMENTS =============

  async createInventoryAdjustment(payload: any) {
    const { data: adj, error: adjError } = await supabase
      .from('inventory_adjustments')
      .insert([
        {
          count_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          ...payload,
        },
      ])
      .select()
      .single()

    if (adjError) throw new Error(`Failed to create adjustment: ${adjError.message}`)

    // Create adjustment lines
    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any) => ({
        ...line,
        adjustment_id: adj.id,
      }))

      const { error: linesError } = await supabase.from('inventory_adjustment_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create adjustment lines: ${linesError.message}`)
    }

    return adj
  },

  async postInventoryAdjustment(adjId: string) {
    const { data: adj } = await supabase
      .from('inventory_adjustments')
      .select('warehouse_id, inventory_adjustment_lines(*)')
      .eq('id', adjId)
      .single()

    if (adj && adj.inventory_adjustment_lines) {
      // Update stock levels based on variance
      for (const line of adj.inventory_adjustment_lines) {
        const variance = line.quantity_variance

        const { data: stockLevel } = await supabase
          .from('stock_levels')
          .select('*')
          .match({
            product_id: line.product_id,
            warehouse_id: adj.warehouse_id,
          })
          .single()

        if (stockLevel) {
          const newQuantity = Math.max(0, (stockLevel.quantity_on_hand || 0) + variance)
          await supabase
            .from('stock_levels')
            .update({ quantity_on_hand: newQuantity, last_adjusted_at: new Date().toISOString() })
            .eq('id', stockLevel.id)
        }
      }
    }

    const { data, error } = await supabase
      .from('inventory_adjustments')
      .update({ status: 'completed' })
      .eq('id', adjId)
      .select()

    if (error) throw new Error(`Failed to post adjustment: ${error.message}`)
    return data
  },

  // ============= SERIAL NUMBER & WARRANTY =============

  async getSerialNumbersByProduct(productId: string) {
    const { data, error } = await supabase
      .from('serial_numbers')
      .select('*')
      .eq('product_id', productId)
      .order('date_received', { ascending: false })

    if (error) throw new Error(`Failed to fetch serial numbers: ${error.message}`)
    return data || []
  },

  async getSerialNumberByNumber(serialNumber: string) {
    const { data, error } = await supabase
      .from('serial_numbers')
      .select('*, warranty:warranties(*)')
      .eq('serial_number', serialNumber)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch serial number: ${error.message}`)
    }

    return data
  },

  async createWarranty(payload: any) {
    const { data, error } = await supabase.from('warranties').insert([payload]).select().single()

    if (error) throw new Error(`Failed to create warranty: ${error.message}`)
    return data
  },

  async submitWarrantyClaim(payload: any) {
    const { data, error } = await supabase
      .from('warranty_claims')
      .insert([payload])
      .select()
      .single()

    if (error) throw new Error(`Failed to submit warranty claim: ${error.message}`)
    return data
  },

  // ============= INVENTORY METRICS =============

  async getStockLevelsByWarehouse(warehouseId: string) {
    const { data, error } = await supabase
      .from('stock_levels')
      .select('*, product:products(name, sku, reorder_level, reorder_quantity)')
      .eq('warehouse_id', warehouseId)
      .order('product_id')

    if (error) throw new Error(`Failed to fetch stock levels: ${error.message}`)

    return (data || []).map((stock: any) => ({
      ...stock,
      status:
        stock.quantity_on_hand === 0
          ? 'out_of_stock'
          : stock.quantity_on_hand <= stock.product?.reorder_level
            ? 'critical'
            : stock.quantity_on_hand <= stock.product?.reorder_level * 1.5
              ? 'low'
              : 'optimal',
    }))
  },

  async getLowStockItems(warehouseId?: string) {
    let query = supabase
      .from('stock_levels')
      .select('*, product:products(name, sku, reorder_level, reorder_quantity)')
      .or(`quantity_on_hand.lte.product.reorder_level`)

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch low stock items: ${error.message}`)
    return data || []
  },
}
