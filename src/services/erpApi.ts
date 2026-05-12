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
  const input = normalizeText(name)
  if (!input) {
    throw new Error('Warehouse is required and must exist in Master Data.')
  }
  // If it looks like a UUID, trust it directly (from dropdown value)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
    return input
  }
  // Extract warehouse_code from label like "Kho Ha Noi (WH-HN)"
  const codeMatch = input.match(/\(([A-Z0-9-]+)\)\s*$/)
  if (codeMatch) {
    const { data, error } = await supabase.from('warehouses').select('id').ilike('warehouse_code', codeMatch[1]).limit(1).maybeSingle()
    if (error) throw error
    if (data?.id) return data.id as string
    throw new Error(`Warehouse code "${codeMatch[1]}" not found.`)
  }
  // Fallback: lookup by name
  const byName = await maybeSingleByName('warehouses', input, 'id, name, warehouse_code')
  if (byName?.id) return byName.id as string
  throw new Error(`Warehouse "${input}" does not exist in Master Data.`)
}

const resolveCategoryId = async (name?: string | null) => {
  const input = normalizeText(name)
  if (!input) throw new Error('Product category is required and must exist in Master Data.')
  // If it looks like a UUID, trust it directly (from dropdown value)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
    return input
  }
  const existing = await maybeSingleByName('product_categories', input)
  if (existing?.id) return existing.id as string
  throw new Error(`Product category "${input}" does not exist in Master Data.`)
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

const resolveUomId = async (nameOrCode: string) => {
  if (!nameOrCode) return null
  const { data, error } = await supabase
    .from('units_of_measure')
    .select('id')
    .or(`name.ilike.${nameOrCode},code.ilike.${nameOrCode}`)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error(`Unit of measure "${nameOrCode}" not found.`)
  return data.id as string
}

const resolveUserIdByName = async (fullName: string) => {
  if (!fullName) return null
  const input = normalizeText(fullName)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
    return input
  }
  const { data, error } = await supabase.from('users').select('id').ilike('full_name', input).limit(1).maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error(`User "${input}" not found.`)
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
  stage: lead.stage?.name || lead.stage || 'new',
  email: lead.contact_person_email,
  phone: lead.contact_person_phone,
  company: lead.company_name,
  next_follow_up: lead.expected_close_date,
  internal_notes: lead.notes,
  owner_name: lead.owner?.full_name || lead.owner_name || '',
  customer_type: lead.customer_type,
  billing_address: lead.billing_address,
  shipping_address: lead.shipping_address,
  tax_percent: lead.tax_percent || 10,
  is_auto_request: lead.is_auto_request || false,
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
  uomName: row.uom?.name || row.uom?.code || '',
  listPrice: row.list_price,
  costPrice: row.cost_price,
  reorderLevel: row.reorder_level ?? 0,
  reorderQuantity: row.reorder_quantity ?? 0,
  supplierLeadTimeDays: row.supplier_lead_time_days ?? 0,
  is_auto_bom: row.is_auto_bom ?? false,
  min_sqm: row.min_sqm ?? 0,
  max_sqm: row.max_sqm ?? 9999,
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
  supplierTypeName: row.supplier_type?.name || '',  // For dropdown display
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

// Helper: prefers camelCase (form values) over snake_case (DB response values).
// On CREATE (no id): picks first non-empty value.
// On EDIT (has id): picks camelCase first; snake_case only if camelCase is absent/missing.
const norm = (body: Record<string, any>, camel: string, snake: string): any => {
  const cv = body[camel]
  const sv = body[snake]
  // camelCase takes priority when both exist; snake_case is DB fallback
  if (cv !== undefined && cv !== null && cv !== '') return cv
  return sv
}

const normalizeWriteBody = async (pathname: string, body: Record<string, any>) => {
  const currentUserId = await getCurrentUserId()
  const currentId = typeof body.id === 'string' ? body.id : undefined

  if (pathname === '/crm/leads' || pathname.startsWith('/crm/leads/')) {
    // Auto-detect customer: check by email first
    const email = body.contact_person_email || body.email || null
    let customerId: string | null = null
    if (email) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .ilike('contact_person_email', email)
        .limit(1)
        .maybeSingle()
      if (existingCustomer?.id) {
        customerId = existingCustomer.id
      }
    }

    const stage = await resolveLeadStage(norm(body, 'stage', 'status'))
    const payload: any = {
      lead_number: norm(body, 'lead_number', 'leadNumber') || `LEAD-${Date.now().toString().slice(-6)}`,
      company_name: norm(body, 'company_name', 'company') || norm(body, 'company', 'name'),
      contact_person_name: norm(body, 'contact_person_name', 'contact_name') || norm(body, 'contact_name', 'name'),
      contact_person_phone: norm(body, 'contact_person_phone', 'phone') || null,
      contact_person_email: email,
      company_address: norm(body, 'company_address', 'address') || null,
      company_tax_id: norm(body, 'company_tax_id', 'tax_id') || null,
      source: norm(body, 'source', 'lead_source') || null,
      stage_id: stage.id,
      estimated_value: Number(norm(body, 'estimated_value', 'total_amount') || norm(body, 'total_amount', 'value') || 0),
      probability_percent: norm(body, 'probability_percent', 'probabilityPercent') ?? stage.probability_percent ?? 50,
      expected_close_date: norm(body, 'expected_close_date', 'next_follow_up') || null,
      notes: norm(body, 'notes', 'internal_notes') || null,
      owner_id: norm(body, 'owner_id', 'ownerId') || currentUserId,
      customer_type: norm(body, 'customer_type', 'customerType') || null,
      billing_address: norm(body, 'billing_address', 'company_address') || null,
      shipping_address: norm(body, 'shipping_address', 'company_address') || null,
      tax_percent: Number(norm(body, 'tax_percent', 'taxPercent') || 10),
      is_auto_request: body.is_auto_request === true || body.owner_id === null || body.owner_id === 'auto_request',
      customer_id: customerId,
    }
    return payload
  }

  if (pathname === '/sales-orders/quotations' || pathname.startsWith('/sales-orders/quotations/')) {
    // Business Rule: Quotation must have product lines
    const productCount = body.lines?.length || body.products?.length || 0
    if (productCount === 0) {
      throw new Error('Quotation must have at least one product.')
    }

    const leadId = norm(body, 'lead_id', 'leadId') || null
    const customerId = norm(body, 'customer_id', 'customerId')
      || (norm(body, 'customerName', 'customer_name') ? await resolveCustomerId(norm(body, 'customerName', 'customer_name')) : null)
    if (!customerId && !leadId) {
      throw new Error('Quotation must be linked to a lead or a customer.')
    }

    return {
      quotation_number: norm(body, 'quotation_number', 'quoteNumber'),
      customer_id: customerId,
      lead_id: leadId,
      issued_date: norm(body, 'issued_date', 'quote_date') || norm(body, 'quote_date', 'date') || new Date().toISOString().slice(0, 10),
      valid_until_date: norm(body, 'valid_until_date', 'valid_until') || norm(body, 'valid_until', 'expiryDate') || normalizeDate(undefined, 30),
      status: quotationStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      // tax_percent is the only editable financial field; totals are GENERATED ALWAYS AS STORED in DB
      tax_percent: Number(norm(body, 'tax_percent', 'taxPercent') || 10),
      notes: norm(body, 'notes', 'description') || null,
      internal_notes: norm(body, 'internal_notes', 'notes') || null,
      approved_by_id: null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
    }
  }

  if (pathname === '/sales-orders' || pathname.startsWith('/sales-orders/')) {
    if (!isPositiveNumber(norm(body, 'total_amount', 'total') || 0)) {
      throw new Error('Sales order total must be greater than 0.')
    }
    ensureDateOrder(
      norm(body, 'order_date', 'date'),
      norm(body, 'required_delivery_date', 'dueDate') || norm(body, 'dueDate', 'deliveryDate'),
      'Delivery date must be on or after order date.'
    )

    const customerId = norm(body, 'customer_id', 'customerId') || (norm(body, 'customerName', 'customer_name') ? await resolveCustomerId(norm(body, 'customerName', 'customer_name')) : null)
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
      const orderProducts = body.lines || body.products || []
      for (const product of orderProducts) {
        const availableStock = stockByProduct[product.product_id] || 0
        if (availableStock < (product.quantity_ordered || product.quantity || 0)) {
          console.warn(`[Business Rule] Product ${product.product_id} has insufficient stock. Available: ${availableStock}, Ordered: ${product.quantity_ordered || product.quantity || 0}`)
        }
      }
    }
    
    return {
      sales_order_number: norm(body, 'sales_order_number', 'orderNumber'),
      quotation_id: norm(body, 'quotation_id', 'quotationId') || null,
      customer_id: customerId,
      order_date: norm(body, 'order_date', 'date') || new Date().toISOString().slice(0, 10),
      required_delivery_date:
        norm(body, 'required_delivery_date', 'dueDate') || norm(body, 'dueDate', 'deliveryDate') || normalizeDate(undefined, 7),
      status: salesStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      // Financial totals (subtotal, total, profit) are GENERATED ALWAYS AS STORED in DB
      // Only tax_percent is editable
      tax_percent: Number(norm(body, 'tax_percent', 'taxPercent') || 10),
      payment_terms: norm(body, 'payment_terms', 'paymentTerms') || 'NET30',
      notes: norm(body, 'notes', 'description') || null,
      internal_notes: norm(body, 'internal_notes', 'notes') || null,
      sales_person_id: norm(body, 'sales_person_id', 'salesPersonId') || currentUserId,
    }
  }

  if (pathname === '/purchase/rfqs' || pathname.startsWith('/purchase/rfqs/')) {
    const rfqLineCount = body.lines?.length || body.products?.length || 0
    if (rfqLineCount === 0 && !normalizeText(norm(body, 'notes', 'description') || norm(body, 'productName', 'product_name'))) {
      throw new Error('RFQ must have at least one line or a clear requirement description.')
    }
    if (normalizeText(norm(body, 'supplierName', 'supplier_name'))) {
      await resolveSupplierId(norm(body, 'supplierName', 'supplier_name'))
    }
    ensureDateOrder(
      norm(body, 'issued_date', 'date'),
      norm(body, 'closing_date', 'due_date') || norm(body, 'due_date', 'dueDate'),
      'RFQ deadline must be on or after issued date.'
    )

    // Business Rule: RFQ should be sent to at least 3 suppliers for comparison
    const supplierCount = norm(body, 'supplier_ids', 'supplierIds')?.length || 1
    const supplierName = norm(body, 'supplierName', 'supplier_name')
    if (supplierCount < 3 && supplierName && !String(supplierName).includes('Multiple')) {
      console.warn(`[Business Rule] SmartHome best practice: Send RFQ to at least 3 suppliers for competitive pricing.`)
    }

    return {
      rfq_number: norm(body, 'rfq_number', 'rfqNumber'),
      issued_date: norm(body, 'issued_date', 'date') || new Date().toISOString().slice(0, 10),
      closing_date: norm(body, 'closing_date', 'due_date') || norm(body, 'due_date', 'dueDate') || normalizeDate(undefined, 7),
      status: rfqStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      total_estimated_cost: Number(norm(body, 'total_estimated_cost', 'estimated_total') || norm(body, 'estimated_total', 'targetPrice') || 0),
      notes: norm(body, 'notes', 'description') || norm(body, 'productName', 'product_name') || null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
    }
  }

  if (pathname === '/purchase/purchase-orders' || pathname.startsWith('/purchase/purchase-orders/')) {
    if (!isPositiveNumber(norm(body, 'total_amount', 'total') || 0)) {
      throw new Error('Purchase order total must be greater than 0.')
    }
    ensureDateOrder(
      norm(body, 'order_date', 'date'),
      norm(body, 'required_delivery_date', 'expected_delivery_date') || norm(body, 'expected_delivery_date', 'dueDate'),
      'Expected delivery date must be on or after PO date.'
    )

    // Business Rule: PO should be linked to an RFQ for traceability
    if (!norm(body, 'rfq_id', 'rfqId') && !norm(body, 'rfq_number', 'rfqNumber')) {
      console.warn(`[Business Rule] Purchase Order is not linked to an RFQ. Consider creating RFQ first for better procurement tracking.`)
    }

    const supplierId = norm(body, 'supplier_id', 'supplierId') || (norm(body, 'supplierName', 'supplier_name') ? await resolveSupplierId(norm(body, 'supplierName', 'supplier_name')) : null)
    const { data: supplierData } = await supabase.from('suppliers').select('average_lead_time_days, quality_rating').eq('id', supplierId).single()
    if (supplierData) {
      const avgLeadTime = supplierData.average_lead_time_days || 7
      if (avgLeadTime > 14) {
        console.warn(`[Business Rule] Supplier has long average lead time (${avgLeadTime} days). Plan inventory accordingly.`)
      }
    }

    return {
      purchase_order_number: norm(body, 'purchase_order_number', 'poNumber'),
      supplier_id: supplierId,
      rfq_id: norm(body, 'rfq_id', 'rfqId') || null,
      order_date: norm(body, 'order_date', 'date') || new Date().toISOString().slice(0, 10),
      required_delivery_date:
        norm(body, 'required_delivery_date', 'expected_delivery_date') || norm(body, 'expected_delivery_date', 'dueDate') || normalizeDate(undefined, 7),
      status: purchaseStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      total_amount: Number(norm(body, 'total_amount', 'total') || 0),
      notes: norm(body, 'notes', 'description') || null,
      internal_notes: norm(body, 'internal_notes', 'notes') || null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
    }
  }

  if (pathname === '/inventory/delivery-orders' || pathname.startsWith('/inventory/delivery-orders/')) {
    const warehouseId = norm(body, 'warehouse_id', 'warehouseId') || (norm(body, 'warehouseName', 'warehouse_name') ? await resolveWarehouseId(norm(body, 'warehouseName', 'warehouse_name')) : null)
    await resolveCustomerId(norm(body, 'partnerName', 'partner_name'))
    return {
      delivery_order_number: norm(body, 'delivery_order_number', 'reference'),
      sales_order_id: norm(body, 'sales_order_id', 'salesOrderId') || (norm(body, 'reference', 'reference') ? await resolveSalesOrderId(norm(body, 'reference', 'reference'), norm(body, 'partnerName', 'partner_name')) : null),
      warehouse_id: warehouseId,
      status: deliveryStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      scheduled_delivery_date: norm(body, 'scheduled_delivery_date', 'scheduledDate') || null,
      notes: norm(body, 'notes', 'description') || null,
    }
  }

  if (pathname === '/inventory/goods-receipts' || pathname.startsWith('/inventory/goods-receipts/')) {
    const purchaseOrderId = norm(body, 'purchase_order_id', 'purchaseOrderId') || (norm(body, 'reference', 'reference') ? await resolvePurchaseOrderId(norm(body, 'reference', 'reference'), norm(body, 'partnerName', 'partner_name')) : null)
    console.info(`[Business Rule] Goods Receipt for PO. All IoT devices (Camera, Robot, Smart Lock) must have Serial/MAC scanned for warranty tracking.`)

    const warehouseId = norm(body, 'warehouse_id', 'warehouseId') || (norm(body, 'warehouseName', 'warehouse_name') ? await resolveWarehouseId(norm(body, 'warehouseName', 'warehouse_name')) : null)
    await resolveSupplierId(norm(body, 'partnerName', 'partner_name'))
    return {
      goods_receipt_number: norm(body, 'goods_receipt_number', 'reference'),
      purchase_order_id: purchaseOrderId,
      warehouse_id: warehouseId,
      status: receiptStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      received_date: norm(body, 'received_date', 'scheduledDate') || new Date().toISOString().slice(0, 10),
      notes: norm(body, 'notes', 'description') || null,
    }
  }

  if (pathname === '/inventory/adjustments' || pathname.startsWith('/inventory/adjustments/')) {
    const warehouseId = norm(body, 'warehouse_id', 'warehouseId') || (norm(body, 'warehouseName', 'warehouse_name') ? await resolveWarehouseId(norm(body, 'warehouseName', 'warehouse_name')) : null)
    await ensureBinExists(warehouseId, norm(body, 'binCode', 'bin_code') || norm(body, 'reason', 'reason'))

    // Business Rule: Stock count must cover all bin locations
    const { count: binCount } = await supabase.from('bin_locations').select('*', { count: 'exact', head: true }).eq('warehouse_id', warehouseId)
    if (binCount) {
      console.info(`[Business Rule] Warehouse has ${binCount} bin locations. Ensure all bins are counted for accurate inventory.`)
    }

    return {
      adjustment_number: norm(body, 'adjustment_number', 'reference'),
      warehouse_id: warehouseId,
      adjustment_type: norm(body, 'adjustment_type', 'adjustmentType') || 'stock_count',
      count_date: norm(body, 'count_date', 'countDate') || new Date().toISOString().slice(0, 10),
      status: adjustmentStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      reason: norm(body, 'reason', 'binCode') || null,
      notes: norm(body, 'notes', 'description') || null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
    }
  }

  if (pathname === '/accounting/invoices' || pathname.startsWith('/accounting/invoices/')) {
    if (!isPositiveNumber(norm(body, 'total_amount', 'total') || 0)) {
      throw new Error('Invoice total must be greater than 0.')
    }
    ensureDateOrder(norm(body, 'invoice_date', 'invoiceDate'), norm(body, 'due_date', 'dueDate'), 'Invoice due date must be on or after invoice date.')

    const salesOrderId = norm(body, 'sales_order_id', 'salesOrderId') || (norm(body, 'sales_order_number', 'salesOrderNumber') ? await resolveSalesOrderId(norm(body, 'sales_order_number', 'salesOrderNumber'), norm(body, 'customerName', 'customer_name')) : null)
    if (salesOrderId) {
      const { data: soData } = await supabase.from('sales_orders').select('status').eq('id', salesOrderId).single()
      if (soData && !['delivered', 'completed', 'shipped'].includes(soData.status)) {
        throw new Error(`[Business Rule] Cannot create invoice. Sales Order must be delivered first. Current status: ${soData.status}`)
      }
    }

    const customerId = norm(body, 'customer_id', 'customerId') || (norm(body, 'customerName', 'customer_name') ? await resolveCustomerId(norm(body, 'customerName', 'customer_name')) : null)
    return {
      invoice_number: norm(body, 'invoice_number', 'invoiceNumber'),
      sales_order_id: salesOrderId,
      customer_id: customerId,
      invoice_date: norm(body, 'invoice_date', 'invoiceDate') || new Date().toISOString().slice(0, 10),
      due_date: norm(body, 'due_date', 'dueDate') || normalizeDate(undefined, 30),
      status: invoiceStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      total_amount: Number(norm(body, 'total_amount', 'total') || 0),
      payment_terms: norm(body, 'payment_terms', 'paymentTerms') || null,
      description: norm(body, 'description', 'notes') || null,
      notes: norm(body, 'notes', 'description') || null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
      issued_by_id: norm(body, 'issued_by_id', 'issuedById') || currentUserId,
    }
  }

  if (pathname === '/accounting/bills' || pathname.startsWith('/accounting/bills/')) {
    if (!isPositiveNumber(norm(body, 'total_amount', 'total') || 0)) {
      throw new Error('Vendor bill total must be greater than 0.')
    }
    ensureDateOrder(
      norm(body, 'bill_date', 'billDate'),
      norm(body, 'due_date', 'dueDate'),
      'Bill due date must be on or after bill date.'
    )

    const poId = norm(body, 'purchase_order_id', 'purchaseOrderId') || (norm(body, 'purchase_order_number', 'purchaseOrderNumber') ? await resolvePurchaseOrderId(norm(body, 'purchase_order_number', 'purchaseOrderNumber'), norm(body, 'supplierName', 'supplier_name')) : null)
    if (poId) {
      const { data: grData } = await supabase.from('goods_receipts')
        .select('status')
        .eq('purchase_order_id', poId)
        .in('status', ['received', 'verified', 'completed'])
        .limit(1)
      if (!grData || grData.length === 0) {
        throw new Error(`[Business Rule] Cannot create Vendor Bill. Must have at least one completed Goods Receipt for this PO.`)
      }
    }

    const supplierId = norm(body, 'supplier_id', 'supplierId') || (norm(body, 'supplierName', 'supplier_name') ? await resolveSupplierId(norm(body, 'supplierName', 'supplier_name')) : null)
    return {
      bill_number: norm(body, 'bill_number', 'billNumber'),
      purchase_order_id: poId,
      supplier_id: supplierId,
      bill_date: norm(body, 'bill_date', 'billDate') || new Date().toISOString().slice(0, 10),
      due_date: norm(body, 'due_date', 'dueDate') || normalizeDate(undefined, 30),
      status: billStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      total_amount: Number(norm(body, 'total_amount', 'total') || 0),
      payment_terms: norm(body, 'payment_terms', 'paymentTerms') || null,
      notes: norm(body, 'notes', 'description') || null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
      received_by_id: norm(body, 'received_by_id', 'receivedById') || currentUserId,
    }
  }

  if (pathname === '/accounting/credit-notes' || pathname.startsWith('/accounting/credit-notes/')) {
    if (!isPositiveNumber(norm(body, 'total_amount', 'total') || 0)) {
      throw new Error('Credit note amount must be greater than 0.')
    }
    const customerId = norm(body, 'customer_id', 'customerId') || (norm(body, 'partnerName', 'partner_name') ? await resolveCustomerId(norm(body, 'partnerName', 'partner_name')) : null)
    return {
      credit_note_number: norm(body, 'credit_note_number', 'noteNumber'),
      invoice_id: norm(body, 'invoice_id', 'invoiceId') || (norm(body, 'invoice_number', 'invoiceNumber') ? await resolveInvoiceId(norm(body, 'invoice_number', 'invoiceNumber'), norm(body, 'partnerName', 'partner_name')) : null),
      customer_id: customerId,
      reason: norm(body, 'reason', 'reason') || null,
      credit_date: norm(body, 'credit_date', 'noteDate') || new Date().toISOString().slice(0, 10),
      status: noteStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      total_amount: Number(norm(body, 'total_amount', 'total') || 0),
      description: norm(body, 'description', 'notes') || null,
      notes: norm(body, 'notes', 'description') || null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
    }
  }

  if (pathname === '/accounting/debit-notes' || pathname.startsWith('/accounting/debit-notes/')) {
    if (!isPositiveNumber(norm(body, 'total_amount', 'total') || 0)) {
      throw new Error('Debit note amount must be greater than 0.')
    }
    const supplierId = norm(body, 'supplier_id', 'supplierId') || (norm(body, 'partnerName', 'partner_name') ? await resolveSupplierId(norm(body, 'partnerName', 'partner_name')) : null)
    return {
      debit_note_number: norm(body, 'debit_note_number', 'noteNumber'),
      bill_id: norm(body, 'bill_id', 'billId') || (norm(body, 'bill_number', 'billNumber') ? await resolveBillId(norm(body, 'bill_number', 'billNumber'), norm(body, 'partnerName', 'partner_name')) : null),
      supplier_id: supplierId,
      reason: norm(body, 'reason', 'reason') || null,
      debit_date: norm(body, 'debit_date', 'noteDate') || new Date().toISOString().slice(0, 10),
      status: noteStatusToDb[norm(body, 'status', 'status')] || norm(body, 'status', 'status') || 'draft',
      total_amount: Number(norm(body, 'total_amount', 'total') || 0),
      description: norm(body, 'description', 'notes') || null,
      notes: norm(body, 'notes', 'description') || null,
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
    }
  }

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    await ensureUniqueValue('users', 'email', norm(body, 'email', 'email'), currentId)
    if (!normalizeText(norm(body, 'fullName', 'full_name'))) throw new Error('Full name is required.')
    const result: any = {
      email: norm(body, 'email', 'email'),
      full_name: norm(body, 'fullName', 'full_name'),
      phone: norm(body, 'phone', 'phone') ?? null,
      role: norm(body, 'role', 'role') ?? 'user',
      status: norm(body, 'status', 'status') ?? 'active',
    }
    if (norm(body, 'password', 'password') || !currentId) {
      result.password_hash = norm(body, 'password', 'password') || norm(body, 'password_hash', 'passwordHash') || '123456'
    }
    return result
  }

  if (pathname === '/product-categories' || pathname.startsWith('/product-categories/')) {
    await ensureUniqueValue('product_categories', 'name', norm(body, 'name', 'name'), currentId)
    return {
      name: norm(body, 'name', 'name'),
      description: norm(body, 'description', 'description') || null,
      display_order: Number(norm(body, 'display_order', 'displayOrder') ?? 0),
      is_active: body.is_active === true || body.isActive === 'true' || body.isActive === true,
    }
  }

  if (pathname === '/products' || pathname.startsWith('/products/')) {
    await ensureUniqueValue('products', 'sku', norm(body, 'sku', 'sku'), currentId)
    if (!isPositiveNumber(norm(body, 'list_price', 'listPrice') ?? 0)) {
      throw new Error('List price must be greater than 0.')
    }
    const listPrice = Number(norm(body, 'list_price', 'listPrice') ?? 0)
    const costPrice = Number(norm(body, 'cost_price', 'costPrice') ?? 0)
    if (costPrice < 0) {
      throw new Error('Cost price cannot be negative.')
    }
    if (costPrice > listPrice) {
      throw new Error('Cost price cannot be greater than list price.')
    }
    const categoryId = norm(body, 'category_id', 'categoryId') || (norm(body, 'categoryName', 'category_name') ? await resolveCategoryId(norm(body, 'categoryName', 'category_name')) : null)
    const uomId = norm(body, 'uom_id', 'uomId') || (norm(body, 'uomName', 'uom_name') ? await resolveUomId(norm(body, 'uomName', 'uom_name')) : null) || (await resolveDefaultUomId())
    return {
      sku: norm(body, 'sku', 'sku'),
      name: norm(body, 'name', 'name'),
      description: norm(body, 'description', 'description') || null,
      category_id: categoryId,
      uom_id: uomId,
      list_price: listPrice,
      cost_price: costPrice,
      physical_size_sqm: Number(norm(body, 'physical_size_sqm', 'physicalSizeSqm') ?? 1.0),
      is_iot_device: norm(body, 'is_iot_device', 'isIotDevice') === true || String(norm(body, 'is_iot_device', 'isIotDevice') ?? '') === 'true',
      requires_serial_scan: norm(body, 'requires_serial_scan', 'requiresSerialScan') === true || String(norm(body, 'requires_serial_scan', 'requiresSerialScan') ?? '') === 'true',
      is_auto_bom: norm(body, 'is_auto_bom', 'isAutoBom') === true || String(norm(body, 'is_auto_bom', 'isAutoBom') ?? '') === 'true',
      min_sqm: Number(norm(body, 'min_sqm', 'minSqm') ?? 0),
      max_sqm: Number(norm(body, 'max_sqm', 'maxSqm') ?? 9999),
      reorder_level: Number(norm(body, 'reorder_level', 'reorderLevel') ?? 10),
      reorder_quantity: Number(norm(body, 'reorder_quantity', 'reorderQuantity') ?? 50),
      supplier_lead_time_days: Number(norm(body, 'supplier_lead_time_days', 'supplierLeadTimeDays') ?? 7),
      status: norm(body, 'status', 'status') || 'active',
      barcode: norm(body, 'barcode', 'barcode') || null,
      image_url: norm(body, 'image_url', 'imageUrl') || null,
    }
  }

  if (pathname === '/customers' || pathname.startsWith('/customers/')) {
    if (!normalizeText(norm(body, 'name', 'name'))) throw new Error('Customer name is required.')
    return {
      name: norm(body, 'name', 'name'),
      company_tax_id: norm(body, 'company_tax_id', 'companyTaxId') ?? null,
      customer_type: norm(body, 'customer_type', 'customerType') ?? 'B2C',
      contact_person_name: norm(body, 'contact_person_name', 'contactName') || norm(body, 'contactName', 'name'),
      contact_person_email: norm(body, 'contact_person_email', 'contactEmail') ?? null,
      contact_person_phone: norm(body, 'contact_person_phone', 'contactPhone') ?? null,
      billing_address: norm(body, 'billing_address', 'billingAddress') || null,
      shipping_address: norm(body, 'shipping_address', 'shippingAddress') || norm(body, 'billingAddress', 'billing_address') || null,
      lead_id: norm(body, 'lead_id', 'leadId') ?? null,
      payment_terms: norm(body, 'payment_terms', 'paymentTerms') ?? 'NET30',
      status: norm(body, 'status', 'status') ?? 'active',
      created_by_id: norm(body, 'created_by_id', 'createdById') || currentUserId,
    }
  }

  if (pathname === '/suppliers' || pathname.startsWith('/suppliers/')) {
    if (!normalizeText(norm(body, 'name', 'name'))) throw new Error('Supplier name is required.')
    return {
      name: norm(body, 'name', 'name'),
      supplier_type_id: norm(body, 'supplier_type_id', 'supplierTypeId') ?? null,
      contact_person_name: norm(body, 'contact_person_name', 'contactName') || norm(body, 'contactName', 'name'),
      contact_person_email: norm(body, 'contact_person_email', 'contactEmail') ?? null,
      contact_person_phone: norm(body, 'contact_person_phone', 'contactPhone') ?? null,
      company_address: norm(body, 'company_address', 'companyAddress') || null,
      payment_terms: norm(body, 'payment_terms', 'paymentTerms') ?? 'NET30',
      average_lead_time_days: Number(norm(body, 'average_lead_time_days', 'averageLeadTimeDays') ?? 7),
      is_preferred: norm(body, 'is_preferred', 'isPreferred') === true || String(norm(body, 'is_preferred', 'isPreferred') ?? '') === 'true',
      status: norm(body, 'status', 'status') ?? 'active',
    }
  }

  if (pathname === '/warehouse/warehouses' || pathname.startsWith('/warehouse/warehouses/')) {
    const warehouseCode = norm(body, 'warehouse_code', 'warehouseCode')
    await ensureUniqueValue('warehouses', 'warehouse_code', warehouseCode, currentId)
    if (!normalizeText(norm(body, 'name', 'name'))) throw new Error('Warehouse name is required.')
    return {
      warehouse_code: warehouseCode,
      name: norm(body, 'name', 'name'),
      description: norm(body, 'description', 'description') || null,
      location_address: norm(body, 'location_address', 'locationAddress') || null,
      city: norm(body, 'city', 'city') || null,
      province: norm(body, 'province', 'province') || null,
      postal_code: norm(body, 'postal_code', 'postalCode') ?? null,
      manager_id: norm(body, 'manager_id', 'managerId') || (norm(body, 'managerName', 'manager_name') ? await resolveUserIdByName(norm(body, 'managerName', 'manager_name')) : null),
      capacity_sqm: Number(norm(body, 'capacity_sqm', 'capacitySqm') ?? 0),
      status: norm(body, 'status', 'status') || 'active',
    }
  }

  if (pathname === '/warehouse/bin-locations' || pathname.startsWith('/warehouse/bin-locations/')) {
    let warehouseId = norm(body, 'warehouse_id', 'warehouseId')
    if (!warehouseId) {
      warehouseId = await resolveWarehouseId(norm(body, 'warehouseName', 'warehouse_name'))
    }
    const binCode = norm(body, 'bin_code', 'binCode')
    if (!normalizeText(binCode)) throw new Error('Bin code is required.')
    const { data: existingBin, error: binError } = await supabase
      .from('bin_locations')
      .select('id')
      .eq('warehouse_id', warehouseId)
      .ilike('bin_code', binCode)
      .limit(1)
      .maybeSingle()
    if (binError) throw binError
    if (existingBin?.id && existingBin.id !== currentId) {
      throw new Error(`Bin code "${binCode}" already exists in the selected warehouse.`)
    }
    return {
      warehouse_id: warehouseId,
      bin_code: binCode,
      description: norm(body, 'description', 'description') || null,
      capacity_units: Number(norm(body, 'capacity_units', 'capacityUnits') ?? 0),
      status: norm(body, 'status', 'status') ?? 'active',
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
      .select('*, stage:lead_stages(name, probability_percent), owner:users(full_name), products:lead_products(product_id, product_name, quantity, unit_price, discount_percent, line_total)')
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
      .select('*, stage:lead_stages(name, probability_percent), owner:users(full_name), products:lead_products(product_id, product_name, quantity, unit_price, discount_percent, line_total)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizeLeadRow(data) as T
  }

  if (pathname === '/crm/activities') {
    const { data, error } = await supabase
      .from('activities')
      .select('*, activity_type:activity_types(name, icon, color), performed_by:users(full_name), lead:leads(company_name, lead_number)')
      .order('activity_date', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/lead-stages') {
    const { data, error } = await supabase
      .from('lead_stages')
      .select('*')
      .order('sequence', { ascending: true })
    if (error) throw error
    return (data || []) as T
  }

  if (pathname === '/activity-types') {
    const { data, error } = await supabase
      .from('activity_types')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return (data || []) as T
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

  if (pathname === '/product-bom') {
    const { data, error } = await supabase
      .from('product_bom')
      .select('*, product:products(id, name, sku, cost_price, list_price)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data || []) as T
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
      supabase
        .from('suppliers')
        .select('*, supplier_type:supplier_types(name)')
        .order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeSupplierRow)) as T
  }

  if (pathname.startsWith('/suppliers/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('suppliers')
      .select('*, supplier_type:supplier_types(name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return normalizeSupplierRow(data) as T
  }

  if (pathname === '/supplier-types') {
    const { data, error } = await supabase.from('supplier_types').select('*').order('name', { ascending: true })
    if (error) throw error
    return data as T
  }

  if (pathname === '/units-of-measure') {
    const { data, error } = await supabase.from('units_of_measure').select('*').order('name', { ascending: true })
    if (error) throw error
    return data as T
  }

  if (pathname === '/departments') {
    const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true })
    if (error) throw error
    return data as T
  }

  if (pathname === '/users') {
    const { data, error } = await applyLimit(
      supabase
        .from('users')
        .select('*, department:departments(name)')
        .order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map(normalizeUserRow)) as T
  }

  if (pathname.startsWith('/users/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('users')
      .select('*, department:departments(name)')
      .eq('id', id)
      .single()
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

  // ========== STOCK TRANSFERS ==========
  if (pathname === '/inventory/stock-transfers') {
    const { data, error } = await applyLimit(
      supabase
        .from('stock_transfers')
        .select('*, source_warehouse:warehouses!source_warehouse_id(name), dest_warehouse:warehouses!dest_warehouse_id(name)')
        .order('transfer_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map((r: any) => ({
      ...r,
      status: r.status,
      sourceWarehouseName: r.source_warehouse?.name || '',
      destWarehouseName: r.dest_warehouse?.name || '',
    }))) as T
  }

  if (pathname.startsWith('/inventory/stock-transfers/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('stock_transfers')
      .select('*, source_warehouse:warehouses!source_warehouse_id(name), dest_warehouse:warehouses!dest_warehouse_id(name), lines:stock_transfer_lines(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return { ...data, status: data.status } as T
  }

  // ========== CUSTOMER PAYMENTS ==========
  if (pathname === '/accounting/customer-payments') {
    const { data, error } = await applyLimit(
      supabase
        .from('customer_payments')
        .select('*, customer:customers(name), invoice:customer_invoices(invoice_number)')
        .order('payment_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map((r: any) => ({
      ...r,
      customerName: r.customer?.name || '',
      invoiceNumber: r.invoice?.invoice_number || '',
    }))) as T
  }

  // ========== SUPPLIER PAYMENTS ==========
  if (pathname === '/accounting/supplier-payments') {
    const { data, error } = await applyLimit(
      supabase
        .from('supplier_payments')
        .select('*, supplier:suppliers(name), bill:vendor_bills(bill_number)')
        .order('payment_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return ((data || []).map((r: any) => ({
      ...r,
      supplierName: r.supplier?.name || '',
      billNumber: r.bill?.bill_number || '',
    }))) as T
  }

  // ========== IoT DEVICES ==========
  if (pathname === '/iot/devices') {
    const { data, error } = await applyLimit(
      supabase
        .from('mac_serial_mapping')
        .select('*, product:products(name, sku, list_price), customer:customers(name)')
        .order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  if (pathname.startsWith('/iot/devices/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('mac_serial_mapping')
      .select('*, product:products(name, sku), customer:customers(name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as T
  }

  // ========== IoT WARRANTY ALERTS ==========
  if (pathname === '/iot/warranty-alerts') {
    const { data, error } = await applyLimit(
      supabase
        .from('device_warranty_alerts')
        .select('*, device:mac_serial_mapping(serial_number, mac_address, product:products(name))')
        .order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  if (pathname.startsWith('/iot/warranty-alerts/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('device_warranty_alerts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as T
  }

  // ========== PROACTIVE WARRANTY SCAN (GET = preview, POST = execute) ==========
  if (pathname === '/iot/warranty-scan') {
    const warningDays = 30
    const now = new Date()
    const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000)
    const todayStr = now.toISOString().slice(0, 10)
    const warningDateStr = warningDate.toISOString().slice(0, 10)

    // Preview: return devices expiring within warning_days + already expired (for preview)
    const { data: expiringDevices } = await supabase
      .from('mac_serial_mapping')
      .select('*, product:products(name)')
      .lte('warranty_end_date', warningDateStr)
      .neq('warranty_end_date', null)

    const { data: expiredDevices } = await supabase
      .from('mac_serial_mapping')
      .select('*, product:products(name)')
      .lt('warranty_end_date', todayStr)
      .neq('warranty_end_date', null)

    return {
      expiring: (expiringDevices || []).map(d => ({
        ...d,
        product_name: d.product?.name || '',
        days_until_expiry: d.warranty_end_date
          ? Math.ceil((new Date(d.warranty_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      expired: (expiredDevices || []).map(d => ({
        ...d,
        product_name: d.product?.name || '',
        days_until_expiry: d.warranty_end_date
          ? Math.ceil((new Date(d.warranty_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    }
  }

  // ========== IoT WARRANTY TRACKING ==========
  if (pathname === '/iot/warranty-tracking') {
    const { data, error } = await applyLimit(
      supabase
        .from('warranty_tracking')
        .select('*, device:mac_serial_mapping(serial_number, product:products(name))')
        .order('warranty_end_date', { ascending: true }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  // ========== BOM PACKAGES ==========
  if (pathname === '/bom/packages') {
    const { data, error } = await applyLimit(
      supabase
        .from('bom_packages')
        .select('*, components:bom_components(product_name, quantity, unit_price, line_total, is_optional)')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  if (pathname.startsWith('/bom/packages/')) {
    const id = pathname.split('/').pop()
    const { data, error } = await supabase
      .from('bom_packages')
      .select('*, components:bom_components(product_id, product_name, quantity, unit_price, line_total, is_optional)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as T
  }

  // ========== IoT DEVICE REGISTRATIONS ==========
  if (pathname === '/iot/registrations') {
    const { data, error } = await applyLimit(
      supabase
        .from('device_registrations')
        .select('*, device:mac_serial_mapping(serial_number, product:products(name)), customer:customers(name)')
        .order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []) as T
  }

  throw new Error(`Unsupported query path: ${pathname}`)
}

const writeResource = async <T>(path: string, body: Record<string, any>, method: 'POST' | 'PUT') => {
  const { pathname } = parsePath(path)
  const normalizedBody = await normalizeWriteBody(pathname, body)
  const rawLines = Array.isArray(body.lines) ? body.lines : (Array.isArray(body.products) ? body.products : null)

  const toNumber = (value: any, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const persistLines = async (table: string, foreignKey: string, parentId: string, lines: any[]) => {
    const { error: deleteError } = await supabase.from(table).delete().eq(foreignKey, parentId)
    if (deleteError) throw deleteError
    if (!lines.length) return
    const { error: insertError } = await supabase.from(table).insert(lines)
    if (insertError) throw insertError
  }

  const upsert = async (table: string, id?: string) => {
    const bodyWithDelete = method === 'POST'
      ? { ...normalizedBody, is_deleted: false }
      : normalizedBody
    const query =
      method === 'POST'
        ? supabase.from(table).insert(bodyWithDelete).select().single()
        : supabase.from(table).update(bodyWithDelete).eq('id', id).select().single()

    const { data, error } = await query
    if (error) throw error
    return data as T
  }

  if (pathname === '/crm/leads') {
    const lead = await upsert<any>('leads')
    const lines = (rawLines || body.products || []).map((line: any) => ({
      lead_id: lead.id,
      product_id: line.product_id || null,
      product_name: line.product_name || line.productName || null,
      product_sku: line.product_sku || line.productSku || null,
      quantity: toNumber(line.quantity ?? 1),
      unit_price: toNumber(line.unit_price ?? line.price ?? 0),
      discount_percent: toNumber(line.discount_percent ?? line.discount ?? 0),
    })).filter((line: any) => line.product_id || line.product_name)
    if (lines.length > 0) {
      await persistLines('lead_products', 'lead_id', lead.id, lines)
    }
    return lead
  }
  if (pathname.startsWith('/crm/leads/')) {
    const id = pathname.split('/').pop()
    const lead = await upsert<any>('leads', id)
    const lines = (rawLines || body.products || []).map((line: any) => ({
      lead_id: id,
      product_id: line.product_id || null,
      product_name: line.product_name || line.productName || null,
      product_sku: line.product_sku || line.productSku || null,
      quantity: toNumber(line.quantity ?? 1),
      unit_price: toNumber(line.unit_price ?? line.price ?? 0),
      discount_percent: toNumber(line.discount_percent ?? line.discount ?? 0),
    })).filter((line: any) => line.product_id || line.product_name)
    if (lines.length > 0) {
      await persistLines('lead_products', 'lead_id', id, lines)
    }
    return lead
  }
  if (pathname === '/crm/activities') {
    const payload = {
      lead_id: body.lead_id || null,
      activity_type_id: body.activity_type_id || null,
      description: body.description || body.activity_type || '',
      outcome: body.outcome || null,
      activity_date: body.activity_date || new Date().toISOString(),
      performed_by_id: body.performed_by_id || currentUserId,
    }
    const { data, error } = await supabase.from('activities').insert(payload).select().single()
    if (error) throw error
    return data as T
  }
  if (pathname === '/sales-orders') {
    const order = await upsert<any>('sales_orders')
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        sales_order_id: order.id,
        product_id: line.product_id || line.productId,
        sequence: index + 1,
        quantity_ordered: toNumber(line.quantity ?? line.quantity_ordered ?? 1),
        quantity_delivered: 0,
        unit_price: toNumber(line.unit_price ?? line.unitPrice ?? line.price ?? 0),
        cost_price: toNumber(line.cost_price ?? line.costPrice ?? line.cost ?? 0),
        discount_percent: toNumber(line.discount_percent ?? line.discount ?? 0),
        notes: line.notes || null,
      })).filter((line: any) => line.product_id)
      await persistLines('sales_order_lines', 'sales_order_id', order.id, lines)
    }
    return order
  }
  if (pathname.startsWith('/sales-orders/quotations/')) {
    const quotation = await upsert<any>('quotations', pathname.split('/').pop())
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        quotation_id: quotation.id,
        product_id: line.product_id || line.productId || null,
        product_name: line.product_name || line.productName || null,
        sequence: index + 1,
        quantity: toNumber(line.quantity ?? line.quantity_ordered ?? 1),
        unit_price: toNumber(line.unit_price ?? line.unitPrice ?? line.price ?? 0),
        discount_percent: toNumber(line.discount_percent ?? line.discount ?? 0),
      })).filter((line: any) => line.product_id || line.product_name)
      await persistLines('quotation_lines', 'quotation_id', quotation.id, lines)
    }
    return quotation
  }
  if (pathname === '/sales-orders/quotations') {
    const quotation = await upsert<any>('quotations')
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        quotation_id: quotation.id,
        product_id: line.product_id || line.productId,
        sequence_number: index + 1,
        quantity_quoted: toNumber(line.quantity_quoted ?? line.quantity ?? 0),
        unit_price: toNumber(line.unit_price ?? line.unitPrice ?? line.price ?? 0),
        discount_percent: toNumber(line.discount_percent ?? line.discount ?? 0),
        tax_percent: toNumber(line.tax_percent ?? line.tax ?? 10),
        notes: line.notes || null,
      })).filter((line: any) => line.product_id)
      await persistLines('quotation_lines', 'quotation_id', quotation.id, lines)
    }
    return quotation
  }
  if (pathname.startsWith('/sales-orders/')) {
    const order = await upsert<any>('sales_orders', pathname.split('/').pop())
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        sales_order_id: order.id,
        product_id: line.product_id || line.productId,
        sequence_number: index + 1,
        quantity_ordered: toNumber(line.quantity_ordered ?? line.quantity ?? 0),
        unit_price: toNumber(line.unit_price ?? line.unitPrice ?? line.price ?? 0),
        cost_price: toNumber(line.cost_price ?? line.costPrice ?? line.cost ?? 0),
        discount_percent: toNumber(line.discount_percent ?? line.discount ?? 0),
        tax_percent: toNumber(line.tax_percent ?? line.tax ?? 10),
        notes: line.notes || null,
      })).filter((line: any) => line.product_id)
      await persistLines('sales_order_lines', 'sales_order_id', order.id, lines)
    }
    return order
  }
  if (pathname === '/purchase/rfqs') {
    const rfq = await upsert<any>('rfqs')
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        rfq_id: rfq.id,
        product_id: line.product_id || line.productId,
        sequence_number: index + 1,
        quantity_required: toNumber(line.quantity_required ?? line.quantity ?? 0),
        required_delivery_date: line.required_delivery_date ?? line.requiredDeliveryDate ?? line.deliveryDate ?? null,
        notes: line.notes || null,
      })).filter((line: any) => line.product_id)
      await persistLines('rfq_lines', 'rfq_id', rfq.id, lines)
    }
    return rfq
  }
  if (pathname.startsWith('/purchase/rfqs/')) {
    const rfq = await upsert<any>('rfqs', pathname.split('/').pop())
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        rfq_id: rfq.id,
        product_id: line.product_id || line.productId,
        sequence_number: index + 1,
        quantity_required: toNumber(line.quantity_required ?? line.quantity ?? 0),
        required_delivery_date: line.required_delivery_date ?? line.requiredDeliveryDate ?? line.deliveryDate ?? null,
        notes: line.notes || null,
      })).filter((line: any) => line.product_id)
      await persistLines('rfq_lines', 'rfq_id', rfq.id, lines)
    }
    return rfq
  }
  if (pathname === '/purchase/purchase-orders') {
    const po = await upsert<any>('purchase_orders')
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        purchase_order_id: po.id,
        product_id: line.product_id || line.productId,
        sequence_number: index + 1,
        quantity_ordered: toNumber(line.quantity_ordered ?? line.quantity ?? 0),
        unit_price: toNumber(line.unit_price ?? line.unitPrice ?? line.price ?? 0),
        tax_percent: toNumber(line.tax_percent ?? line.tax ?? 10),
        notes: line.notes || null,
      })).filter((line: any) => line.product_id)
      await persistLines('purchase_order_lines', 'purchase_order_id', po.id, lines)
    }
    return po
  }
  if (pathname.startsWith('/purchase/purchase-orders/')) {
    const po = await upsert<any>('purchase_orders', pathname.split('/').pop())
    if (rawLines) {
      const lines = rawLines.map((line: any, index: number) => ({
        purchase_order_id: po.id,
        product_id: line.product_id || line.productId,
        sequence_number: index + 1,
        quantity_ordered: toNumber(line.quantity_ordered ?? line.quantity ?? 0),
        unit_price: toNumber(line.unit_price ?? line.unitPrice ?? line.price ?? 0),
        tax_percent: toNumber(line.tax_percent ?? line.tax ?? 10),
        notes: line.notes || null,
      })).filter((line: any) => line.product_id)
      await persistLines('purchase_order_lines', 'purchase_order_id', po.id, lines)
    }
    return po
  }
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
  if (pathname === '/product-bom') {
    // Bulk upsert BOM lines for a parent product
    const { parent_product_id, lines } = body
    if (!parent_product_id) throw new Error('parent_product_id is required')
    // Delete existing BOM lines
    await supabase.from('product_bom').delete().eq('parent_product_id', parent_product_id)
    // Insert new lines
    if (lines && lines.length > 0) {
      const rows = lines.map((l: any) => ({
        parent_product_id,
        component_product_id: l.component_product_id || l.product_id,
        quantity: Number(l.quantity || 1),
        is_optional: l.is_optional === true,
      })).filter((r: any) => r.component_product_id)
      if (rows.length > 0) {
        const { error } = await supabase.from('product_bom').insert(rows)
        if (error) throw error
      }
    }
    return { success: true } as T
  }
  if (pathname === '/products') {
    const product = await upsert<any>('products')
    if (product && method === 'POST') {
      const { data: warehouses } = await supabase.from('warehouses').select('id')
      if (warehouses && warehouses.length > 0) {
        const stockRows = warehouses.map((w: any) => ({
          product_id: product.id,
          warehouse_id: w.id,
          bin_location_id: null,
          quantity_on_hand: 0,
          quantity_reserved: 0,
        }))
        await supabase.from('stock_levels').upsert(stockRows, {
          onConflict: 'product_id,warehouse_id,bin_location_id',
          ignoreDuplicates: true,
        })
      }
    }
    return product
  }
  if (pathname.startsWith('/products/')) return upsert('products', pathname.split('/').pop())
  if (pathname === '/customers') return upsert('customers')
  if (pathname.startsWith('/customers/')) return upsert('customers', pathname.split('/').pop())
  if (pathname === '/suppliers') return upsert('suppliers')
  if (pathname.startsWith('/suppliers/')) return upsert('suppliers', pathname.split('/').pop())
  if (pathname === '/warehouse/warehouses') {
    const warehouse = await upsert<any>('warehouses')
    if (warehouse && method === 'POST') {
      const { data: products } = await supabase.from('products').select('id')
      if (products && products.length > 0) {
        const stockRows = products.map((p: any) => ({
          product_id: p.id,
          warehouse_id: warehouse.id,
          bin_location_id: null,
          quantity_on_hand: 0,
          quantity_reserved: 0,
        }))
        await supabase.from('stock_levels').upsert(stockRows, {
          onConflict: 'product_id,warehouse_id,bin_location_id',
          ignoreDuplicates: true,
        })
      }
    }
    return warehouse
  }
  if (pathname.startsWith('/warehouse/warehouses/')) return upsert('warehouses', pathname.split('/').pop())
  if (pathname === '/warehouse/bin-locations') return upsert('bin_locations')
  if (pathname.startsWith('/warehouse/bin-locations/')) return upsert('bin_locations', pathname.split('/').pop())

  // ========== STOCK TRANSFERS ==========
  if (pathname === '/inventory/stock-transfers') return upsert('stock_transfers')
  if (pathname.startsWith('/inventory/stock-transfers/')) {
    const transfer = await upsert<any>('stock_transfers', pathname.split('/').pop())
    if (rawLines) {
      await persistLines('stock_transfer_lines', 'transfer_id', transfer.id, rawLines.map((line: any, index: number) => ({
        transfer_id: transfer.id,
        product_id: line.product_id,
        product_name: line.product_name || null,
        from_bin_location_id: line.from_bin_location_id || null,
        to_bin_location_id: line.to_bin_location_id || null,
        quantity: toNumber(line.quantity, 1),
        sequence: index + 1,
      })).filter((line: any) => line.product_id))
    }
    return transfer
  }

  // ========== CUSTOMER PAYMENTS ==========
  if (pathname === '/accounting/customer-payments') {
    if (!isPositiveNumber(body.amount ?? 0)) {
      throw new Error('Payment amount must be greater than 0.')
    }
    const customerId = body.customer_id || (await resolveCustomerId(body.customerName))
    const invoiceId = body.invoice_id || (body.invoiceNumber ? await resolveInvoiceId(body.invoiceNumber, body.customerName) : null)

    const payment = await upsert<any>('customer_payments')

    // Auto-update invoice paid_amount
    if (invoiceId && payment?.id) {
      const { data: invoice } = await supabase.from('customer_invoices').select('total_amount, paid_amount').eq('id', invoiceId).single()
      if (invoice) {
        const totalPaid = invoice.paid_amount + (body.amount || 0)
        const newStatus = totalPaid >= invoice.total_amount ? 'paid' : totalPaid > 0 ? 'partial_paid' : 'issued'
        await supabase.from('customer_invoices').update({ paid_amount: totalPaid, status: newStatus }).eq('id', invoiceId)
      }
    }

    return payment
  }

  // ========== SUPPLIER PAYMENTS ==========
  if (pathname === '/accounting/supplier-payments') {
    if (!isPositiveNumber(body.amount ?? 0)) {
      throw new Error('Payment amount must be greater than 0.')
    }
    const supplierId = body.supplier_id || (await resolveSupplierId(body.supplierName))
    const billId = body.bill_id || (body.billNumber ? await resolveBillId(body.billNumber, body.supplierName) : null)

    const payment = await upsert<any>('supplier_payments')

    // Auto-update vendor bill paid_amount
    if (billId && payment?.id) {
      const { data: bill } = await supabase.from('vendor_bills').select('total_amount, paid_amount').eq('id', billId).single()
      if (bill) {
        const totalPaid = bill.paid_amount + (body.amount || 0)
        const newStatus = totalPaid >= bill.total_amount ? 'paid' : totalPaid > 0 ? 'partial_paid' : 'received'
        await supabase.from('vendor_bills').update({ paid_amount: totalPaid, status: newStatus }).eq('id', billId)
      }
    }

    return payment
  }

  // ========== IoT DEVICES ==========
  if (pathname === '/iot/devices') return upsert('mac_serial_mapping')
  if (pathname.startsWith('/iot/devices/')) return upsert('mac_serial_mapping', pathname.split('/').pop())

  // ========== IoT WARRANTY ALERTS ==========
  if (pathname === '/iot/warranty-alerts') return upsert('device_warranty_alerts')
  if (pathname.startsWith('/iot/warranty-alerts/')) return upsert('device_warranty_alerts', pathname.split('/').pop())

  // ========== PROACTIVE WARRANTY SCAN ==========
  if (pathname === '/iot/warranty-scan') {
    // Scan all mac_serial_mapping records and auto-generate warranty alerts
    const now = new Date()
    const warningDays = Number(body?.warning_days ?? 30)
    const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000)
    const warningDateStr = warningDate.toISOString().slice(0, 10)

    // Find devices expiring within warning_days
    const { data: expiringDevices } = await supabase
      .from('mac_serial_mapping')
      .select('*, product:products(name)')
      .lte('warranty_end_date', warningDateStr)
      .neq('warranty_end_date', null)

    // Find already expired devices (older than today)
    const todayStr = now.toISOString().slice(0, 10)
    const { data: expiredDevices } = await supabase
      .from('mac_serial_mapping')
      .select('*, product:products(name)')
      .lt('warranty_end_date', todayStr)
      .neq('warranty_end_date', null)

    const allDevices = [...(expiringDevices || []), ...(expiredDevices || [])]
    const existingAlertMap: Record<string, boolean> = {}
    const { data: existingAlerts } = await supabase
      .from('device_warranty_alerts')
      .select('mac_serial_id, alert_type')
      .in('mac_serial_id', allDevices.map(d => d.id))

    for (const a of (existingAlerts || [])) {
      existingAlertMap[`${a.mac_serial_id}|${a.alert_type}`] = true
    }

    const newAlerts: any[] = []
    for (const device of allDevices) {
      const daysUntilExpiry = device.warranty_end_date
        ? Math.ceil((new Date(device.warranty_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

      const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
      const alertType = isExpired ? 'warranty_expired' : 'warranty_expiring'
      const alertKey = `${device.id}|${alertType}`
      if (existingAlertMap[alertKey]) continue

      const productName = device.product?.name || device.product_name || ''
      let message = ''
      if (isExpired) {
        message = `Thiết bị "${productName}" (${device.serial_number || device.mac_address}) đã hết hạn bảo hành từ ngày ${device.warranty_end_date}. Vui lòng liên hệ khách hàng để chăm sóc sau bán hàng.`
      } else {
        message = `Thiết bị "${productName}" (${device.serial_number || device.mac_address}) sẽ hết hạn bảo hành trong ${daysUntilExpiry} ngày (${device.warranty_end_date}). Đề xuất chủ động liên hệ khách hàng.`
      }

      newAlerts.push({
        mac_serial_id: device.id,
        alert_type: alertType,
        message,
        severity: isExpired ? 'critical' : 'warning',
        status: 'open',
      })
    }

    if (newAlerts.length > 0) {
      const { error } = await supabase.from('device_warranty_alerts').insert(newAlerts)
      if (error) throw error
    }

    return { scanned: allDevices.length, new_alerts: newAlerts.length, alerts: newAlerts }
  }

  // ========== IoT REGISTRATIONS ==========
  if (pathname === '/iot/registrations') return upsert('device_registrations')
  if (pathname.startsWith('/iot/registrations/')) return upsert('device_registrations', pathname.split('/').pop())

  // ========== IoT WARRANTY TRACKING ==========
  if (pathname === '/iot/warranty-tracking') return upsert('warranty_tracking')
  if (pathname.startsWith('/iot/warranty-tracking/')) return upsert('warranty_tracking', pathname.split('/').pop())

  // ========== BOM PACKAGES ==========
  if (pathname === '/bom/packages') return upsert('bom_packages')
  if (pathname.startsWith('/bom/packages/')) return upsert('bom_packages', pathname.split('/').pop())

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
