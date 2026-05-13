import { supabase } from '../lib/supabase'

const parsePath = (path: string) => {
  const url = new URL(path, 'http://localhost')
  return {
    pathname: url.pathname.replace(/\/+$/, '') || '/',
    searchParams: url.searchParams,
  }
}

const limitFrom = (searchParams: URLSearchParams) => {
  const limit = Number(searchParams.get('limit') || '0')
  return Number.isFinite(limit) && limit > 0 ? limit : undefined
}

const applyLimit = (query: any, searchParams: URLSearchParams) => {
  const limit = limitFrom(searchParams)
  return limit ? query.limit(limit) : query
}

const today = () => new Date().toISOString().slice(0, 10)

const addDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

const normalizeStatus = (value?: string | null) => {
  if (value === 'won') return 'accepted'
  if (value === 'lost') return 'rejected'
  if (value === 'pending') return 'sent'
  if (value === 'posted') return 'posted'
  if (value === 'done') return 'delivered'
  if (value === 'ready') return 'ready'
  return value || 'draft'
}

const productName = (product: any) => product?.product_name || product?.name || ''

const mapUser = (user: any) => ({
  ...user,
  status: user?.is_active ? 'active' : 'inactive',
})

const mapProduct = (product: any) => ({
  ...product,
  name: product?.product_name,
  list_price: product?.unit_price,
  status: product?.is_active ? 'active' : 'inactive',
  category: product?.category,
})

const mapCustomer = (customer: any) => ({
  ...customer,
  name: customer?.full_name || customer?.company_name,
  customer_number: customer?.id?.slice(0, 8),
  status: customer?.is_active ? 'active' : 'inactive',
  contact_person_email: customer?.email,
  contact_person_phone: customer?.phone,
  billing_address: customer?.address,
})

const mapSupplier = (supplier: any) => ({
  ...supplier,
  name: supplier?.supplier_name,
  contact_person_name: supplier?.contact_name,
  contact_person_email: supplier?.email,
  contact_person_phone: supplier?.phone,
  status: supplier?.is_active ? 'active' : 'inactive',
})

const mapLead = (lead: any) => ({
  ...lead,
  lead_number: lead?.id?.slice(0, 8),
  company_name: lead?.company || `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim(),
  contact_person_name: `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim(),
  contact_person_email: lead?.email,
  contact_person_phone: lead?.phone,
  owner_id: lead?.assigned_to_id,
  owner: lead?.assigned_to ? mapUser(lead.assigned_to) : undefined,
  stage: lead?.status,
  stage_name: lead?.status,
  probability_percent: lead?.probability,
  is_auto_request: lead?.source === 'auto_request',
})

const mapQuotationItem = (item: any) => ({
  ...item,
  product_name: productName(item?.product),
  line_total: toNumber(item?.subtotal),
})

const mapQuotation = (quotation: any) => ({
  ...quotation,
  issued_date: quotation?.issue_date,
  valid_until_date: quotation?.valid_until,
  customer: quotation?.customer ? mapCustomer(quotation.customer) : undefined,
  customer_name: quotation?.customer ? mapCustomer(quotation.customer).name : '',
  lines: (quotation?.items || quotation?.quotation_items || []).map(mapQuotationItem),
  quotation_lines: (quotation?.items || quotation?.quotation_items || []).map(mapQuotationItem),
})

const mapSalesOrderItem = (item: any) => ({
  ...item,
  product_name: productName(item?.product),
  product_sku: item?.product?.sku,
  cost_price: item?.product?.cost_price,
  line_total: toNumber(item?.quantity) * toNumber(item?.unit_price),
})

const mapSalesOrder = (order: any) => {
  const lines = (order?.items || order?.sales_order_items || []).map(mapSalesOrderItem)
  const total = lines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0)
  const totalCost = lines.reduce((sum: number, line: any) => sum + toNumber(line.quantity) * toNumber(line.cost_price), 0)
  return {
    ...order,
    sales_order_number: order?.order_number,
    customer: order?.customer ? mapCustomer(order.customer) : undefined,
    customer_name: order?.customer ? mapCustomer(order.customer).name : '',
    lines,
    sales_order_lines: lines,
    total_amount: total,
    estimated_profit: total - totalCost,
  }
}

const mapStock = (row: any) => ({
  ...row,
  product_name: productName(row?.product),
  warehouse_name: row?.warehouse?.warehouse_name,
  warehouseName: row?.warehouse?.warehouse_name,
  productName: productName(row?.product),
  quantityAvailable: row?.available,
  reorderStatus: row?.reorder_status,
})

const selectProduct = '*, category:product_categories(*)'
const selectLead = '*, assigned_to:users(*)'
const selectQuotation = '*, customer:customers(*), lead:leads(*), items:quotation_items(*, product:products(*))'
const selectSalesOrder = '*, customer:customers(*), quotation:quotations(*), items:sales_order_items(*, product:products(*))'

const getSingle = async (table: string, id: string, columns = '*') => {
  const { data, error } = await supabase.from(table).select(columns).eq('id', id).single()
  if (error) throw error
  return data
}

const replaceChildren = async (table: string, foreignKey: string, parentId: string, rows: any[]) => {
  const { error: deleteError } = await supabase.from(table).delete().eq(foreignKey, parentId)
  if (deleteError) throw deleteError
  if (rows.length === 0) return
  const { error: insertError } = await supabase.from(table).insert(rows)
  if (insertError) throw insertError
}

const findDefaultCustomer = async () => {
  const { data, error } = await supabase.from('customers').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) throw error
  return data?.id || null
}

const getResource = async <T>(path: string): Promise<T> => {
  const { pathname, searchParams } = parsePath(path)

  if (pathname === '/lead-stages') {
    return [
      { id: 'new', name: 'new', display_name: 'New', probability_percent: 10 },
      { id: 'quoted', name: 'quoted', display_name: 'Quoted', probability_percent: 60 },
      { id: 'won', name: 'won', display_name: 'Won', probability_percent: 100 },
      { id: 'lost', name: 'lost', display_name: 'Lost', probability_percent: 0 },
    ] as T
  }

  if (pathname === '/activity-types') {
    const { data, error } = await supabase.from('activity_types').select('*').order('type_name')
    if (error) throw error
    return (data || []).map((row: any) => ({ ...row, name: row.type_name })) as T
  }

  if (pathname === '/users') {
    const { data, error } = await applyLimit(supabase.from('users').select('*').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapUser) as T
  }
  if (pathname.startsWith('/users/')) return mapUser(await getSingle('users', pathname.split('/').pop()!)) as T

  if (pathname === '/products') {
    const { data, error } = await applyLimit(supabase.from('products').select(selectProduct).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapProduct) as T
  }
  if (pathname.startsWith('/products/')) return mapProduct(await getSingle('products', pathname.split('/').pop()!, selectProduct)) as T

  if (pathname === '/product-categories' || pathname === '/products/categories/all') {
    const { data, error } = await supabase.from('product_categories').select('*, parent:product_categories(*)').order('category_name')
    if (error) throw error
    return (data || []).map((c: any) => ({ ...c, name: c.category_name, parentName: c.parent?.category_name })) as T
  }

  if (pathname === '/customers') {
    const { data, error } = await applyLimit(supabase.from('customers').select('*').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapCustomer) as T
  }
  if (pathname.startsWith('/customers/')) return mapCustomer(await getSingle('customers', pathname.split('/').pop()!)) as T

  if (pathname === '/suppliers') {
    const { data, error } = await applyLimit(supabase.from('suppliers').select('*').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapSupplier) as T
  }
  if (pathname.startsWith('/suppliers/')) return mapSupplier(await getSingle('suppliers', pathname.split('/').pop()!)) as T

  if (pathname === '/supplier-products') {
    const { data, error } = await applyLimit(
      supabase.from('supplier_products').select('*, supplier:suppliers(*), product:products(*)'),
      searchParams
    )
    if (error) throw error
    return data as T
  }

  if (pathname === '/warehouse/warehouses' || pathname === '/inventory/warehouses') {
    const { data, error } = await supabase.from('warehouses').select('*').order('warehouse_name')
    if (error) throw error
    return (data || []).map((w: any) => ({ ...w, name: w.warehouse_name, status: w.is_active ? 'active' : 'inactive' })) as T
  }

  if (pathname === '/warehouse/bin-locations' || pathname === '/inventory/bin-locations') {
    const { data, error } = await applyLimit(supabase.from('bin_locations').select('*, warehouse:warehouses(*)').order('location_code'), searchParams)
    if (error) throw error
    return (data || []).map((b: any) => ({
      ...b,
      bin_code: b.location_code,
      name: b.location_name,
      warehouseName: b.warehouse?.warehouse_name,
    })) as T
  }

  if (pathname === '/crm/leads') {
    const { data, error } = await applyLimit(supabase.from('leads').select(selectLead).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapLead) as T
  }
  if (pathname.startsWith('/crm/leads/')) return mapLead(await getSingle('leads', pathname.split('/').pop()!, selectLead)) as T

  if (pathname === '/crm/activities') {
    const { data, error } = await applyLimit(
      supabase.from('activities').select('*, lead:leads(*), type:activity_types(*), performed_by:users(*)').order('activity_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map((a: any) => ({ ...a, activity_type: a.type?.type_name })) as T
  }

  if (pathname === '/sales-orders/quotations' || pathname === '/sales/quotations') {
    const { data, error } = await applyLimit(supabase.from('quotations').select(selectQuotation).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapQuotation) as T
  }
  if (pathname.startsWith('/sales-orders/quotations/') || pathname.startsWith('/sales/quotations/')) {
    return mapQuotation(await getSingle('quotations', pathname.split('/').pop()!, selectQuotation)) as T
  }

  if (pathname === '/sales-orders' || pathname === '/sales/orders') {
    const { data, error } = await applyLimit(supabase.from('sales_orders').select(selectSalesOrder).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapSalesOrder) as T
  }
  if (pathname.startsWith('/sales-orders/') || pathname.startsWith('/sales/orders/')) {
    return mapSalesOrder(await getSingle('sales_orders', pathname.split('/').pop()!, selectSalesOrder)) as T
  }

  if (pathname === '/inventory/delivery-orders' || pathname === '/sales/deliveries') {
    const { data, error } = await applyLimit(
      supabase.from('delivery_orders').select('*, sales_order:sales_orders(*, customer:customers(*)), items:delivery_order_items(*, product:products(*), bin_location:bin_locations(*))').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return data as T
  }

  if (pathname === '/inventory/stock-levels' || pathname === '/inventory/stock') {
    const { data, error } = await applyLimit(
      supabase.from('stock_levels').select('*, product:products(*), warehouse:warehouses(*)').order('reorder_status'),
      searchParams
    )
    if (error) throw error
    return (data || []).map(mapStock) as T
  }

  if (pathname === '/inventory/stock-transfers') {
    const { data, error } = await applyLimit(
      supabase.from('stock_transfers').select('*, product:products(*), source:bin_locations!stock_transfers_src_bin_location_id_fkey(*), target:bin_locations!stock_transfers_target_bin_location_id_fkey(*)').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return data as T
  }

  if (pathname === '/purchase/rfqs') {
    const { data, error } = await applyLimit(
      supabase.from('rfqs').select('*, items:rfq_items(*, supplier_product:supplier_products(*, supplier:suppliers(*), product:products(*)))').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map((r: any) => ({ ...r, rfq_number: r.id?.slice(0, 8), issued_date: r.issue_date, closing_date: r.deadline })) as T
  }

  if (pathname === '/purchase/purchase-orders') {
    const { data, error } = await applyLimit(
      supabase.from('purchase_orders').select('*, supplier:suppliers!purchase_orders_vendor_id_fkey(*), items:purchase_order_items(*, supplier_product:supplier_products(*, product:products(*)))').order('order_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map((po: any) => ({
      ...po,
      purchase_order_number: po.order_number,
      supplier_id: po.vendor_id,
      supplier: po.supplier ? mapSupplier(po.supplier) : undefined,
      total_amount: (po.items || []).reduce((sum: number, item: any) => sum + toNumber(item.quantity) * toNumber(item.unit_price), 0),
    })) as T
  }

  if (pathname === '/inventory/goods-receipts' || pathname === '/purchase/receipts') {
    const { data, error } = await applyLimit(supabase.from('receipts').select('*, purchase_order:purchase_orders(*)').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return data as T
  }

  if (pathname === '/accounting/invoices' || pathname === '/sales/invoices') {
    const { data, error } = await applyLimit(
      supabase.from('invoices').select('*, sales_order:sales_orders(*, customer:customers(*)), warranty_order:warranty_orders(*)').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map((i: any) => ({ ...i, customer_id: i.sales_order?.customer_id, customer: i.sales_order?.customer })) as T
  }

  if (pathname === '/accounting/bills' || pathname === '/purchase/vendor-bills') {
    const { data, error } = await applyLimit(supabase.from('vendor_bills').select('*, purchase_order:purchase_orders(*, supplier:suppliers!purchase_orders_vendor_id_fkey(*))').order('issue_date', { ascending: false }), searchParams)
    if (error) throw error
    return data as T
  }

  if (pathname === '/accounting/credit-notes' || pathname === '/sales/credit-notes') {
    const { data, error } = await applyLimit(supabase.from('credit_notes').select('*, invoice:invoices(*)'), searchParams)
    if (error) throw error
    return data as T
  }

  if (pathname === '/accounting/debit-notes' || pathname === '/purchase/debit-notes') {
    const { data, error } = await applyLimit(supabase.from('debit_notes').select('*, vendor_bill:vendor_bills(*)'), searchParams)
    if (error) throw error
    return data as T
  }

  if (pathname === '/accounting/accounts') {
    const { data, error } = await supabase.from('accounts').select('*').order('account_number')
    if (error) throw error
    return data as T
  }

  if (pathname === '/sales/warranty-orders') {
    const { data, error } = await applyLimit(
      supabase.from('warranty_orders').select('*, sales_order:sales_orders(*), products:warranty_order_products(*, product:products(*))').order('date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return data as T
  }

  if (pathname.startsWith('/metrics') || pathname.startsWith('/iot') || pathname === '/product-bom' || pathname === '/bom/packages') {
    return [] as T
  }

  if (pathname === '/accounting/metrics') {
    return { receivables: 0, payables: 0, cash: 0 } as T
  }

  if (pathname === '/units-of-measure' || pathname === '/supplier-types' || pathname === '/departments') {
    return [] as T
  }

  throw new Error(`Unsupported read path: ${pathname}`)
}

const normalizeLeadPayload = (body: any) => {
  const contactName = body.contact_person_name || `${body.first_name || ''} ${body.last_name || ''}`.trim()
  const parts = contactName.split(/\s+/).filter(Boolean)
  return {
    first_name: body.first_name || parts[0] || body.company_name || 'Lead',
    last_name: body.last_name || parts.slice(1).join(' ') || '-',
    email: body.email || body.contact_person_email,
    phone: body.phone || body.contact_person_phone || null,
    company: body.company || body.company_name || null,
    source: body.source || 'referral',
    status: body.status || body.stage || 'new',
    probability: toNumber(body.probability ?? body.probability_percent, 10),
    assigned_to_id: body.assigned_to_id || body.owner_id || null,
  }
}

const normalizeProductPayload = (body: any) => ({
  category_id: body.category_id || null,
  sku: body.sku,
  product_name: body.product_name || body.name,
  description: body.description || null,
  unit_price: toNumber(body.unit_price ?? body.list_price),
  cost_price: toNumber(body.cost_price),
  uom: body.uom || 'pcs',
  is_active: body.is_active ?? body.status !== 'inactive',
  warranty_period: toNumber(body.warranty_period, 365),
  repair_fee: toNumber(body.repair_fee),
})

const normalizeCustomerPayload = (body: any) => ({
  full_name: body.full_name || body.name || body.contact_person_name || body.company_name,
  email: body.email || body.contact_person_email || null,
  phone: body.phone || body.contact_person_phone || null,
  address: body.address || body.billing_address || null,
  company_name: body.company_name || (body.customer_type === 'company' ? body.name : null),
  tax_id: body.tax_id || body.company_tax_id || null,
  customer_type: ['B2B', 'company'].includes(body.customer_type) ? 'company' : 'individual',
  is_active: body.is_active ?? body.status !== 'inactive',
})

const normalizeSupplierPayload = (body: any) => ({
  supplier_name: body.supplier_name || body.name,
  contact_name: body.contact_name || body.contact_person_name || null,
  email: body.email || body.contact_person_email || null,
  phone: body.phone || body.contact_person_phone || null,
  address: body.address || body.company_address || null,
  tax_id: body.tax_id || null,
  is_active: body.is_active ?? body.status !== 'inactive',
})

const writeSimple = async <T>(table: string, body: any, id?: string, mapper = (value: any) => value): Promise<T> => {
  const payload = mapper(body)
  const query = id
    ? supabase.from(table).update(payload).eq('id', id).select().single()
    : supabase.from(table).insert(payload).select().single()
  const { data, error } = await query
  if (error) throw error
  return data as T
}

const writeQuotation = async <T>(body: any, id?: string): Promise<T> => {
  const payload = {
    lead_id: body.lead_id || null,
    customer_id: body.customer_id || null,
    issue_date: body.issue_date || body.issued_date || today(),
    valid_until: body.valid_until || body.valid_until_date || addDays(30),
    status: normalizeStatus(body.status),
    notes: body.notes || null,
  }
  if (body.quotation_number) Object.assign(payload, { quotation_number: body.quotation_number })
  const { data, error } = id
    ? await supabase.from('quotations').update(payload).eq('id', id).select().single()
    : await supabase.from('quotations').insert(payload).select().single()
  if (error) throw error

  const lines = (body.lines || body.products || []).map((line: any) => ({
    quotation_id: data.id,
    product_id: line.product_id,
    quantity: toNumber(line.quantity ?? line.quantity_ordered, 1),
    unit_price: toNumber(line.unit_price),
    discount_percent: toNumber(line.discount_percent),
    tax_amount: toNumber(line.tax_amount),
  }))
  await replaceChildren('quotation_items', 'quotation_id', data.id, lines)
  return mapQuotation(await getSingle('quotations', data.id, selectQuotation)) as T
}

const writeSalesOrder = async <T>(body: any, id?: string): Promise<T> => {
  let customerId = body.customer_id || null
  if (!customerId && body.quotation_id) {
    const quotation: any = await getSingle('quotations', body.quotation_id, '*')
    customerId = quotation.customer_id
  }
  customerId = customerId || await findDefaultCustomer()
  if (!customerId) throw new Error('Customer is required.')

  const payload = {
    quotation_id: body.quotation_id || null,
    customer_id: customerId,
    order_date: body.order_date || today(),
    status: normalizeStatus(body.status),
    shipping_address: body.shipping_address || body.required_delivery_date || null,
    notes: body.notes || null,
  }
  if (body.sales_order_number || body.order_number) Object.assign(payload, { order_number: body.sales_order_number || body.order_number })
  const { data, error } = id
    ? await supabase.from('sales_orders').update(payload).eq('id', id).select().single()
    : await supabase.from('sales_orders').insert(payload).select().single()
  if (error) throw error

  const sourceLines = body.lines || body.products || []
  const lines = sourceLines.map((line: any) => ({
    sales_order_id: data.id,
    product_id: line.product_id,
    quantity: toNumber(line.quantity ?? line.quantity_ordered, 1),
    unit_price: toNumber(line.unit_price),
  }))
  await replaceChildren('sales_order_items', 'sales_order_id', data.id, lines)
  return mapSalesOrder(await getSingle('sales_orders', data.id, selectSalesOrder)) as T
}

const writeRfq = async <T>(body: any, id?: string): Promise<T> => {
  const payload = {
    issue_date: body.issue_date || body.issuedDate || today(),
    deadline: body.deadline || body.closingDate || null,
    status: normalizeStatus(body.status),
  }
  const { data, error } = id
    ? await supabase.from('rfqs').update(payload).eq('id', id).select().single()
    : await supabase.from('rfqs').insert(payload).select().single()
  if (error) throw error
  const lines = (body.lines || []).map((line: any) => ({
    rfq_id: data.id,
    supplier_products_id: line.supplier_products_id || line.supplier_product_id || line.product_id,
    quantity: toNumber(line.quantity ?? line.quantity_required, 1),
  })).filter((line: any) => isUuid(line.supplier_products_id))
  await replaceChildren('rfq_items', 'rfq_id', data.id, lines)
  return data as T
}

const writePurchaseOrder = async <T>(body: any, id?: string): Promise<T> => {
  const payload = {
    rfq_id: isUuid(body.rfq_id) ? body.rfq_id : null,
    vendor_id: body.vendor_id || body.supplier_id || body.supplierId,
    order_date: body.order_date || body.orderDate || today(),
    expected_arrival_date: body.expected_arrival_date || body.requiredDeliveryDate || null,
    status: normalizeStatus(body.status),
    notes: body.notes || null,
  }
  if (!payload.vendor_id) throw new Error('Supplier is required.')
  if (body.order_number || body.purchase_order_number || body.poNumber) Object.assign(payload, { order_number: body.order_number || body.purchase_order_number || body.poNumber })
  const { data, error } = id
    ? await supabase.from('purchase_orders').update(payload).eq('id', id).select().single()
    : await supabase.from('purchase_orders').insert(payload).select().single()
  if (error) throw error
  const lines = (body.lines || []).map((line: any) => ({
    purchase_order_id: data.id,
    supplier_products_id: line.supplier_products_id || line.supplier_product_id || line.product_id,
    quantity: toNumber(line.quantity ?? line.quantity_ordered, 1),
    unit_price: toNumber(line.unit_price),
  })).filter((line: any) => isUuid(line.supplier_products_id))
  await replaceChildren('purchase_order_items', 'purchase_order_id', data.id, lines)
  return data as T
}

const writePayment = async <T>(body: any, type: 'customer' | 'vendor'): Promise<T> => {
  const payload = {
    invoice_id: type === 'customer' ? body.invoice_id || body.document_id : null,
    vendor_bill_id: type === 'vendor' ? body.vendor_bill_id || body.bill_id || body.document_id : null,
    payment_date: body.payment_date || today(),
    payment_method: body.payment_method || 'cash',
    amount: toNumber(body.amount),
    payment_account: body.payment_method === 'cash' ? null : (body.payment_account || null),
    target_account: body.payment_method === 'cash' ? null : (body.target_account || null),
    reference_number: body.reference_number || null,
    notes: body.notes || null,
  }
  const { data, error } = await supabase.from('payments').insert(payload).select().single()
  if (error) throw error
  return data as T
}

const writeResource = async <T>(path: string, body: any, method: 'POST' | 'PUT'): Promise<T> => {
  const { pathname } = parsePath(path)
  const id = method === 'PUT' ? pathname.split('/').pop() : undefined

  if (pathname === '/crm/leads' || pathname.startsWith('/crm/leads/')) return writeSimple<T>('leads', body, id, normalizeLeadPayload)
  if (pathname === '/crm/activities') {
    const activityTypeId = body.activity_type_id || body.activityTypeId || body.type_id
    return writeSimple<T>('activities', {
      lead_id: body.lead_id,
      activity_type_id: activityTypeId || null,
      description: body.description,
      activity_date: body.activity_date || new Date().toISOString(),
      performed_by_id: body.performed_by_id || null,
    }, undefined)
  }

  if (pathname === '/sales-orders/quotations' || pathname.startsWith('/sales-orders/quotations/') || pathname === '/sales/quotations' || pathname.startsWith('/sales/quotations/')) {
    return writeQuotation<T>(body, id)
  }
  if (pathname === '/sales-orders' || pathname.startsWith('/sales-orders/') || pathname === '/sales/orders' || pathname.startsWith('/sales/orders/')) {
    return writeSalesOrder<T>(body, id)
  }

  if (pathname === '/products' || pathname.startsWith('/products/')) return writeSimple<T>('products', body, id, normalizeProductPayload)
  if (pathname === '/product-categories' || pathname.startsWith('/product-categories/')) {
    return writeSimple<T>('product_categories', body, id, (value) => ({ category_name: value.category_name || value.name, parent_id: value.parent_id || null }))
  }
  if (pathname === '/customers' || pathname.startsWith('/customers/')) return writeSimple<T>('customers', body, id, normalizeCustomerPayload)
  if (pathname === '/suppliers' || pathname.startsWith('/suppliers/')) return writeSimple<T>('suppliers', body, id, normalizeSupplierPayload)
  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return writeSimple<T>('users', body, id, (value) => ({
      username: value.username || value.email?.split('@')[0],
      email: value.email,
      password_hash: value.password_hash || value.password || 'demo123',
      full_name: value.full_name || value.fullName,
      role: ['admin','sales','purchasing','warehouse','accountant','manager'].includes(value.role) ? value.role : 'sales',
      is_active: value.is_active ?? value.status !== 'inactive',
    }))
  }

  if (pathname === '/warehouse/warehouses' || pathname.startsWith('/warehouse/warehouses/')) {
    return writeSimple<T>('warehouses', body, id, (value) => ({ warehouse_name: value.warehouse_name || value.name, address: value.address || value.location_address || null, is_active: value.is_active ?? value.status !== 'inactive' }))
  }
  if (pathname === '/warehouse/bin-locations' || pathname.startsWith('/warehouse/bin-locations/')) {
    return writeSimple<T>('bin_locations', body, id, (value) => ({ warehouse_id: value.warehouse_id, location_code: value.location_code || value.bin_code, location_name: value.location_name || value.name || null, is_active: value.is_active ?? true }))
  }

  if (pathname === '/purchase/rfqs' || pathname.startsWith('/purchase/rfqs/')) return writeRfq<T>(body, id)
  if (pathname === '/purchase/purchase-orders' || pathname.startsWith('/purchase/purchase-orders/')) return writePurchaseOrder<T>(body, id)
  if (pathname === '/inventory/goods-receipts' || pathname.startsWith('/inventory/goods-receipts/')) {
    return writeSimple<T>('receipts', body, id, (value) => {
      const status = value.status === 'done' || value.status === 'ready' || value.status === 'received' ? 'completed' : normalizeStatus(value.status)
      return { purchase_order_id: value.purchase_order_id, receipt_date: value.receipt_date || value.scheduledDate || today(), status, notes: value.notes || null }
    })
  }

  if (pathname === '/inventory/stock-levels' || pathname.startsWith('/inventory/stock-levels/')) {
    return writeSimple<T>('stock_levels', body, id, (value) => ({
      product_id: value.product_id || value.productId,
      warehouse_id: value.warehouse_id || value.warehouseId,
      quantity_on_hand: toNumber(value.quantity_on_hand ?? value.quantityOnHand),
      total_quantity: toNumber(value.total_quantity ?? value.quantityOnHand),
      available: toNumber(value.available ?? value.quantityAvailable ?? value.quantityOnHand),
      new_quantity: toNumber(value.new_quantity),
      reorder_status: value.reorder_status || value.reorderStatus || 'normal',
    }))
  }
  if (pathname === '/inventory/stock-transfers' || pathname.startsWith('/inventory/stock-transfers/')) {
    return writeSimple<T>('stock_transfers', body, id, (value) => ({
      product_id: value.product_id || value.productId || value.lines?.[0]?.product_id,
      src_bin_location_id: value.src_bin_location_id || value.from_bin_location_id || value.sourceBinLocationId || value.lines?.[0]?.from_bin_location_id || null,
      target_bin_location_id: value.target_bin_location_id || value.to_bin_location_id || value.destBinLocationId || value.lines?.[0]?.to_bin_location_id,
      quantity: toNumber(value.quantity),
      note: value.note || value.notes || null,
    }))
  }
  if (pathname === '/inventory/delivery-orders' || pathname.startsWith('/inventory/delivery-orders/')) {
    return writeSimple<T>('delivery_orders', body, id, (value) => ({ sales_order_id: value.sales_order_id, delivery_date: value.delivery_date || today(), status: normalizeStatus(value.status), tracking_number: value.tracking_number || null, notes: value.notes || null }))
  }

  if (pathname === '/accounting/invoices' || pathname.startsWith('/accounting/invoices/')) {
    return writeSimple<T>('invoices', body, id, (value) => ({ sales_order_id: value.sales_order_id, issue_date: value.issue_date || value.invoice_date || today(), due_date: value.due_date || null, status: normalizeStatus(value.status), total_amount: toNumber(value.total_amount), tax_amount: toNumber(value.tax_amount ?? value.total_tax), net_amount: toNumber(value.net_amount ?? value.total_amount_before_tax ?? value.total_amount), warranty_orders_id: value.warranty_orders_id || null, notes: value.notes || value.description || null }))
  }
  if (pathname === '/accounting/bills' || pathname.startsWith('/accounting/bills/')) {
    return writeSimple<T>('vendor_bills', body, id, (value) => ({ purchase_order_id: value.purchase_order_id, issue_date: value.issue_date || value.bill_date || today(), due_date: value.due_date || null, status: normalizeStatus(value.status), total: toNumber(value.total ?? value.total_amount), tax_amount: toNumber(value.tax_amount ?? value.total_tax), subtotal: toNumber(value.subtotal ?? value.total_amount_before_tax), notes: value.notes || null }))
  }
  if (pathname === '/accounting/credit-notes' || pathname.startsWith('/accounting/credit-notes/')) return writeSimple<T>('credit_notes', body, id, (value) => ({ invoices_id: value.invoices_id || value.invoice_id, reason: value.reason, total_amount: toNumber(value.total_amount) }))
  if (pathname === '/accounting/debit-notes' || pathname.startsWith('/accounting/debit-notes/')) return writeSimple<T>('debit_notes', body, id, (value) => ({ vendor_bills_id: value.vendor_bills_id || value.bill_id, reason: value.reason, total_amount: toNumber(value.total_amount) }))
  if (pathname === '/accounting/customer-payments') return writePayment<T>(body, 'customer')
  if (pathname === '/accounting/supplier-payments') return writePayment<T>(body, 'vendor')

  if (pathname.startsWith('/iot') || pathname === '/product-bom' || pathname === '/bom/packages') {
    return { success: true } as T
  }

  throw new Error(`Unsupported write path: ${pathname}`)
}

const deleteResource = async <T>(path: string): Promise<T> => {
  const { pathname } = parsePath(path)
  const id = pathname.split('/').pop()
  const table =
    pathname.startsWith('/crm/leads/') ? 'leads' :
    pathname.startsWith('/sales-orders/quotations/') ? 'quotations' :
    pathname.startsWith('/sales-orders/') ? 'sales_orders' :
    pathname.startsWith('/products/') ? 'products' :
    pathname.startsWith('/product-categories/') ? 'product_categories' :
    pathname.startsWith('/customers/') ? 'customers' :
    pathname.startsWith('/suppliers/') ? 'suppliers' :
    pathname.startsWith('/users/') ? 'users' :
    pathname.startsWith('/warehouse/warehouses/') ? 'warehouses' :
    pathname.startsWith('/warehouse/bin-locations/') ? 'bin_locations' :
    pathname.startsWith('/purchase/rfqs/') ? 'rfqs' :
    pathname.startsWith('/purchase/purchase-orders/') ? 'purchase_orders' :
    pathname.startsWith('/inventory/goods-receipts/') ? 'receipts' :
    pathname.startsWith('/inventory/delivery-orders/') ? 'delivery_orders' :
    pathname.startsWith('/inventory/stock-transfers/') ? 'stock_transfers' :
    pathname.startsWith('/accounting/invoices/') ? 'invoices' :
    pathname.startsWith('/accounting/bills/') ? 'vendor_bills' :
    pathname.startsWith('/accounting/credit-notes/') ? 'credit_notes' :
    pathname.startsWith('/accounting/debit-notes/') ? 'debit_notes' :
    ''
  if (!table || !id) throw new Error(`Unsupported delete path: ${pathname}`)
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
  return { success: true } as T
}

export const erpApi = {
  get: <T>(path: string) => getResource<T>(path),
  post: <T>(path: string, body: any) => writeResource<T>(path, body, 'POST'),
  put: <T>(path: string, body: any) => writeResource<T>(path, body, 'PUT'),
  delete: <T>(path: string) => deleteResource<T>(path),
}
