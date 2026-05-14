import http from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
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

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function count(table) {
  const { count: value, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
  if (error) throw new Error(`${table} count failed: ${error.message}`)
  return value || 0
}

async function countWhere(table, buildQuery) {
  const baseQuery = supabase.from(table).select('id', { count: 'exact', head: true })
  const { count: value, error } = await buildQuery(baseQuery)
  if (error) throw new Error(`${table} invariant failed: ${error.message}`)
  return value || 0
}

async function invariant(name, table, buildQuery) {
  const issueCount = await countWhere(table, buildQuery)
  return issueCount === 0
    ? { name, status: 'passed', issueCount }
    : { name, status: 'failed', issueCount }
}

async function tableHealth() {
  const tables = [
    'leads',
    'customers',
    'quotations',
    'sales_orders',
    'delivery_orders',
    'invoices',
    'rfqs',
    'purchase_orders',
    'receipts',
    'vendor_bills',
    'payments',
    'stock_levels',
    'stock_in_bins',
    'supplier_products',
    'products',
    'accounts',
  ]
  const entries = await Promise.all(tables.map(async (table) => [table, await count(table)]))
  return Object.fromEntries(entries)
}

async function readiness() {
  const counts = await tableHealth()
  return {
    ok: true,
    mode: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon_or_publishable_key',
    masterData: {
      product: counts.products,
      warehouse: await count('warehouses'),
      supplier: await count('suppliers'),
      customer: counts.customers,
    },
    counts,
  }
}

async function dataIntegrityWorkflow() {
  const checks = [
    ['leads_without_account', 'leads', (query) => query.is('account_id', null)],
    ['customers_without_account', 'customers', (query) => query.is('account_id', null)],
    ['suppliers_without_account', 'suppliers', (query) => query.is('account_id', null)],
    ['users_without_account', 'users', (query) => query.is('account_id', null)],
    ['products_without_category', 'products', (query) => query.is('category_id', null)],
  ]
  const results = []
  for (const [name, table, buildQuery] of checks) results.push(await invariant(name, table, buildQuery))
  return { ok: results.every((step) => step.status === 'passed'), workflow: 'data_integrity', results }
}

async function businessShapeWorkflow() {
  const counts = await tableHealth()
  const requiredMasterData = ['products', 'supplier_products', 'accounts']
  const missing = requiredMasterData.filter((key) => counts[key] <= 0)
  return {
    ok: missing.length === 0,
    workflow: 'business_shape',
    missing,
    counts,
  }
}

async function allWorkflows() {
  const steps = []
  for (const [name, fn] of [
    ['readiness', readiness],
    ['dataIntegrity', dataIntegrityWorkflow],
    ['businessShape', businessShapeWorkflow],
  ]) {
    try {
      const result = await fn()
      steps.push({ name, status: result.ok === false ? 'failed' : 'passed', result })
      if (result.ok === false) break
    } catch (error) {
      steps.push({ name, status: 'failed', error: error.message })
      break
    }
  }
  return { ok: steps.every((step) => step.status === 'passed'), steps }
}

const routes = {
  'GET /health': readiness,
  'POST /workflows/all': allWorkflows,
  'POST /workflows/data-integrity': dataIntegrityWorkflow,
  'POST /workflows/business-shape': businessShapeWorkflow,
}

const server = http.createServer(async (req, res) => {
  const key = `${req.method} ${req.url?.split('?')[0]}`
  const handler = routes[key]
  if (!handler) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: `No route: ${key}` }))
    return
  }
  try {
    const body = await handler()
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: error.message }))
  }
})

const port = Number(process.env.WORKFLOW_TEST_PORT || 8787)
server.listen(port, '127.0.0.1', () => {
  console.log(`Workflow API server listening on http://127.0.0.1:${port}`)
})
