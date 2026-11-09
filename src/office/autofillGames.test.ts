import { describe, expect, it } from 'vitest'
import type { BlistPrompt, RetconRecord, Schedule } from '../content/types'
import { validateGameSchedule } from '../content/validateGames'
import { addDays } from '../lib/time'
import { autofillBlist, autofillRetcon } from './autofillGames'

const FROM = '2026-11-09' // a Monday
const TO = addDays(FROM, 13)

const prompts: BlistPrompt[] = Array.from({ length: 150 }, (_, i) => ({
  id: `p${i}`,
  text: `Prompt ${i}`,
  category: ['team', 'enemy', 'mcu-cast', 'species', 'wordplay'][i % 5]!,
  difficulty: ([1, 1, 1, 2, 3] as const)[i % 5]!,
  answers: [],
  sources: [],
}))
const records: RetconRecord[] = Array.from({ length: 400 }, (_, i) => ({
  id: `r-${i}`,
  text: `Record ${i}`,
  date: `${1940 + ((i * 7) % 86)}-0${(i % 9) + 1}`,
  kind: i % 4 === 0 ? 'screen' : 'debut',
  difficulty: (i % 5) + 1,
  sources: ['x'],
}))
const base = (): Schedule => ({
  launchDate: FROM,
  days: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [addDays(FROM, i), { unmasked: 'x' }])),
})

describe('autofillBlist', () => {
  it('schedules only easy and medium prompts: one medium on weekdays, two at weekends', () => {
    const out = autofillBlist(base(), prompts, FROM, TO)
    const byId = new Map(prompts.map((p) => [p.id, p]))
    for (let i = 0; i < 14; i++) {
      const d = addDays(FROM, i)
      const ds = out.days[d]!.blist!.map((id) => byId.get(id)!.difficulty)
      expect(ds).toHaveLength(7)
      expect(ds.every((x) => x <= 2)).toBe(true)
      const weekend = [0, 5, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay())
      expect(ds.filter((x) => x === 2)).toHaveLength(weekend ? 2 : 1)
    }
    expect(validateGameSchedule(out, prompts, records).filter((i) => i.level === 'error')).toEqual([])
  })
})

describe('autofillRetcon', () => {
  it('uses no deep cuts, at most one harder record, and keeps records three years apart', () => {
    const out = autofillRetcon(base(), records, FROM, TO)
    const byId = new Map(records.map((r) => [r.id, r]))
    for (let i = 0; i < 14; i++) {
      const rs = out.days[addDays(FROM, i)]!.retcon!.map((id) => byId.get(id)!)
      expect(rs).toHaveLength(6)
      expect(rs.every((r) => (r.difficulty ?? 1) <= 4)).toBe(true)
      expect(rs.filter((r) => r.difficulty === 4).length).toBeLessThanOrEqual(1)
      const years = rs.map((r) => Number(r.date.slice(0, 4))).sort((a, b) => a - b)
      for (let j = 1; j < years.length; j++) expect(years[j]! - years[j - 1]!).toBeGreaterThanOrEqual(3)
    }
  })
})
