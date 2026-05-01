import { supabase } from '../config/supabase'

export const purchaseService = {
  // ============= RFQs =============

  async getAllRFQs(skip: number = 0, limit: number = 50, status?: string) {
    let query = supabase
      .from('rfqs')
      .select('*', { count: 'exact' })
      .order('issued_date', { ascending: false })
      .range(skip, skip + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.eq('is_deleted', false)

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch RFQs: ${error.message}`)

    return { data: data || [], total: count || 0 }
  },

  async getRFQById(id: string) {
    const { data, error } = await supabase
      .from('rfqs')
      .select('*, lines:rfq_lines(*, product:products(*), quotations:rfq_supplier_quotations(*, supplier:suppliers(*)))')
      .eq('id', id)
      .single()

    if (error) throw new Error(`Failed to fetch RFQ: ${error.message}`)
    return data
  },

  async createRFQ(payload: any) {
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .insert([
        {
          issued_date: new Date().toISOString().split('T')[0],
          ...payload,
        },
      ])
      .select()
      .single()

    if (rfqError) throw new Error(`Failed to create RFQ: ${rfqError.message}`)

    // Create RFQ lines
    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any, idx: number) => ({
        ...line,
        rfq_id: rfq.id,
        sequence_number: idx + 1,
      }))

      const { error: linesError } = await supabase.from('rfq_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create RFQ lines: ${linesError.message}`)
    }

    return rfq
  },

  async updateRFQ(id: string, payload: any) {
    const { data, error } = await supabase
      .from('rfqs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update RFQ: ${error.message}`)
    return data
  },

  async deleteRFQ(id: string) {
    const { error } = await supabase.from('rfqs').update({ is_deleted: true }).eq('id', id)
    if (error) throw new Error(`Failed to delete RFQ: ${error.message}`)
  },

  async submitRFQToSuppliers(rfqId: string, supplierIds: string[]) {
    const { data: rfq } = await supabase.from('rfqs').select('*').eq('id', rfqId).single()

    if (!rfq) throw new Error('RFQ not found')

    const { data: rfqLines } = await supabase.from('rfq_lines').select('*').eq('rfq_id', rfqId)

    if (!rfqLines) throw new Error('RFQ lines not found')

    // Create placeholder quotation records for each supplier-line combination
    const quotations = []

    for (const line of rfqLines) {
      for (const supplierId of supplierIds) {
        quotations.push({
          rfq_line_id: line.id,
          supplier_id: supplierId,
          quoted_price: 0,
          received_date: null,
        })
      }
    }

    const { error } = await supabase.from('rfq_supplier_quotations').insert(quotations)

    if (error) throw new Error(`Failed to send RFQ to suppliers: ${error.message}`)

    // Update RFQ status
    await supabase.from('rfqs').update({ status: 'sent' }).eq('id', rfqId)

    return { success: true, rfqId, supplierCount: supplierIds.length }
  },

  async receiveSupplierQuote(rfqLineId: string, supplierId: string, quotedPrice: number, leadTime: number) {
    const { data, error } = await supabase
      .from('rfq_supplier_quotations')
      .update({
        quoted_price: quotedPrice,
        quoted_lead_time_days: leadTime,
        received_date: new Date().toISOString(),
      })
      .match({
        rfq_line_id: rfqLineId,
        supplier_id: supplierId,
      })
      .select()

    if (error) throw new Error(`Failed to record supplier quote: ${error.message}`)

    return data
  },

  async compareSupplierQuotes(rfqLineId: string) {
    const { data, error } = await supabase
      .from('rfq_supplier_quotations')
      .select('*, supplier:suppliers(name, average_lead_time_days, quality_rating)')
      .eq('rfq_line_id', rfqLineId)
      .gt('quoted_price', 0)
      .order('quoted_price', { ascending: true })

    if (error) throw new Error(`Failed to fetch supplier quotes: ${error.message}`)

    return data || []
  },

  async selectSupplierForRFQLine(rfqLineId: string, supplierId: string) {
    // Mark as selected
    const { error } = await supabase
      .from('rfq_supplier_quotations')
      .update({ is_selected: true })
      .match({
        rfq_line_id: rfqLineId,
        supplier_id: supplierId,
      })

    if (error) throw new Error(`Failed to select supplier: ${error.message}`)

    return { success: true }
  },

  // ============= PURCHASE ORDERS =============

  async getAllPurchaseOrders(skip: number = 0, limit: number = 50, status?: string) {
    let query = supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name), lines:purchase_order_lines(count)', { count: 'exact' })
      .order('order_date', { ascending: false })
      .range(skip, skip + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.eq('is_deleted', false)

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch POs: ${error.message}`)

    return { data: data || [], total: count || 0 }
  },

  async getPurchaseOrderById(id: string) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*), lines:purchase_order_lines(*, product:products(*))')
      .eq('id', id)
      .single()

    if (error) throw new Error(`Failed to fetch PO: ${error.message}`)
    return data
  },

  async createPurchaseOrder(payload: any) {
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert([
        {
          order_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          ...payload,
        },
      ])
      .select()
      .single()

    if (poError) throw new Error(`Failed to create PO: ${poError.message}`)

    // Create PO lines
    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any, idx: number) => ({
        ...line,
        purchase_order_id: po.id,
        sequence_number: idx + 1,
      }))

      const { error: linesError } = await supabase.from('purchase_order_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create PO lines: ${linesError.message}`)
    }

    return po
  },

  async updatePurchaseOrder(id: string, payload: any) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update PO: ${error.message}`)
    return data
  },

  async deletePurchaseOrder(id: string) {
    const { error } = await supabase.from('purchase_orders').update({ is_deleted: true }).eq('id', id)
    if (error) throw new Error(`Failed to delete PO: ${error.message}`)
  },

  async confirmPurchaseOrder(id: string, approvedById: string) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'confirmed',
        approved_by_id: approvedById,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to confirm PO: ${error.message}`)
    return data
  },

  async recordPOReceipt(poId: string, partialQuantities: { [lineId: string]: number }) {
    // Update received quantities per line
    let allReceived = true

    for (const [lineId, quantity] of Object.entries(partialQuantities)) {
      const { data: line } = await supabase
        .from('purchase_order_lines')
        .select('quantity_ordered')
        .eq('id', lineId)
        .single()

      const received = quantity
      const ordered = line?.quantity_ordered || 0

      if (received < ordered) {
        allReceived = false
      }

      await supabase.from('purchase_order_lines').update({ quantity_received: received }).eq('id', lineId)
    }

    // Update PO status
    const newStatus = allReceived ? 'received' : 'partial_received'

    await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', poId)

    return { success: true, status: newStatus }
  },

  // ============= PURCHASE ANALYTICS =============

  async getPurchaseMetrics(
    startDate: string,
    endDate: string
  ): Promise<{ totalPOs: number; totalSpent: number; averageLeadTime: number }> {
    const { data: pos, error: posError } = await supabase
      .from('purchase_orders')
      .select('total_amount, required_delivery_date, order_date')
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .eq('is_deleted', false)

    if (posError) throw new Error(`Failed to fetch PO metrics: ${posError.message}`)

    const totalSpent = pos?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0

    let totalLeadDays = 0
    if (pos && pos.length > 0) {
      pos.forEach((po) => {
        const orderDate = new Date(po.order_date)
        const dueDate = new Date(po.required_delivery_date)
        const leadDays = Math.ceil((dueDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
        totalLeadDays += leadDays
      })
    }

    return {
      totalPOs: pos?.length || 0,
      totalSpent,
      averageLeadTime: pos && pos.length > 0 ? Math.round(totalLeadDays / pos.length) : 0,
    }
  },

  async getTopSuppliers(limit: number = 10) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*, purchase_orders:purchase_orders(total_amount)')
      .order('total_spent', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch top suppliers: ${error.message}`)

    return data || []
  },
}
