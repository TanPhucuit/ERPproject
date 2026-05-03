import { supabase } from '../lib/supabase'

const parsePath = (path: string) => {
  const url = new URL(path, 'http://localhost')
  return {
    pathname: url.pathname.replace(/\/+$/, '') || '/',
    searchParams: url.searchParams,
  }
}

const applyLimit = (query: any, searchParams: URLSearchParams) => {
  const limit = Number(searchParams.get('limit') || '0')
  if (!Number.isFinite(limit) || limit <= 0) {
    return query
  }
  return query.limit(limit)
}

const leadStageAliases: Record<string, string> = {
  new: 'new',
  contacted: 'site_survey',
  qualified: 'site_survey',
  site_survey: 'site_survey',
  proposition: 'proposition',
  won: 'won',
  lost: 'lost',
}

const quotationStatusToDb: Record<string, string> = {
  draft: 'draft',
  sent: 'sent',
  won: 'accepted',
  lost: 'rejected',
  accepted: 'accepted',
  rejected: 'rejected',
  expired: 'expired',
}

const quotationStatusFromDb: Record<string, string> = {
  draft: 'draft',
  sent: 'sent',
  accepted: 'won',
  rejected: 'lost',
  expired: 'lost',
}

const salesStatusToDb: Record<string, string> = {
  draft: 'draft',
  pending: 'draft',
  confirmed: 'confirmed',
  delivered: 'delivered',
  completed: 'delivered',
  cancelled: 'cancelled',
}

const salesStatusFromDb: Record<string, string> = {
  draft: 'draft',
  confirmed: 'confirmed',
  partially_shipped: 'delivered',
  shipped: 'delivered',
  delivered: 'completed',
  cancelled: 'cancelled',
}

const purchaseStatusToDb: Record<string, string> = {
  draft: 'draft',
  pending: 'confirmed',
  confirmed: 'confirmed',
  received: 'received',
  cancelled: 'cancelled',
}

const purchaseStatusFromDb: Record<string, string> = {
  draft: 'draft',
  confirmed: 'confirmed',
  partial_received: 'confirmed',
  received: 'received',
  cancelled: 'cancelled',
}

const rfqStatusToDb: Record<string, string> = {
  draft: 'draft',
  sent: 'sent',
  awarded: 'closed',
  cancelled: 'cancelled',
  closed: 'closed',
}

const rfqStatusFromDb: Record<string, string> = {
  draft: 'draft',
  sent: 'sent',
  closed: 'awarded',
  cancelled: 'cancelled',
}

const deliveryStatusToDb: Record<string, string> = {
  draft: 'draft',
  ready: 'ready',
  done: 'delivered',
}

const deliveryStatusFromDb: Record<string, string> = {
  draft: 'draft',
  ready: 'ready',
  picked: 'ready',
  shipped: 'ready',
  in_transit: 'ready',
  delivered: 'done',
  cancelled: 'draft',
}

const receiptStatusToDb: Record<string, string> = {
  draft: 'draft',
  ready: 'received',
  done: 'completed',
}

const receiptStatusFromDb: Record<string, string> = {
  draft: 'draft',
  received: 'ready',
  verified: 'done',
  completed: 'done',
  cancelled: 'draft',
}

const adjustmentStatusToDb: Record<string, string> = {
  draft: 'draft',
  posted: 'confirmed',
}

const adjustmentStatusFromDb: Record<string, string> = {
  draft: 'draft',
  confirmed: 'posted',
  completed: 'posted',
}

const invoiceStatusToDb: Record<string, string> = {
  draft: 'draft',
  pending: 'issued',
  paid: 'paid',
  overdue: 'overdue',
}

const invoiceStatusFromDb: Record<string, string> = {
  draft: 'draft',
  issued: 'pending',
  sent: 'pending',
  partial_paid: 'pending',
  paid: 'paid',
  overdue: 'overdue',
  cancelled: 'draft',
}

const billStatusToDb: Record<string, string> = {
  draft: 'draft',
  posted: 'received',
  paid: 'paid',
}

const billStatusFromDb: Record<string, string> = {
  draft: 'draft',
  received: 'posted',
  verified: 'posted',
  partial_paid: 'posted',
  paid: 'paid',
  overdue: 'posted',
  cancelled: 'draft',
}

const noteStatusToDb: Record<string, string> = {
  draft: 'draft',
  posted: 'issued',
  paid: 'applied',
}

const noteStatusFromDb: Record<string, string> = {
  draft: 'draft',
  issued: 'posted',
  applied: 'posted',
}

const normalizeDate = (value?: string | null, fallbackDays = 7) => {
  if (value) return value
  const date = new Date()
  date.setDate(date.getDate() + fallbackDays)
  return date.toISOString().slice(0, 10)
}

const normalizeText = (value?: string | null) => value?.trim() || null

const maybeSingleByName = async (
  table: string,
  value?: string | null,
  columns = 'id, name'
): Promise<any | null> => {
  const normalized = normalizeText(value)
  if (!normalized) return null

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .ilike('name', normalized)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

const firstRow = async (
  table: string,
  columns = 'id, name',
  orderBy = 'created_at'
): Promise<any | null> => {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order(orderBy, { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

const getCurrentUserId = async () => {
  try {
    const raw = localStorage.getItem('auth_token')
    if (!raw) return null
    const parsed = JSON.parse(atob(raw)) as { id?: string }
    return parsed.id || null
  } catch {
    return null
  }
}

const resolveLeadStage = async (status?: string | null) => {
  const stageName = leadStageAliases[status || 'new'] || 'new'
  const { data, error } = await supabase
    .from('lead_stages')
    .select('id, name, probability_percent')
    .eq('name', stageName)
    .single()

  if (error) throw error
  return data
}

const resolveCustomerId = async (name?: string | null) => {
  const normalized = normalizeText(name)
  if (!normalized) {
    const fallback = await firstRow('customers')
    if (!fallback?.id) throw new Error('No customers found in database.')
    return fallback.id as string
  }

  const existing = await maybeSingleByName('customers', normalized)
  if (existing?.id) return existing.id as string

  const creatorId = await getCurrentUserId()
  const customerType = normalized.toLowerCase().includes('store') || normalized.toLowerCase().includes('company') ? 'B2B' : 'B2C'
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: normalized,
      customer_type: customerType,
      contact_person_name: normalized,
      status: 'active',
      created_by_id: creatorId,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

const resolveSupplierId = async (name?: string | null) => {
  const normalized = normalizeText(name)
  if (!normalized) {
    const fallback = await firstRow('suppliers')
    if (!fallback?.id) throw new Error('No suppliers found in database.')
    return fallback.id as string
  }

  const existing = await maybeSingleByName('suppliers', normalized)
  if (existing?.id) return existing.id as string

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: normalized,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

const resolveWarehouseId = async (name?: string | null) => {
  const normalized = normalizeText(name)
  if (normalized) {
    const byName = await maybeSingleByName('warehouses', normalized, 'id, name, warehouse_code')
    if (byName?.id) return byName.id as string
  }

  const fallback = await firstRow('warehouses', 'id, name, warehouse_code')
  if (!fallback?.id) throw new Error('No warehouses found in database.')
  return fallback.id as string
}

const resolveSalesOrderId = async (reference?: string | null, customerName?: string | null) => {
  const normalizedReference = normalizeText(reference)
  if (normalizedReference) {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('id, sales_order_number')
      .eq('sales_order_number', normalizedReference)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data?.id) return data.id as string
  }

  const customerId = await resolveCustomerId(customerName)
  const { data, error } = await supabase
    .from('sales_orders')
    .select('id')
    .eq('customer_id', customerId)
    .order('order_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (data?.id) return data.id as string

  const fallback = await firstRow('sales_orders', 'id, sales_order_number', 'order_date')
  if (!fallback?.id) throw new Error('No sales orders found in database.')
  return fallback.id as string
}

const resolvePurchaseOrderId = async (reference?: string | null, supplierName?: string | null) => {
  const normalizedReference = normalizeText(reference)
  if (normalizedReference) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, purchase_order_number')
      .eq('purchase_order_number', normalizedReference)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data?.id) return data.id as string
  }

  const supplierId = await resolveSupplierId(supplierName)
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('supplier_id', supplierId)
    .order('order_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (data?.id) return data.id as string

  const fallback = await firstRow('purchase_orders', 'id, purchase_order_number', 'order_date')
  if (!fallback?.id) throw new Error('No purchase orders found in database.')
  return fallback.id as string
}

const resolveInvoiceId = async (reference?: string | null, customerName?: string | null) => {
  const normalizedReference = normalizeText(reference)
  if (normalizedReference) {
    const { data, error } = await supabase
      .from('customer_invoices')
      .select('id, invoice_number')
      .eq('invoice_number', normalizedReference)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data?.id) return data.id as string
  }

  const customerId = await resolveCustomerId(customerName)
  const { data, error } = await supabase
    .from('customer_invoices')
    .select('id')
    .eq('customer_id', customerId)
    .order('invoice_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (data?.id) return data.id as string

  const fallback = await firstRow('customer_invoices', 'id, invoice_number', 'invoice_date')
  if (!fallback?.id) throw new Error('No customer invoices found in database.')
  return fallback.id as string
}

const resolveBillId = async (reference?: string | null, supplierName?: string | null) => {
  const normalizedReference = normalizeText(reference)
  if (normalizedReference) {
    const { data, error } = await supabase
      .from('vendor_bills')
      .select('id, bill_number')
      .eq('bill_number', normalizedReference)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data?.id) return data.id as string
  }

  const supplierId = await resolveSupplierId(supplierName)
  const { data, error } = await supabase
    .from('vendor_bills')
    .select('id')
    .eq('supplier_id', supplierId)
    .order('bill_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (data?.id) return data.id as string

  const fallback = await firstRow('vendor_bills', 'id, bill_number', 'bill_date')
  if (!fallback?.id) throw new Error('No vendor bills found in database.')
  return fallback.id as string
}

const normalizeLeadRow = (lead: any) => ({
  ...lead,
  name: lead.contact_person_name,
  status: lead.stage?.name || 'new',
  stage: lead.stage?.name || 'new',
  email: lead.contact_person_email,
  phone: lead.contact_person_phone,
  company: lead.company_name,
  next_follow_up: lead.expected_close_date,
  internal_notes: lead.notes,
})

const normalizeQuotationRow = (quote: any) => ({
  ...quote,
  quote_date: quote.issued_date,
  valid_until: quote.valid_until_date,
  customerName: quote.customer?.name,
  status: quotationStatusFromDb[quote.status] || quote.status,
})

const normalizeSalesOrderRow = (order: any) => ({
  ...order,
  customerName: order.customer?.name,
  status: salesStatusFromDb[order.status] || order.status,
})

const normalizePurchaseOrderRow = (order: any) => ({
  ...order,
  expected_delivery_date: order.required_delivery_date,
  supplierName: order.supplier?.name,
  status: purchaseStatusFromDb[order.status] || order.status,
})

const normalizeRfqRow = (rfq: any) => ({
  ...rfq,
  due_date: rfq.closing_date,
  estimated_total: rfq.total_estimated_cost,
  status: rfqStatusFromDb[rfq.status] || rfq.status,
})

const normalizeDeliveryRow = (row: any) => ({
  ...row,
  status: deliveryStatusFromDb[row.status] || row.status,
})

const normalizeReceiptRow = (row: any) => ({
  ...row,
  status: receiptStatusFromDb[row.status] || row.status,
})

const normalizeAdjustmentRow = (row: any) => ({
  ...row,
  status: adjustmentStatusFromDb[row.status] || row.status,
})

const normalizeInvoiceRow = (row: any) => ({
  ...row,
  customerName: row.customer?.name,
  status: invoiceStatusFromDb[row.status] || row.status,
})

const normalizeBillRow = (row: any) => ({
  ...row,
  supplierName: row.supplier?.name,
  status: billStatusFromDb[row.status] || row.status,
})

const normalizeCreditRow = (row: any) => ({
  ...row,
  partnerName: row.customer?.name,
  noteNumber: row.credit_note_number,
  noteDate: row.credit_date,
  total: row.total_amount,
  status: noteStatusFromDb[row.status] || row.status,
})

const normalizeDebitRow = (row: any) => ({
  ...row,
  partnerName: row.supplier?.name,
  noteNumber: row.debit_note_number,
  noteDate: row.debit_date,
  total: row.total_amount,
  status: noteStatusFromDb[row.status] || row.status,
})

const fetchInvoices = async () => {
  const { data, error } = await supabase
    .from('customer_invoices')
    .select('*, customer:customers(*)')
    .order('invoice_date', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeInvoiceRow)
}

const fetchBills = async () => {
  const { data, error } = await supabase
    .from('vendor_bills')
    .select('*, supplier:suppliers(*)')
    .order('bill_date', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeBillRow)
}

const getAccountingMetrics = async () => {
  const [invoices, bills] = await Promise.all([fetchInvoices(), fetchBills()])

  return {
    paidInvoices: invoices.filter((invoice) => invoice.status === 'paid').length,
    pendingInvoices: invoices.filter((invoice) => ['draft', 'pending'].includes(invoice.status)).length,
    overdueInvoices: invoices.filter((invoice) => invoice.status === 'overdue').length,
    outstandingReceivable: invoices
      .filter((invoice) => invoice.status !== 'paid')
      .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    outstandingPayable: bills
      .filter((bill) => bill.status !== 'paid')
      .reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0),
  }
}

const normalizeWriteBody = async (pathname: string, body: Record<string, any>) => {
  const currentUserId = await getCurrentUserId()

  if (pathname === '/crm/leads' || pathname.startsWith('/crm/leads/')) {
    const stage = await resolveLeadStage(body.stage || body.status)
    return {
      lead_number: body.lead_number,
      company_name: body.company_name || body.company || body.name,
      contact_person_name: body.contact_person_name || body.contact_name || body.name,
      contact_person_phone: body.contact_person_phone || body.phone || null,
      contact_person_email: body.contact_person_email || body.email || null,
      source: body.source || body.lead_source || null,
      stage_id: stage.id,
      estimated_value: Number(body.estimated_value || body.value || 0),
      probability_percent: body.probability_percent ?? stage.probability_percent ?? 50,
      expected_close_date: body.expected_close_date || body.next_follow_up || null,
      notes: body.notes || body.internal_notes || null,
      owner_id: body.owner_id || currentUserId,
    }
  }

  if (pathname === '/sales-orders/quotations' || pathname.startsWith('/sales-orders/quotations/')) {
    const customerId = body.customer_id || (await resolveCustomerId(body.customerName))
    return {
      quotation_number: body.quotation_number || body.quoteNumber,
      customer_id: customerId,
      lead_id: body.lead_id || null,
      issued_date: body.issued_date || body.quote_date || body.date || new Date().toISOString().slice(0, 10),
      valid_until_date: body.valid_until_date || body.valid_until || body.expiryDate || normalizeDate(undefined, 14),
      status: quotationStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || body.total || 0),
      notes: body.notes || body.description || null,
      internal_notes: body.internal_notes || null,
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/sales-orders' || pathname.startsWith('/sales-orders/')) {
    const customerId = body.customer_id || (await resolveCustomerId(body.customerName))
    return {
      sales_order_number: body.sales_order_number || body.orderNumber,
      quotation_id: body.quotation_id || null,
      customer_id: customerId,
      order_date: body.order_date || body.date || new Date().toISOString().slice(0, 10),
      required_delivery_date:
        body.required_delivery_date || body.dueDate || body.deliveryDate || normalizeDate(undefined, 7),
      status: salesStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || body.total || 0),
      notes: body.notes || null,
      internal_notes: body.internal_notes || null,
      sales_person_id: body.sales_person_id || currentUserId,
    }
  }

  if (pathname === '/purchase/rfqs' || pathname.startsWith('/purchase/rfqs/')) {
    return {
      rfq_number: body.rfq_number || body.rfqNumber,
      issued_date: body.issued_date || body.date || new Date().toISOString().slice(0, 10),
      closing_date: body.closing_date || body.due_date || body.dueDate || normalizeDate(undefined, 7),
      status: rfqStatusToDb[body.status] || body.status || 'draft',
      total_estimated_cost: Number(body.total_estimated_cost || body.estimated_total || body.targetPrice || 0),
      notes: body.notes || body.description || body.productName || null,
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/purchase/purchase-orders' || pathname.startsWith('/purchase/purchase-orders/')) {
    const supplierId = body.supplier_id || (await resolveSupplierId(body.supplierName))
    return {
      purchase_order_number: body.purchase_order_number || body.poNumber,
      supplier_id: supplierId,
      rfq_id: body.rfq_id || null,
      order_date: body.order_date || body.date || new Date().toISOString().slice(0, 10),
      required_delivery_date:
        body.required_delivery_date || body.expected_delivery_date || body.dueDate || normalizeDate(undefined, 7),
      status: purchaseStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || body.total || 0),
      notes: body.notes || null,
      internal_notes: body.internal_notes || null,
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/inventory/delivery-orders' || pathname.startsWith('/inventory/delivery-orders/')) {
    return {
      delivery_order_number: body.delivery_order_number || body.reference,
      sales_order_id: body.sales_order_id || (await resolveSalesOrderId(body.reference, body.partnerName)),
      warehouse_id: body.warehouse_id || (await resolveWarehouseId(body.warehouseName)),
      status: deliveryStatusToDb[body.status] || body.status || 'draft',
      scheduled_delivery_date: body.scheduled_delivery_date || body.scheduledDate || null,
      notes: body.notes || null,
    }
  }

  if (pathname === '/inventory/goods-receipts' || pathname.startsWith('/inventory/goods-receipts/')) {
    return {
      goods_receipt_number: body.goods_receipt_number || body.reference,
      purchase_order_id: body.purchase_order_id || (await resolvePurchaseOrderId(body.reference, body.partnerName)),
      warehouse_id: body.warehouse_id || (await resolveWarehouseId(body.warehouseName)),
      status: receiptStatusToDb[body.status] || body.status || 'draft',
      received_date: body.received_date || body.scheduledDate || new Date().toISOString().slice(0, 10),
      notes: body.notes || null,
    }
  }

  if (pathname === '/inventory/adjustments' || pathname.startsWith('/inventory/adjustments/')) {
    return {
      adjustment_number: body.adjustment_number || body.reference,
      warehouse_id: body.warehouse_id || (await resolveWarehouseId(body.warehouseName)),
      adjustment_type: body.adjustment_type || 'stock_count',
      count_date: body.count_date || body.countDate || new Date().toISOString().slice(0, 10),
      status: adjustmentStatusToDb[body.status] || body.status || 'draft',
      reason: body.reason || body.binCode || null,
      notes: body.notes || null,
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/accounting/invoices' || pathname.startsWith('/accounting/invoices/')) {
    const customerId = body.customer_id || (await resolveCustomerId(body.customerName))
    return {
      invoice_number: body.invoice_number,
      sales_order_id: body.sales_order_id || (await resolveSalesOrderId(body.sales_order_number, body.customerName)),
      customer_id: customerId,
      invoice_date: body.invoice_date || new Date().toISOString().slice(0, 10),
      due_date: body.due_date || body.dueDate || normalizeDate(undefined, 30),
      status: invoiceStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || 0),
      payment_terms: body.payment_terms || null,
      description: body.description || null,
      notes: body.notes || null,
      created_by_id: body.created_by_id || currentUserId,
      issued_by_id: body.issued_by_id || currentUserId,
    }
  }

  if (pathname === '/accounting/bills' || pathname.startsWith('/accounting/bills/')) {
    const supplierId = body.supplier_id || (await resolveSupplierId(body.supplierName))
    return {
      bill_number: body.bill_number || body.billNumber,
      purchase_order_id: body.purchase_order_id || (await resolvePurchaseOrderId(body.purchase_order_number, body.supplierName)),
      supplier_id: supplierId,
      bill_date: body.bill_date || body.billDate || new Date().toISOString().slice(0, 10),
      due_date: body.due_date || body.dueDate || normalizeDate(undefined, 30),
      status: billStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || body.total || 0),
      payment_terms: body.payment_terms || null,
      notes: body.notes || null,
      created_by_id: body.created_by_id || currentUserId,
      received_by_id: body.received_by_id || currentUserId,
    }
  }

  if (pathname === '/accounting/credit-notes' || pathname.startsWith('/accounting/credit-notes/')) {
    const customerId = body.customer_id || (await resolveCustomerId(body.partnerName))
    return {
      credit_note_number: body.credit_note_number || body.noteNumber,
      invoice_id: body.invoice_id || (await resolveInvoiceId(body.invoice_number, body.partnerName)),
      customer_id: customerId,
      reason: body.reason || null,
      credit_date: body.credit_date || body.noteDate || new Date().toISOString().slice(0, 10),
      status: noteStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || body.total || 0),
      description: body.description || null,
      notes: body.notes || null,
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/accounting/debit-notes' || pathname.startsWith('/accounting/debit-notes/')) {
    const supplierId = body.supplier_id || (await resolveSupplierId(body.partnerName))
    return {
      debit_note_number: body.debit_note_number || body.noteNumber,
      bill_id: body.bill_id || (await resolveBillId(body.bill_number, body.partnerName)),
      supplier_id: supplierId,
      reason: body.reason || null,
      debit_date: body.debit_date || body.noteDate || new Date().toISOString().slice(0, 10),
      status: noteStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || body.total || 0),
      description: body.description || null,
      notes: body.notes || null,
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  return body
}

const getResource = async <T>(path: string): Promise<T> => {
  const { pathname, searchParams } = parsePath(path)

  if (pathname === '/metrics/leads') {
    const leads = await getResource<any[]>('/crm/leads')
    const total = leads.length
    const won = leads.filter((lead) => lead.status === 'won').length
    const lost = leads.filter((lead) => lead.status === 'lost').length
    const open = total - won - lost
    return ({
      total,
      won,
      lost,
      open,
      conversionRate: total ? Math.round((won / total) * 100) : 0,
    }) as T
  }

  if (pathname === '/leads/by-stage') {
    const leads = await getResource<any[]>('/crm/leads')
    const grouped = leads.reduce<Record<string, any[]>>((acc, lead) => {
      const key = lead.status || 'new'
      acc[key] = acc[key] || []
      acc[key].push(lead)
      return acc
    }, {})
    return grouped as T
  }

  if (pathname === '/crm/leads') {
    const stage = searchParams.get('stage')
    let query = supabase
      .from('leads')
      .select('*, stage:lead_stages(name, probability_percent)')
      .order('created_at', { ascending: false })
    if (stage) {
      const stageName = leadStageAliases[stage] || stage
      const resolvedStage = await resolveLeadStage(stageName)
      query = query.eq('stage_id', resolvedStage.id)
    }
    const { data, error } = await applyLimit(query, searchParams)
    if (error) throw error
    return ((data || []).map(normalizeLeadRow)) as T
  }

  if (pathname.startsWith('/crm/leads/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('leads')
      .select('*, stage:lead_stages(name, probability_percent)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizeLeadRow(data) as T
  }

  if (pathname === '/sales-orders') {
    const { data, error } = await applyLimit(
      supabase
        .from('sales_orders')
        .select('*, customer:customers(name)')
        .order('order_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeSalesOrderRow)) as T
  }

  if (pathname.startsWith('/sales-orders/') && !pathname.startsWith('/sales-orders/quotations/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*, customer:customers(name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizeSalesOrderRow(data) as T
  }

  if (pathname === '/sales-orders/quotations') {
    const { data, error } = await applyLimit(
      supabase
        .from('quotations')
        .select('*, customer:customers(name)')
        .order('issued_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeQuotationRow)) as T
  }

  if (pathname.startsWith('/sales-orders/quotations/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('quotations')
      .select('*, customer:customers(name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizeQuotationRow(data) as T
  }

  if (pathname === '/purchase/rfqs') {
    const { data, error } = await applyLimit(
      supabase.from('rfqs').select('*').order('issued_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeRfqRow)) as T
  }

  if (pathname.startsWith('/purchase/rfqs/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('rfqs').select('*').eq('id', id).single()
    if (error) throw error
    return normalizeRfqRow(data) as T
  }

  if (pathname === '/purchase/purchase-orders') {
    const { data, error } = await applyLimit(
      supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(name)')
        .order('order_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizePurchaseOrderRow)) as T
  }

  if (pathname.startsWith('/purchase/purchase-orders/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizePurchaseOrderRow(data) as T
  }

  if (pathname === '/inventory/stock-levels') {
    const { data, error } = await applyLimit(
      supabase
        .from('stock_levels')
        .select('*, product:products(*), warehouse:warehouses(*)')
        .order('updated_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  if (pathname.startsWith('/products/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    if (error) throw error
    return data as T
  }

  if (pathname === '/inventory/delivery-orders') {
    const { data, error } = await applyLimit(
      supabase
        .from('delivery_orders')
        .select('*, sales_order:sales_orders(*), warehouse:warehouses(*)')
        .order('scheduled_delivery_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeDeliveryRow)) as T
  }

  if (pathname === '/inventory/goods-receipts') {
    const { data, error } = await applyLimit(
      supabase
        .from('goods_receipts')
        .select('*, purchase_order:purchase_orders(*), warehouse:warehouses(*)')
        .order('received_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeReceiptRow)) as T
  }

  if (pathname === '/inventory/adjustments') {
    const { data, error } = await applyLimit(
      supabase
        .from('inventory_adjustments')
        .select('*, warehouse:warehouses(*)')
        .order('count_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeAdjustmentRow)) as T
  }

  if (pathname === '/accounting/invoices') {
    return (await fetchInvoices()) as T
  }

  if (pathname === '/accounting/bills') {
    return (await fetchBills()) as T
  }

  if (pathname === '/accounting/credit-notes') {
    const { data, error } = await applyLimit(
      supabase
        .from('credit_notes')
        .select('*, customer:customers(name)')
        .order('credit_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeCreditRow)) as T
  }

  if (pathname === '/accounting/debit-notes') {
    const { data, error } = await applyLimit(
      supabase
        .from('debit_notes')
        .select('*, supplier:suppliers(name)')
        .order('debit_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeDebitRow)) as T
  }

  if (pathname === '/accounting/metrics') {
    return (await getAccountingMetrics()) as T
  }

  if (pathname === '/metrics/daily') {
    const days = Number(searchParams.get('days') || '30')
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .gte('metric_date', fromDate.toISOString().slice(0, 10))
      .order('metric_date', { ascending: true })

    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/metrics/products') {
    const { data, error } = await supabase
      .from('product_sales_metrics')
      .select('*, product:products(name, sku)')
      .order('total_quantity_sold', { ascending: false })
      .limit(20)

    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/metrics/customers') {
    const { data, error } = await supabase
      .from('customer_metrics')
      .select('*, customer:customers(name)')
      .order('total_spent', { ascending: false })
      .limit(20)

    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/metrics/suppliers') {
    const { data, error } = await supabase
      .from('supplier_metrics')
      .select('*, supplier:suppliers(name)')
      .order('total_spent', { ascending: false })
      .limit(20)

    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/products') {
    const { data, error } = await applyLimit(
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/products/categories/all' || pathname === '/product-categories') {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/customers') {
    const { data, error } = await applyLimit(
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  if (pathname.startsWith('/customers/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
    if (error) throw error
    return data as T
  }

  if (pathname === '/warehouse/warehouses') {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as T
  }

  if (pathname.startsWith('/warehouse/warehouses/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('warehouses').select('*').eq('id', id).single()
    if (error) throw error
    return data as T
  }

  throw new Error(`Unsupported query path: ${pathname}`)
}

const writeResource = async <T>(path: string, body: Record<string, any>, method: 'POST' | 'PUT') => {
  const { pathname } = parsePath(path)
  const normalizedBody = await normalizeWriteBody(pathname, body)

  const upsert = async (table: string, id?: string) => {
    const query =
      method === 'POST'
        ? supabase.from(table).insert(normalizedBody).select().single()
        : supabase.from(table).update(normalizedBody).eq('id', id).select().single()

    const { data, error } = await query
    if (error) throw error
    return data as T
  }

  if (pathname === '/crm/leads') return upsert('leads')
  if (pathname.startsWith('/crm/leads/')) return upsert('leads', pathname.split('/').pop())
  if (pathname === '/sales-orders') return upsert('sales_orders')
  if (pathname.startsWith('/sales-orders/quotations/')) return upsert('quotations', pathname.split('/').pop())
  if (pathname === '/sales-orders/quotations') return upsert('quotations')
  if (pathname.startsWith('/sales-orders/')) return upsert('sales_orders', pathname.split('/').pop())
  if (pathname === '/purchase/rfqs') return upsert('rfqs')
  if (pathname.startsWith('/purchase/rfqs/')) return upsert('rfqs', pathname.split('/').pop())
  if (pathname === '/purchase/purchase-orders') return upsert('purchase_orders')
  if (pathname.startsWith('/purchase/purchase-orders/')) return upsert('purchase_orders', pathname.split('/').pop())
  if (pathname === '/inventory/delivery-orders') return upsert('delivery_orders')
  if (pathname.startsWith('/inventory/delivery-orders/')) return upsert('delivery_orders', pathname.split('/').pop())
  if (pathname === '/inventory/goods-receipts') return upsert('goods_receipts')
  if (pathname.startsWith('/inventory/goods-receipts/')) return upsert('goods_receipts', pathname.split('/').pop())
  if (pathname === '/inventory/adjustments') return upsert('inventory_adjustments')
  if (pathname.startsWith('/inventory/adjustments/')) return upsert('inventory_adjustments', pathname.split('/').pop())
  if (pathname === '/accounting/invoices') return upsert('customer_invoices')
  if (pathname.startsWith('/accounting/invoices/')) return upsert('customer_invoices', pathname.split('/').pop())
  if (pathname === '/accounting/bills') return upsert('vendor_bills')
  if (pathname.startsWith('/accounting/bills/')) return upsert('vendor_bills', pathname.split('/').pop())
  if (pathname === '/accounting/credit-notes') return upsert('credit_notes')
  if (pathname.startsWith('/accounting/credit-notes/')) return upsert('credit_notes', pathname.split('/').pop())
  if (pathname === '/accounting/debit-notes') return upsert('debit_notes')
  if (pathname.startsWith('/accounting/debit-notes/')) return upsert('debit_notes', pathname.split('/').pop())

  throw new Error(`Unsupported write path: ${pathname}`)
}

const deleteResource = async <T>(path: string) => {
  const { pathname } = parsePath(path)
  const id = pathname.split('/').pop()

  const remove = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  if (pathname.startsWith('/sales-orders/quotations/')) return remove('quotations')
  if (pathname.startsWith('/sales-orders/')) return remove('sales_orders')
  if (pathname.startsWith('/purchase/rfqs/')) return remove('rfqs')
  if (pathname.startsWith('/purchase/purchase-orders/')) return remove('purchase_orders')
  if (pathname.startsWith('/inventory/delivery-orders/')) return remove('delivery_orders')
  if (pathname.startsWith('/inventory/goods-receipts/')) return remove('goods_receipts')
  if (pathname.startsWith('/inventory/adjustments/')) return remove('inventory_adjustments')
  if (pathname.startsWith('/crm/leads/')) return remove('leads')
  if (pathname.startsWith('/accounting/invoices/')) return remove('customer_invoices')
  if (pathname.startsWith('/accounting/bills/')) return remove('vendor_bills')
  if (pathname.startsWith('/accounting/credit-notes/')) return remove('credit_notes')
  if (pathname.startsWith('/accounting/debit-notes/')) return remove('debit_notes')

  throw new Error(`Unsupported delete path: ${pathname}`)
}

export const erpApi = {
  get: <T>(path: string) => getResource<T>(path),
  post: <T>(path: string, body: any) => writeResource<T>(path, body, 'POST'),
  put: <T>(path: string, body: any) => writeResource<T>(path, body, 'PUT'),
  delete: <T>(path: string) => deleteResource<T>(path),
}
