import type { Page } from '@playwright/test'

/** A returning agent: every field manual (which opens itself on a first visit) has been read. */
export async function seedReturningAgent(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('marvelous:v1')) {
      localStorage.setItem('marvelous:v1', JSON.stringify({
        version: 1, days: {},
        settings: { sound: false, motion: 'reduce', extendedTimer: false, seenManual: { unmasked: true, blist: true, retcon: true } },
      }))
    }
  })
}
