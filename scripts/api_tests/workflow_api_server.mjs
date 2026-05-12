import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function loadEnv() {
  const envPath = resolve(root, '.env.local')
  if (!existsSync(envPath)) return
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [name, ...valueParts] = line.split('=')
    if (!process.env[name]) {
      process.env[name] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '')
    }
  }
}

loadEnv()

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY for write tests.')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: process.env.SUPABASE_ACCESS_TOKEN
    ? { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } }
    : undefined,
})

const today = () => new Date().toISOString().slice(0, 10)
const daysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
const docNo = (prefix) => `${prefix}-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
const lineTotal = (qty, price, discount = 0) => qty * price * (1 - discount / 100)

async function one(table, query = '*', label = table) {
  const { data, error } = await supabase.from(table).select(query).limit(1)
  if (error) throw new Error(`${label} read failed: ${error.message}`)
  if (!data?.length) throw new Error(`Missing required master data: ${label}`)
  return data[0]
}

async function maybeOne(table, query = '*') {
  const { data, error } = await supabase.from(table).select(query).limit(1)
  if (error) throw new Error(`${table} read failed: ${error.message}`)
  return data?.[0] || null
}

async function maybeOneWhere(table, query, column, value) {
  const { data, error } = await supabase.from(table).select(query).eq(column, value).limit(1)
  if (error) throw new Error(`${table} read failed: ${error.message}`)
  return data?.[0] || null
}

async function insert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) throw new Error(`${table} insert failed: ${error.message}`)
  return data
}

async function update(table, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
  if (error) throw new Error(`${table} update failed: ${error.message}`)
  return data
}

async function insertMany(table, rows) {
  if (!rows.length) return []
  const { data, error } = await supabase.from(table).insert(rows).select()
  if (error) throw new Error(`${table} insert failed: ${error.message}`)
  return data || []
}

async function seedContext() {
  const product = await one('products', 'id,name,sku,list_price,cost_price', 'product')
  const warehouse = await one('warehouses', 'id,name,warehouse_code', 'warehouse')
  const supplier = await one('suppliers', 'id,name,payment_terms', 'supplier')
  const user = await maybeOne('users', 'id,email,full_name,role')
  const stageNew = await one('lead_stages', 'id,name', 'lead stage')
  const activityType = await one('activity_types', 'id,name', 'activity type')
  const customer = await maybeOne('customers', 'id,name,payment_terms,customer_type,credit_limit,credit_used')
  return { product, warehouse, supplier, user, stageNew, activityType, customer }
}

async function readiness() {
  const ctx = await seedContext()
  return {
    ok: true,
    mode: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : process.env.SUPABASE_ACCESS_TOKEN ? 'access_token' : 'anon_key',
    masterData: {
      product: ctx.product.name,
      warehouse: ctx.warehouse.name,
      supplier: ctx.supplier.name,
      user: ctx.user?.email || null,
      customer: ctx.customer?.name || null,
      leadStage: ctx.stageNew.name,
      activityType: ctx.activityType.name,
    },
  }
}

async function crmSalesWorkflow() {
  const ctx = await seedContext()
  const productPrice = Number(ctx.product.list_price || 1000000)
  const qty = 1
  const subtotal = lineTotal(qty, productPrice)
  const taxPercent = 10
  const taxAmount = subtotal * taxPercent / 100
  const total = subtotal + taxAmount

  const lead = await insert('leads', {
    lead_number: docNo('LEAD'),
    company_name: 'API Workflow Lead',
    contact_person_name: 'Workflow Tester',
    contact_person_email: `workflow-${Date.now()}@example.com`,
    contact_person_phone: '0900000000',
    company_address: 'Workflow Test Address',
    source: 'website',
    lead_rating: 'hot',
    stage_id: ctx.stageNew.id,
    owner_id: ctx.user?.id || null,
    estimated_value: total,
    probability_percent: 50,
    customer_type: 'B2C',
    billing_address: 'Workflow Test Address',
    shipping_address: 'Workflow Test Address',
    notes: 'Created by local curl workflow test.',
  })

  await insert('activities', {
    lead_id: lead.id,
    activity_type_id: ctx.activityType.id,
    description: 'Workflow activity note. No outcome column is used.',
    activity_date: new Date().toISOString(),
    performed_by_id: ctx.user?.id || null,
  })

  await insert('lead_products', {
    lead_id: lead.id,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: qty,
    unit_price: productPrice,
    discount_percent: 0,
    notes: 'Requirement copied into quotation.',
  })

  const quotation = await insert('quotations', {
    quotation_number: docNo('QUO'),
    lead_id: lead.id,
    customer_id: null,
    issued_date: today(),
    valid_until_date: daysFromNow(30),
    sales_person_id: ctx.user?.id || null,
    subtotal,
    discount_percent: 0,
    discount_amount: 0,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    status: 'draft',
    notes: 'Lead-first quotation. Customer is intentionally null.',
    created_by_id: ctx.user?.id || null,
  })

  await insert('quotation_lines', {
    quotation_id: quotation.id,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: qty,
    unit_price: productPrice,
    discount_percent: 0,
    sequence: 1,
  })

  const wonStage = await maybeOneWhere('lead_stages', 'id,name', 'name', 'won')
  const customer = await insert('customers', {
    customer_number: docNo('CUST'),
    name: lead.company_name,
    customer_type: 'B2C',
    contact_person_name: lead.contact_person_name,
    contact_person_email: lead.contact_person_email,
    contact_person_phone: lead.contact_person_phone,
    billing_address: lead.billing_address || lead.company_address,
    shipping_address: lead.shipping_address || lead.company_address,
    payment_terms: 'NET30',
    status: 'active',
    created_by_id: ctx.user?.id || null,
  })

  await update('leads', lead.id, {
    customer_id: customer.id,
    stage_id: wonStage?.name === 'won' ? wonStage.id : lead.stage_id,
    probability_percent: 100,
  })
  await update('quotations', quotation.id, { status: 'accepted', customer_id: customer.id })

  const salesOrder = await insert('sales_orders', {
    sales_order_number: docNo('SO'),
    quotation_id: quotation.id,
    customer_id: customer.id,
    sales_person_id: ctx.user?.id || null,
    order_date: today(),
    required_delivery_date: daysFromNow(7),
    subtotal,
    discount_percent: 0,
    discount_amount: 0,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    total_cost: Number(ctx.product.cost_price || 0) * qty,
    status: 'confirmed',
    notes: 'Created from accepted quotation.',
    created_by_id: ctx.user?.id || null,
  })

  const soLines = await insertMany('sales_order_lines', [{
    sales_order_id: salesOrder.id,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: qty,
    unit_price: productPrice,
    cost_price: Number(ctx.product.cost_price || 0),
    discount_percent: 0,
    sequence: 1,
  }])

  const invoice = await insert('customer_invoices', {
    invoice_number: docNo('INV'),
    sales_order_id: salesOrder.id,
    customer_id: customer.id,
    invoice_date: today(),
    due_date: daysFromNow(30),
    subtotal,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    paid_amount: 0,
    status: 'issued',
    payment_terms: 'NET30',
    description: 'Invoice generated from sales order.',
    issued_by_id: ctx.user?.id || null,
  })

  await insertMany('customer_invoice_lines', [{
    invoice_id: invoice.id,
    sales_order_line_id: soLines[0]?.id || null,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: qty,
    unit_price: productPrice,
  }])

  const delivery = await insert('delivery_orders', {
    delivery_order_number: docNo('DO'),
    sales_order_id: salesOrder.id,
    warehouse_id: ctx.warehouse.id,
    status: 'ready',
    scheduled_delivery_date: daysFromNow(7),
    notes: 'Delivery opened because NET payment terms allow delivery before payment.',
    created_by_id: ctx.user?.id || null,
  })

  await insert('delivery_order_lines', {
    delivery_order_id: delivery.id,
    sales_order_line_id: soLines[0]?.id || null,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity_ordered: qty,
    quantity_delivered: 0,
    sequence: 1,
  })

  const payment = await insert('customer_payments', {
    payment_number: docNo('PAY'),
    customer_id: customer.id,
    invoice_id: invoice.id,
    amount: total,
    payment_date: today(),
    payment_method: 'bank_transfer',
    reference: docNo('BANK'),
    notes: 'Full payment in curl workflow test.',
    created_by_id: ctx.user?.id || null,
  })

  await update('customer_invoices', invoice.id, { paid_amount: total, status: 'paid' })
  const delivered = await update('delivery_orders', delivery.id, { status: 'delivered', actual_delivery_date: today() })

  return {
    ok: true,
    workflow: 'crm_sales_accounting_delivery',
    ids: {
      lead: lead.id,
      quotation: quotation.id,
      customer: customer.id,
      salesOrder: salesOrder.id,
      invoice: invoice.id,
      deliveryOrder: delivered.id,
      payment: payment.id,
    },
  }
}

async function purchaseWorkflow() {
  const ctx = await seedContext()
  const qty = 2
  const unitPrice = Number(ctx.product.cost_price || ctx.product.list_price || 1000000)
  const subtotal = qty * unitPrice
  const taxPercent = 10
  const taxAmount = subtotal * taxPercent / 100
  const total = subtotal + taxAmount

  const rfq = await insert('rfqs', {
    rfq_number: docNo('RFQ'),
    issued_date: today(),
    closing_date: daysFromNow(7),
    status: 'draft',
    total_estimated_cost: subtotal,
    created_by_id: ctx.user?.id || null,
    notes: 'Purchase workflow curl test.',
  })

  const rfqLines = await insertMany('rfq_lines', [{
    rfq_id: rfq.id,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: qty,
    target_price: unitPrice,
    description: 'Stock replenishment request.',
    sequence: 1,
  }])

  await insert('rfq_supplier_quotations', {
    rfq_line_id: rfqLines[0].id,
    supplier_id: ctx.supplier.id,
    quoted_price: unitPrice,
    quoted_lead_time_days: 7,
    valid_until_date: daysFromNow(14),
    notes: 'Selected supplier quote.',
  })

  await update('rfqs', rfq.id, { status: 'closed' })

  const po = await insert('purchase_orders', {
    purchase_order_number: docNo('PO'),
    rfq_id: rfq.id,
    supplier_id: ctx.supplier.id,
    order_date: today(),
    required_delivery_date: daysFromNow(10),
    subtotal,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    status: 'confirmed',
    created_by_id: ctx.user?.id || null,
    notes: 'PO created after supplier selection.',
  })

  const poLines = await insertMany('purchase_order_lines', [{
    purchase_order_id: po.id,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: qty,
    unit_price: unitPrice,
    sequence: 1,
  }])

  const gr = await insert('goods_receipts', {
    goods_receipt_number: docNo('GR'),
    purchase_order_id: po.id,
    warehouse_id: ctx.warehouse.id,
    received_date: today(),
    status: 'completed',
    notes: 'Goods received and QC completed.',
    created_by_id: ctx.user?.id || null,
  })

  await insert('goods_receipt_lines', {
    goods_receipt_id: gr.id,
    purchase_order_line_id: poLines[0]?.id || null,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity_expected: qty,
    quantity_received: qty,
    quantity_accepted: qty,
    quantity_rejected: 0,
    unit_cost: unitPrice,
    sequence: 1,
  })

  const bill = await insert('vendor_bills', {
    bill_number: docNo('BILL'),
    purchase_order_id: po.id,
    supplier_id: ctx.supplier.id,
    bill_date: today(),
    due_date: daysFromNow(30),
    subtotal,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    paid_amount: 0,
    status: 'received',
    payment_terms: ctx.supplier.payment_terms || 'NET30',
    notes: 'Vendor bill after goods receipt.',
  })

  await insert('vendor_bill_lines', {
    bill_id: bill.id,
    purchase_order_line_id: poLines[0]?.id || null,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: qty,
    unit_price: unitPrice,
  })

  const supplierPayment = await insert('supplier_payments', {
    payment_number: docNo('SPAY'),
    supplier_id: ctx.supplier.id,
    bill_id: bill.id,
    amount: total,
    payment_date: today(),
    payment_method: 'bank_transfer',
    reference: docNo('BANK'),
    notes: 'Full supplier payment.',
    created_by_id: ctx.user?.id || null,
  })

  await update('vendor_bills', bill.id, { paid_amount: total, status: 'paid' })

  return {
    ok: true,
    workflow: 'purchase_inventory_ap',
    ids: {
      rfq: rfq.id,
      purchaseOrder: po.id,
      goodsReceipt: gr.id,
      vendorBill: bill.id,
      supplierPayment: supplierPayment.id,
    },
  }
}

async function inventoryWorkflow() {
  const ctx = await seedContext()
  const toWarehouse = await maybeOne('warehouses', 'id,name')
  const adjustment = await insert('inventory_adjustments', {
    adjustment_number: docNo('ADJ'),
    warehouse_id: ctx.warehouse.id,
    adjustment_type: 'stock_count',
    count_date: today(),
    status: 'draft',
    reason: 'Curl workflow stock count test.',
    notes: 'Adjustment header only; lines are tested if RLS/schema allows.',
    created_by_id: ctx.user?.id || null,
  })

  const transfer = await insert('stock_transfers', {
    transfer_number: docNo('TRF'),
    source_warehouse_id: ctx.warehouse.id,
    dest_warehouse_id: toWarehouse?.id || ctx.warehouse.id,
    status: 'draft',
    transfer_date: today(),
    notes: 'Stock transfer workflow curl test.',
    created_by_id: ctx.user?.id || null,
  })

  await insert('stock_transfer_lines', {
    transfer_id: transfer.id,
    product_id: ctx.product.id,
    product_name: ctx.product.name,
    quantity: 1,
    sequence: 1,
  })

  return {
    ok: true,
    workflow: 'inventory_adjustment_transfer',
    ids: {
      adjustment: adjustment.id,
      stockTransfer: transfer.id,
    },
  }
}

async function allWorkflows() {
  const steps = []
  for (const [name, fn] of [
    ['readiness', readiness],
    ['crmSalesAccountingDelivery', crmSalesWorkflow],
    ['purchaseInventoryPayables', purchaseWorkflow],
    ['inventoryAdjustmentTransfer', inventoryWorkflow],
  ]) {
    try {
      steps.push({ name, status: 'passed', result: await fn() })
    } catch (error) {
      steps.push({ name, status: 'failed', error: error.message })
      break
    }
  }
  return {
    ok: steps.every((step) => step.status === 'passed'),
    steps,
  }
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

const routes = {
  'GET /health': readiness,
  'POST /workflows/crm-sales': crmSalesWorkflow,
  'POST /workflows/purchase': purchaseWorkflow,
  'POST /workflows/inventory': inventoryWorkflow,
  'POST /workflows/all': allWorkflows,
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  try {
    if (req.method !== 'GET') await readJson(req)
    const key = `${req.method} ${new URL(req.url, 'http://localhost').pathname}`
    const handler = routes[key]
    if (!handler) {
      res.statusCode = 404
      res.end(JSON.stringify({ ok: false, error: `Unknown route ${key}` }))
      return
    }
    const data = await handler()
    res.statusCode = data.ok === false ? 500 : 200
    res.end(JSON.stringify(data, null, 2))
  } catch (error) {
    res.statusCode = 500
    res.end(JSON.stringify({ ok: false, error: error.message }, null, 2))
  }
})

const port = Number(process.env.WORKFLOW_TEST_PORT || 8787)
server.listen(port, () => {
  console.log(`Workflow test API listening on http://localhost:${port}`)
})
