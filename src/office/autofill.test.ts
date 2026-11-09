import { autofillSchedule } from './autofill'
import { validateSchedule } from '../content/validate'
import { addDays, daysBetween, weekday } from '../lib/time'
import type { Character, Schedule } from '../content/types'

function fixture(n = 200): Character[] {
  const teams = ['avengers', 'x-men', 'fantastic-four', 'none']
  return Array.from({ length: n }, (_, i) => ({
    id: `char-${i}`, name: `Char ${i}`, aliases: [], realName: null,
    primaryTeam: teams[i % 4]!, teams: [], world: 'avengers', debutYear: 1970, debutIssue: '#1', debutDate: '1970',
    alignment: 'hero', origin: 'mutant', gender: 'other', mcu: false, mcuFirst: null,
    answerOk: i % 10 !== 9, difficulty: ((i % 4) + 1) as 1 | 2 | 3 | 4, caseNote: 'note',
    archetype: 'caped', sources: ['https://example.com'], notes: '',
  }))
}

const FROM = '2026-11-06'
const TO = addDays(FROM, 89)

describe('autofillSchedule', () => {
  const chars = fixture()
  const empty: Schedule = { launchDate: FROM, days: {} }

  it('fills 90 empty days with no cooldown violations', () => {
    const out = autofillSchedule(empty, chars, FROM, TO)
    expect(Object.keys(out.days)).toHaveLength(90)
    expect(validateSchedule(out, chars).filter((i) => i.level === 'error')).toEqual([])
  })

  it('is deterministic', () => {
    expect(autofillSchedule(empty, chars, FROM, TO)).toEqual(autofillSchedule(empty, chars, FROM, TO))
  })

  it('never overwrites a scheduled day and does not mutate its input', () => {
    const sched: Schedule = { launchDate: FROM, days: { '2026-11-10': { unmasked: 'char-0' } } }
    const out = autofillSchedule(sched, chars, FROM, TO)
    expect(out.days['2026-11-10']).toEqual({ unmasked: 'char-0' })
    expect(Object.keys(sched.days)).toHaveLength(1)
  })

  it('respects the cooldown against days already scheduled after the range', () => {
    const sched: Schedule = { launchDate: FROM, days: { [addDays(TO, 5)]: { unmasked: 'char-0' } } }
    const out = autofillSchedule(sched, chars, FROM, TO)
    for (const [d, e] of Object.entries(out.days)) {
      if (e.unmasked === 'char-0' && d !== addDays(TO, 5)) expect(Math.abs(daysBetween(d, addDays(TO, 5)))).toBeGreaterThanOrEqual(120)
    }
  })

  it('uses only answerOk characters, banded difficulty, and varies the team day to day', () => {
    const out = autofillSchedule(empty, chars, FROM, TO)
    const byId = new Map(chars.map((c) => [c.id, c]))
    let prev: string | null = null
    for (let i = 0; i < 90; i++) {
      const d = addDays(FROM, i)
      const c = byId.get(out.days[d]!.unmasked!)!
      expect(c.answerOk).toBe(true)
      const [lo, hi] = [1, 2, 3, 4].includes(weekday(d)) ? [1, 2] : [2, 3]
      expect(c.difficulty).toBeGreaterThanOrEqual(lo!)
      expect(c.difficulty).toBeLessThanOrEqual(hi!)
      if (prev) expect(c.primaryTeam).not.toBe(prev)
      prev = c.primaryTeam
    }
  })
})
