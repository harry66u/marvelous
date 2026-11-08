import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/unmasked', '/b-list', '/retcon', '/shift', '/agent', '/manual', '/office']

for (const route of ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] })
      // Marvelous Display lettering is a logotype (WCAG 1.4.3 exempts logotypes); it always has a text equivalent.
      .exclude('[data-text][data-tone]')
      .analyze()
    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    expect(serious).toEqual([])
  })
}
