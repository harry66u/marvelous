import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const b64 = (path: string) => Buffer.from(readFileSync(path)).toString('base64')

test('the Scheduling Office loads read-only without a token', async ({ page }) => {
  await page.route('https://api.github.com/**', async (route) => {
    const url = route.request().url()
    if (/\/repos\/harry66u\/marvelous$/.test(url)) return route.fulfill({ json: { default_branch: 'main' } })
    if (url.includes('content/schedule.json')) return route.fulfill({ json: { sha: 'a1', content: b64('content/schedule.json'), encoding: 'base64' } })
    if (url.includes('content/characters.json')) return route.fulfill({ json: { sha: 'b2', content: b64('content/characters.json'), encoding: 'base64' } })
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/office')
  await expect(page.getByRole('heading', { name: 'Scheduling Office' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
})
