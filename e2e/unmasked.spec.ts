import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { decodeAnswer } from '../src/server/dayBundle'
import { etDateOf } from '../src/lib/time'

interface Char { id: string; name: string }
const characters = JSON.parse(readFileSync('content/characters.json', 'utf8')) as Char[]

async function todaysAnswer(page: Page): Promise<Char> {
  const date = etDateOf(new Date())
  const res = await page.request.get(`/api/day?date=${date}`)
  expect(res.status()).toBe(200)
  const bundle = (await res.json()) as { unmasked: { key: string } }
  const id = decodeAnswer(bundle.unmasked.key, date)
  const answer = characters.find((c) => c.id === id)
  if (!answer) throw new Error(`answer ${id} not in characters.json`)
  return answer
}

function wrongNames(answer: Char, n: number): string[] {
  const picks = ['Galactus', 'Rogue', 'Groot', 'Mojo', 'Dazzler', 'Blob', 'Thanos', 'Gamora']
  return picks.filter((name) => name !== answer.name && characters.some((c) => c.name === name)).slice(0, n)
}

async function openGame(page: Page) {
  // A returning agent: the field manual (which opens itself on a first visit) has been read.
  await page.addInitScript(() => {
    if (!localStorage.getItem('marvelous:v1')) {
      localStorage.setItem('marvelous:v1', JSON.stringify({
        version: 1, days: {}, settings: { sound: false, motion: 'system', seenManual: { unmasked: true } },
      }))
    }
  })
  await page.goto('/unmasked')
  await expect(page.getByRole('combobox', { name: 'Enter subject name' })).toBeEnabled()
}

async function file(page: Page, name: string) {
  const box = page.getByRole('combobox', { name: 'Enter subject name' })
  await box.fill(name)
  await box.press('Enter')
}

test('solving the case shows the ID card and a report with two rows', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const answer = await todaysAnswer(page)
  await openGame(page)
  await file(page, wrongNames(answer, 1)[0]!)
  await file(page, answer.name)
  await expect(page.getByText('Identity confirmed in 2 of 6 attempts.')).toBeVisible()
  await expect(page.getByText('CASE CLOSED').first()).toBeVisible()
  await page.getByRole('button', { name: 'Copy report' }).click()
  const report = await page.evaluate(() => navigator.clipboard.readText())
  expect(report).toMatch(/UNMASKED 2\/6\n[⬛🟨🟧]{6}\n🟧{6}/u)
})

test('six misses close the file anyway', async ({ page }) => {
  const answer = await todaysAnswer(page)
  await openGame(page)
  for (const name of wrongNames(answer, 6)) await file(page, name)
  await expect(page.getByText('Subject at large. The file has been closed anyway.')).toBeVisible()
  await expect(page.getByText(answer.name).first()).toBeVisible()
})

test('a game in progress survives a reload', async ({ page }) => {
  const answer = await todaysAnswer(page)
  await openGame(page)
  for (const name of wrongNames(answer, 2)) await file(page, name)
  await expect(page.getByRole('img', { name: '2 of 6 attempts used' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: '2 of 6 attempts used' })).toBeVisible()
})

test('the game is playable with the keyboard alone', async ({ page }) => {
  const answer = await todaysAnswer(page)
  await openGame(page)
  for (let i = 0; i < 25; i++) {
    const role = await page.evaluate(() => document.activeElement?.getAttribute('role'))
    if (role === 'combobox') break
    await page.keyboard.press('Tab')
  }
  expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('combobox')
  const target = wrongNames(answer, 1)[0]!
  await page.keyboard.type(target.slice(0, 5))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('img', { name: '1 of 6 attempts used' })).toBeVisible()
})

test('reduced motion leaves no running animations after a guess', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const answer = await todaysAnswer(page)
  await openGame(page)
  await file(page, wrongNames(answer, 1)[0]!)
  await page.waitForTimeout(300)
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)
  expect(running).toBe(0)
})
