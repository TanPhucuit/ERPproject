import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'

const envText = await fs.readFile('.env.local', 'utf8').catch(() => '')
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    })
)

const appOrigin = process.env.APP_ORIGIN || 'http://127.0.0.1:5173'
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env in .env.local')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = `AUDIT-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
const token = Buffer.from(JSON.stringify({
  id: '00000000-0000-0000-0000-000000000101',
  email: 'admin@erp.local',
  role: 'admin',
})).toString('base64')

const findings = []
const evidence = {}
const toNum = (value) => Number(value || 0)
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function addFinding(area, title, proof, expected) {
  findings.push({ area, title, proof, expected })
}

async function selectByLabel(page, label, value) {
  await page.locator(`xpath=//label[normalize-space(.)="${label}"]/following-sibling::select[1]`).selectOption(value)
}

async function fillInputByLabel(page, label, value) {
  await page.locator(`xpath=//label[normalize-space(.)="${label}"]/following-sibling::input[1]`).fill(String(value))
}

async function fillTextareaByLabel(page, label, value) {
  await page.locator(`xpath=//label[normalize-space(.)="${label}"]/following-sibling::textarea[1]`).fill(String(value))
}

async function openApp(page, path) {
  await page.goto(`${appOrigin}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await wait(700)
}

async function clickTab(page, name) {
  await page.getByRole('button', { name }).click({ timeout: 8000 })
  await wait(700)
}

async function latestRfqAfter(startIso) {
  const { data, error } = await supabase
    .from('rfqs')
    .select('*, items:rfq_items(*)')
    .gte('created_at', startIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function getPurchaseBundle(rfqId) {
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*, items:purchase_order_items(*)')
    .eq('rfq_id', rfqId)
    .neq('status', 'cancelled')
    .order('order_date', { ascending: false })
    .order('order_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (poError) throw poError
  if (!po) return {}

  const [{ data: receipt, error: receiptError }, { data: bill, error: billError }] = await Promise.all([
    supabase.from('receipts').select('*').eq('purchase_order_id', po.id).maybeSingle(),
    supabase.from('vendor_bills').select('*').eq('purchase_order_id', po.id).maybeSingle(),
  ])
  if (receiptError) throw receiptError
  if (billError) throw billError
  return { po, receipt, bill }
}

async function getAccount(id) {
  const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

async function getStockLevel(productId, warehouseId) {
  const { data, error } = await supabase
    .from('stock_levels')
    .select('*')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .maybeSingle()
  if (error) throw error
  return data || { total_quantity: 0, available: 0, new_quantity: 0, quantity_on_hand: 0 }
}

async function getBinStock(productId, binId) {
  const { data, error } = await supabase
    .from('stock_in_bins')
    .select('*')
    .eq('product_id', productId)
    .eq('bin_location_id', binId)
    .maybeSingle()
  if (error) throw error
  return data || { quantity: 0, available: 0 }
}

async function setupDeliveredSalesOrder(customerId, productId, unitPrice) {
  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .insert({
      customer_id: customerId,
      order_date: today(),
      status: 'delivered',
      notes: `${runId} setup delivered order for customer return`,
    })
    .select('*')
    .single()
  if (orderError) throw orderError

  const { error: itemError } = await supabase
    .from('sales_order_items')
    .insert({
      sales_order_id: order.id,
      product_id: productId,
      quantity: 1,
      unit_price: unitPrice,
    })
  if (itemError) throw itemError
  return order
}

const [{ data: scenarioRows, error: scenarioError }, { data: customerRows, error: customerError }] = await Promise.all([
  supabase
    .from('supplier_products')
    .select('*, supplier:suppliers(*, account:accounts(*)), product:products(*)')
    .not('supplier.account_id', 'is', null)
    .order('price', { ascending: true })
    .limit(30),
  supabase.from('customers').select('*, account:accounts(*)').not('account_id', 'is', null).order('created_at').limit(1),
])
if (scenarioError) throw scenarioError
if (customerError) throw customerError

const supplierProduct = scenarioRows.find((row) => row.product?.product_name === 'Smart Plug') || scenarioRows[0]
const customer = customerRows[0]
if (!supplierProduct || !customer) throw new Error('Missing supplier product or existing customer for audit.')

const productId = supplierProduct.product_id
const productName = supplierProduct.product?.product_name || supplierProduct.sku
const supplierAccountId = supplierProduct.supplier?.account_id
const supplierName = supplierProduct.supplier?.supplier_name
const supplierProductId = supplierProduct.id
const qty = 2
const unitPrice = toNum(supplierProduct.price)
const subtotal = qty * unitPrice
const expectedBillTotal = subtotal + Math.round(subtotal * 0.1)

const { data: defaultWarehouse, error: warehouseError } = await supabase
  .from('warehouses')
  .select('*')
  .eq('is_active', true)
  .order('created_at')
  .limit(1)
  .single()
if (warehouseError) throw warehouseError

const { data: targetBin, error: binError } = await supabase
  .from('bin_locations')
  .select('*')
  .eq('warehouse_id', defaultWarehouse.id)
  .eq('is_active', true)
  .order('location_code')
  .limit(1)
  .single()
if (binError) throw binError

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const pageErrors = []
const consoleErrors = []
page.on('pageerror', (error) => pageErrors.push(error.stack || error.message))
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) consoleErrors.push(`${message.type()}: ${message.text()}`)
})

await page.goto(appOrigin, { waitUntil: 'domcontentloaded' })
await page.evaluate((value) => localStorage.setItem('auth_token', value), token)

const startIso = new Date().toISOString()

// RFQ supplier quotation workflow.
await openApp(page, '/app/purchase')
await clickTab(page, /RFQs/i)
await page.getByRole('button', { name: 'New RFQ' }).click()
const rfqModal = page.locator('.fixed.inset-0').last()
await rfqModal.waitFor({ timeout: 5000 })
evidence.rfqModalBeforeProduct = await rfqModal.innerText()
const rfqNumberUi = await rfqModal.locator('xpath=//label[normalize-space(.)="RFQ #"]/following-sibling::input[1]').inputValue()
await rfqModal.getByPlaceholder('Search products to add to RFQ...').fill(productName)
await wait(500)
await rfqModal.getByRole('button').filter({ hasText: productName }).first().click()
await wait(500)
evidence.rfqModalAfterProduct = await rfqModal.innerText()

if (!/Supplier/i.test(evidence.rfqModalAfterProduct)) {
  addFinding('Supplier RFQ', 'RFQ form does not show supplier selection after adding a product.', evidence.rfqModalAfterProduct, 'Every RFQ line should expose supplier/price information.')
}

await selectByLabel(page, 'Supplier', supplierProductId)
await fillInputByLabel(page, 'Qty Required', qty)
await fillTextareaByLabel(page, 'Notes', `${runId} supplier quotation audit`)
await page.getByRole('button', { name: /Create RFQ/i }).click()
await wait(1500)

let rfq = await latestRfqAfter(startIso)
if (!rfq) {
  addFinding('Supplier RFQ', 'RFQ was not created in database.', rfqNumberUi, 'Creating RFQ from UI should insert rfqs and rfq_items.')
} else {
  evidence.createdRfq = rfq
  if (rfq.items?.length !== 1) addFinding('Supplier RFQ', 'RFQ item count is wrong.', JSON.stringify(rfq.items), 'RFQ should have exactly one item.')
  if (rfq.items?.[0]?.supplier_products_id !== supplierProductId) addFinding('Supplier RFQ', 'RFQ selected supplier product is wrong.', JSON.stringify(rfq.items?.[0]), supplierProductId)
  if (toNum(rfq.items?.[0]?.quantity) !== qty) addFinding('Supplier RFQ', 'RFQ quantity is wrong.', JSON.stringify(rfq.items?.[0]), qty)
}

if (rfq) {
  const row = page.locator('tr').filter({ hasText: rfqNumberUi }).first()
  await row.getByRole('button', { name: /Accept/i }).click()
  await wait(2500)
  rfq = await latestRfqAfter(startIso)
}

let bundle = rfq ? await getPurchaseBundle(rfq.id) : {}
evidence.purchaseBundleAfterAccept = bundle
if (!bundle.po?.id) addFinding('Supplier RFQ', 'Accept RFQ did not create purchase order.', JSON.stringify(bundle), 'Accepted RFQ should create one active PO.')
if (!bundle.receipt?.id) addFinding('Supplier RFQ', 'Accept RFQ did not create goods receipt.', JSON.stringify(bundle), 'Accepted RFQ should create a ready receipt.')
if (!bundle.bill?.id) addFinding('Supplier RFQ', 'Accept RFQ did not create vendor bill.', JSON.stringify(bundle), 'Accepted RFQ should create a posted vendor bill.')
if (bundle.bill && toNum(bundle.bill.total) !== expectedBillTotal) {
  addFinding('Vendor Bill', 'Vendor bill total is wrong.', JSON.stringify(bundle.bill), expectedBillTotal)
}

// Vendor bill payment workflow.
let companyBefore
let supplierBefore
let companyAfter
let supplierAfter
if (bundle.bill?.id) {
  const { data: companyAccount, error: companyError } = await supabase.from('accounts').select('*').eq('is_novatech_default', true).single()
  if (companyError) throw companyError
  companyBefore = companyAccount
  supplierBefore = await getAccount(supplierAccountId)

  await openApp(page, '/app/accounting')
  await clickTab(page, /Vendor Bills/i)
  await page.getByPlaceholder('Search records...').fill(bundle.bill.bill_number || bundle.bill.id.slice(0, 8))
  await wait(700)
  await page.locator('tr').filter({ hasText: bundle.bill.bill_number || bundle.bill.id.slice(0, 8) }).first().getByRole('button', { name: /Pay/i }).click()
  const paymentModal = page.locator('.fixed.inset-0').last()
  await paymentModal.waitFor({ timeout: 5000 })
  evidence.paymentModal = await paymentModal.innerText()
  await page.getByRole('button', { name: /Post Payment/i }).click()
  await wait(2500)

  const [{ data: payments, error: paymentsError }, { data: paidBill, error: paidBillError }, { data: paidReceipt, error: paidReceiptError }] = await Promise.all([
    supabase.from('payments').select('*').eq('vendor_bill_id', bundle.bill.id),
    supabase.from('vendor_bills').select('*').eq('id', bundle.bill.id).single(),
    supabase.from('receipts').select('*').eq('id', bundle.receipt.id).single(),
  ])
  if (paymentsError) throw paymentsError
  if (paidBillError) throw paidBillError
  if (paidReceiptError) throw paidReceiptError
  companyAfter = await getAccount(companyBefore.id)
  supplierAfter = await getAccount(supplierAccountId)
  evidence.vendorPayment = { payments, paidBill, paidReceipt, companyBefore, companyAfter, supplierBefore, supplierAfter }

  const paidTotal = payments.reduce((sum, payment) => sum + toNum(payment.amount), 0)
  if (paidBill.status !== 'paid') addFinding('Vendor Payment', 'Vendor bill status did not become paid.', JSON.stringify(paidBill), 'paid')
  if (paidTotal !== expectedBillTotal) addFinding('Vendor Payment', 'Payment amount total is wrong.', JSON.stringify(payments), expectedBillTotal)
  if (toNum(companyBefore.balance) - toNum(companyAfter.balance) !== expectedBillTotal) {
    addFinding('Vendor Payment', 'Company bank balance delta is wrong.', JSON.stringify({ before: companyBefore.balance, after: companyAfter.balance }), `-${expectedBillTotal}`)
  }
  if (toNum(supplierAfter.balance) - toNum(supplierBefore.balance) !== expectedBillTotal) {
    addFinding('Vendor Payment', 'Supplier bank balance delta is wrong.', JSON.stringify({ before: supplierBefore.balance, after: supplierAfter.balance }), `+${expectedBillTotal}`)
  }
  if (paidReceipt.status !== 'delivering') addFinding('Vendor Payment', 'Receipt did not move to delivering after bill payment.', JSON.stringify(paidReceipt), 'delivering')
}

// Receive goods, then transfer newly received stock into a bin.
let stockBeforeReceipt
let stockAfterReceipt
let stockAfterTransfer
let binBeforeTransfer
let binAfterTransfer
if (bundle.receipt?.id) {
  stockBeforeReceipt = await getStockLevel(productId, defaultWarehouse.id)
  await openApp(page, '/app/inventory')
  await clickTab(page, /Goods Receipts/i)
  await page.getByPlaceholder('Search records...').fill(bundle.receipt.id.slice(0, 8))
  await wait(700)
  await page.locator('tr').filter({ hasText: bundle.receipt.id.slice(0, 8) }).first().getByRole('button', { name: /Receive/i }).click()
  await wait(2500)

  const { data: receivedReceipt, error: receivedReceiptError } = await supabase.from('receipts').select('*').eq('id', bundle.receipt.id).single()
  if (receivedReceiptError) throw receivedReceiptError
  stockAfterReceipt = await getStockLevel(productId, defaultWarehouse.id)
  evidence.goodsReceipt = { stockBeforeReceipt, stockAfterReceipt, receivedReceipt }

  if (receivedReceipt.status !== 'received') addFinding('Goods Receipt', 'Receipt status did not become received.', JSON.stringify(receivedReceipt), 'received')
  if (toNum(stockAfterReceipt.new_quantity) - toNum(stockBeforeReceipt.new_quantity) !== qty) {
    addFinding('Goods Receipt', 'Received goods did not increase new_quantity correctly.', JSON.stringify({ stockBeforeReceipt, stockAfterReceipt }), `+${qty}`)
  }

  binBeforeTransfer = await getBinStock(productId, targetBin.id)
  await clickTab(page, /Stock Transfers/i)
  await page.getByRole('button', { name: /New Stock Transfer/i }).click()
  const transferModal = page.locator('.fixed.inset-0').last()
  await transferModal.waitFor({ timeout: 5000 })
  evidence.newStockTransferModal = await transferModal.innerText()
  await selectByLabel(page, 'Source Warehouse', defaultWarehouse.id)
  await selectByLabel(page, 'Source Bin', 'new')
  await selectByLabel(page, 'Product', productId)
  await fillInputByLabel(page, 'Quantity', 1)
  await selectByLabel(page, 'Destination Warehouse', defaultWarehouse.id)
  await selectByLabel(page, 'Destination Bin', targetBin.id)
  await fillInputByLabel(page, 'Notes', `${runId} move received stock to bin`)
  await page.getByRole('button', { name: /Save Transfer/i }).click()
  await wait(2500)
  stockAfterTransfer = await getStockLevel(productId, defaultWarehouse.id)
  binAfterTransfer = await getBinStock(productId, targetBin.id)
  evidence.newStockTransfer = { binBeforeTransfer, binAfterTransfer, stockAfterReceipt, stockAfterTransfer, targetBin, defaultWarehouse }

  if (toNum(stockAfterReceipt.new_quantity) - toNum(stockAfterTransfer.new_quantity) !== 1) {
    addFinding('New Stock Transfer', 'Transfer from new stock did not reduce new_quantity by 1.', JSON.stringify({ stockAfterReceipt, stockAfterTransfer }), '-1')
  }
  if (toNum(stockAfterTransfer.available) - toNum(stockAfterReceipt.available) !== 1) {
    addFinding('New Stock Transfer', 'Transfer from new stock did not increase available stock by 1.', JSON.stringify({ stockAfterReceipt, stockAfterTransfer }), '+1')
  }
  if (toNum(binAfterTransfer.quantity) - toNum(binBeforeTransfer.quantity) !== 1) {
    addFinding('New Stock Transfer', 'Destination bin quantity did not increase by 1.', JSON.stringify({ binBeforeTransfer, binAfterTransfer }), '+1')
  }
}

// Existing customer return workflow.
const returnOrder = await setupDeliveredSalesOrder(customer.id, productId, toNum(supplierProduct.product?.unit_price || unitPrice * 2))
const stockBeforeReturnReceive = await getStockLevel(productId, defaultWarehouse.id)
await openApp(page, '/app/sales')
await clickTab(page, /Sales Returns/i)
await page.getByRole('button', { name: /New Sales Return/i }).click()
const returnModal = page.locator('.fixed.inset-0').last()
await returnModal.waitFor({ timeout: 5000 })
evidence.returnModal = await returnModal.innerText()
await selectByLabel(page, 'Delivered Sales Order', returnOrder.id)
await selectByLabel(page, 'Product', productId)
await fillTextareaByLabel(page, 'Return Reason', `${runId} customer return audit`)
await page.getByRole('button', { name: /Create Return/i }).click()
await wait(2500)

const { data: salesReturn, error: salesReturnError } = await supabase
  .from('sales_returns')
  .select('*, items:sales_return_items(*)')
  .eq('sales_order_id', returnOrder.id)
  .single()
if (salesReturnError) throw salesReturnError
const { data: refundRequest, error: refundError } = await supabase
  .from('refund_requests')
  .select('*')
  .eq('sales_return_id', salesReturn.id)
  .single()
if (refundError) throw refundError
evidence.customerReturnCreated = { returnOrder, salesReturn, refundRequest }

if (salesReturn.status !== 'pending') addFinding('Customer Return', 'Sales return initial status is wrong.', JSON.stringify(salesReturn), 'pending')
if (refundRequest.status !== 'pending') addFinding('Customer Return', 'Refund request initial status is wrong.', JSON.stringify(refundRequest), 'pending')
if (toNum(refundRequest.amount) !== toNum(salesReturn.items?.[0]?.refund_amount)) {
  addFinding('Customer Return', 'Refund request amount does not match return line refund.', JSON.stringify({ salesReturn, refundRequest }), salesReturn.items?.[0]?.refund_amount)
}

await openApp(page, '/app/inventory')
await clickTab(page, /Goods Receipts/i)
await page.getByPlaceholder('Search records...').fill(salesReturn.id.slice(0, 8))
await wait(700)
await page.locator('tr').filter({ hasText: salesReturn.id.slice(0, 8) }).first().getByRole('button', { name: /Receive/i }).click()
await wait(2500)

const { data: receivedReturn, error: receivedReturnError } = await supabase
  .from('sales_returns')
  .select('*')
  .eq('id', salesReturn.id)
  .single()
if (receivedReturnError) throw receivedReturnError
const stockAfterReturnReceive = await getStockLevel(productId, defaultWarehouse.id)
evidence.customerReturnReceived = { stockBeforeReturnReceive, stockAfterReturnReceive, receivedReturn }

if (receivedReturn.status !== 'received') addFinding('Customer Return', 'Receiving returned goods did not set return status to received.', JSON.stringify(receivedReturn), 'received')
if (toNum(stockAfterReturnReceive.new_quantity) - toNum(stockBeforeReturnReceive.new_quantity) !== 1) {
  addFinding('Customer Return', 'Receiving customer return did not increase new_quantity by returned quantity.', JSON.stringify({ stockBeforeReturnReceive, stockAfterReturnReceive }), '+1')
}

await browser.close()

const report = {
  runAt: new Date().toISOString(),
  runId,
  appOrigin,
  scenario: {
    productId,
    productName,
    supplierName,
    supplierProductId,
    qty,
    unitPrice,
    expectedBillTotal,
    customer: { id: customer.id, name: customer.full_name || customer.company_name },
    warehouse: { id: defaultWarehouse.id, name: defaultWarehouse.warehouse_name },
    targetBin: { id: targetBin.id, location_code: targetBin.location_code },
  },
  findings,
  pageErrors,
  consoleErrors,
  evidence,
}

await fs.mkdir('audit-results', { recursive: true })
await fs.writeFile('audit-results/ui-procurement-return-audit.json', JSON.stringify(report, null, 2), 'utf8')

const status = findings.length === 0 ? 'PASS' : 'FAIL'
const md = `# Bao Cao Test Quy Trinh Mua Hang Va Tra Hang

Thoi gian chay: ${new Date().toISOString()}

Run ID: \`${runId}\`

Ket qua tong quat: **${status}** (${findings.length} finding)

## Kich Ban

- San pham: ${productName}
- Nha cung cap: ${supplierName}
- So luong RFQ/PO/Receipt: ${qty}
- Vendor bill expected total: ${expectedBillTotal}
- Customer cu dung de test return: ${customer.full_name || customer.company_name}
- Warehouse nhan hang moi: ${defaultWarehouse.warehouse_name}
- Bin nhan transfer: ${targetBin.location_code}

## Doi Chieu Chinh

- RFQ tao tu UI co 1 line, dung supplier product, dung quantity.
- Accept RFQ tao PO, Goods Receipt, Vendor Bill.
- Pay Vendor Bill cap nhat payment, vendor bill paid, company account giam, supplier account tang.
- Receipt sau khi paid chuyen sang delivering, nhan hang thanh received va tang \`stock_levels.new_quantity\`.
- Stock Transfer tu \`Unbinned received stock\` vao bin lam \`new_quantity\` giam 1, \`available\` tang 1, bin dich tang 1.
- Customer return cua customer cu tao sales_return + refund_request, receive return lam return received va tang \`new_quantity\`.

## Findings

${findings.length === 0 ? '- Khong co finding.' : findings.map((finding, index) => `${index + 1}. **${finding.area}** - ${finding.title}\n   - Proof: ${finding.proof}\n   - Expected: ${finding.expected}`).join('\n')}

JSON chi tiet: \`audit-results/ui-procurement-return-audit.json\`
`
await fs.writeFile('audit-results/BAO_CAO_TEST_MUA_HANG_TRA_HANG.md', md, 'utf8')
console.log(JSON.stringify(report, null, 2))
