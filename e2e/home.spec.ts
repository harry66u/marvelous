import { expect, test } from '@playwright/test'

test('home shows the three assignments and a running countdown', async ({ page }) => {
  await page.goto('/')
  const list = page.getByRole('list', { name: "Today's assignments" })
  await expect(list.getByRole('listitem')).toHaveCount(3)
  await expect(page.getByText(/^\d{2}:\d{2}:\d{2}$/).first()).toBeVisible()
  await expect(page.getByText('Agent registration opens soon. Your shifts are kept on this device.').first()).toBeVisible()
})

test('the Unmasked branch opens the game', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Branch monitor' }).getByRole('link', { name: /unmasked/i }).first().click()
  await expect(page).toHaveURL(/\/unmasked$/)
})

test('the footer disclaimer is on the page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/Marvelous is an unofficial fan game\. Not affiliated with, endorsed by, or sponsored by Marvel or Disney\./i)).toBeVisible()
})
