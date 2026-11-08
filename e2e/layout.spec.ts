import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/unmasked', '/b-list', '/retcon', '/shift', '/agent', '/manual', '/office', '/no-such-form']

for (const route of ROUTES) {
  test(`no horizontal overflow at 320px on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })
}
