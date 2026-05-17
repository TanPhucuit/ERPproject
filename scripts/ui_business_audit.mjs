import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const BASE_URL = process.env.AUDIT_URL || 'https://er-pproject-three.vercel.app/app/'
const origin = new URL(BASE_URL).origin
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const qaEmail = `qa.${runId}@example.com`
const qaPassword = 'Qa123456!'

const findings = []
const observations = []
const consoleMessages = []
const pageErrors = []
const networkErrors = []

const addFinding = (severity, area, title, evidence, impact) => {
  findings.push({ severity, area, title, evidence, impact })
}

const addObservation = (area, title, evidence) => {
  observations.push({ area, title, evidence })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const safeText = async (locator) => {
  try {
    return (await locator.innerText({ timeout: 1500 })).trim()
  } catch {
    return ''
  }
}

const allVisibleTexts = async (page, selector) => {
  try {
    return await page.locator(selector).evaluateAll((els) =>
      els
        .filter((el) => {
          const box = el.getBoundingClientRect()
          const style = window.getComputedStyle(el)
          return box.width > 0 && box.height > 0 && style.visibility !== 'hidden'
        })
        .map((el) => el.textContent?.trim() || '')
        .filter(Boolean)
    )
  } catch {
    return []
  }
}

const clickByText = async (page, text, timeout = 3000) => {
  const loc = page.getByText(text, { exact: false }).first()
  await loc.click({ timeout })
}

const clickAnyText = async (page, texts, timeout = 2500) => {
  for (const text of texts) {
    try {
      await clickByText(page, text, timeout)
      return text
    } catch {}
  }
  throw new Error(`Could not click any text: ${texts.join(', ')}`)
}

const fillFirst = async (page, candidates, value) => {
  for (const candidate of candidates) {
    const loc = typeof candidate === 'string' ? page.locator(candidate).first() : candidate
    try {
      if (await loc.count()) {
        await loc.fill(value, { timeout: 1000 })
        return true
      }
    } catch {}
  }
  return false
}

const selectFirstNonEmpty = async (locator) => {
  try {
    const options = await locator.locator('option').evaluateAll((opts) =>
      opts.map((o) => ({ value: o.value, label: o.textContent?.trim() || '' }))
    )
    const option = options.find((o) => o.value)
    if (option) {
      await locator.selectOption(option.value)
      return option
    }
  } catch {}
  return null
}

const modalRoot = (page) => page.locator('.fixed.inset-0').last()

const auditEmptySaveValidation = async (page, area) => {
  const saveButton = page.getByRole('button', { name: /save|create|tạo|cập nhật|update/i }).last()
  try {
    await saveButton.click({ timeout: 2000 })
    await sleep(700)
    const modal = modalRoot(page)
    const errors = [
      ...(await allVisibleTexts(modal, 'p')),
      ...(await allVisibleTexts(modal, '.text-red-600')),
      ...(await allVisibleTexts(page, '[role="status"], .text-red-700, .text-red-800')),
    ].join(' | ')
    if (!errors.toLowerCase().includes('required') && !errors.toLowerCase().includes('phải') && !errors.toLowerCase().includes('must')) {
      addFinding(
        'Medium',
        area,
        'Empty form save does not show clear validation',
        errors || 'No visible validation message after saving an empty form.',
        'Users can be left unsure why a required business document cannot be saved.'
      )
    }
  } catch (error) {
    addFinding('Low', area, 'Could not trigger empty-save validation', String(error), 'May indicate inaccessible or inconsistent form controls.')
  }
}

const closeModal = async (page) => {
  for (const name of [/cancel/i, /hủy/i]) {
    try {
      await page.getByRole('button', { name }).last().click({ timeout: 1000 })
      await sleep(400)
      return
    } catch {}
  }
  try {
    await page.keyboard.press('Escape')
    await sleep(400)
  } catch {}
}

const login = async (page) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (!page.url().includes('/sign-in')) {
    addObservation('Auth', 'Already authenticated or route accessible', page.url())
    return true
  }

  const candidates = [
    ['admin@smartbiz.vn', '123456'],
    ['sales@smartbiz.vn', '123456'],
    ['admin@erp.local', 'admin123'],
    ['sarah.sales@erp.local', 'demo123'],
  ]

  for (const [email, password] of candidates) {
    await page.goto(`${origin}/sign-in`, { waitUntil: 'domcontentloaded' })
    await fillFirst(page, ['input[type="email"]'], email)
    await fillFirst(page, ['input[type="password"]'], password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForTimeout(2500)
    if (page.url().includes('/app')) {
      addObservation('Auth', 'Logged in with seed account', email)
      return true
    }
  }

  await page.goto(`${origin}/sign-up`, { waitUntil: 'domcontentloaded' })
  await fillFirst(page, ['input[type="text"]'], `QA Tester ${runId}`)
  await fillFirst(page, ['input[type="email"]'], qaEmail)
  const passwords = page.locator('input[type="password"]')
  await passwords.nth(0).fill(qaPassword)
  await passwords.nth(1).fill(qaPassword)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForTimeout(3500)
  if (page.url().includes('/app')) {
    addObservation('Auth', 'Created QA account and logged in', qaEmail)
    return true
  }

  const body = await safeText(page.locator('body'))
  addFinding('Critical', 'Auth', 'Cannot log in or sign up automatically', body.slice(0, 1200), 'Cannot test protected ERP workflows through UI.')
  return false
}

const auditModuleLoad = async (page, path, area) => {
  const beforeErrors = pageErrors.length
  const beforeConsole = consoleMessages.length
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await sleep(1000)
  const body = await safeText(page.locator('body'))
  if (!body || body.length < 80) {
    addFinding('Critical', area, 'Page renders blank or nearly blank', `URL: ${page.url()}, body length: ${body.length}`, 'Users cannot operate the module.')
  }
  if (page.url().includes('/sign-in')) {
    addFinding('Critical', area, 'Protected route redirected to sign-in during audit', page.url(), 'Session handling may interrupt business workflows.')
  }
  const newErrors = pageErrors.slice(beforeErrors)
  const newConsoleErrors = consoleMessages.slice(beforeConsole).filter((m) => ['error', 'warning'].includes(m.type))
  if (newErrors.length) {
    addFinding('Critical', area, 'Runtime page error', newErrors.join('\n'), 'React crash can block the module or form.')
  }
  if (newConsoleErrors.length) {
    addFinding('Medium', area, 'Console warnings/errors on module load', newConsoleErrors.map((m) => `${m.type}: ${m.text}`).join('\n').slice(0, 2000), 'May indicate broken data mapping or failed business API calls.')
  }
  return body
}

const auditCRM = async (page) => {
  await auditModuleLoad(page, '/app/crm', 'CRM')
  const tabs = await allVisibleTexts(page, 'button')
  addObservation('CRM', 'Visible buttons/tabs', tabs.join(' | '))

  await clickAnyText(page, ['New Lead', 'Tạo Lead', 'Create Lead'])
  await sleep(700)
  await auditEmptySaveValidation(page, 'CRM Lead')
  const modal = modalRoot(page)
  const selects = modal.locator('select')
  const selectOptions = []
  for (let i = 0; i < await selects.count(); i++) {
    const opts = await selects.nth(i).locator('option').evaluateAll((os) => os.map((o) => o.textContent?.trim() || ''))
    selectOptions.push(opts)
  }
  const allOpts = selectOptions.flat().map((x) => x.toLowerCase())
  const forbiddenStages = ['site survey', 'proposition', 'qualified', 'contacted']
  const hasForbiddenStage = forbiddenStages.some((stage) => allOpts.some((opt) => opt.includes(stage)))
  if (hasForbiddenStage) {
    addFinding(
      'High',
      'CRM Lead',
      'Lead form still exposes old stages',
      JSON.stringify(selectOptions),
      'Business rule says lead only has new, won, lost. Old stages distort pipeline and quotation conversion logic.'
    )
  }
  await closeModal(page)
}

const auditSales = async (page) => {
  await auditModuleLoad(page, '/app/sales', 'Sales')
  await clickAnyText(page, ['Quotations', 'Báo giá']).catch(() => {})
  await sleep(700)
  const body = await safeText(page.locator('body'))
  if (body.toLowerCase().includes('draft') || body.toLowerCase().includes('sent')) {
    addFinding(
      'High',
      'Sales Quotation',
      'Quotation screen still shows old draft/sent states',
      body.match(/draft|sent/gi)?.slice(0, 20).join(', ') || 'draft/sent visible',
      'Current business flow should revolve around accept/reject from the first quotation, not draft/sent progression.'
    )
  }
  await clickAnyText(page, ['New Quotation', 'Tạo Quotation', 'Create Quotation'])
  await sleep(900)
  await auditEmptySaveValidation(page, 'Sales Quotation')
  const modalText = await safeText(modalRoot(page))
  if (modalText.toLowerCase().includes('không có lead') || modalText.toLowerCase().includes('no lead')) {
    addFinding(
      'Medium',
      'Sales Quotation',
      'Quotation lead selector permits empty/no lead option',
      modalText.slice(0, 1200),
      'If quotation is meant for new leads only, allowing no lead can break lead won/lost conversion.'
    )
  }
  await closeModal(page)
}

const auditPurchase = async (page) => {
  await auditModuleLoad(page, '/app/purchase', 'Purchase')
  await clickAnyText(page, ['RFQs', 'RFQ']).catch(() => {})
  await sleep(700)
  await clickAnyText(page, ['New RFQ', 'Tạo RFQ', 'Create RFQ'])
  await sleep(900)
  const modalText = await safeText(modalRoot(page))
  if (!modalText.toLowerCase().includes('product')) {
    addFinding('High', 'Purchase RFQ', 'RFQ form does not expose product lines', modalText.slice(0, 1200), 'RFQ without product lines cannot support supplier quotation comparison.')
  }
  if (!modalText.toLowerCase().includes('supplier')) {
    addFinding('High', 'Purchase RFQ', 'RFQ form does not expose supplier selection/quotations', modalText.slice(0, 1200), 'RFQ cannot be sent to suppliers or compared by supplier response.')
  }
  await auditEmptySaveValidation(page, 'Purchase RFQ')
  await closeModal(page)
}

const auditInventory = async (page) => {
  await auditModuleLoad(page, '/app/inventory', 'Inventory')
  const body = await safeText(page.locator('body'))
  if (!body.toLowerCase().includes('stock transfers')) {
    addFinding(
      'High',
      'Inventory Transfer',
      'Stock Transfer function is not visible in Inventory',
      body.slice(0, 1500),
      'Business flow requires warehouse/bin transfer with in-transit and stock_in_bin updates.'
    )
  } else {
    await clickAnyText(page, ['Stock Transfers', 'Transfer']).catch(() => {})
    await sleep(600)
    await clickAnyText(page, ['New Stock Transfer', 'New Stock Transfer Line', 'New Transfer', 'New'])
    await sleep(700)
    const modalText = await safeText(modalRoot(page))
    for (const required of ['Source Warehouse', 'Source Bin', 'Destination Warehouse', 'Destination Bin', 'Product', 'Quantity', 'Status']) {
      if (!modalText.toLowerCase().includes(required.toLowerCase().replace(' location', ''))) {
        addFinding('High', 'Inventory Transfer', `Transfer form missing ${required}`, modalText.slice(0, 1600), 'Transfer cannot update source/destination stock correctly.')
      }
    }
    if (!modalText.toLowerCase().includes('success')) {
      addFinding('Medium', 'Inventory Transfer', 'Transfer status does not expose success state', modalText.slice(0, 1600), 'Business rule expects draft -> success for completing transfer.')
    }
    await closeModal(page)
  }

  if (body.toLowerCase().includes('stock levels')) {
    await clickAnyText(page, ['Stock Levels', 'Stock']).catch(() => {})
    await sleep(500)
    await clickAnyText(page, ['New Stock Item', 'Managed Automatically', 'New'])
    await sleep(700)
    const modalText = await safeText(modalRoot(page))
    const manualAutoFields = ['Reserved', 'Available', 'In Transit', 'Reorder Status']
    for (const field of manualAutoFields) {
      if (modalText.includes(field) && !modalText.toLowerCase().includes(`${field.toLowerCase()} (auto`)) {
        addFinding('Medium', 'Inventory Stock Level', `${field} may still be manually editable`, modalText.slice(0, 1600), 'Auto-calculated stock fields should not be user-entered.')
      }
    }
    await closeModal(page)
  }
}

const auditAccounting = async (page) => {
  await auditModuleLoad(page, '/app/accounting', 'Accounting')
  const body = await safeText(page.locator('body'))
  if (!body.toLowerCase().includes('payment')) {
    addFinding('Medium', 'Accounting Payment', 'Payment entry is not visible', body.slice(0, 1200), 'Invoices and credit_used cannot be updated by proper payment workflow.')
  }
}

const auditMasterData = async (page) => {
  await auditModuleLoad(page, '/app/master-data', 'Master Data')
  const body = await safeText(page.locator('body'))
  for (const field of ['Credit Used', 'Total Spent', 'Current Occupancy']) {
    if (body.includes(field)) {
      addFinding('Medium', 'Master Data', `Auto-calculated field visible in master data: ${field}`, body.slice(0, 1600), 'Calculated ERP metrics should be read-only or hidden from manual entry.')
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    if (!text.includes('Download the React DevTools')) consoleMessages.push({ type, text })
  })
  page.on('pageerror', (err) => pageErrors.push(err.stack || err.message))
  page.on('requestfailed', (req) => networkErrors.push(`${req.method()} ${req.url()} ${req.failure()?.errorText || ''}`))

  const loggedIn = await login(page)
  if (loggedIn) {
    const audits = [
      ['CRM', auditCRM],
      ['Sales', auditSales],
      ['Purchase', auditPurchase],
      ['Inventory', auditInventory],
      ['Accounting', auditAccounting],
      ['Master Data', auditMasterData],
    ]
    for (const [name, fn] of audits) {
      try {
        await fn(page)
      } catch (error) {
        addFinding('Medium', name, 'Audit step failed before completion', error.stack || String(error), 'The UI may have inaccessible controls or labels that block normal tester workflows.')
        await closeModal(page).catch(() => {})
      }
    }
  }

  const report = {
    runAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    qaEmail,
    counts: {
      findings: findings.length,
      critical: findings.filter((f) => f.severity === 'Critical').length,
      high: findings.filter((f) => f.severity === 'High').length,
      medium: findings.filter((f) => f.severity === 'Medium').length,
      low: findings.filter((f) => f.severity === 'Low').length,
      consoleMessages: consoleMessages.length,
      pageErrors: pageErrors.length,
      networkErrors: networkErrors.length,
    },
    findings,
    observations,
    consoleMessages,
    pageErrors,
    networkErrors: networkErrors.slice(0, 100),
  }

  await fs.mkdir('audit-results', { recursive: true })
  await fs.writeFile(`audit-results/ui-business-audit-${runId}.json`, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
