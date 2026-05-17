import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const origin = 'https://er-pproject-three.vercel.app'
const token = Buffer.from(JSON.stringify({
  id: '00000000-0000-0000-0000-000000000101',
  email: 'admin@erp.local',
  role: 'admin',
})).toString('base64')

const pages = ['/app/crm', '/app/sales', '/app/purchase', '/app/inventory', '/app/accounting', '/app/master-data']

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(origin)
await page.evaluate((value) => localStorage.setItem('auth_token', value), token)

const result = {}
for (const path of pages) {
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
  result[path] = {
    url: page.url(),
    title: await page.locator('h1').first().innerText().catch(() => ''),
    body: (await page.locator('body').innerText().catch(() => '')).slice(0, 12000),
    buttons: await page.locator('button').evaluateAll((els) => els.map((el) => el.textContent?.trim() || '').filter(Boolean)),
    selects: await page.locator('select').evaluateAll((els) => els.map((el) => ({
      value: el.value,
      options: Array.from(el.options).map((o) => o.textContent?.trim() || ''),
    }))),
  }
}

await fs.mkdir('audit-results', { recursive: true })
await fs.writeFile('audit-results/ui-page-snapshot.json', JSON.stringify(result, null, 2), 'utf8')
console.log(JSON.stringify(result, null, 2))
await browser.close()
