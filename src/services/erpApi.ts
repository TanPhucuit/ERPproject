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

const isPositiveNumber = (value: any) => Number.isFinite(Number(value)) && Number(value) > 0
const isNonNegativeNumber = (value: any) => Number.isFinite(Number(value)) && Number(value) >= 0

const ensureDateOrder = (start?: string | null, end?: string | null, message = 'End date must be on or after start date.') => {
  if (!start || !end) return
  if (new Date(end) < new Date(start)) throw new Error(message)
}

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
  if (!normalized) throw new Error('Customer is required and must exist in Master Data.')

  const existing = await maybeSingleByName('customers', normalized)
  if (existing?.id) return existing.id as string
  throw new Error(`Customer "${normalized}" does not exist in Master Data.`)
}

const resolveSupplierId = async (name?: string | null) => {
  const normalized = normalizeText(name)
  if (!normalized) throw new Error('Supplier is required and must exist in Master Data.')

  const existing = await maybeSingleByName('suppliers', normalized)
  if (existing?.id) return existing.id as string
  throw new Error(`Supplier "${normalized}" does not exist in Master Data.`)
}

const resolveWarehouseId = async (name?: string | null) => {
  const normalized = normalizeText(name)
  if (!normalized) {
    throw new Error('Warehouse is required and must exist in Master Data.')
  }
  const idMatch = normalized.match(/\((\d+)\)$/)
  if (idMatch) {
    return idMatch[1]
  }
  if (normalized) {
    const byName = await maybeSingleByName('warehouses', normalized, 'id, name, warehouse_code')
    if (byName?.id) return byName.id as string
    throw new Error(`Warehouse "${normalized}" does not exist in Master Data.`)
  }
  throw new Error('Warehouse is required and must exist in Master Data.')
}

const resolveCategoryId = async (name?: string | null) => {
  const normalized = normalizeText(name)
  if (!normalized) throw new Error('Product category is required and must exist in Master Data.')

  const existing = await maybeSingleByName('product_categories', normalized)
  if (existing?.id) return existing.id as string
  throw new Error(`Product category "${normalized}" does not exist in Master Data.`)
}

const resolveDefaultUomId = async () => {
  const { data, error } = await supabase
    .from('units_of_measure')
    .select('id, code')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data?.id) throw new Error('No units of measure found in database.')
  return data.id as string
}

const ensureUniqueValue = async (table: string, column: string, value: any, currentId?: string) => {
  const normalized = typeof value === 'string' ? value.trim() : value
  if (!normalized) return

  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq(column, normalized)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (data?.id && data.id !== currentId) {
    throw new Error(`${column.replace(/_/g, ' ')} "${normalized}" already exists.`)
  }
}

const ensureBinExists = async (warehouseId: string, binCode?: string | null) => {
  const normalizedBin = normalizeText(binCode)
  if (!normalizedBin) throw new Error('Bin location is required.')

  const { data, error } = await supabase
    .from('bin_locations')
    .select('id')
    .eq('warehouse_id', warehouseId)
    .ilike('bin_code', normalizedBin)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data?.id) {
    throw new Error(`Bin "${normalizedBin}" does not exist in the selected warehouse.`)
  }
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

const normalizeCategoryRow = (row: any) => ({
  ...row,
  displayOrder: row.display_order ?? 0,
})

const normalizeProductRow = (row: any) => ({
  ...row,
  categoryName: row.category?.name || row.categoryName || '',
  uomCode: row.uom?.code || '',
  listPrice: row.list_price,
  costPrice: row.cost_price,
  reorderLevel: row.reorder_level ?? 0,
  reorderQuantity: row.reorder_quantity ?? 0,
  supplierLeadTimeDays: row.supplier_lead_time_days ?? 0,
})

const normalizeCustomerMasterRow = (row: any) => ({
  ...row,
  customerNumber: row.customer_number,
  customerType: row.customer_type,
  contactName: row.contact_person_name || '',
  contactEmail: row.contact_person_email || '',
  contactPhone: row.contact_person_phone || '',
  billingAddress: row.billing_address || '',
  paymentTerms: row.payment_terms || 'NET30',
})

const normalizeSupplierRow = (row: any) => ({
  ...row,
  supplierNumber: row.supplier_number,
  supplierTypeId: row.supplier_type_id || '',
  contactName: row.contact_person_name || '',
  contactEmail: row.contact_person_email || '',
  contactPhone: row.contact_person_phone || '',
  companyAddress: row.company_address || '',
  paymentTerms: row.payment_terms || 'NET30',
  averageLeadTimeDays: row.average_lead_time_days ?? 7,
})

const normalizeUserRow = (row: any) => ({
  ...row,
  fullName: row.full_name,
  password: '', // Never expose password_hash, use empty string for security
})

const normalizeWarehouseRow = (row: any) => ({
  ...row,
  warehouseCode: row.warehouse_code,
  locationAddress: row.location_address || '',
  province: row.province || '',
  city: row.city || '',
  capacitySqm: row.capacity_sqm ?? 0,
  currentOccupancySqm: row.current_occupancy_sqm ?? 0,
})

const normalizeBinLocationRow = (row: any) => ({
  ...row,
  warehouseId: row.warehouse_id,
  warehouseName: row.warehouse?.name || '',
  warehouseCode: row.warehouse?.warehouse_code || '',
  binCode: row.bin_code || '',
  description: row.description || '',
  capacityUnits: row.capacity_units ?? 0,
  currentOccupancyUnits: row.current_occupancy_units ?? 0,
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
  const currentId = typeof body.id === 'string' ? body.id : undefined

  if (pathname === '/crm/leads' || pathname.startsWith('/crm/leads/')) {
    if (!isPositiveNumber(body.estimated_value || body.value || 0)) {
      throw new Error('Estimated value must be greater than 0.')
    }
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
    if (!isPositiveNumber(body.total_amount || body.total || 0)) {
      throw new Error('Quotation amount must be greater than 0.')
    }
    ensureDateOrder(
      body.issued_date || body.quote_date || body.date,
      body.valid_until_date || body.valid_until || body.expiryDate,
      'Quotation expiry date must be on or after quote date.'
    )
    
    // Business Rule: High discount (>15%) requires Sales Manager approval notification
    const discountPercent = body.discount_percent || body.discount || 0
    if (discountPercent > 15) {
      console.warn(`[Business Rule] Quotation has high discount (${discountPercent}%). Sales Manager approval required.`)
    }
    
    // Business Rule: SmartHome products should be validated
    const productCount = body.products?.length || 0
    if (productCount === 0) {
      throw new Error('Quotation must have at least one product.')
    }
    
    const customerId = body.customer_id || (await resolveCustomerId(body.customerName))
    return {
      quotation_number: body.quotation_number || body.quoteNumber,
      customer_id: customerId,
      lead_id: body.lead_id || null,
      issued_date: body.issued_date || body.quote_date || body.date || new Date().toISOString().slice(0, 10),
      valid_until_date: body.valid_until_date || body.valid_until || body.expiryDate || normalizeDate(undefined, 14),
      status: quotationStatusToDb[body.status] || body.status || 'draft',
      total_amount: Number(body.total_amount || body.total || 0),
      discount_percent: discountPercent,
      notes: body.notes || body.description || null,
      internal_notes: body.internal_notes || (discountPercent > 15 ? 'High discount - requires Sales Manager approval' : null),
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/sales-orders' || pathname.startsWith('/sales-orders/')) {
    if (!isPositiveNumber(body.total_amount || body.total || 0)) {
      throw new Error('Sales order total must be greater than 0.')
    }
    ensureDateOrder(
      body.order_date || body.date,
      body.required_delivery_date || body.dueDate || body.deliveryDate,
      'Delivery date must be on or after order date.'
    )
    
    // Business Rule: Check customer outstanding debt for B2B customers
    const customerId = body.customer_id || (await resolveCustomerId(body.customerName))
    const { data: customerData } = await supabase.from('customers').select('customer_type, credit_used, credit_limit').eq('id', customerId).single()
    if (customerData && customerData.customer_type === 'B2B') {
      const outstandingDebt = customerData.credit_used || 0
      const creditLimit = customerData.credit_limit || 0
      if (outstandingDebt > creditLimit * 0.8) {
        throw new Error(`[Business Rule] Customer has outstanding debt (${outstandingDebt.toLocaleString()} VND) exceeding 80% of credit limit. Cannot create sales order until payment is received.`)
      }
    }
    
    // Business Rule: SmartHome - inventory check at 3 warehouses (Hanoi, HCMC, Bao Hanh)
    const { data: warehouses } = await supabase.from('warehouses').select('id, name').in('status', ['active'])
    if (warehouses && warehouses.length > 0) {
      const warehouseIds = warehouses.map((w: any) => w.id)
      const { data: stockLevels } = await supabase
        .from('stock_levels')
        .select('product_id, quantity_on_hand, warehouse_id')
        .in('warehouse_id', warehouseIds)
        .gt('quantity_on_hand', 0)
      
      // Group stock by product
      const stockByProduct: Record<string, number> = {}
      if (stockLevels) {
        stockLevels.forEach((stock: any) => {
          stockByProduct[stock.product_id] = (stockByProduct[stock.product_id] || 0) + stock.quantity_on_hand
        })
      }
      
      // Check if ordered products have stock
      const orderProducts = body.products || []
      for (const product of orderProducts) {
        const availableStock = stockByProduct[product.product_id] || 0
        if (availableStock < (product.quantity_ordered || product.quantity || 0)) {
          console.warn(`[Business Rule] Product ${product.product_id} has insufficient stock. Available: ${availableStock}, Ordered: ${product.quantity_ordered || product.quantity || 0}`)
        }
      }
    }
    
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
    if (!normalizeText(body.description || body.productName)) {
      throw new Error('RFQ product or requirement is required.')
    }
    if (!normalizeText(body.supplierName)) {
      throw new Error('Supplier is required and must exist in Master Data.')
    }
    await resolveSupplierId(body.supplierName)
    ensureDateOrder(
      body.issued_date || body.date,
      body.closing_date || body.due_date || body.dueDate,
      'RFQ deadline must be on or after issued date.'
    )
    
    // Business Rule: RFQ must be sent to at least 3 suppliers for comparison (SmartHome procurement)
    const supplierCount = body.supplier_ids?.length || 1
    if (supplierCount < 3 && !body.supplierName.includes('Multiple')) {
      console.warn(`[Business Rule] SmartHome best practice: Send RFQ to at least 3 suppliers for competitive pricing.`)
    }
    
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
    if (!isPositiveNumber(body.total_amount || body.total || 0)) {
      throw new Error('Purchase order total must be greater than 0.')
    }
    ensureDateOrder(
      body.order_date || body.date,
      body.required_delivery_date || body.expected_delivery_date || body.dueDate,
      'Expected delivery date must be on or after PO date.'
    )
    
    // Business Rule: PO should be linked to an RFQ for traceability
    if (!body.rfq_id && !body.rfq_number) {
      console.warn(`[Business Rule] Purchase Order is not linked to an RFQ. Consider creating RFQ first for better procurement tracking.`)
    }
    
    // Business Rule: Check supplier lead time against product reorder levels
    const supplierId = body.supplier_id || (await resolveSupplierId(body.supplierName))
    const { data: supplierData } = await supabase.from('suppliers').select('average_lead_time_days, quality_rating').eq('id', supplierId).single()
    if (supplierData) {
      const avgLeadTime = supplierData.average_lead_time_days || 7
      if (avgLeadTime > 14) {
        console.warn(`[Business Rule] Supplier has long average lead time (${avgLeadTime} days). Plan inventory accordingly.`)
      }
      if (supplierData.quality_rating && supplierData.quality_rating < 3) {
        throw new Error(`[Business Rule] Supplier quality rating is low (${supplierData.quality_rating}/5). Consider alternative suppliers.`)
      }
    }
    
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
    const warehouseId = body.warehouse_id || (await resolveWarehouseId(body.warehouseName))
    await resolveCustomerId(body.partnerName)
    return {
      delivery_order_number: body.delivery_order_number || body.reference,
      sales_order_id: body.sales_order_id || (await resolveSalesOrderId(body.reference, body.partnerName)),
      warehouse_id: warehouseId,
      status: deliveryStatusToDb[body.status] || body.status || 'draft',
      scheduled_delivery_date: body.scheduled_delivery_date || body.scheduledDate || null,
      notes: body.notes || null,
    }
  }

  if (pathname === '/inventory/goods-receipts' || pathname.startsWith('/inventory/goods-receipts/')) {
    // Business Rule: SmartHome IoT devices require Serial/MAC address scanning
    const purchaseOrderId = body.purchase_order_id || (await resolvePurchaseOrderId(body.reference, body.partnerName))
    console.info(`[Business Rule] Goods Receipt for PO. All IoT devices (Camera, Robot, Smart Lock) must have Serial/MAC scanned for warranty tracking.`)
    
    const warehouseId = body.warehouse_id || (await resolveWarehouseId(body.warehouseName))
    await resolveSupplierId(body.partnerName)
    return {
      goods_receipt_number: body.goods_receipt_number || body.reference,
      purchase_order_id: purchaseOrderId,
      warehouse_id: warehouseId,
      status: receiptStatusToDb[body.status] || body.status || 'draft',
      received_date: body.received_date || body.scheduledDate || new Date().toISOString().slice(0, 10),
      notes: body.notes || null,
    }
  }

  if (pathname === '/inventory/adjustments' || pathname.startsWith('/inventory/adjustments/')) {
    const warehouseId = body.warehouse_id || (await resolveWarehouseId(body.warehouseName))
    await ensureBinExists(warehouseId, body.binCode || body.reason)
    
    // Business Rule: Stock count must cover all 30 bin locations (SmartHome warehouse)
    const { count: binCount } = await supabase.from('bin_locations').select('*', { count: 'exact', head: true }).eq('warehouse_id', warehouseId)
    if (binCount) {
      console.info(`[Business Rule] Warehouse has ${binCount} bin locations. Ensure all bins are counted for accurate inventory.`)
    }
    
    return {
      adjustment_number: body.adjustment_number || body.reference,
      warehouse_id: warehouseId,
      adjustment_type: body.adjustment_type || 'stock_count',
      count_date: body.count_date || body.countDate || new Date().toISOString().slice(0, 10),
      status: adjustmentStatusToDb[body.status] || body.status || 'draft',
      reason: body.reason || body.binCode || null,
      notes: body.notes || null,
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/accounting/invoices' || pathname.startsWith('/accounting/invoices/')) {
    if (!isPositiveNumber(body.total_amount || 0)) {
      throw new Error('Invoice total must be greater than 0.')
    }
    ensureDateOrder(body.invoice_date, body.due_date || body.dueDate, 'Invoice due date must be on or after invoice date.')
    
    // Business Rule: Invoice created only when Sales Order is delivered successfully
    const salesOrderId = body.sales_order_id || (await resolveSalesOrderId(body.sales_order_number, body.customerName))
    if (salesOrderId) {
      const { data: soData } = await supabase.from('sales_orders').select('status').eq('id', salesOrderId).single()
      if (soData && !['delivered', 'completed', 'shipped'].includes(soData.status)) {
        throw new Error(`[Business Rule] Cannot create invoice. Sales Order must be delivered first. Current status: ${soData.status}`)
      }
    }
    
    const customerId = body.customer_id || (await resolveCustomerId(body.customerName))
    return {
      invoice_number: body.invoice_number,
      sales_order_id: salesOrderId,
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
    if (!isPositiveNumber(body.total_amount || body.total || 0)) {
      throw new Error('Vendor bill total must be greater than 0.')
    }
    ensureDateOrder(
      body.bill_date || body.billDate,
      body.due_date || body.dueDate,
      'Bill due date must be on or after bill date.'
    )
    
    // Business Rule: Vendor Bill created only when Goods Receipt is completed
    const purchaseOrderId = body.purchase_order_id || (await resolvePurchaseOrderId(body.purchase_order_number, body.supplierName))
    if (purchaseOrderId) {
      const { data: grData } = await supabase.from('goods_receipts')
        .select('status')
        .eq('purchase_order_id', purchaseOrderId)
        .in('status', ['received', 'verified', 'completed'])
        .limit(1)
      if (!grData || grData.length === 0) {
        throw new Error(`[Business Rule] Cannot create Vendor Bill. Must have at least one completed Goods Receipt for this PO.`)
      }
    }
    
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
    if (!isPositiveNumber(body.total_amount || body.total || 0)) {
      throw new Error('Credit note amount must be greater than 0.')
    }
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
    if (!isPositiveNumber(body.total_amount || body.total || 0)) {
      throw new Error('Debit note amount must be greater than 0.')
    }
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

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    await ensureUniqueValue('users', 'email', body.email, currentId)
    if (!normalizeText(body.fullName ?? body.full_name)) throw new Error('Full name is required.')
    const result: any = {
      email: body.email,
      full_name: body.fullName ?? body.full_name,
      phone: body.phone ?? null,
      role: body.role ?? 'user',
      status: body.status ?? 'active',
    }
    // Only include password if provided and not empty
    if (body.password || !currentId) {
      result.password_hash = body.password || body.password_hash || '123456'
    }
    return result
  }

  if (pathname === '/product-categories' || pathname.startsWith('/product-categories/')) {
    await ensureUniqueValue('product_categories', 'name', body.name, currentId)
    return {
      name: body.name,
      description: body.description || null,
      display_order: Number(body.display_order ?? body.displayOrder ?? 0),
    }
  }

  if (pathname === '/products' || pathname.startsWith('/products/')) {
    await ensureUniqueValue('products', 'sku', body.sku, currentId)
    if (!isPositiveNumber(body.list_price ?? body.listPrice ?? 0)) {
      throw new Error('List price must be greater than 0.')
    }
    if (!isNonNegativeNumber(body.cost_price ?? body.costPrice ?? 0)) {
      throw new Error('Cost price cannot be negative.')
    }
    if (Number(body.cost_price ?? body.costPrice ?? 0) > Number(body.list_price ?? body.listPrice ?? 0)) {
      throw new Error('Cost price cannot be greater than list price.')
    }
    const categoryId = body.category_id || (await resolveCategoryId(body.categoryName || body.category_name))
    const uomId = body.uom_id || (await resolveDefaultUomId())
    return {
      sku: body.sku,
      name: body.name,
      description: body.description || null,
      category_id: categoryId,
      uom_id: uomId,
      list_price: Number(body.list_price ?? body.listPrice ?? 0),
      cost_price: Number(body.cost_price ?? body.costPrice ?? 0),
      reorder_level: Number(body.reorder_level ?? body.reorderLevel ?? 10),
      reorder_quantity: Number(body.reorder_quantity ?? body.reorderQuantity ?? 50),
      supplier_lead_time_days: Number(body.supplier_lead_time_days ?? body.supplierLeadTimeDays ?? 7),
      status: body.status || 'active',
      barcode: body.barcode || null,
      image_url: body.image_url || null,
    }
  }

  if (pathname === '/customers' || pathname.startsWith('/customers/')) {
    if (!normalizeText(body.name)) throw new Error('Customer name is required.')
    return {
      name: body.name,
      customer_type: body.customerType ?? body.customer_type ?? 'B2C',
      contact_person_name: body.contactName ?? body.contact_person_name ?? body.name,
      contact_person_email: body.contactEmail ?? body.contact_person_email ?? null,
      contact_person_phone: body.contactPhone ?? body.contact_person_phone ?? null,
      billing_address: body.billingAddress ?? body.billing_address ?? null,
      shipping_address: body.shippingAddress ?? body.shipping_address ?? body.billingAddress ?? body.billing_address ?? null,
      payment_terms: body.paymentTerms ?? body.payment_terms ?? 'NET30',
      status: body.status ?? 'active',
      created_by_id: body.created_by_id || currentUserId,
    }
  }

  if (pathname === '/suppliers' || pathname.startsWith('/suppliers/')) {
    if (!normalizeText(body.name)) throw new Error('Supplier name is required.')
    return {
      name: body.name,
      supplier_type_id: body.supplierTypeId ?? body.supplier_type_id ?? null,
      contact_person_name: body.contactName ?? body.contact_person_name ?? body.name,
      contact_person_email: body.contactEmail ?? body.contact_person_email ?? null,
      contact_person_phone: body.contactPhone ?? body.contact_person_phone ?? null,
      company_address: body.companyAddress ?? body.company_address ?? null,
      payment_terms: body.paymentTerms ?? body.payment_terms ?? 'NET30',
      average_lead_time_days: Number(body.averageLeadTimeDays ?? body.average_lead_time_days ?? 7),
      status: body.status ?? 'active',
    }
  }

  if (pathname === '/warehouse/warehouses' || pathname.startsWith('/warehouse/warehouses/')) {
    const warehouseCode = body.warehouseCode ?? body.warehouse_code
    await ensureUniqueValue('warehouses', 'warehouse_code', warehouseCode, currentId)
    if (!normalizeText(body.name)) throw new Error('Warehouse name is required.')
    if (!isNonNegativeNumber(body.capacitySqm ?? body.capacity_sqm ?? 0)) {
      throw new Error('Warehouse capacity cannot be negative.')
    }
    if (
      isNonNegativeNumber(body.currentOccupancySqm ?? body.current_occupancy_sqm ?? 0) &&
      Number(body.currentOccupancySqm ?? body.current_occupancy_sqm ?? 0) > Number(body.capacitySqm ?? body.capacity_sqm ?? 0)
    ) {
      throw new Error('Current occupancy cannot exceed warehouse capacity.')
    }
    return {
      warehouse_code: warehouseCode,
      name: body.name,
      description: body.description || null,
      location_address: body.locationAddress ?? body.location_address ?? null,
      city: body.city || null,
      province: body.province || null,
      postal_code: body.postalCode ?? body.postal_code ?? null,
      capacity_sqm: Number(body.capacitySqm ?? body.capacity_sqm ?? 0),
      current_occupancy_sqm: Number(body.currentOccupancySqm ?? body.current_occupancy_sqm ?? 0),
      status: body.status || 'active',
    }
  }

  if (pathname === '/warehouse/bin-locations' || pathname.startsWith('/warehouse/bin-locations/')) {
    let warehouseId = body.warehouse_id
    if (!warehouseId) {
      warehouseId = await resolveWarehouseId(body.warehouseName)
    }
    if (!normalizeText(body.binCode ?? body.bin_code)) throw new Error('Bin code is required.')
    if (!isNonNegativeNumber(body.capacityUnits ?? body.capacity_units ?? 0)) {
      throw new Error('Bin capacity cannot be negative.')
    }
    if (!isNonNegativeNumber(body.currentOccupancyUnits ?? body.current_occupancy_units ?? 0)) {
      throw new Error('Current occupancy cannot be negative.')
    }
    if (Number(body.currentOccupancyUnits ?? body.current_occupancy_units ?? 0) > Number(body.capacityUnits ?? body.capacity_units ?? 0)) {
      throw new Error('Current occupancy cannot exceed bin capacity.')
    }
    const { data: existingBin, error: binError } = await supabase
      .from('bin_locations')
      .select('id')
      .eq('warehouse_id', warehouseId)
      .ilike('bin_code', body.binCode ?? body.bin_code)
      .limit(1)
      .maybeSingle()
    if (binError) throw binError
    if (existingBin?.id && existingBin.id !== currentId) {
      throw new Error(`Bin code "${body.binCode ?? body.bin_code}" already exists in the selected warehouse.`)
    }
    return {
      warehouse_id: warehouseId,
      bin_code: body.binCode ?? body.bin_code,
      description: body.description || null,
      capacity_units: Number(body.capacityUnits ?? body.capacity_units ?? 0),
      current_occupancy_units: Number(body.currentOccupancyUnits ?? body.current_occupancy_units ?? 0),
      status: body.status ?? 'active',
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

  if (
    pathname.startsWith('/sales-orders/') &&
    pathname !== '/sales-orders/quotations' &&
    !pathname.startsWith('/sales-orders/quotations/')
  ) {
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
      supabase
        .from('products')
        .select('*, category:product_categories(name), uom:units_of_measure(code, name)')
        .order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeProductRow)) as T
  }

  if (pathname.startsWith('/products/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('products')
      .select('*, category:product_categories(name), uom:units_of_measure(code, name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizeProductRow(data) as T
  }

  if (pathname === '/products/categories/all' || pathname === '/product-categories') {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) throw error
    return ((data || []).map(normalizeCategoryRow)) as T
  }

  if (pathname.startsWith('/product-categories/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('product_categories').select('*').eq('id', id).single()
    if (error) throw error
    return normalizeCategoryRow(data) as T
  }

  if (pathname === '/customers') {
    const { data, error } = await applyLimit(
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeCustomerMasterRow)) as T
  }

  if (pathname.startsWith('/customers/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
    if (error) throw error
    return normalizeCustomerMasterRow(data) as T
  }

  if (pathname === '/suppliers') {
    const { data, error } = await applyLimit(
      supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeSupplierRow)) as T
  }

  if (pathname.startsWith('/suppliers/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
    if (error) throw error
    return normalizeSupplierRow(data) as T
  }

  if (pathname === '/users') {
    const { data, error } = await applyLimit(
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeUserRow)) as T
  }

  if (pathname.startsWith('/users/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (error) throw error
    return normalizeUserRow(data) as T
  }

  if (pathname === '/warehouse/warehouses') {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return ((data || []).map(normalizeWarehouseRow)) as T
  }

  if (pathname.startsWith('/warehouse/warehouses/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase.from('warehouses').select('*').eq('id', id).single()
    if (error) throw error
    return normalizeWarehouseRow(data) as T
  }

  if (pathname === '/warehouse/bin-locations') {
    const { data, error } = await applyLimit(
      supabase
        .from('bin_locations')
        .select('*, warehouse:warehouses(name, warehouse_code)')
        .order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeBinLocationRow)) as T
  }

  if (pathname.startsWith('/warehouse/bin-locations/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('bin_locations')
      .select('*, warehouse:warehouses(name, warehouse_code)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizeBinLocationRow(data) as T
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
  if (pathname === '/users') return upsert('users')
  if (pathname.startsWith('/users/')) return upsert('users', pathname.split('/').pop())
  if (pathname === '/product-categories') return upsert('product_categories')
  if (pathname.startsWith('/product-categories/')) return upsert('product_categories', pathname.split('/').pop())
  if (pathname === '/products') return upsert('products')
  if (pathname.startsWith('/products/')) return upsert('products', pathname.split('/').pop())
  if (pathname === '/customers') return upsert('customers')
  if (pathname.startsWith('/customers/')) return upsert('customers', pathname.split('/').pop())
  if (pathname === '/suppliers') return upsert('suppliers')
  if (pathname.startsWith('/suppliers/')) return upsert('suppliers', pathname.split('/').pop())
  if (pathname === '/warehouse/warehouses') return upsert('warehouses')
  if (pathname.startsWith('/warehouse/warehouses/')) return upsert('warehouses', pathname.split('/').pop())
  if (pathname === '/warehouse/bin-locations') return upsert('bin_locations')
  if (pathname.startsWith('/warehouse/bin-locations/')) return upsert('bin_locations', pathname.split('/').pop())

  throw new Error(`Unsupported write path: ${pathname}`)
}

// Helper to check if records exist with a foreign key
const checkRelatedRecords = async (table: string, foreignKey: string, id: string): Promise<{ count: number; records: string }> => {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(foreignKey, id)
  if (error) throw error
  return { count: count || 0, records: table }
}

// Helper to get related record names for error messages
const getRelatedRecordNames = async (table: string, foreignKey: string, id: string, limit = 5): Promise<string[]> => {
  const { data, error } = await supabase.from(table).select('*').eq(foreignKey, id).limit(limit)
  if (error) return []
  return (data || []).map((r: any) => r.name || r.code || r.number || r.email || r.id).slice(0, limit)
}

const deleteResource = async <T>(path: string) => {
  const { pathname } = parsePath(path)
  const id = pathname.split('/').pop()

  // ========== SALES ORDERS ==========
  if (pathname.startsWith('/sales-orders/')) {
    // Check for delivery orders
    const doCheck = await checkRelatedRecords('delivery_orders', 'sales_order_id', id!)
    if (doCheck.count > 0) {
      const deliveryOrders = await getRelatedRecordNames('delivery_orders', 'sales_order_id', id!)
      throw new Error(`Không thể xóa Sales Order này vì có ${doCheck.count} Delivery Order(s) liên quan: ${deliveryOrders.join(', ')}. Vui lòng xóa Delivery Orders trước.`)
    }
    const { error } = await supabase.from('sales_orders').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== QUOTATIONS ==========
  if (pathname.startsWith('/sales-orders/quotations/')) {
    // Check if quotation is linked to a sales order
    const { data: soData } = await supabase.from('sales_orders').select('id').eq('quotation_id', id).limit(1)
    if (soData && soData.length > 0) {
      throw new Error('Không thể xóa Quotation này vì đã được chuyển thành Sales Order. Vui lòng xóa Sales Order liên quan trước.')
    }
    const { error } = await supabase.from('quotations').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== CUSTOMERS ==========
  if (pathname.startsWith('/customers/')) {
    // Check for quotations
    const qtCheck = await checkRelatedRecords('quotations', 'customer_id', id!)
    if (qtCheck.count > 0) {
      throw new Error(`Không thể xóa Customer này vì có ${qtCheck.count} Quotation(s) liên quan. Vui lòng xóa Quotation(s) trước.`)
    }
    // Check for sales orders
    const soCheck = await checkRelatedRecords('sales_orders', 'customer_id', id!)
    if (soCheck.count > 0) {
      throw new Error(`Không thể xóa Customer này vì có ${soCheck.count} Sales Order(s) liên quan. Vui lòng xóa Sales Orders trước.`)
    }
    // Check for invoices
    const invCheck = await checkRelatedRecords('customer_invoices', 'customer_id', id!)
    if (invCheck.count > 0) {
      throw new Error(`Không thể xóa Customer này vì có ${invCheck.count} Invoice(s) liên quan. Vui lòng xóa Invoices trước.`)
    }
    // Check for credit notes
    const cnCheck = await checkRelatedRecords('credit_notes', 'customer_id', id!)
    if (cnCheck.count > 0) {
      throw new Error(`Không thể xóa Customer này vì có ${cnCheck.count} Credit Note(s) liên quan. Vui lòng xóa Credit Notes trước.`)
    }
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== PRODUCTS ==========
  if (pathname.startsWith('/products/')) {
    // Check for quotation lines
    const qtLineCheck = await checkRelatedRecords('quotation_lines', 'product_id', id!)
    if (qtLineCheck.count > 0) {
      throw new Error(`Không thể xóa Product này vì có ${qtLineCheck.count} Quotation Line(s) liên quan.`)
    }
    // Check for sales order lines
    const soLineCheck = await checkRelatedRecords('sales_order_lines', 'product_id', id!)
    if (soLineCheck.count > 0) {
      throw new Error(`Không thể xóa Product này vì có ${soLineCheck.count} Sales Order Line(s) liên quan.`)
    }
    // Check for stock levels
    const stockCheck = await checkRelatedRecords('stock_levels', 'product_id', id!)
    if (stockCheck.count > 0) {
      throw new Error(`Không thể xóa Product này vì có ${stockCheck.count} Stock Level(s) liên quan. Vui lòng xóa Stock Levels trước.`)
    }
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== PRODUCT CATEGORIES ==========
  if (pathname.startsWith('/product-categories/')) {
    const prodCheck = await checkRelatedRecords('products', 'category_id', id!)
    if (prodCheck.count > 0) {
      throw new Error(`Không thể xóa Category này vì có ${prodCheck.count} Product(s) thuộc category. Vui lòng xóa hoặc chuyển Products sang category khác trước.`)
    }
    const { error } = await supabase.from('product_categories').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== SUPPLIERS ==========
  if (pathname.startsWith('/suppliers/')) {
    // Check for quotations
    const rfqCheck = await checkRelatedRecords('rfq_supplier_quotations', 'supplier_id', id!)
    if (rfqCheck.count > 0) {
      throw new Error(`Không thể xóa Supplier này vì có ${rfqCheck.count} RFQ Supplier Quotation(s) liên quan.`)
    }
    // Check for purchase orders
    const poCheck = await checkRelatedRecords('purchase_orders', 'supplier_id', id!)
    if (poCheck.count > 0) {
      throw new Error(`Không thể xóa Supplier này vì có ${poCheck.count} Purchase Order(s) liên quan. Vui lòng xóa Purchase Orders trước.`)
    }
    // Check for vendor bills
    const vbCheck = await checkRelatedRecords('vendor_bills', 'supplier_id', id!)
    if (vbCheck.count > 0) {
      throw new Error(`Không thể xóa Supplier này vì có ${vbCheck.count} Vendor Bill(s) liên quan. Vui lòng xóa Vendor Bills trước.`)
    }
    // Check for debit notes
    const dnCheck = await checkRelatedRecords('debit_notes', 'supplier_id', id!)
    if (dnCheck.count > 0) {
      throw new Error(`Không thể xóa Supplier này vì có ${dnCheck.count} Debit Note(s) liên quan. Vui lòng xóa Debit Notes trước.`)
    }
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== PURCHASE ORDERS ==========
  if (pathname.startsWith('/purchase/purchase-orders/')) {
    // Check for goods receipts
    const grCheck = await checkRelatedRecords('goods_receipts', 'purchase_order_id', id!)
    if (grCheck.count > 0) {
      throw new Error(`Không thể xóa Purchase Order này vì có ${grCheck.count} Goods Receipt(s) liên quan. Vui lòng xóa Goods Receipts trước.`)
    }
    // Check for vendor bills
    const vbCheck = await checkRelatedRecords('vendor_bills', 'purchase_order_id', id!)
    if (vbCheck.count > 0) {
      throw new Error(`Không thể xóa Purchase Order này vì có ${vbCheck.count} Vendor Bill(s) liên quan. Vui lòng xóa Vendor Bills trước.`)
    }
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== RFQS ==========
  if (pathname.startsWith('/purchase/rfqs/')) {
    // Check for purchase orders
    const poCheck = await checkRelatedRecords('purchase_orders', 'rfq_id', id!)
    if (poCheck.count > 0) {
      throw new Error('Không thể xóa RFQ này vì đã có Purchase Order được tạo từ RFQ. Vui lòng xóa Purchase Order trước.')
    }
    const { error } = await supabase.from('rfqs').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== DELIVERY ORDERS ==========
  if (pathname.startsWith('/inventory/delivery-orders/')) {
    // Check status - don't allow delete if already delivered
    const { data: doData } = await supabase.from('delivery_orders').select('status').eq('id', id).single()
    if (doData && ['delivered', 'shipped', 'in_transit'].includes(doData.status)) {
      throw new Error(`Không thể xóa Delivery Order này vì đã ở trạng thái "${doData.status}". Chỉ có thể xóa Delivery Orders ở trạng thái Draft, Ready, hoặc Cancelled.`)
    }
    const { error } = await supabase.from('delivery_orders').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== GOODS RECEIPTS ==========
  if (pathname.startsWith('/inventory/goods-receipts/')) {
    // Check status - don't allow delete if already completed
    const { data: grData } = await supabase.from('goods_receipts').select('status').eq('id', id).single()
    if (grData && ['completed', 'verified'].includes(grData.status)) {
      throw new Error(`Không thể xóa Goods Receipt này vì đã ở trạng thái "${grData.status}". Chỉ có thể xóa Goods Receipts ở trạng thái Draft, Received, hoặc Cancelled.`)
    }
    const { error } = await supabase.from('goods_receipts').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== CUSTOMER INVOICES ==========
  if (pathname.startsWith('/accounting/invoices/')) {
    // Check for credit notes
    const cnCheck = await checkRelatedRecords('credit_notes', 'invoice_id', id!)
    if (cnCheck.count > 0) {
      throw new Error(`Không thể xóa Invoice này vì có ${cnCheck.count} Credit Note(s) liên quan. Vui lòng xóa Credit Notes trước.`)
    }
    // Check status - don't allow delete if already paid
    const { data: invData } = await supabase.from('customer_invoices').select('status').eq('id', id).single()
    if (invData && invData.status === 'paid') {
      throw new Error('Không thể xóa Invoice đã thanh toán. Hãy tạo Credit Note để xử lý.')
    }
    const { error } = await supabase.from('customer_invoices').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== VENDOR BILLS ==========
  if (pathname.startsWith('/accounting/bills/')) {
    // Check for debit notes
    const dnCheck = await checkRelatedRecords('debit_notes', 'bill_id', id!)
    if (dnCheck.count > 0) {
      throw new Error(`Không thể xóa Vendor Bill này vì có ${dnCheck.count} Debit Note(s) liên quan. Vui lòng xóa Debit Notes trước.`)
    }
    // Check status - don't allow delete if already paid
    const { data: vbData } = await supabase.from('vendor_bills').select('status').eq('id', id).single()
    if (vbData && vbData.status === 'paid') {
      throw new Error('Không thể xóa Vendor Bill đã thanh toán. Hãy tạo Debit Note để xử lý.')
    }
    const { error } = await supabase.from('vendor_bills').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== CRM LEADS ==========
  if (pathname.startsWith('/crm/leads/')) {
    // Check if lead is Won/Lost and has related customer
    const { data: leadData } = await supabase.from('leads').select('status, customer_id').eq('id', id).single()
    if (leadData && leadData.customer_id) {
      throw new Error('Không thể xóa Lead này vì đã chuyển thành Customer. Vui lòng xóa Customer liên quan trước.')
    }
    // Check for quotations created from lead
    const qtCheck = await checkRelatedRecords('quotations', 'lead_id', id!)
    if (qtCheck.count > 0) {
      throw new Error(`Không thể xóa Lead này vì có ${qtCheck.count} Quotation(s) được tạo từ Lead. Vui lòng xóa Quotation(s) trước.`)
    }
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== USERS ==========
  if (pathname.startsWith('/users/')) {
    // Check if user is owner of any leads
    const leadCheck = await checkRelatedRecords('leads', 'owner_id', id!)
    if (leadCheck.count > 0) {
      throw new Error(`Không thể xóa User này vì đang là Owner của ${leadCheck.count} Lead(s). Vui lòng chuyển Leads sang User khác trước.`)
    }
    // Check if user is creator of any quotations
    const qtCheck = await checkRelatedRecords('quotations', 'created_by_id', id!)
    if (qtCheck.count > 0) {
      throw new Error(`Không thể xóa User này vì đã tạo ${qtCheck.count} Quotation(s). Không thể xóa người dùng đã tạo transaction.`)
    }
    // Check if user is sales person of any sales orders
    const soCheck = await checkRelatedRecords('sales_orders', 'sales_person_id', id!)
    if (soCheck.count > 0) {
      throw new Error(`Không thể xóa User này vì là Sales Person của ${soCheck.count} Sales Order(s). Vui lòng chuyển Sales Orders sang User khác trước.`)
    }
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== WAREHOUSES ==========
  if (pathname.startsWith('/warehouse/warehouses/')) {
    // Check for bin locations
    const binCheck = await checkRelatedRecords('bin_locations', 'warehouse_id', id!)
    if (binCheck.count > 0) {
      throw new Error(`Không thể xóa Warehouse này vì có ${binCheck.count} Bin Location(s). Vui lòng xóa Bin Locations trước.`)
    }
    // Check for delivery orders
    const doCheck = await checkRelatedRecords('delivery_orders', 'warehouse_id', id!)
    if (doCheck.count > 0) {
      throw new Error(`Không thể xóa Warehouse này vì có ${doCheck.count} Delivery Order(s) liên quan.`)
    }
    // Check for goods receipts
    const grCheck = await checkRelatedRecords('goods_receipts', 'warehouse_id', id!)
    if (grCheck.count > 0) {
      throw new Error(`Không thể xóa Warehouse này vì có ${grCheck.count} Goods Receipt(s) liên quan.`)
    }
    // Check for stock levels
    const stockCheck = await checkRelatedRecords('stock_levels', 'warehouse_id', id!)
    if (stockCheck.count > 0) {
      throw new Error(`Không thể xóa Warehouse này vì có ${stockCheck.count} Stock Level(s). Vui lòng xóa Stock Levels trước.`)
    }
    const { error } = await supabase.from('warehouses').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== BIN LOCATIONS ==========
  if (pathname.startsWith('/warehouse/bin-locations/')) {
    // Check for stock in bins
    const sibCheck = await checkRelatedRecords('stock_in_bins', 'bin_location_id', id!)
    if (sibCheck.count > 0) {
      throw new Error(`Không thể xóa Bin Location này vì đang có ${sibCheck.count} Stock record(s). Vui lòng chuyển Stock sang Bin khác trước.`)
    }
    const { error } = await supabase.from('bin_locations').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== INVENTORY ADJUSTMENTS ==========
  if (pathname.startsWith('/inventory/adjustments/')) {
    const { data: adjData } = await supabase.from('inventory_adjustments').select('status').eq('id', id).single()
    if (adjData && adjData.status === 'completed') {
      throw new Error('Không thể xóa Inventory Adjustment đã được phê duyệt (Completed).')
    }
    const { error } = await supabase.from('inventory_adjustments').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== CREDIT NOTES ==========
  if (pathname.startsWith('/accounting/credit-notes/')) {
    const { error } = await supabase.from('credit_notes').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  // ========== DEBIT NOTES ==========
  if (pathname.startsWith('/accounting/debit-notes/')) {
    const { error } = await supabase.from('debit_notes').delete().eq('id', id)
    if (error) throw error
    return { success: true } as T
  }

  throw new Error(`Unsupported delete path: ${pathname}`)
}

export const erpApi = {
  get: <T>(path: string) => getResource<T>(path),
  post: <T>(path: string, body: any) => writeResource<T>(path, body, 'POST'),
  put: <T>(path: string, body: any) => writeResource<T>(path, body, 'PUT'),
  delete: <T>(path: string) => deleteResource<T>(path),
}
