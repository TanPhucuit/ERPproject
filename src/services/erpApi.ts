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
  if (value === 'done') return 'delivered'
  if (value === 'ready') return 'ready'
  if (value === 'partial_received') return 'received'
  return value || 'sent'
}

const quotationStatus = (value?: string | null) =>
  ['sent', 'accepted', 'rejected'].includes(value || '') ? value! : 'sent'

const salesOrderStatus = (value?: string | null) =>
  ['ready', 'delivering', 'delivered', 'cancelled'].includes(value || '') ? value! : 'ready'

const deliveryStatus = (value?: string | null) =>
  ['ready', 'delivering', 'delivered', 'cancelled'].includes(value || '') ? value! : 'ready'

const invoiceStatus = (value?: string | null) =>
  ['sent', 'partial_paid', 'paid', 'overdue', 'cancelled'].includes(value || '') ? value! : 'sent'

const billStatus = (value?: string | null) =>
  ['posted', 'partial_paid', 'paid', 'overdue', 'cancelled'].includes(value || '') ? value! : 'posted'

const receiptStatus = (value?: string | null) =>
  ['ready', 'delivering', 'received', 'completed', 'cancelled'].includes(value || '') ? value! : 'ready'

const rfqStatus = (value?: string | null) => {
  if (value === 'sent') return 'new'
  if (value === 'closed') return 'accepted'
  if (value === 'cancelled' || value === 'rejected') return 'denied'
  return ['new', 'accepted', 'denied'].includes(value || '') ? value! : 'new'
}

const purchaseOrderStatus = (value?: string | null) =>
  ['sent', 'received', 'cancelled'].includes(value || '') ? value! : 'sent'

const productName = (product: any) => product?.product_name || product?.name || ''

const mapUser = (user: any) => ({
  ...user,
  account: user?.account,
  account_id: user?.account_id,
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
  account: customer?.account,
  account_id: customer?.account_id,
  customer_number: customer?.id?.slice(0, 8),
  status: customer?.is_active ? 'active' : 'inactive',
  contact_person_email: customer?.email,
  contact_person_phone: customer?.phone,
  billing_address: customer?.address,
})

const mapSupplier = (supplier: any) => ({
  ...supplier,
  name: supplier?.supplier_name,
  account: supplier?.account,
  account_id: supplier?.account_id,
  contact_person_name: supplier?.contact_name,
  contact_person_email: supplier?.email,
  contact_person_phone: supplier?.phone,
  status: supplier?.is_active ? 'active' : 'inactive',
})

const mapLead = (lead: any) => ({
  ...lead,
  account: lead?.account,
  account_id: lead?.account_id,
  lead_number: lead?.id?.slice(0, 8),
  company_name: lead?.company || `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim(),
  contact_person_name: `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim(),
  contact_person_email: lead?.email,
  contact_person_phone: lead?.phone,
  owner_id: lead?.assigned_to_id,
  owner: lead?.assigned_to ? mapUser(lead.assigned_to) : undefined,
  stage: lead?.status,
  stage_name: lead?.status,
  customer_type: lead?.company ? 'B2B' : 'B2C',
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

const mapInvoice = (invoice: any) => {
  const order = invoice?.sales_order
  const orderLines = (order?.items || order?.sales_order_items || []).map(mapSalesOrderItem)
  const calculatedSubtotal = orderLines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0)
  const netAmount = toNumber(invoice?.net_amount, calculatedSubtotal)
  const subtotal = netAmount || calculatedSubtotal
  const storedTaxAmount = toNumber(invoice?.tax_amount)
  const taxAmount = storedTaxAmount > 0 ? storedTaxAmount : Math.round(subtotal * 0.1)
  const totalAmount = subtotal + taxAmount
  return {
    ...invoice,
    customer_id: order?.customer_id,
    customer: order?.customer ? mapCustomer(order.customer) : undefined,
    customer_name: order?.customer ? mapCustomer(order.customer).name : '',
    sales_order_number: order?.order_number,
    lines: orderLines,
    items: orderLines,
    subtotal,
    net_amount: subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
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

const mapBinStock = (row: any) => ({
  ...row,
  productName: productName(row?.product),
  productSku: row?.product?.sku,
  binCode: row?.bin_location?.location_code,
  binName: row?.bin_location?.location_name,
  warehouseName: row?.bin_location?.warehouse?.warehouse_name,
  warehouseId: row?.bin_location?.warehouse_id,
  occupancyQuantity: row?.quantity,
})

const supplierProductName = (supplierProduct: any) => supplierProduct?.sku || supplierProduct?.product?.sku || ''

const mapRfqItem = (item: any) => ({
  ...item,
  product_id: item?.supplier_product?.product_id || '',
  product_name: supplierProductName(item?.supplier_product),
  product_sku: supplierProductName(item?.supplier_product),
  supplier_name: item?.supplier_product?.supplier?.supplier_name || '',
  estimated_unit_price: toNumber(item?.supplier_product?.price),
  quantity_required: toNumber(item?.quantity, 1),
  line_total: toNumber(item?.quantity, 1) * toNumber(item?.supplier_product?.price),
})

const mapRfq = (rfq: any) => {
  const lines = (rfq?.items || rfq?.rfq_items || []).map(mapRfqItem)
  const supplierNames = Array.from(new Set(lines.map((line: any) => line.supplier_name).filter(Boolean)))
  const displayStatus = rfq?.status === 'sent' ? 'new' : rfq?.status === 'closed' ? 'accepted' : rfq?.status === 'cancelled' ? 'denied' : rfq?.status
  return {
    ...rfq,
    status: displayStatus,
    rfq_number: rfq?.rfq_number || rfq?.id?.slice(0, 8),
    issued_date: rfq?.issue_date,
    closing_date: rfq?.deadline,
    supplier_name: supplierNames.join(', '),
    total_estimated_cost: lines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0),
    lines,
    rfq_lines: lines,
  }
}

const mapPurchaseOrderItem = (item: any) => ({
  ...item,
  product_id: item?.supplier_product?.product_id || '',
  product_name: supplierProductName(item?.supplier_product),
  product_sku: supplierProductName(item?.supplier_product),
  supplier_name: item?.supplier_product?.supplier?.supplier_name || '',
  quantity_ordered: toNumber(item?.quantity, 1),
  line_total: toNumber(item?.quantity, 1) * toNumber(item?.unit_price),
})

const mapPurchaseOrder = (po: any) => {
  const lines = (po?.items || po?.purchase_order_items || []).map(mapPurchaseOrderItem)
  const supplierNames = Array.from(new Set(lines.map((line: any) => line.supplier_name).filter(Boolean)))
  return {
    ...po,
    purchase_order_number: po?.order_number,
    supplier_id: po?.vendor_id,
    supplier: po?.supplier ? mapSupplier(po.supplier) : undefined,
    supplier_name: supplierNames.length > 1 ? supplierNames.join(', ') : po?.supplier?.supplier_name || supplierNames[0] || '',
    rfq_number: po?.rfq?.rfq_number || po?.rfq_id?.slice(0, 8),
    product_count: lines.length,
    required_delivery_date: po?.expected_arrival_date,
    total_amount: lines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0),
    lines,
    purchase_order_lines: lines,
  }
}

const mapVendorBill = (bill: any) => {
  const lines = (bill?.purchase_order?.items || bill?.purchase_order?.purchase_order_items || []).map(mapPurchaseOrderItem)
  const calculatedSubtotal = lines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0)
  const subtotal = toNumber(bill?.subtotal, calculatedSubtotal)
  const storedTaxAmount = toNumber(bill?.tax_amount)
  const taxAmount = storedTaxAmount > 0 ? storedTaxAmount : Math.round(subtotal * 0.1)
  const totalAmount = subtotal + taxAmount
  return {
    ...bill,
    supplier: bill?.purchase_order?.supplier ? mapSupplier(bill.purchase_order.supplier) : undefined,
    supplier_name: bill?.purchase_order?.supplier?.supplier_name || '',
    purchase_order_number: bill?.purchase_order?.order_number || bill?.purchase_order_id?.slice(0, 8),
    product_count: lines.length,
    lines,
    items: lines,
    subtotal,
    tax_amount: taxAmount,
    total: totalAmount,
    total_amount: totalAmount,
  }
}

const mapWarrantyOrder = (order: any) => ({
  ...order,
  warranty_order_number: order?.id?.slice(0, 8),
  sales_order_number: order?.sales_order?.order_number,
  customer: order?.sales_order?.customer ? mapCustomer(order.sales_order.customer) : undefined,
  customer_name: order?.sales_order?.customer ? mapCustomer(order.sales_order.customer).name : '',
  lines: (order?.products || order?.warranty_order_products || []).map((line: any) => ({
    ...line,
    product_name: productName(line?.product),
    product_sku: line?.product?.sku,
    repair_fee: toNumber(line?.product?.repair_fee),
    warranty_period: toNumber(line?.product?.warranty_period, 365),
    line_total: toNumber(line?.repair_fee_amount),
  })),
  total_amount: (order?.products || order?.warranty_order_products || []).reduce((sum: number, line: any) => sum + toNumber(line?.repair_fee_amount), 0),
  status: 'invoiced',
})

const mapSalesReturnItem = (item: any) => ({
  ...item,
  product_name: productName(item?.product),
  product_sku: item?.product?.sku,
  line_total: toNumber(item?.refund_amount),
})

const mapSalesReturn = (row: any) => {
  const lines = (row?.items || row?.sales_return_items || []).map(mapSalesReturnItem)
  return {
    ...row,
    returnNumber: row?.return_number,
    return_number: row?.return_number,
    customer: row?.customer ? mapCustomer(row.customer) : undefined,
    customerName: row?.customer ? mapCustomer(row.customer).name : '',
    customer_name: row?.customer ? mapCustomer(row.customer).name : '',
    salesOrderNumber: row?.sales_order?.order_number,
    sales_order_number: row?.sales_order?.order_number,
    returnDate: row?.return_date,
    total_amount: lines.reduce((sum: number, line: any) => sum + toNumber(line.refund_amount), 0),
    lines,
    items: lines,
  }
}

const mapRefundRequest = (row: any) => ({
  ...row,
  refundNumber: row?.refund_number,
  refund_number: row?.refund_number,
  requestDate: row?.request_date,
  customer: row?.customer ? mapCustomer(row.customer) : undefined,
  customerName: row?.customer ? mapCustomer(row.customer).name : '',
  customer_name: row?.customer ? mapCustomer(row.customer).name : '',
  salesReturnNumber: row?.sales_return?.return_number,
  sales_order_number: row?.sales_return?.sales_order?.order_number,
  amount: toNumber(row?.amount),
  amountDue: toNumber(row?.amount),
})

const selectProduct = '*, category:product_categories(*)'
const selectLead = '*, assigned_to:users(*), account:accounts(*)'
const selectQuotation = '*, customer:customers(*, account:accounts(*)), lead:leads(*, account:accounts(*)), items:quotation_items(*, product:products(*))'
const selectSalesOrder = '*, customer:customers(*, account:accounts(*)), quotation:quotations(*), items:sales_order_items(*, product:products(*))'
const selectInvoice = '*, sales_order:sales_orders(*, customer:customers(*, account:accounts(*)), items:sales_order_items(*, product:products(*))), warranty_order:warranty_orders(*)'
const selectVendorBill = '*, purchase_order:purchase_orders(*, supplier:suppliers!purchase_orders_vendor_id_fkey(*, account:accounts(*)), items:purchase_order_items(*, supplier_product:supplier_products(*, supplier:suppliers(*, account:accounts(*)), product:products(*))))'
const selectRfq = '*, items:rfq_items(*, supplier_product:supplier_products(*, supplier:suppliers(*), product:products(*)))'
const selectPurchaseOrder = '*, rfq:rfqs(*), supplier:suppliers!purchase_orders_vendor_id_fkey(*, account:accounts(*)), items:purchase_order_items(*, supplier_product:supplier_products(*, supplier:suppliers(*, account:accounts(*)), product:products(*)))'
const selectSalesReturn = '*, customer:customers(*, account:accounts(*)), sales_order:sales_orders(*, customer:customers(*, account:accounts(*))), warehouse:warehouses(*), items:sales_return_items(*, product:products(*))'
const selectRefundRequest = '*, customer:customers(*, account:accounts(*)), sales_return:sales_returns(*, sales_order:sales_orders(*))'

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

const recalculateReservedStock = async () => {
  const { error } = await supabase.rpc('recalculate_reserved_stock_levels')
  if (error) throw error
}

const getDefaultCompanyAccount = async () => {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('is_novatech_default', true)
    .single()
  if (error) throw error
  return data
}

const getFirstWarehouseId = async () => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('id')
    .order('warehouse_name', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
}

const cancelSalesInvoiceCascade = async (invoiceId: string, reason: string) => {
  if (!reason?.trim()) throw new Error('Cancellation reason is required.')
  const invoice: any = await getSingle('invoices', invoiceId, selectInvoice)
  if (invoice.status === 'paid') throw new Error('Paid invoices cannot be cancelled from this flow.')
  const salesOrderId = invoice.sales_order_id
  const { data: deliveryOrders, error: deliveryLookupError } = await supabase
    .from('delivery_orders')
    .select('id, status, items:delivery_order_items(id, product_id, bin_location_id, quantity_requested, bin_location:bin_locations(warehouse_id))')
    .eq('sales_order_id', salesOrderId)
  if (deliveryLookupError) throw deliveryLookupError

  for (const delivery of deliveryOrders || []) {
    if (delivery.status === 'delivered') {
      throw new Error('Delivered orders cannot be cancelled from invoice cancellation. Create a sales return instead.')
    }
    if (['ready', 'delivering'].includes(delivery.status)) {
      for (const item of delivery.items || []) {
        const quantity = toNumber(item.quantity_requested)
        const { data: binRow, error: binLookupError } = await supabase
          .from('stock_in_bins')
          .select('id, quantity, available')
          .eq('product_id', item.product_id)
          .eq('bin_location_id', item.bin_location_id)
          .maybeSingle()
        if (binLookupError) throw binLookupError
        if (binRow?.id && delivery.status === 'delivering') {
          const { error: binUpdateError } = await supabase
            .from('stock_in_bins')
            .update({
              quantity: toNumber(binRow.quantity) + quantity,
              available: toNumber(binRow.available) + quantity,
            })
            .eq('id', binRow.id)
          if (binUpdateError) throw binUpdateError
        }

        const binLocation: any = item.bin_location
        const warehouseId = Array.isArray(binLocation)
          ? binLocation[0]?.warehouse_id
          : binLocation?.warehouse_id
        if (warehouseId) {
          const { data: stockLevel, error: stockLookupError } = await supabase
            .from('stock_levels')
            .select('id, total_quantity, available')
            .eq('product_id', item.product_id)
            .eq('warehouse_id', warehouseId)
            .maybeSingle()
          if (stockLookupError) throw stockLookupError
          if (stockLevel?.id) {
            const nextAvailable = toNumber(stockLevel.available) + quantity
            const nextTotal = delivery.status === 'delivering'
              ? toNumber(stockLevel.total_quantity) + quantity
              : toNumber(stockLevel.total_quantity)
            const { error: stockUpdateError } = await supabase
              .from('stock_levels')
              .update({
                total_quantity: nextTotal,
                available: nextAvailable,
                reorder_status: nextAvailable <= 0 ? 'out' : nextAvailable < 10 ? 'low' : 'normal',
              })
              .eq('id', stockLevel.id)
            if (stockUpdateError) throw stockUpdateError
          }
        }
      }
    }
  }

  const note = `Cancelled: ${reason.trim()}`
  const { error: invoiceUpdateError } = await supabase
    .from('invoices')
    .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: invoice.notes ? `${invoice.notes}\n${note}` : note })
    .eq('id', invoiceId)
  if (invoiceUpdateError) throw invoiceUpdateError

  const { error: orderUpdateError } = await supabase
    .from('sales_orders')
    .update({ status: 'cancelled', cancellation_reason: reason.trim() })
    .eq('id', salesOrderId)
  if (orderUpdateError) throw orderUpdateError

  const { error: deliveryUpdateError } = await supabase
    .from('delivery_orders')
    .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: note })
    .eq('sales_order_id', salesOrderId)
  if (deliveryUpdateError) throw deliveryUpdateError

  await recalculateReservedStock()
}

const cancelVendorBillCascade = async (billId: string, reason: string) => {
  if (!reason?.trim()) throw new Error('Cancellation reason is required.')
  const bill: any = await getSingle('vendor_bills', billId, selectVendorBill)
  if (bill.status === 'paid') throw new Error('Paid vendor bills cannot be cancelled from this flow.')
  const note = `Cancelled: ${reason.trim()}`
  const { error: billUpdateError } = await supabase
    .from('vendor_bills')
    .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: bill.notes ? `${bill.notes}\n${note}` : note })
    .eq('id', billId)
  if (billUpdateError) throw billUpdateError

  if (bill.purchase_order_id) {
    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled', cancellation_reason: reason.trim() })
      .eq('id', bill.purchase_order_id)
    if (poUpdateError) throw poUpdateError

    const { error: receiptUpdateError } = await supabase
      .from('receipts')
      .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: note })
      .eq('purchase_order_id', bill.purchase_order_id)
    if (receiptUpdateError) throw receiptUpdateError
  }
}

const ensureSalesOrderInvoiceAndDelivery = async (orderId: string) => {
  const order: any = await getSingle('sales_orders', orderId, selectSalesOrder)
  const lines = (order?.items || []).map(mapSalesOrderItem)
  const netAmount = lines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0)
  const taxAmount = Math.round(netAmount * 0.1)
  const totalAmount = netAmount + taxAmount

  const { data: existingInvoice, error: invoiceLookupError } = await supabase
    .from('invoices')
    .select('id')
    .eq('sales_order_id', orderId)
    .maybeSingle()
  if (invoiceLookupError) throw invoiceLookupError
  if (!existingInvoice?.id) {
    const { error: invoiceCreateError } = await supabase
      .from('invoices')
      .insert({
        sales_order_id: orderId,
        issue_date: today(),
        due_date: addDays(30),
        status: 'sent',
        net_amount: netAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: 'Auto-created from accepted quotation.',
      })
    if (invoiceCreateError) throw invoiceCreateError
  }

  const { data: existingDelivery, error: deliveryLookupError } = await supabase
    .from('delivery_orders')
    .select('id')
    .eq('sales_order_id', orderId)
    .maybeSingle()
  if (deliveryLookupError) throw deliveryLookupError
  if (!existingDelivery?.id) {
    const { error: deliveryCreateError } = await supabase
      .from('delivery_orders')
      .insert({
        sales_order_id: orderId,
        delivery_date: today(),
        status: 'ready',
        notes: 'Auto-created from accepted quotation.',
      })
    if (deliveryCreateError) throw deliveryCreateError
  }
}

const ensureSalesOrderInvoice = async (orderId: string, note = 'Auto-created from sales order.') => {
  const order: any = await getSingle('sales_orders', orderId, selectSalesOrder)
  const lines = (order?.items || []).map(mapSalesOrderItem)
  const netAmount = lines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0)
  const taxAmount = Math.round(netAmount * 0.1)
  const totalAmount = netAmount + taxAmount

  const { data: existingInvoice, error: invoiceLookupError } = await supabase
    .from('invoices')
    .select('id')
    .eq('sales_order_id', orderId)
    .maybeSingle()
  if (invoiceLookupError) throw invoiceLookupError
  if (existingInvoice?.id) return

  const { error: invoiceCreateError } = await supabase
    .from('invoices')
    .insert({
      sales_order_id: orderId,
      issue_date: today(),
      due_date: addDays(30),
      status: 'sent',
      net_amount: netAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: note,
    })
  if (invoiceCreateError) throw invoiceCreateError
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
    const { data, error } = await applyLimit(supabase.from('users').select('*, account:accounts(*)').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapUser) as T
  }
  if (pathname.startsWith('/users/')) return mapUser(await getSingle('users', pathname.split('/').pop()!, '*, account:accounts(*)')) as T

  if (pathname === '/products') {
    const { data, error } = await applyLimit(supabase.from('products').select(selectProduct).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapProduct) as T
  }
  if (pathname.startsWith('/products/')) return mapProduct(await getSingle('products', pathname.split('/').pop()!, selectProduct)) as T

  if (pathname === '/product-categories') {
    const { data, error } = await supabase.from('product_categories').select('*, parent:product_categories(*)').order('category_name')
    if (error) throw error
    return (data || []).map((c: any) => ({ ...c, name: c.category_name, parentName: c.parent?.category_name })) as T
  }

  if (pathname === '/customers') {
    const { data, error } = await applyLimit(supabase.from('customers').select('*, account:accounts(*)').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapCustomer) as T
  }
  if (pathname.startsWith('/customers/')) return mapCustomer(await getSingle('customers', pathname.split('/').pop()!, '*, account:accounts(*)')) as T

  if (pathname === '/suppliers') {
    const { data, error } = await applyLimit(supabase.from('suppliers').select('*, account:accounts(*)').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapSupplier) as T
  }
  if (pathname.startsWith('/suppliers/')) return mapSupplier(await getSingle('suppliers', pathname.split('/').pop()!, '*, account:accounts(*)')) as T

  if (pathname === '/supplier-products') {
    const { data, error } = await applyLimit(
      supabase.from('supplier_products').select('*, supplier:suppliers(*), product:products(*)'),
      searchParams
    )
    if (error) throw error
    return (data || []).map((row: any) => ({
      ...row,
      supplierName: row.supplier?.supplier_name,
      supplier_name: row.supplier?.supplier_name,
      productName: row.product?.product_name || row.sku,
      product_name: row.product?.product_name || row.sku,
      productSku: row.product?.sku,
      name: `${row.supplier?.supplier_name || 'Supplier'} - ${row.sku}`,
    })) as T
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

  if (pathname === '/sales-orders/quotations') {
    const { data, error } = await applyLimit(supabase.from('quotations').select(selectQuotation).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapQuotation) as T
  }
  if (pathname.startsWith('/sales-orders/quotations/')) {
    return mapQuotation(await getSingle('quotations', pathname.split('/').pop()!, selectQuotation)) as T
  }

  if (pathname === '/sales-orders') {
    const { data, error } = await applyLimit(supabase.from('sales_orders').select(selectSalesOrder).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapSalesOrder) as T
  }
  if (pathname.startsWith('/sales-orders/')) {
    return mapSalesOrder(await getSingle('sales_orders', pathname.split('/').pop()!, selectSalesOrder)) as T
  }

  if (pathname === '/inventory/delivery-orders') {
    const { data, error } = await applyLimit(
      supabase.from('delivery_orders').select('*, sales_order:sales_orders(*, customer:customers(*, account:accounts(*)), items:sales_order_items(*, product:products(*))), items:delivery_order_items(*, product:products(*), bin_location:bin_locations(*, warehouse:warehouses(*)))').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return data as T
  }

  if (pathname === '/inventory/stock-levels') {
    const { data, error } = await applyLimit(
      supabase.from('stock_levels').select('*, product:products(*), warehouse:warehouses(*)').order('reorder_status'),
      searchParams
    )
    if (error) throw error
    return (data || []).map(mapStock) as T
  }

  if (pathname === '/inventory/stock-in-bins') {
    const { data, error } = await applyLimit(
      supabase
        .from('stock_in_bins')
        .select('*, product:products(*), bin_location:bin_locations(*, warehouse:warehouses(*))')
        .order('quantity', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map(mapBinStock) as T
  }

  if (pathname === '/inventory/stock-transfers') {
    const { data, error } = await applyLimit(
      supabase.from('stock_transfers').select('*, product:products(*), source:bin_locations!stock_transfers_src_bin_location_id_fkey(*), target:bin_locations!stock_transfers_target_bin_location_id_fkey(*)').order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map((row: any) => ({
      ...row,
      reference: row.id?.slice(0, 8),
      productId: row.product_id,
      productName: productName(row.product),
      sourceBinLocationId: row.src_bin_location_id || 'new',
      destBinLocationId: row.target_bin_location_id,
      sourceWarehouseId: row.source?.warehouse_id || '',
      destWarehouseId: row.target?.warehouse_id || '',
      sourceWarehouseName: row.source?.location_code ? `${row.source.location_code}` : 'New',
      destWarehouseName: row.target?.location_code || '',
      transferDate: row.created_at?.slice(0, 10),
    })) as T
  }

  if (pathname === '/purchase/rfqs') {
    const { data, error } = await applyLimit(
      supabase.from('rfqs').select(selectRfq).order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map(mapRfq) as T
  }
  if (pathname.startsWith('/purchase/rfqs/')) {
    return mapRfq(await getSingle('rfqs', pathname.split('/').pop()!, selectRfq)) as T
  }

  if (pathname === '/purchase/purchase-orders') {
    const { data, error } = await applyLimit(
      supabase.from('purchase_orders').select(selectPurchaseOrder).order('order_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map(mapPurchaseOrder) as T
  }
  if (pathname.startsWith('/purchase/purchase-orders/')) {
    return mapPurchaseOrder(await getSingle('purchase_orders', pathname.split('/').pop()!, selectPurchaseOrder)) as T
  }

  if (pathname === '/inventory/goods-receipts') {
    const { data, error } = await applyLimit(supabase.from('receipts').select('*, purchase_order:purchase_orders(*)').order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    const { data: returnData, error: returnError } = await applyLimit(
      supabase.from('sales_returns').select(selectSalesReturn).order('created_at', { ascending: false }),
      searchParams
    )
    if (returnError) throw returnError
    const purchaseReceipts = (data || []).map((row: any) => ({ ...row, receipt_type: 'purchase', recordType: 'purchase' }))
    const returnReceipts = (returnData || []).map((row: any) => ({
      ...mapSalesReturn(row),
      id: row.id,
      receipt_type: 'customer_return',
      recordType: 'customer_return',
      purchase_order_id: null,
      receipt_date: row.return_date,
      status: row.status === 'pending' ? 'delivering' : row.status,
      notes: row.reason,
    }))
    return [...purchaseReceipts, ...returnReceipts] as T
  }

  if (pathname === '/accounting/invoices') {
    const { data, error } = await applyLimit(
      supabase.from('invoices').select(selectInvoice).order('created_at', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map(mapInvoice) as T
  }
  if (pathname.startsWith('/accounting/invoices/')) {
    return mapInvoice(await getSingle('invoices', pathname.split('/').pop()!, selectInvoice)) as T
  }

  if (pathname === '/accounting/bills') {
    const { data, error } = await applyLimit(supabase.from('vendor_bills').select(selectVendorBill).order('issue_date', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapVendorBill) as T
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

  if (pathname === '/accounting/refund-requests') {
    const { data, error } = await applyLimit(supabase.from('refund_requests').select(selectRefundRequest).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapRefundRequest) as T
  }

  if (pathname === '/accounting/accounts') {
    const { data, error } = await supabase.from('accounts').select('*').order('account_number')
    if (error) throw error
    return data as T
  }

  if (pathname === '/accounting/payments') {
    const { data, error } = await applyLimit(
      supabase
        .from('payments')
        .select('*, invoice:invoices(*), vendor_bill:vendor_bills(*), refund_request:refund_requests(*), source_account:accounts!payments_payment_account_fkey(*), destination_account:accounts!payments_target_account_fkey(*)')
        .order('payment_date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return data as T
  }

  if (pathname === '/sales/warranty-orders') {
    const { data, error } = await applyLimit(
      supabase.from('warranty_orders').select('*, sales_order:sales_orders(*, customer:customers(*)), products:warranty_order_products(*, product:products(*))').order('date', { ascending: false }),
      searchParams
    )
    if (error) throw error
    return (data || []).map(mapWarrantyOrder) as T
  }

  if (pathname === '/sales/returns') {
    const { data, error } = await applyLimit(supabase.from('sales_returns').select(selectSalesReturn).order('created_at', { ascending: false }), searchParams)
    if (error) throw error
    return (data || []).map(mapSalesReturn) as T
  }

  throw new Error(`Unsupported read path: ${pathname}`)
}

const normalizeLeadPayload = (body: any) => {
  const contactName = body.contact_person_name || `${body.first_name || ''} ${body.last_name || ''}`.trim()
  const parts = contactName.split(/\s+/).filter(Boolean)
  const source = ['referral','auto_request','website','phone','email','event','other'].includes(body.source) ? body.source : 'other'
  const status = body.status || body.stage
  const payload: any = {
    first_name: body.first_name || parts[0] || body.company_name || 'Lead',
    last_name: body.last_name || parts.slice(1).join(' ') || '-',
    email: body.email || body.contact_person_email,
    phone: body.phone || body.contact_person_phone || null,
    company: body.company || body.company_name || null,
    source,
    probability: toNumber(body.probability ?? body.probability_percent, 10),
    assigned_to_id: body.assigned_to_id || body.owner_id || null,
  }
  if (body.account_id || body.accountId) payload.account_id = body.account_id || body.accountId
  if (['new','quoted','won','lost'].includes(status)) payload.status = status
  return payload
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

const normalizeCustomerPayload = (body: any) => {
  const payload: any = {
    full_name: body.full_name || body.name || body.contact_person_name || body.company_name,
    email: body.email || body.contact_person_email || null,
    phone: body.phone || body.contact_person_phone || null,
    address: body.address || body.billing_address || null,
    company_name: body.company_name || (body.customer_type === 'company' ? body.name : null),
    tax_id: body.tax_id || body.company_tax_id || null,
    customer_type: ['B2B', 'company'].includes(body.customer_type) ? 'company' : 'individual',
    is_active: body.is_active ?? body.status !== 'inactive',
  }
  if (body.account_id || body.accountId) payload.account_id = body.account_id || body.accountId
  return payload
}

const normalizeSupplierPayload = (body: any) => {
  const payload: any = {
    supplier_name: body.supplier_name || body.name,
    contact_name: body.contact_name || body.contact_person_name || null,
    email: body.email || body.contact_person_email || null,
    phone: body.phone || body.contact_person_phone || null,
    address: body.address || body.company_address || null,
    tax_id: body.tax_id || null,
    is_active: body.is_active ?? body.status !== 'inactive',
  }
  if (body.account_id || body.accountId) payload.account_id = body.account_id || body.accountId
  return payload
}

const writeSimple = async <T>(table: string, body: any, id?: string, mapper = (value: any) => value): Promise<T> => {
  const payload = mapper(body)
  const query = id
    ? supabase.from(table).update(payload).eq('id', id).select().single()
    : supabase.from(table).insert(payload).select().single()
  const { data, error } = await query
  if (error) throw error
  return data as T
}

const applyAcceptedQuotationWorkflow = async (quotationId: string) => {
  const quotation: any = await getSingle('quotations', quotationId, selectQuotation)
  if (quotation.status !== 'accepted') return
  if (!quotation.lead_id && !quotation.customer_id) {
    throw new Error('Accepted quotation must belong to a lead or customer before conversion.')
  }

  let customerId = quotation.customer_id
  if (!customerId && quotation.lead_id) {
    const lead: any = await getSingle('leads', quotation.lead_id, '*')
    const { data: existingCustomer, error: customerLookupError } = await supabase
      .from('customers')
      .select('id, account_id')
      .eq('email', lead.email)
      .maybeSingle()
    if (customerLookupError) throw customerLookupError

    customerId = existingCustomer?.id
    if (!customerId) {
      const { data: customer, error: customerCreateError } = await supabase
        .from('customers')
        .insert({
          full_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          email: lead.email,
          phone: lead.phone,
          company_name: lead.company,
          customer_type: lead.company ? 'company' : 'individual',
          account_id: lead.account_id || null,
        })
        .select('id')
        .single()
      if (customerCreateError) throw customerCreateError
      customerId = customer.id
    } else if (existingCustomer && !existingCustomer.account_id && lead.account_id) {
      const { error: customerAccountUpdateError } = await supabase
        .from('customers')
        .update({ account_id: lead.account_id })
        .eq('id', existingCustomer.id)
      if (customerAccountUpdateError) throw customerAccountUpdateError
    }

    const { error: quotationUpdateError } = await supabase
      .from('quotations')
      .update({ customer_id: customerId })
      .eq('id', quotationId)
    if (quotationUpdateError) throw quotationUpdateError
  }

  if (quotation.lead_id) {
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({ status: 'won', probability: 100 })
      .eq('id', quotation.lead_id)
    if (leadUpdateError) throw leadUpdateError
  }

  if (!customerId) return

  const { data: existingOrder, error: orderLookupError } = await supabase
    .from('sales_orders')
    .select('id')
    .eq('quotation_id', quotationId)
    .maybeSingle()
  if (orderLookupError) throw orderLookupError
  if (existingOrder?.id) {
    await ensureSalesOrderInvoiceAndDelivery(existingOrder.id)
    return
  }

  const { data: order, error: orderCreateError } = await supabase
    .from('sales_orders')
    .insert({
      quotation_id: quotationId,
      customer_id: customerId,
      order_date: today(),
      status: 'ready',
      notes: 'Auto-created from accepted quotation.',
    })
    .select('id')
    .single()
  if (orderCreateError) throw orderCreateError

  const lines = (quotation.items || []).map((item: any) => ({
    sales_order_id: order.id,
    product_id: item.product_id,
    quantity: toNumber(item.quantity, 1),
    unit_price: toNumber(item.unit_price),
  }))
  if (lines.length > 0) {
    const { error: lineInsertError } = await supabase.from('sales_order_items').insert(lines)
    if (lineInsertError) throw lineInsertError
  }
  await ensureSalesOrderInvoiceAndDelivery(order.id)
}

const writeQuotation = async <T>(body: any, id?: string): Promise<T> => {
  const leadId = body.lead_id || null
  if (!id && leadId) {
    const { data: existingQuotation, error: quotationLookupError } = await supabase
      .from('quotations')
      .select('id, quotation_number, status')
      .eq('lead_id', leadId)
      .neq('status', 'rejected')
      .maybeSingle()
    if (quotationLookupError) throw quotationLookupError
    if (existingQuotation?.id) {
      throw new Error(`This lead already has quotation ${existingQuotation.quotation_number || existingQuotation.id}.`)
    }
  }
  const payload: any = id
    ? {}
    : {
        lead_id: leadId,
        customer_id: body.customer_id || null,
        issue_date: body.issue_date || body.issued_date || today(),
        valid_until: body.valid_until || body.valid_until_date || addDays(30),
        status: quotationStatus(normalizeStatus(body.status)),
        notes: body.notes || null,
      }
  if (id) {
    if ('lead_id' in body) payload.lead_id = body.lead_id || null
    if ('customer_id' in body) payload.customer_id = body.customer_id || null
    if ('issue_date' in body || 'issued_date' in body) payload.issue_date = body.issue_date || body.issued_date || today()
    if ('valid_until' in body || 'valid_until_date' in body) payload.valid_until = body.valid_until || body.valid_until_date || addDays(30)
    if ('status' in body) payload.status = quotationStatus(normalizeStatus(body.status))
    if ('notes' in body) payload.notes = body.notes || null
  }
  if (body.quotation_number) Object.assign(payload, { quotation_number: body.quotation_number })
  const { data, error } = id
    ? await supabase.from('quotations').update(payload).eq('id', id).select().single()
    : await supabase.from('quotations').insert(payload).select().single()
  if (error) throw error

  if (Array.isArray(body.lines) || Array.isArray(body.products)) {
    const lines = (body.lines || body.products || []).map((line: any) => ({
      quotation_id: data.id,
      product_id: line.product_id,
      quantity: toNumber(line.quantity ?? line.quantity_ordered, 1),
      unit_price: toNumber(line.unit_price),
      discount_percent: toNumber(line.discount_percent),
      tax_amount: toNumber(
        line.tax_amount,
        toNumber(line.quantity ?? line.quantity_ordered, 1) *
          toNumber(line.unit_price) *
          (1 - toNumber(line.discount_percent) / 100) *
          (toNumber(body.tax_percent) / 100)
      ),
    }))
    await replaceChildren('quotation_items', 'quotation_id', data.id, lines)
  }

  if (payload.status === 'accepted') {
    await applyAcceptedQuotationWorkflow(data.id)
  }

  return mapQuotation(await getSingle('quotations', data.id, selectQuotation)) as T
}

const writeSalesOrder = async <T>(body: any, id?: string): Promise<T> => {
  if (id && body.status === 'cancelled') {
    const reason = body.cancellation_reason || body.cancelReason || body.reason || body.notes
    if (!reason?.trim()) throw new Error('Cancellation reason is required.')
    const { data: invoice, error: invoiceLookupError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('sales_order_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (invoiceLookupError) throw invoiceLookupError
    if (invoice?.id) {
      await cancelSalesInvoiceCascade(invoice.id, reason)
    } else {
      const note = `Cancelled: ${reason.trim()}`
      const { error: orderUpdateError } = await supabase
        .from('sales_orders')
        .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: body.notes || note })
        .eq('id', id)
      if (orderUpdateError) throw orderUpdateError
      const { error: deliveryUpdateError } = await supabase
        .from('delivery_orders')
        .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: note })
        .eq('sales_order_id', id)
      if (deliveryUpdateError) throw deliveryUpdateError
      await recalculateReservedStock()
    }
    return mapSalesOrder(await getSingle('sales_orders', id, selectSalesOrder)) as T
  }

  let customerId = body.customer_id || null
  if (!customerId && body.quotation_id) {
    const quotation: any = await getSingle('quotations', body.quotation_id, '*')
    customerId = quotation.customer_id
  }
  if (!id) {
    customerId = customerId || await findDefaultCustomer()
    if (!customerId) throw new Error('Customer is required.')
  }

  const payload: any = id
    ? {}
    : {
        quotation_id: body.quotation_id || null,
        customer_id: customerId,
        order_date: body.order_date || today(),
        status: salesOrderStatus(body.status),
        shipping_address: body.shipping_address || body.required_delivery_date || null,
        notes: body.notes || null,
      }
  if (id) {
    if ('quotation_id' in body) payload.quotation_id = body.quotation_id || null
    if ('customer_id' in body && customerId) payload.customer_id = customerId
    if ('order_date' in body) payload.order_date = body.order_date || today()
    if ('status' in body) payload.status = salesOrderStatus(body.status)
    if ('shipping_address' in body || 'required_delivery_date' in body) payload.shipping_address = body.shipping_address || body.required_delivery_date || null
    if ('notes' in body) payload.notes = body.notes || null
  }
  if (body.sales_order_number || body.order_number) Object.assign(payload, { order_number: body.sales_order_number || body.order_number })
  const { data, error } = id
    ? await supabase.from('sales_orders').update(payload).eq('id', id).select().single()
    : await supabase.from('sales_orders').insert(payload).select().single()
  if (error) throw error

  if (Array.isArray(body.lines) || Array.isArray(body.products)) {
    const sourceLines = body.lines || body.products || []
    const lines = sourceLines.map((line: any) => ({
      sales_order_id: data.id,
      product_id: line.product_id,
      quantity: toNumber(line.quantity ?? line.quantity_ordered, 1),
      unit_price: toNumber(line.unit_price),
    }))
    await replaceChildren('sales_order_items', 'sales_order_id', data.id, lines)
  }
  if (!id) {
    await ensureSalesOrderInvoice(data.id)
  }
  return mapSalesOrder(await getSingle('sales_orders', data.id, selectSalesOrder)) as T
}

const writeWarrantyOrder = async <T>(body: any, id?: string): Promise<T> => {
  if (id) throw new Error('Warranty orders cannot be edited after creation.')
  const salesOrderId = body.sales_order_id || body.salesOrderId
  if (!isUuid(salesOrderId)) throw new Error('Delivered sales order is required.')
  const order: any = await getSingle('sales_orders', salesOrderId, selectSalesOrder)
  if (order.status !== 'delivered') throw new Error('Warranty order can only be created from a delivered sales order.')

  const { data: deliveredOrder, error: deliveryError } = await supabase
    .from('delivery_orders')
    .select('delivery_date')
    .eq('sales_order_id', salesOrderId)
    .eq('status', 'delivered')
    .order('delivery_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (deliveryError) throw deliveryError
  if (!deliveredOrder?.delivery_date) throw new Error('Delivered sales order must have a completed delivery date.')

  const orderLines = (order?.items || []).map(mapSalesOrderItem)
  const deliveryDate = new Date(deliveredOrder.delivery_date)
  const warrantyRows = (body.lines || []).map((line: any) => {
    const sourceLine = orderLines.find((item: any) => item.product_id === line.product_id)
    if (!sourceLine) throw new Error('Warranty product must belong to the selected sales order.')
    const quantity = toNumber(line.quantity, 1)
    if (quantity > toNumber(sourceLine.quantity)) throw new Error(`Warranty quantity for ${sourceLine.product_name} exceeds delivered quantity.`)
    const product = sourceLine.product || {}
    const warrantyUntil = new Date(deliveryDate)
    warrantyUntil.setDate(warrantyUntil.getDate() + toNumber(product.warranty_period, 365))
    const isInWarranty = new Date(today()) <= warrantyUntil
    return {
      product_id: line.product_id,
      quantity,
      warranty_status: isInWarranty ? 'in_warranty' : 'expired',
      repair_fee_amount: isInWarranty ? 0 : toNumber(product.repair_fee) * quantity,
    }
  })
  if (warrantyRows.length === 0) throw new Error('Warranty order must have at least one product.')

  const { data: warrantyOrder, error: warrantyCreateError } = await supabase
    .from('warranty_orders')
    .insert({ sales_order_id: salesOrderId, date: body.date || today(), note: body.notes || body.note || null })
    .select('id')
    .single()
  if (warrantyCreateError) throw warrantyCreateError

  const { error: linesCreateError } = await supabase
    .from('warranty_order_products')
    .insert(warrantyRows.map((line: any) => ({ ...line, warranty_orders_id: warrantyOrder.id })))
  if (linesCreateError) throw linesCreateError

  const totalAmount = warrantyRows.reduce((sum: number, line: any) => sum + toNumber(line.repair_fee_amount), 0)
  const taxAmount = Math.round(totalAmount * 0.1)
  const invoiceTotal = totalAmount + taxAmount
  const { error: invoiceCreateError } = await supabase
    .from('invoices')
    .insert({
      sales_order_id: salesOrderId,
      warranty_orders_id: warrantyOrder.id,
      issue_date: today(),
      due_date: addDays(30),
      status: invoiceTotal > 0 ? 'sent' : 'paid',
      net_amount: totalAmount,
      tax_amount: taxAmount,
      total_amount: invoiceTotal,
      notes: 'Auto-created from warranty sales order.',
    })
  if (invoiceCreateError) throw invoiceCreateError

  return mapWarrantyOrder(await getSingle(
    'warranty_orders',
    warrantyOrder.id,
    '*, sales_order:sales_orders(*, customer:customers(*)), products:warranty_order_products(*, product:products(*))'
  )) as T
}

const writeSalesReturn = async <T>(body: any, id?: string): Promise<T> => {
  if (id) {
    if (body.status !== 'cancelled') throw new Error('Sales returns cannot be edited after creation.')
    const reason = body.cancellation_reason || body.cancelReason || body.reason || body.notes || 'Return cancelled'
    const { error: returnUpdateError } = await supabase
      .from('sales_returns')
      .update({ status: 'cancelled', notes: `Cancelled: ${reason}` })
      .eq('id', id)
    if (returnUpdateError) throw returnUpdateError
    const { error: refundUpdateError } = await supabase
      .from('refund_requests')
      .update({ status: 'cancelled', notes: `Cancelled with sales return: ${reason}` })
      .eq('sales_return_id', id)
      .neq('status', 'paid')
    if (refundUpdateError) throw refundUpdateError
    return mapSalesReturn(await getSingle('sales_returns', id, selectSalesReturn)) as T
  }
  const salesOrderId = body.sales_order_id || body.salesOrderId
  if (!isUuid(salesOrderId)) throw new Error('Sales order is required.')

  const order: any = await getSingle('sales_orders', salesOrderId, selectSalesOrder)
  const customerId = body.customer_id || body.customerId || order.customer_id || order.customer?.id
  if (!isUuid(customerId)) throw new Error('Customer is required.')
  if (order.customer_id !== customerId) throw new Error('Sales order does not belong to the selected customer.')
  if (order.status !== 'delivered') throw new Error('Returns can only be created for delivered sales orders.')

  const { data: existingReturn, error: existingReturnError } = await supabase
    .from('sales_returns')
    .select('id, status')
    .eq('sales_order_id', salesOrderId)
    .neq('status', 'cancelled')
    .limit(1)
    .maybeSingle()
  if (existingReturnError) throw existingReturnError
  if (existingReturn?.id) throw new Error('This sales order already has a sales return.')

  const orderLines = (order.items || []).map(mapSalesOrderItem)
  const lines = (body.lines || []).map((line: any) => {
    const sourceLine = orderLines.find((item: any) => item.product_id === line.product_id)
    if (!sourceLine) throw new Error('Return product must belong to the selected sales order.')
    const quantity = toNumber(line.quantity, 1)
    if (quantity > toNumber(sourceLine.quantity)) throw new Error(`Return quantity for ${sourceLine.product_name} exceeds sold quantity.`)
    const unitPrice = toNumber(sourceLine.unit_price)
    return {
      product_id: line.product_id,
      quantity,
      unit_price: unitPrice,
      refund_amount: unitPrice * quantity,
    }
  })
  if (lines.length === 0) throw new Error('Return must have at least one product.')

  const warehouseId = body.warehouse_id || body.warehouseId || await getFirstWarehouseId()
  const { data: salesReturn, error: returnCreateError } = await supabase
    .from('sales_returns')
    .insert({
      customer_id: customerId,
      sales_order_id: salesOrderId,
      warehouse_id: warehouseId,
      return_date: body.return_date || body.returnDate || today(),
      status: 'pending',
      reason: body.reason || 'Customer return',
      notes: body.notes || null,
    })
    .select('id')
    .single()
  if (returnCreateError) throw returnCreateError

  const { error: linesCreateError } = await supabase
    .from('sales_return_items')
    .insert(lines.map((line: any) => ({ ...line, sales_return_id: salesReturn.id })))
  if (linesCreateError) throw linesCreateError

  const refundAmount = lines.reduce((sum: number, line: any) => sum + toNumber(line.refund_amount), 0)
  const { error: refundCreateError } = await supabase
    .from('refund_requests')
    .insert({
      sales_return_id: salesReturn.id,
      customer_id: customerId,
      request_date: today(),
      status: 'pending',
      amount: refundAmount,
      reason: body.reason || 'Customer return',
      notes: `Auto-created from sales return.`,
    })
  if (refundCreateError) throw refundCreateError

  return mapSalesReturn(await getSingle('sales_returns', salesReturn.id, selectSalesReturn)) as T
}

const receiveCustomerReturn = async <T>(returnId: string): Promise<T> => {
  const salesReturn: any = await getSingle('sales_returns', returnId, selectSalesReturn)
  if (salesReturn.status === 'received') return mapSalesReturn(salesReturn) as T
  if (salesReturn.status === 'cancelled') throw new Error('Cancelled returns cannot be received.')
  const warehouseId = salesReturn.warehouse_id || await getFirstWarehouseId()
  if (!warehouseId) throw new Error('Warehouse is required to receive returned goods.')

  for (const item of salesReturn.items || []) {
    const quantity = toNumber(item.quantity)
    const { data: stockLevel, error: stockLookupError } = await supabase
      .from('stock_levels')
      .select('id, total_quantity, new_quantity')
      .eq('product_id', item.product_id)
      .eq('warehouse_id', warehouseId)
      .maybeSingle()
    if (stockLookupError) throw stockLookupError
    if (stockLevel?.id) {
      const { error: stockUpdateError } = await supabase
        .from('stock_levels')
        .update({
          total_quantity: toNumber(stockLevel.total_quantity) + quantity,
          new_quantity: toNumber(stockLevel.new_quantity) + quantity,
        })
        .eq('id', stockLevel.id)
      if (stockUpdateError) throw stockUpdateError
    } else {
      const { error: stockInsertError } = await supabase
        .from('stock_levels')
        .insert({
          product_id: item.product_id,
          warehouse_id: warehouseId,
          quantity_on_hand: 0,
          total_quantity: quantity,
          available: 0,
          new_quantity: quantity,
          reorder_status: 'normal',
        })
      if (stockInsertError) throw stockInsertError
    }
  }

  const { data, error } = await supabase
    .from('sales_returns')
    .update({ status: 'received' })
    .eq('id', returnId)
    .select(selectSalesReturn)
    .single()
  if (error) throw error
  return mapSalesReturn(data) as T
}

const ensurePurchaseReceiptAndBill = async (purchaseOrderId: string) => {
  const purchaseOrder: any = await getSingle('purchase_orders', purchaseOrderId, selectPurchaseOrder)
  const lines = (purchaseOrder?.items || []).map(mapPurchaseOrderItem)
  const subtotal = lines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0)

  const { data: existingReceipt, error: receiptLookupError } = await supabase
    .from('receipts')
    .select('id')
    .eq('purchase_order_id', purchaseOrderId)
    .maybeSingle()
  if (receiptLookupError) throw receiptLookupError
  if (!existingReceipt?.id) {
    const receiptPayload = {
      purchase_order_id: purchaseOrderId,
      receipt_date: today(),
      status: 'ready',
      notes: 'Auto-created from awarded RFQ.',
    }
    const { error: receiptCreateError } = await supabase
      .from('receipts')
      .insert(receiptPayload)
    if (receiptCreateError) throw receiptCreateError
  }

  const { data: existingBill, error: billLookupError } = await supabase
    .from('vendor_bills')
    .select('id')
    .eq('purchase_order_id', purchaseOrderId)
    .maybeSingle()
  if (billLookupError) throw billLookupError
  const taxAmount = Math.round(subtotal * 0.1)
  if (!existingBill?.id) {
    const { error: billCreateError } = await supabase
      .from('vendor_bills')
      .insert({
        purchase_order_id: purchaseOrderId,
        issue_date: today(),
        due_date: addDays(30),
        status: 'posted',
        subtotal,
        tax_amount: taxAmount,
        total: subtotal + taxAmount,
        notes: 'Auto-created from awarded RFQ.',
      })
    if (billCreateError) throw billCreateError
  } else {
    const { error: billUpdateError } = await supabase
      .from('vendor_bills')
      .update({
        subtotal,
        tax_amount: taxAmount,
        total: subtotal + taxAmount,
      })
      .eq('id', existingBill.id)
      .neq('status', 'paid')
    if (billUpdateError) throw billUpdateError
  }
}

const ensurePurchaseOrdersFromRfq = async (rfqId: string) => {
  const rfq: any = await getSingle('rfqs', rfqId, selectRfq)
  const rfqLines = (rfq?.items || []).filter((item: any) => item?.supplier_product?.supplier_id)
  if (rfqLines.length === 0) return

  const primarySupplierId = rfqLines[0].supplier_product.supplier_id
  const { data: existingOrders, error: existingOrderError } = await supabase
    .from('purchase_orders')
    .select('id, order_number')
    .eq('rfq_id', rfqId)
    .order('order_number', { ascending: true })
  if (existingOrderError) throw existingOrderError

  let purchaseOrderId = existingOrders?.[0]?.id
  if (!purchaseOrderId) {
    const { data: purchaseOrder, error: purchaseOrderCreateError } = await supabase
      .from('purchase_orders')
      .insert({
        rfq_id: rfqId,
        vendor_id: primarySupplierId,
        order_date: today(),
        expected_arrival_date: rfq.deadline || null,
        status: 'sent',
        notes: 'Auto-created from awarded RFQ.',
      })
      .select('id')
      .single()
    if (purchaseOrderCreateError) throw purchaseOrderCreateError
    purchaseOrderId = purchaseOrder.id
  }

  const orderLines = rfqLines.map((item: any) => ({
    purchase_order_id: purchaseOrderId,
    supplier_products_id: item.supplier_products_id,
    quantity: toNumber(item.quantity, 1),
    unit_price: toNumber(item.supplier_product?.price),
  }))
  await replaceChildren('purchase_order_items', 'purchase_order_id', purchaseOrderId, orderLines)
  await ensurePurchaseReceiptAndBill(purchaseOrderId)
}

const writeRfq = async <T>(body: any, id?: string): Promise<T> => {
  const payload: any = id
    ? {}
    : {
        issue_date: body.issue_date || body.issuedDate || today(),
        deadline: body.deadline || body.closingDate || null,
        status: rfqStatus(body.status),
      }
  if (id) {
    if ('issue_date' in body || 'issuedDate' in body) payload.issue_date = body.issue_date || body.issuedDate || today()
    if ('deadline' in body || 'closingDate' in body) payload.deadline = body.deadline || body.closingDate || null
    if ('status' in body) payload.status = rfqStatus(body.status)
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
  if (lines.length === 0) throw new Error('RFQ must have at least one supplier product line.')
  await replaceChildren('rfq_items', 'rfq_id', data.id, lines)
  if (payload.status === 'accepted') {
    await ensurePurchaseOrdersFromRfq(data.id)
  }
  return mapRfq(await getSingle('rfqs', data.id, selectRfq)) as T
}

const writePurchaseOrder = async <T>(body: any, id?: string): Promise<T> => {
  if (id && body.status === 'cancelled') {
    const reason = body.cancellation_reason || body.cancelReason || body.reason || body.notes
    if (!reason?.trim()) throw new Error('Cancellation reason is required.')
    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: body.notes || `Cancelled: ${reason.trim()}` })
      .eq('id', id)
    if (poUpdateError) throw poUpdateError
    const { error: billUpdateError } = await supabase
      .from('vendor_bills')
      .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: `Cancelled: ${reason.trim()}` })
      .eq('purchase_order_id', id)
      .neq('status', 'paid')
    if (billUpdateError) throw billUpdateError
    const { error: receiptUpdateError } = await supabase
      .from('receipts')
      .update({ status: 'cancelled', cancellation_reason: reason.trim(), notes: `Cancelled: ${reason.trim()}` })
      .eq('purchase_order_id', id)
    if (receiptUpdateError) throw receiptUpdateError
    return mapPurchaseOrder(await getSingle('purchase_orders', id, selectPurchaseOrder)) as T
  }

  let vendorId = body.vendor_id || body.supplier_id || body.supplierId || null
  if (!vendorId && Array.isArray(body.lines) && body.lines.length > 0) {
    const sourceLine = body.lines.find((line: any) => isUuid(line.supplier_products_id || line.supplier_product_id))
    const supplierProductId = sourceLine?.supplier_products_id || sourceLine?.supplier_product_id
    if (supplierProductId) {
      const { data: supplierProduct, error: supplierProductError } = await supabase
        .from('supplier_products')
        .select('supplier_id')
        .eq('id', supplierProductId)
        .single()
      if (supplierProductError) throw supplierProductError
      vendorId = supplierProduct?.supplier_id || null
    }
  }
  const payload: any = id
    ? {}
    : {
        rfq_id: isUuid(body.rfq_id) ? body.rfq_id : null,
        vendor_id: vendorId,
        order_date: body.order_date || body.orderDate || today(),
        expected_arrival_date: body.expected_arrival_date || body.requiredDeliveryDate || null,
        status: purchaseOrderStatus(body.status),
        notes: body.notes || null,
      }
  if (id) {
    if ('rfq_id' in body) payload.rfq_id = isUuid(body.rfq_id) ? body.rfq_id : null
    if ('vendor_id' in body || 'supplier_id' in body || 'supplierId' in body) payload.vendor_id = vendorId
    if ('order_date' in body || 'orderDate' in body) payload.order_date = body.order_date || body.orderDate || today()
    if ('expected_arrival_date' in body || 'requiredDeliveryDate' in body) payload.expected_arrival_date = body.expected_arrival_date || body.requiredDeliveryDate || null
    if ('status' in body) payload.status = purchaseOrderStatus(body.status)
    if ('notes' in body) payload.notes = body.notes || null
  }
  if (!id && !payload.vendor_id) throw new Error('Supplier is required.')
  if (id && (body.order_number || body.purchase_order_number || body.poNumber)) Object.assign(payload, { order_number: body.order_number || body.purchase_order_number || body.poNumber })
  const { data, error } = id
    ? await supabase.from('purchase_orders').update(payload).eq('id', id).select().single()
    : await supabase.from('purchase_orders').insert(payload).select().single()
  if (error) throw error
  if (Array.isArray(body.lines)) {
    const lines = body.lines.map((line: any) => ({
      purchase_order_id: data.id,
      supplier_products_id: line.supplier_products_id || line.supplier_product_id || line.product_id,
      quantity: toNumber(line.quantity ?? line.quantity_ordered, 1),
      unit_price: toNumber(line.unit_price),
    })).filter((line: any) => isUuid(line.supplier_products_id))
    if (lines.length === 0) throw new Error('Purchase order must have at least one supplier product line.')
    await replaceChildren('purchase_order_items', 'purchase_order_id', data.id, lines)
  }
  if (!id && (payload.rfq_id || body.rfq_id)) {
    await ensurePurchaseReceiptAndBill(data.id)
  }
  return mapPurchaseOrder(await getSingle('purchase_orders', data.id, selectPurchaseOrder)) as T
}

const writeStockTransfer = async <T>(body: any, id?: string): Promise<T> => {
  if (body.transfer_type === 'customer_delivery' || body.delivery_order_id || body.deliveryOrderId) {
    const deliveryOrderId = body.delivery_order_id || body.deliveryOrderId
    const lines = (body.lines || []).map((line: any) => ({
      delivery_order_id: deliveryOrderId,
      product_id: line.product_id,
      bin_location_id: line.bin_location_id || line.sourceBinLocationId,
      quantity_requested: toNumber(line.quantity_requested ?? line.quantity, 1),
    })).filter((line: any) => isUuid(line.product_id) && isUuid(line.bin_location_id))

    if (!isUuid(deliveryOrderId)) throw new Error('Delivery order is required.')
    if (lines.length === 0) throw new Error('At least one delivery line with bin location is required.')

    for (const line of lines) {
      const { data: sourceBin, error: sourceBinError } = await supabase
        .from('stock_in_bins')
        .select('id, quantity, available, bin_location:bin_locations(warehouse_id)')
        .eq('product_id', line.product_id)
        .eq('bin_location_id', line.bin_location_id)
        .single()
      if (sourceBinError) throw sourceBinError
      const sourceBinRow: any = sourceBin
      if (toNumber(sourceBinRow?.quantity) < line.quantity_requested || toNumber(sourceBinRow?.available) < line.quantity_requested) {
        throw new Error(`Insufficient bin stock for product ${line.product_id}.`)
      }

      const { error: binUpdateError } = await supabase
        .from('stock_in_bins')
        .update({
          quantity: Math.max(toNumber(sourceBinRow.quantity) - line.quantity_requested, 0),
          available: Math.max(toNumber(sourceBinRow.available) - line.quantity_requested, 0),
        })
        .eq('id', sourceBinRow.id)
      if (binUpdateError) throw binUpdateError

      const warehouseId = Array.isArray(sourceBinRow.bin_location)
        ? sourceBinRow.bin_location[0]?.warehouse_id
        : sourceBinRow.bin_location?.warehouse_id
      if (warehouseId) {
        const { data: stockLevel, error: stockLevelError } = await supabase
          .from('stock_levels')
          .select('id, total_quantity, available')
          .eq('product_id', line.product_id)
          .eq('warehouse_id', warehouseId)
          .maybeSingle()
        if (stockLevelError) throw stockLevelError
        if (stockLevel?.id) {
          const nextAvailable = Math.max(toNumber(stockLevel.available) - line.quantity_requested, 0)
          const { error: stockLevelUpdateError } = await supabase
            .from('stock_levels')
            .update({
              total_quantity: Math.max(toNumber(stockLevel.total_quantity) - line.quantity_requested, 0),
              available: nextAvailable,
              reorder_status: nextAvailable <= 0 ? 'out' : nextAvailable < 10 ? 'low' : 'normal',
            })
            .eq('id', stockLevel.id)
          if (stockLevelUpdateError) throw stockLevelUpdateError
        }
      }
    }

    await replaceChildren('delivery_order_items', 'delivery_order_id', deliveryOrderId, lines)
    const { data, error } = await supabase
      .from('delivery_orders')
      .update({ status: deliveryStatus(body.status || 'delivering'), notes: body.notes || body.note || null })
      .eq('id', deliveryOrderId)
      .select('*, sales_order:sales_orders(*, customer:customers(*), items:sales_order_items(*, product:products(*))), items:delivery_order_items(*, product:products(*), bin_location:bin_locations(*, warehouse:warehouses(*)))')
      .single()
    if (error) throw error
    return data as T
  }

  return writeSimple<T>('stock_transfers', body, id, (value) => ({
    product_id: value.product_id || value.productId || value.lines?.[0]?.product_id,
    src_bin_location_id: [value.src_bin_location_id, value.from_bin_location_id, value.sourceBinLocationId, value.lines?.[0]?.from_bin_location_id]
      .find((candidate) => candidate && candidate !== 'new') || null,
    target_bin_location_id: value.target_bin_location_id || value.to_bin_location_id || value.destBinLocationId || value.lines?.[0]?.to_bin_location_id,
    quantity: toNumber(value.quantity),
    note: value.note || value.notes || null,
  }))
}

const writePayment = async <T>(body: any, type: 'customer' | 'vendor' | 'refund'): Promise<T> => {
  const paymentMethod = body.payment_method || 'bank_transfer'
  const companyAccount = await getDefaultCompanyAccount()

  const invoiceId = type === 'customer' ? body.invoice_id || body.document_id : null
  const vendorBillId = type === 'vendor' ? body.vendor_bill_id || body.bill_id || body.document_id : null
  const refundRequestId = type === 'refund' ? body.refund_request_id || body.refundRequestId || body.document_id : null
  const sourceAccountInput = body.payment_account || body.source_account_id || body.sourceAccountId || null
  const targetAccountInput = body.target_account || body.target_account_id || body.targetAccountId || null
  let customerAccountId = null
  let supplierAccountId = null
  let refundCustomerAccountId = null

  if (invoiceId) {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('sales_order:sales_orders(customer:customers(account_id))')
      .eq('id', invoiceId)
      .single()
    if (invoiceError) throw invoiceError
    customerAccountId = (invoice as any)?.sales_order?.customer?.account_id
    if (paymentMethod !== 'cash' && !customerAccountId) throw new Error('Customer bank account is required before receiving this invoice payment.')
  }
  if (vendorBillId) {
    const { data: bill, error: billError } = await supabase
      .from('vendor_bills')
      .select('purchase_order:purchase_orders(vendor:suppliers!purchase_orders_vendor_id_fkey(account_id))')
      .eq('id', vendorBillId)
      .single()
    if (billError) throw billError
    supplierAccountId = (bill as any)?.purchase_order?.vendor?.account_id
    if (!supplierAccountId) throw new Error('Supplier bank account is required before paying this vendor bill.')
  }
  if (refundRequestId) {
    const { data: refund, error: refundError } = await supabase
      .from('refund_requests')
      .select('customer:customers(account_id)')
      .eq('id', refundRequestId)
      .single()
    if (refundError) throw refundError
    refundCustomerAccountId = (refund as any)?.customer?.account_id
    if (!refundCustomerAccountId) throw new Error('Customer bank account is required before paying this refund request.')
    if (paymentMethod === 'cash') throw new Error('Refund requests can only be paid by bank transfer.')
  }

  const payload = {
    invoice_id: invoiceId,
    vendor_bill_id: vendorBillId,
    refund_request_id: refundRequestId,
    payment_date: body.payment_date || today(),
    payment_method: paymentMethod,
    amount: toNumber(body.amount),
    payment_account: paymentMethod === 'cash'
      ? null
      : invoiceId
        ? (sourceAccountInput || customerAccountId)
        : companyAccount.id,
    target_account: paymentMethod === 'cash'
      ? null
      : invoiceId
        ? (targetAccountInput || companyAccount.id)
        : vendorBillId
          ? (targetAccountInput || supplierAccountId)
          : (targetAccountInput || refundCustomerAccountId),
    reference_number: null,
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

  if (pathname === '/sales-orders/quotations' || pathname.startsWith('/sales-orders/quotations/')) {
    return writeQuotation<T>(body, id)
  }
  if (pathname === '/sales-orders' || pathname.startsWith('/sales-orders/')) {
    return writeSalesOrder<T>(body, id)
  }
  if (pathname === '/sales/warranty-orders' || pathname.startsWith('/sales/warranty-orders/')) {
    return writeWarrantyOrder<T>(body, id)
  }
  if (pathname === '/sales/returns' || pathname.startsWith('/sales/returns/')) {
    return writeSalesReturn<T>(body, id)
  }

  if (pathname === '/products' || pathname.startsWith('/products/')) return writeSimple<T>('products', body, id, normalizeProductPayload)
  if (pathname === '/product-categories' || pathname.startsWith('/product-categories/')) {
    return writeSimple<T>('product_categories', body, id, (value) => ({ category_name: value.category_name || value.name, parent_id: value.parent_id || null }))
  }
  if (pathname === '/customers' || pathname.startsWith('/customers/')) return writeSimple<T>('customers', body, id, normalizeCustomerPayload)
  if (pathname === '/suppliers' || pathname.startsWith('/suppliers/')) return writeSimple<T>('suppliers', body, id, normalizeSupplierPayload)
  if (pathname === '/supplier-products' || pathname.startsWith('/supplier-products/')) {
    return writeSimple<T>('supplier_products', body, id, (value) => ({
      supplier_id: value.supplier_id || value.supplierId,
      product_id: value.product_id || value.productId || null,
      sku: value.sku,
      price: toNumber(value.price),
    }))
  }
  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return writeSimple<T>('users', body, id, (value) => {
      const payload: any = {
        username: value.username || value.email?.split('@')[0],
        email: value.email,
        password_hash: value.password_hash || value.password || 'demo123',
        full_name: value.full_name || value.fullName,
        role: ['admin','sales','purchasing','warehouse','accountant','manager'].includes(value.role) ? value.role : 'sales',
        is_active: value.is_active ?? value.status !== 'inactive',
      }
      if (value.account_id || value.accountId) payload.account_id = value.account_id || value.accountId
      return payload
    })
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
    if (body.receipt_type === 'customer_return' || body.recordType === 'customer_return' || body.sales_return_id) {
      const returnId = body.sales_return_id || id
      if (!returnId) throw new Error('Sales return is required.')
      if (body.status === 'received') return receiveCustomerReturn<T>(returnId)
      return writeSimple<T>('sales_returns', body, returnId, (value) => ({ status: value.status === 'delivering' ? 'pending' : value.status, notes: value.notes || null }))
    }
    return writeSimple<T>('receipts', body, id, (value) => {
      const status = receiptStatus(value.status)
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
    return writeStockTransfer<T>(body, id)
  }
  if (pathname === '/inventory/delivery-orders' || pathname.startsWith('/inventory/delivery-orders/')) {
    return writeSimple<T>('delivery_orders', body, id, (value) => ({ sales_order_id: value.sales_order_id, delivery_date: value.delivery_date || today(), status: deliveryStatus(value.status), tracking_number: value.tracking_number || null, notes: value.notes || null }))
  }

  if (pathname === '/accounting/invoices' || pathname.startsWith('/accounting/invoices/')) {
    const value = body
    if (id && value.status === 'cancelled') {
      await cancelSalesInvoiceCascade(id, value.cancellation_reason || value.cancelReason || value.reason || value.notes)
      return mapInvoice(await getSingle('invoices', id, selectInvoice)) as T
    }
    let netAmount = toNumber(value.net_amount ?? value.subtotal ?? value.total_amount_before_tax ?? value.netAmount)
    const rawTaxAmount = value.tax_amount ?? value.total_tax ?? value.taxAmount
    const hasExplicitTax = rawTaxAmount != null && toNumber(rawTaxAmount) > 0
    let taxAmount = hasExplicitTax ? toNumber(rawTaxAmount) : 0
    let totalAmount = toNumber(value.total_amount ?? value.totalAmount)
    if (value.sales_order_id && (!netAmount || !totalAmount)) {
      const order: any = await getSingle('sales_orders', value.sales_order_id, selectSalesOrder)
      const orderLines = (order?.items || []).map(mapSalesOrderItem)
      netAmount = orderLines.reduce((sum: number, line: any) => sum + toNumber(line.line_total), 0)
    }
    if (!hasExplicitTax) {
      taxAmount = Math.round(netAmount * 0.1)
    }
    if (!totalAmount) {
      totalAmount = netAmount + taxAmount
    }
    const payload = {
      sales_order_id: value.sales_order_id,
      invoice_number: value.invoice_number || value.invoiceNumber || '',
      issue_date: value.issue_date || value.invoice_date || today(),
      due_date: value.due_date || null,
      status: invoiceStatus(value.status),
      total_amount: totalAmount,
      tax_amount: taxAmount,
      net_amount: netAmount || totalAmount,
      warranty_orders_id: value.warranty_orders_id || value.warrantyOrderId || null,
      notes: value.notes || value.description || null,
    }
    const { data, error } = id
      ? await supabase.from('invoices').update(payload).eq('id', id).select().single()
      : await supabase.from('invoices').insert(payload).select().single()
    if (error) throw error
    return mapInvoice(await getSingle('invoices', data.id, selectInvoice)) as T
  }
  if (pathname === '/accounting/bills' || pathname.startsWith('/accounting/bills/')) {
    if (id && body.status === 'cancelled') {
      await cancelVendorBillCascade(id, body.cancellation_reason || body.cancelReason || body.reason || body.notes)
      return mapVendorBill(await getSingle('vendor_bills', id, selectVendorBill)) as T
    }
    return writeSimple<T>('vendor_bills', body, id, (value) => {
      const subtotal = toNumber(value.subtotal ?? value.total_amount_before_tax)
      const rawTaxAmount = value.tax_amount ?? value.total_tax ?? value.taxAmount
      const hasExplicitTax = rawTaxAmount != null && toNumber(rawTaxAmount) > 0
      const taxAmount = hasExplicitTax ? toNumber(rawTaxAmount) : Math.round(subtotal * 0.1)
      const total = toNumber(value.total ?? value.total_amount) || subtotal + taxAmount
      return {
        purchase_order_id: value.purchase_order_id,
        bill_number: value.bill_number || value.billNumber || '',
        issue_date: value.issue_date || value.bill_date || today(),
        due_date: value.due_date || null,
        status: billStatus(value.status),
        total,
        tax_amount: taxAmount,
        subtotal,
        notes: value.notes || null,
      }
    })
  }
  if (pathname === '/accounting/credit-notes' || pathname.startsWith('/accounting/credit-notes/')) return writeSimple<T>('credit_notes', body, id, (value) => ({ invoices_id: value.invoices_id || value.invoice_id, reason: value.reason, total_amount: toNumber(value.total_amount) }))
  if (pathname === '/accounting/debit-notes' || pathname.startsWith('/accounting/debit-notes/')) return writeSimple<T>('debit_notes', body, id, (value) => ({ vendor_bills_id: value.vendor_bills_id || value.bill_id, reason: value.reason, total_amount: toNumber(value.total_amount) }))
  if (pathname === '/accounting/accounts' || pathname.startsWith('/accounting/accounts/')) {
    return writeSimple<T>('accounts', body, id, (value) => ({
      account_number: value.account_number || value.accountNumber,
      bank: value.bank || null,
      name: value.name,
      balance: toNumber(value.balance),
      account_type: value.account_type || value.accountType || 'operating',
      is_novatech_default: value.is_novatech_default ?? value.isNovatechDefault ?? false,
    }))
  }
  if (pathname === '/accounting/customer-payments') return writePayment<T>(body, 'customer')
  if (pathname === '/accounting/supplier-payments') return writePayment<T>(body, 'vendor')
  if (pathname === '/accounting/refund-payments') return writePayment<T>(body, 'refund')
  if (pathname === '/accounting/payments') return writePayment<T>(
    body,
    body.refund_request_id || body.refundRequestId ? 'refund' : body.vendor_bill_id || body.bill_id ? 'vendor' : 'customer'
  )
  if (pathname.startsWith('/accounting/payments/')) {
    throw new Error('Payments are posted ledger entries. Delete and recreate a payment if it was entered incorrectly.')
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
    pathname.startsWith('/sales/warranty-orders/') ? 'warranty_orders' :
    pathname.startsWith('/sales/returns/') ? 'sales_returns' :
    pathname.startsWith('/products/') ? 'products' :
    pathname.startsWith('/product-categories/') ? 'product_categories' :
    pathname.startsWith('/customers/') ? 'customers' :
    pathname.startsWith('/suppliers/') ? 'suppliers' :
    pathname.startsWith('/supplier-products/') ? 'supplier_products' :
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
    pathname.startsWith('/accounting/refund-requests/') ? 'refund_requests' :
    pathname.startsWith('/accounting/accounts/') ? 'accounts' :
    pathname.startsWith('/accounting/payments/') ? 'payments' :
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
