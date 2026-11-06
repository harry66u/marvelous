/**
 * Static preview: `npm run build:preview` builds dist-preview/ with relative assets and
 * pre-built day bundles in dist-preview/days/, for hosts without serverless functions.
 * Day files are written from the launch date through 7 days after today (Eastern).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import schedule from '../content/schedule.json' with { type: 'json' }
import { buildDayBundle } from '../src/server/dayBundle'
import { addDays, daysBetween, etDateOf } from '../src/lib/time'
import type { Schedule } from '../src/content/types'

const s = schedule as Schedule
const last = addDays(etDateOf(new Date()), 7)
mkdirSync('dist-preview/days', { recursive: true })
let written = 0
for (let d = s.launchDate; daysBetween(d, last) >= 0; d = addDays(d, 1)) {
  const result = buildDayBundle(s, d, new Date(`${d}T17:00:00Z`))
  if (result.ok) {
    writeFileSync(`dist-preview/days/${d}.json`, JSON.stringify(result.bundle))
    written++
  }
}
console.log(`static preview: ${written} day bundles written to dist-preview/days/`)
