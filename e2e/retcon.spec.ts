import { expect, test, type Page } from '@playwright/test'
import { decodePayload, type RetconDay } from '../src/server/dayBundle'
import { etDateOf } from '../src/lib/time'
import { seedReturningAgent } from './seed'

async function todaysRecords(page: Page): Promise<RetconDay> {
  const date = etDateOf(new Date())
  const res = await page.request.get(`/api/day?date=${date}`)
  expect(res.status()).toBe(200)
  const bundle = (await res.json()) as { retcon?: { key: string } }
  test.skip(!bundle.retcon, 'No Retcon case is scheduled today')
  return decodePayload<RetconDay>(bundle.retcon!.key, date)
}

/** Where record `i` belongs among the records already on the line. */
function slotFor(records: RetconDay, i: number): number {
  const line = records.slice(0, i).map((r) => r.date).sort()
  const idx = line.findIndex((d) => records[i]!.date < d)
  return idx === -1 ? line.length : idx
}

const slots = (page: Page) => page.getByRole('group', { name: 'Timeline slots' }).getByRole('button')

test('placing every record correctly closes the case at 5/5', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const records = await todaysRecords(page)
  await seedReturningAgent(page)
  await page.goto('/retcon')
  for (let i = 1; i < records.length; i++) {
    await expect(slots(page)).toHaveCount(i + 1)
    await slots(page).nth(slotFor(records, i)).click()
  }
  await expect(page.getByRole('heading', { name: '5/5 records in order' })).toBeVisible()
  await page.getByRole('button', { name: 'Copy report' }).first().click()
  const report = await page.evaluate(() => navigator.clipboard.readText())
  expect(report).toContain('RETCON 5/5\n🟧🟧🟧🟧🟧')
})

test('three wrong placements file the rest automatically', async ({ page }) => {
  const records = await todaysRecords(page)
  await seedReturningAgent(page)
  await page.goto('/retcon')
  for (let i = 1; i <= 3; i++) {
    await expect(slots(page)).toHaveCount(i + 1)
    const right = slotFor(records, i)
    await slots(page).nth(right === 0 ? i : 0).click()
  }
  await expect(page.getByRole('heading', { name: 'Variance limit reached' })).toBeVisible()
})

test('Retcon is playable with the keyboard alone', async ({ page }) => {
  const records = await todaysRecords(page)
  await seedReturningAgent(page)
  await page.goto('/retcon')
  await expect(slots(page)).toHaveCount(2)
  await slots(page).first().focus()
  if (slotFor(records, 1) === 1) await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(slots(page)).toHaveCount(3)
})
