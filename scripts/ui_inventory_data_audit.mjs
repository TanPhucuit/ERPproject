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

const appUrl = process.env.APP_URL || 'http://127.0.0.1:5173/app/inventory'
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env in .env.local')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const token = Buffer.from(JSON.stringify({
  id: '00000000-0000-0000-0000-000000000101',
  email: 'admin@erp.local',
  role: 'admin',
})).toString('base64')

const toNum = (value) => Number(value || 0)

async function one(table, query) {
  const { data, error } = await query.single()
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

async function maybe(table, query) {
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

async function countTransfers() {
  const { count, error } = await supabase.from('stock_transfers').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count || 0
}

async function snapshot(productId, sourceBinId, targetBinId, warehouseId) {
  const [sourceBin, targetBin, stockLevel, transferCount] = await Promise.all([
    one('source stock_in_bins', supabase.from('stock_in_bins').select('*').eq('product_id', productId).eq('bin_location_id', sourceBinId)),
    maybe('target stock_in_bins', supabase.from('stock_in_bins').select('*').eq('product_id', productId).eq('bin_location_id', targetBinId)),
    one('stock_levels', supabase.from('stock_levels').select('*').eq('product_id', productId).eq('warehouse_id', warehouseId)),
    countTransfers(),
  ])
  return {
    sourceBin: { quantity: toNum(sourceBin.quantity), available: toNum(sourceBin.available) },
    targetBin: { quantity: toNum(targetBin?.quantity), available: toNum(targetBin?.available) },
    stockLevel: {
      total_quantity: toNum(stockLevel.total_quantity),
      available: toNum(stockLevel.available),
      new_quantity: toNum(stockLevel.new_quantity),
      quantity_on_hand: toNum(stockLevel.quantity_on_hand),
    },
    transferCount,
  }
}

async function findScenario() {
  const { data, error } = await supabase
    .from('stock_in_bins')
    .select('product_id, quantity, available, product:products(product_name, sku), bin_location:bin_locations(id, location_code, warehouse_id, warehouse:warehouses(warehouse_name))')
    .gte('available', 2)
    .order('available', { ascending: false })
    .limit(20)
  if (error) throw error

  for (const row of data || []) {
    const warehouseId = row.bin_location?.warehouse_id
    const { data: bins, error: binsError } = await supabase
      .from('bin_locations')
      .select('id, location_code, warehouse_id')
      .eq('warehouse_id', warehouseId)
      .neq('id', row.bin_location.id)
      .order('location_code')
      .limit(1)
    if (binsError) throw binsError
    if (bins?.[0]) {
      return {
        productId: row.product_id,
        productName: row.product?.product_name,
        sourceBinId: row.bin_location.id,
        sourceBinLabel: row.bin_location.location_code,
        targetBinId: bins[0].id,
        targetBinLabel: bins[0].location_code,
        warehouseId,
        warehouseLabel: row.bin_location.warehouse?.warehouse_name,
        quantity: 1,
      }
    }
  }
  throw new Error('No stock scenario with available source bin and destination bin was found.')
}

async function selectAfterLabel(page, label, value) {
  await page.locator(`xpath=//label[normalize-space(.)="${label}"]/following-sibling::select[1]`).selectOption(value)
}

async function fillAfterLabel(page, label, value) {
  await page.locator(`xpath=//label[normalize-space(.)="${label}"]/following-sibling::input[1]`).fill(String(value))
}

function assertDelta(name, actual, expected, findings) {
  if (actual !== expected) {
    findings.push({ name, actual, expected })
  }
}

const scenario = await findScenario()
const before = await snapshot(scenario.productId, scenario.sourceBinId, scenario.targetBinId, scenario.warehouseId)

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const pageErrors = []
const consoleErrors = []
page.on('pageerror', (error) => pageErrors.push(error.stack || error.message))
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) consoleErrors.push(`${message.type()}: ${message.text()}`)
})

await page.goto(appUrl.replace('/app/inventory', ''), { waitUntil: 'domcontentloaded' })
await page.evaluate((value) => localStorage.setItem('auth_token', value), token)
await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
await page.getByRole('button', { name: /Stock Transfers/i }).click()
await page.getByRole('button', { name: /New Stock Transfer/i }).click()

const modal = page.locator('.fixed.inset-0').last()
await modal.waitFor({ timeout: 5000 })
const modalText = await modal.innerText()

await selectAfterLabel(page, 'Source Warehouse', scenario.warehouseId)
await selectAfterLabel(page, 'Source Bin', scenario.sourceBinId)
await selectAfterLabel(page, 'Product', scenario.productId)
await fillAfterLabel(page, 'Quantity', scenario.quantity)
await selectAfterLabel(page, 'Destination Warehouse', scenario.warehouseId)
await selectAfterLabel(page, 'Destination Bin', scenario.targetBinId)
await fillAfterLabel(page, 'Notes', `UI data audit ${new Date().toISOString()}`)

await page.getByRole('button', { name: /Save Transfer/i }).click()
await page.waitForTimeout(2500)

const after = await snapshot(scenario.productId, scenario.sourceBinId, scenario.targetBinId, scenario.warehouseId)
const bodyTextAfterTransfer = await page.locator('body').innerText()

const findings = []
assertDelta('sourceBin.quantity', after.sourceBin.quantity, before.sourceBin.quantity - scenario.quantity, findings)
assertDelta('sourceBin.available', after.sourceBin.available, before.sourceBin.available - scenario.quantity, findings)
assertDelta('targetBin.quantity', after.targetBin.quantity, before.targetBin.quantity + scenario.quantity, findings)
assertDelta('targetBin.available', after.targetBin.available, before.targetBin.available + scenario.quantity, findings)
assertDelta('sameWarehouse.stockLevel.total_quantity', after.stockLevel.total_quantity, before.stockLevel.total_quantity, findings)
assertDelta('sameWarehouse.stockLevel.available', after.stockLevel.available, before.stockLevel.available, findings)
assertDelta('stockTransfer.count', after.transferCount, before.transferCount + 1, findings)

if (!bodyTextAfterTransfer.includes(scenario.productName) || !bodyTextAfterTransfer.includes(scenario.sourceBinLabel) || !bodyTextAfterTransfer.includes(scenario.targetBinLabel)) {
  findings.push({
    name: 'ui.transferList.display',
    actual: 'latest transfer data not visible in body text',
    expected: `${scenario.productName}, ${scenario.sourceBinLabel}, ${scenario.targetBinLabel}`,
  })
}

// Restore the tested quantity so the audit does not leave stock in a different bin.
const { error: restoreError } = await supabase.from('stock_transfers').insert({
  product_id: scenario.productId,
  src_bin_location_id: scenario.targetBinId,
  target_bin_location_id: scenario.sourceBinId,
  quantity: scenario.quantity,
  note: `UI data audit restore ${new Date().toISOString()}`,
})
if (restoreError) {
  findings.push({ name: 'restoreTransfer', actual: restoreError.message, expected: 'reverse transfer inserted' })
}

const restored = await snapshot(scenario.productId, scenario.sourceBinId, scenario.targetBinId, scenario.warehouseId)

const report = {
  runAt: new Date().toISOString(),
  appUrl,
  scenario,
  before,
  after,
  restored,
  modalText,
  findings,
  pageErrors,
  consoleErrors,
}

await fs.mkdir('audit-results', { recursive: true })
await fs.writeFile('audit-results/ui-inventory-data-audit.json', JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))

await browser.close()
