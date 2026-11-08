import { expect, test } from '@playwright/test'
import { seedReturningAgent } from './seed'

test('the end-of-shift page lists today\'s assignments and the report', async ({ page }) => {
  await seedReturningAgent(page)
  await page.goto('/shift')
  await expect(page.getByRole('heading', { name: /shift/i, level: 1 })).toBeVisible()
  await expect(page.getByRole('list', { name: "Today's assignments" }).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('textbox', { name: 'Shift report' })).toHaveValue(/UNMASKED PENDING\nB-LIST PENDING\nRETCON PENDING/)
})

test('the agent file shows stats and a 35-day history', async ({ page }) => {
  await seedReturningAgent(page)
  await page.goto('/agent')
  await expect(page.getByRole('heading', { name: 'Agent file', level: 1 })).toBeVisible()
  await expect(page.getByRole('list', { name: /Shift history/ }).getByRole('listitem')).toHaveCount(35)
})
