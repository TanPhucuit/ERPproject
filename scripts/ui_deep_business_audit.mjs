import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const origin = process.env.APP_ORIGIN || 'https://er-pproject-three.vercel.app'
const token = Buffer.from(JSON.stringify({
  id: '00000000-0000-0000-0000-000000000101',
  email: 'admin@erp.local',
  role: 'admin',
})).toString('base64')

const findings = []
const evidence = {}

const add = (severity, area, title, proof, impact) => findings.push({ severity, area, title, proof, impact })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function pageText(page) {
  return await page.locator('body').innerText().catch(() => '')
}

async function clickExactOrRegex(page, candidates) {
  for (const c of candidates) {
    try {
      if (c instanceof RegExp) {
        await page.getByRole('button', { name: c }).first().click({ timeout: 3000 })
      } else {
        await page.getByRole('button', { name: c, exact: true }).first().click({ timeout: 3000 })
      }
      await wait(700)
      return true
    } catch {}
  }
  return false
}

async function openAppPage(page, path) {
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await wait(700)
}

async function snapshotModal(page, key) {
  const modal = page.locator('.fixed.inset-0').last()
  const text = await modal.innerText({ timeout: 3000 }).catch(async () => '')
  evidence[key] = text
  return text
}

async function saveEmptyAndRead(page, key) {
  await page.getByRole('button', { name: /save|create|update|transfer|invoice|quotation|rfq/i }).last().click({ timeout: 3000 }).catch(() => {})
  await wait(900)
  evidence[`${key}.afterEmptySave`] = await snapshotModal(page, `${key}.modalAfterSave`)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const pageErrors = []
const consoleErrors = []
page.on('pageerror', (e) => pageErrors.push(e.stack || e.message))
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) consoleErrors.push(`${m.type()}: ${m.text()}`)
})

await page.goto(origin)
await page.evaluate((value) => localStorage.setItem('auth_token', value), token)

// CRM lead status audit.
await openAppPage(page, '/app/crm')
const crmText = await pageText(page)
evidence.crm = crmText
if (/\bquoted\b/i.test(crmText)) {
  add('High', 'CRM Lead', 'CRM still exposes obsolete quoted status', crmText.slice(0, 1500), 'Lead stage must only be new/won/lost; quoted creates a fourth state that breaks first quotation accept/reject logic.')
}
await clickExactOrRegex(page, ['New Lead'])
let modal = await snapshotModal(page, 'crm.newLeadModal')
if (/quoted|site survey|proposition|qualified|contacted/i.test(modal)) {
  add('High', 'CRM Lead Form', 'Lead creation/edit form still contains obsolete stages', modal.slice(0, 1600), 'Users can create leads outside the agreed three-stage workflow.')
}
await page.keyboard.press('Escape').catch(() => {})

// Sales quotation tab and form.
await openAppPage(page, '/app/sales')
await clickExactOrRegex(page, [/Quotations/i])
const salesQuoteText = await pageText(page)
evidence.salesQuotationTab = salesQuoteText
if (/draft|sent/i.test(salesQuoteText)) {
  add('High', 'Quotation', 'Quotation list still uses old draft/sent status flow', salesQuoteText.slice(0, 1800), 'Current rule requires accept/reject as business decision, not draft/sent workflow.')
}
if (!/New Quotation/i.test(salesQuoteText)) {
  add('Medium', 'Quotation', 'New Quotation button did not appear after selecting Quotations tab', salesQuoteText.slice(0, 1200), 'Users may be unable to start the quotation workflow from Sales.')
} else {
  await clickExactOrRegex(page, ['New Quotation'])
  modal = await snapshotModal(page, 'sales.newQuotationModal')
  if (/-- Không có Lead --|No Lead|Không có Lead/i.test(modal)) {
    add('High', 'Quotation Form', 'Quotation form allows no lead option', modal.slice(0, 1800), 'Accept/reject cannot update lead to won/lost if quotation is not linked to a lead.')
  }
  await saveEmptyAndRead(page, 'sales.quotation')
  const after = evidence['sales.quotation.afterEmptySave'] || ''
  if (!/lead|product|sản phẩm|required|phải/i.test(after)) {
    add('Medium', 'Quotation Form', 'Empty quotation save lacks clear lead/product validation', after.slice(0, 1800), 'Users may create or attempt invalid quotations without knowing required business inputs.')
  }
  await page.keyboard.press('Escape').catch(() => {})
}

// Purchase RFQ tab and form.
await openAppPage(page, '/app/purchase')
await clickExactOrRegex(page, [/RFQs/i])
const rfqTab = await pageText(page)
evidence.rfqTab = rfqTab
if (!/New RFQ/i.test(rfqTab)) {
  add('High', 'RFQ', 'New RFQ button did not appear after selecting RFQs tab', rfqTab.slice(0, 1200), 'Purchasing cannot start the RFQ workflow reliably.')
} else {
  await clickExactOrRegex(page, ['New RFQ'])
  modal = await snapshotModal(page, 'purchase.newRfqModal')
  if (!/Product|Products/i.test(modal)) {
    add('High', 'RFQ Form', 'RFQ form has no product lines section', modal.slice(0, 1800), 'RFQ without product lines is not a valid purchasing request.')
  }
  if (!/Supplier/i.test(modal)) {
    add('High', 'RFQ Form', 'RFQ form has no supplier selection/quotation section', modal.slice(0, 1800), 'Cannot compare supplier quotes or generate supplier quotations from RFQ.')
  }
  await saveEmptyAndRead(page, 'purchase.rfq')
  await page.keyboard.press('Escape').catch(() => {})
}

// Inventory transfer form.
await openAppPage(page, '/app/inventory')
await clickExactOrRegex(page, [/Stock Transfers/i])
const transferTab = await pageText(page)
evidence.transferTab = transferTab
if (!/New Stock Transfer/i.test(transferTab)) {
  add('High', 'Stock Transfer', 'New Stock Transfer button missing on Stock Transfers tab', transferTab.slice(0, 1200), 'Warehouse cannot enter transfer lines as required.')
} else {
  await clickExactOrRegex(page, ['New Stock Transfer'])
  modal = await snapshotModal(page, 'inventory.transferModal')
  for (const [label, impact] of [
    ['Source Warehouse', 'Source warehouse is required to update source stock levels.'],
    ['Destination Warehouse', 'Destination warehouse is required to update destination stock levels.'],
    ['Source Bin', 'Source bin is required to deduct the correct physical stock.'],
    ['Destination Bin', 'Destination bin is required to add the correct physical stock.'],
    ['Quantity', 'Quantity is required to calculate source/destination deltas.'],
  ]) {
    if (!modal.toLowerCase().includes(label.toLowerCase())) add('High', 'Stock Transfer Form', `Missing ${label}`, modal.slice(0, 1800), impact)
  }
  if (/status|draft|success/i.test(modal)) add('High', 'Stock Transfer Form', 'Transfer form still exposes status/confirmation workflow', modal.slice(0, 1800), 'Current rule requires immediate post: source bin decreases and destination bin increases as soon as the transfer is created.')
  await page.keyboard.press('Escape').catch(() => {})
}

// Accounting payment.
await openAppPage(page, '/app/accounting')
await clickExactOrRegex(page, [/Payments/i])
const payments = await pageText(page)
evidence.paymentsTab = payments
if (!/New Payment/i.test(payments) && !/Payment/i.test(payments)) {
  add('Medium', 'Accounting Payments', 'Payment workflow not visible after selecting Payments tab', payments.slice(0, 1400), 'Cannot properly update paid_amount and customer credit_used.')
}

await fs.mkdir('audit-results', { recursive: true })
const report = {
  runAt: new Date().toISOString(),
  url: origin,
  counts: {
    findings: findings.length,
    high: findings.filter((f) => f.severity === 'High').length,
    medium: findings.filter((f) => f.severity === 'Medium').length,
    pageErrors: pageErrors.length,
    consoleErrors: consoleErrors.length,
  },
  findings,
  pageErrors,
  consoleErrors,
  evidence,
}
await fs.writeFile('audit-results/ui-deep-business-audit.json', JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
await browser.close()
