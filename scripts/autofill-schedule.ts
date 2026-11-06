/**
 * Fill empty days in content/schedule.json from the answer pool (same logic as the Office).
 * Usage: npx tsx scripts/autofill-schedule.ts [from=<today ET>] [days=90]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { autofillSchedule } from '../src/office/autofill'
import { validateSchedule } from '../src/content/validate'
import { addDays, etDateOf } from '../src/lib/time'
import type { Character, Schedule } from '../src/content/types'

const arg = (k: string) => process.argv.slice(2).find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1)
const from = arg('from') ?? etDateOf(new Date())
const days = Number(arg('days') ?? 90)

const load = <T>(path: string) => JSON.parse(readFileSync(new URL(`../content/${path}`, import.meta.url), 'utf8')) as T
const chars = load<Character[]>('characters.json')
const before = load<Schedule>('schedule.json')
const after = autofillSchedule(before, chars, from, addDays(from, days - 1))

const errors = validateSchedule(after, chars).filter((i) => i.level === 'error')
for (const e of errors) console.error(`ERROR ${e.path}: ${e.message}`)
if (errors.length > 0) process.exit(1)

const sorted = { ...after, days: Object.fromEntries(Object.entries(after.days).sort(([a], [b]) => a.localeCompare(b))) }
writeFileSync(new URL('../content/schedule.json', import.meta.url), JSON.stringify(sorted, null, 2) + '\n')
console.log(`filled ${Object.keys(after.days).length - Object.keys(before.days).length} day(s) from ${from}`)
