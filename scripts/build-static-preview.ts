/**
 * Static preview data: `npm run build:preview` runs this before `vite build --mode static`.
 * It writes src/generated/preview-data.json with the public characters and the day bundles from the
 * launch date through 7 days after today (Eastern). The preview bundles this file instead of
 * fetching, because some static hosts serve the page's scripts but refuse its data requests.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import schedule from '../content/schedule.json' with { type: 'json' }
import blist from '../content/blist.json' with { type: 'json' }
import retcon from '../content/retcon.json' with { type: 'json' }
import { buildDayBundle, type DayBundle, type GameContent } from '../src/server/dayBundle'
import { addDays, daysBetween, etDateOf } from '../src/lib/time'
import type { BlistPrompt, RetconRecord, Schedule } from '../src/content/types'

const s = schedule as Schedule
const content: GameContent = {
  prompts: new Map((blist as BlistPrompt[]).map((p) => [p.id, p])),
  records: new Map((retcon as RetconRecord[]).map((r) => [r.id, r])),
}
const last = addDays(etDateOf(new Date()), 7)
const days: Record<string, DayBundle> = {}
for (let d = s.launchDate; daysBetween(d, last) >= 0; d = addDays(d, 1)) {
  const result = buildDayBundle(s, d, new Date(`${d}T17:00:00Z`), content)
  if (result.ok) days[d] = result.bundle
}
const characters = JSON.parse(readFileSync('public/data/characters.json', 'utf8'))
mkdirSync('src/generated', { recursive: true })
writeFileSync('src/generated/preview-data.json', JSON.stringify({ days, characters }))
console.log(`static preview: ${Object.keys(days).length} day bundles and ${characters.length} characters baked in`)
