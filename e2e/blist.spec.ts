import { expect, test, type Page } from '@playwright/test'
import { decodePayload, type BlistDay } from '../src/server/dayBundle'
import { etDateOf } from '../src/lib/time'
import { seedReturningAgent } from './seed'

async function todaysPrompts(page: Page): Promise<BlistDay> {
  const date = etDateOf(new Date())
  const res = await page.request.get(`/api/day?date=${date}`)
  expect(res.status()).toBe(200)
  const bundle = (await res.json()) as { blist?: { key: string } }
  test.skip(!bundle.blist, 'No B-List shift is scheduled today')
  return decodePayload<BlistDay>(bundle.blist!.key, date)
}

async function answer(page: Page, text: string) {
  const box = page.getByLabel('Your answer')
  await expect(box).toBeEditable({ timeout: 10_000 })
  await box.fill(text)
  await box.press('Enter')
}

test('a full B-List shift: seven answers, a miss, a score and a report', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const prompts = await todaysPrompts(page)
  await seedReturningAgent(page)
  await page.goto('/b-list')

  // A name that answers none of today's requests costs three seconds and keeps the request open.
  await answer(page, 'Zzyzx Nobody')
  await expect(page.getByText('No record on file. −3 s')).toBeVisible()

  for (let i = 0; i < prompts.length; i++) {
    await expect(page.getByText(prompts[i]!.text).first()).toBeVisible({ timeout: 10_000 })
    await answer(page, prompts[i]!.answers[0]![0])
    const next = page.getByRole('button', { name: i === prompts.length - 1 ? 'Close the file' : 'Next request' })
    await next.click()
  }

  await expect(page.getByRole('heading', { name: /Search closed/ })).toBeVisible()
  await expect(page.getByText(/\d+ \/ 700/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Copy report' }).first().click()
  const report = await page.evaluate(() => navigator.clipboard.readText())
  expect(report).toMatch(/B-LIST \d+\/700 · (SUBLEVEL B\d|GROUND LEVEL)\n[⬜🟨🟧🟥⬛➖]{7}/u)
})

test('a B-List shift in progress survives a reload', async ({ page }) => {
  const prompts = await todaysPrompts(page)
  await seedReturningAgent(page)
  await page.goto('/b-list')
  await answer(page, prompts[0]!.answers[0]![0])
  await expect(page.getByRole('button', { name: 'Next request' })).toBeVisible()
  await page.reload()
  await expect(page.getByText(prompts[1]!.text).first()).toBeVisible({ timeout: 10_000 })
})
