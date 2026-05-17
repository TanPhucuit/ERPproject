import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const origin = 'https://er-pproject-three.vercel.app'
const token = Buffer.from(JSON.stringify({
  id: '00000000-0000-0000-0000-000000000101',
  email: 'admin@erp.local',
  role: 'admin',
})).toString('base64')

const findings = []
const evidence = {}
const add = (severity, area, title, proof, impact) => findings.push({ severity, area, title, proof, impact })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(origin)
await page.evaluate((value) => localStorage.setItem('auth_token', value), token)

async function open(path) {
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await wait(700)
}

async function clickButton(name) {
  await page.getByRole('button', { name, exact: true }).first().click({ timeout: 3000 })
  await wait(700)
}

async function modalText() {
  return await page.locator('.fixed.inset-0').last().innerText({ timeout: 3000 }).catch(() => '')
}

async function closeModal() {
  await page.getByRole('button', { name: /cancel|hủy/i }).last().click({ timeout: 1500 }).catch(async () => {
    await page.locator('.fixed.inset-0 button').first().click({ timeout: 1500 }).catch(() => {})
  })
  await wait(400)
}

await open('/app/accounting')
await page.getByRole('button', { name: /Payments/i }).first().click()
await wait(700)
await clickButton('New Payment')
let text = await modalText()
evidence.paymentModal = text
for (const field of ['Invoice', 'Amount', 'Payment Date', 'Payment Method']) {
  if (!text.toLowerCase().includes(field.toLowerCase())) {
    add('High', 'Accounting Payment Form', `Missing ${field}`, text.slice(0, 1600), 'Payment cannot correctly update invoice paid amount and customer credit.')
  }
}
await closeModal()

await open('/app/master-data')
for (const tab of ['Customers', 'Suppliers', 'Warehouses', 'Bin Locations']) {
  await page.getByRole('button', { name: new RegExp(tab, 'i') }).first().click()
  await wait(500)
  const body = await page.locator('body').innerText()
  evidence[`master.${tab}.body`] = body.slice(0, 2500)
  const newButton = (await page.locator('button').evaluateAll((buttons) =>
    buttons.map((button) => button.textContent?.trim() || '').filter((label) => /^New /.test(label))
  ))[0]
  if (newButton) {
    await clickButton(newButton)
    text = await modalText()
    evidence[`master.${tab}.modal`] = text
    for (const autoField of ['Credit Used', 'Total Spent', 'Average Response', 'Quality Rating', 'Current Occupancy']) {
      if (text.toLowerCase().includes(autoField.toLowerCase())) {
        add('Medium', `Master Data ${tab}`, `Auto-calculated field is editable: ${autoField}`, text.slice(0, 1800), 'Calculated ERP metrics should be system-generated, not manually entered.')
      }
    }
    await closeModal()
  }
}

const report = { runAt: new Date().toISOString(), findings, evidence }
await fs.mkdir('audit-results', { recursive: true })
await fs.writeFile('audit-results/ui-forms-extra-audit.json', JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
await browser.close()
