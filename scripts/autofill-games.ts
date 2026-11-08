/**
 * Fill empty B-List and Retcon days in content/schedule.json (same logic as the Office).
 * Usage: npx tsx scripts/autofill-games.ts [from=<today ET>] [days=90]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { autofillBlist, autofillRetcon } from '../src/office/autofillGames'
import { validateGameSchedule } from '../src/content/validateGames'
import { addDays, etDateOf } from '../src/lib/time'
import type { BlistPrompt, RetconRecord, Schedule } from '../src/content/types'

const arg = (k: string) => process.argv.slice(2).find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1)
const from = arg('from') ?? etDateOf(new Date())
const to = addDays(from, Number(arg('days') ?? 90) - 1)

const load = <T>(path: string) => JSON.parse(readFileSync(new URL(`../content/${path}`, import.meta.url), 'utf8')) as T
const prompts = load<BlistPrompt[]>('blist.json')
const records = load<RetconRecord[]>('retcon.json')
const before = load<Schedule>('schedule.json')
const after = autofillRetcon(autofillBlist(before, prompts, from, to), records, from, to)

const errors = validateGameSchedule(after, prompts, records).filter((i) => i.level === 'error')
for (const e of errors) console.error(`ERROR ${e.path}: ${e.message}`)
if (errors.length > 0) process.exit(1)

const count = (s: Schedule, f: 'blist' | 'retcon') => Object.values(s.days).filter((d) => d[f]).length
const sorted = { ...after, days: Object.fromEntries(Object.entries(after.days).sort(([a], [b]) => a.localeCompare(b))) }
writeFileSync(new URL('../content/schedule.json', import.meta.url), JSON.stringify(sorted, null, 2) + '\n')
console.log(`B-List: ${count(after, 'blist') - count(before, 'blist')} day(s) filled; Retcon: ${count(after, 'retcon') - count(before, 'retcon')} day(s) filled, from ${from}`)
