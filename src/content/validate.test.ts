import { describe, expect, it } from 'vitest'
import { toPublic, UNMASKED_COOLDOWN_DAYS, validateCharacters, validateSchedule } from './validate'
import type { Character, Schedule, Team } from './types'

const teams: Team[] = [
  { id: 'avengers', name: 'Avengers', short: 'Avengers' },
  { id: 'x-men', name: 'X-Men', short: 'X-Men' },
]

function char(over: Partial<Character> = {}): Character {
  return {
    id: 'storm', name: 'Storm', aliases: [], realName: 'Ororo Munroe',
    primaryTeam: 'x-men', teams: ['x-men'], world: 'x-men', debutYear: 1975, debutIssue: 'Giant-Size X-Men #1',
    debutDate: '1975-05', alignment: 'hero', origin: 'mutant', gender: 'female',
    mcu: false, mcuFirst: null, answerOk: true, difficulty: 2, caseNote: 'Weather.',
    archetype: 'caped', sources: ['https://en.wikipedia.org/wiki/Storm_(Marvel_Comics)'], notes: '',
    ...over,
  }
}

function issues(over: Partial<Character>, others: Character[] = []) {
  return validateCharacters([...others, char(over)], teams)
}
const idx = (others: Character[] = []) => others.length

function expectIssue(list: ReturnType<typeof issues>, path: string, level: 'error' | 'warning' = 'error') {
  expect(list.some((i) => i.path === path && i.level === level), JSON.stringify(list)).toBe(true)
}

describe('validateCharacters', () => {
  it('accepts a valid character', () => {
    expect(validateCharacters([char()], teams)).toEqual([])
  })
  it('flags duplicate ids', () => {
    expectIssue(validateCharacters([char(), char({ name: 'Other' })], teams), 'characters[1].id')
  })
  it('flags non-kebab ids', () => {
    expectIssue(issues({ id: 'Storm_1' }), 'characters[0].id')
  })
  it('flags empty names', () => {
    expectIssue(issues({ name: '  ' }), 'characters[0].name')
  })
  it('flags duplicate names case-insensitively', () => {
    expectIssue(validateCharacters([char(), char({ id: 'storm-2', name: 'STORM' })], teams), 'characters[1].name')
  })
  it('flags more than 8 aliases', () => {
    expectIssue(issues({ aliases: Array.from({ length: 9 }, (_, i) => `a${i}`) }), 'characters[0].aliases')
  })
  it('warns when an alias equals another character name', () => {
    const list = validateCharacters([char(), char({ id: 'x', name: 'X', aliases: ['storm'] })], teams)
    expectIssue(list, 'characters[1].aliases[0]', 'warning')
  })
  it('flags unknown primaryTeam', () => {
    expectIssue(issues({ primaryTeam: 'nope', teams: ['nope'] }), 'characters[0].primaryTeam')
  })
  it("allows primaryTeam 'none' without being in teams", () => {
    expect(issues({ primaryTeam: 'none', teams: [] })).toEqual([])
  })
  it('flags unknown teams entries', () => {
    expectIssue(issues({ teams: ['x-men', 'nope'] }), 'characters[0].teams[1]')
  })
  it('flags more than 5 teams', () => {
    const many = ['avengers', 'x-men']
    const ts: Team[] = [...teams, ...['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, short: id }))]
    const list = validateCharacters([char({ teams: [...many, 'a', 'b', 'c', 'd'] })], ts)
    expectIssue(list, 'characters[0].teams')
  })
  it('flags teams missing primaryTeam', () => {
    expectIssue(issues({ teams: ['avengers'] }), 'characters[0].teams')
  })
  it('flags debutYear out of range', () => {
    expectIssue(issues({ debutYear: 1929, debutDate: '1929' }), 'characters[0].debutYear')
    expectIssue(issues({ debutYear: 2027, debutDate: '2027' }), 'characters[0].debutYear')
  })
  it('flags malformed debutDate', () => {
    expectIssue(issues({ debutDate: '1975-5' }), 'characters[0].debutDate')
  })
  it('flags debutDate not starting with debutYear', () => {
    expectIssue(issues({ debutDate: '1976-05' }), 'characters[0].debutDate')
  })
  it('accepts a year-only debutDate', () => {
    expect(issues({ debutDate: '1975' })).toEqual([])
  })
  it('flags invalid enums', () => {
    expectIssue(issues({ alignment: 'neutral' as never }), 'characters[0].alignment')
    expectIssue(issues({ origin: 'ghost' as never }), 'characters[0].origin')
    expectIssue(issues({ gender: 'x' as never }), 'characters[0].gender')
  })
  it('flags mcu without mcuFirst, and mcuFirst without mcu', () => {
    expectIssue(issues({ mcu: true, mcuFirst: null }), 'characters[0].mcuFirst')
    expectIssue(issues({ mcu: true, mcuFirst: '' }), 'characters[0].mcuFirst')
    expectIssue(issues({ mcu: false, mcuFirst: 'Iron Man (2008)' }), 'characters[0].mcuFirst')
    expect(issues({ mcu: true, mcuFirst: 'Iron Man (2008)' })).toEqual([])
  })
  it('flags difficulty out of range', () => {
    expectIssue(issues({ difficulty: 6 as never }), 'characters[0].difficulty')
    expectIssue(issues({ difficulty: 0 as never }), 'characters[0].difficulty')
  })
  it('flags answerOk with difficulty 5', () => {
    expectIssue(issues({ difficulty: 5 }), 'characters[0].answerOk')
  })
  it('flags answerOk with empty caseNote', () => {
    expectIssue(issues({ caseNote: '' }), 'characters[0].caseNote')
  })
  it('allows empty caseNote when not answerOk', () => {
    expect(issues({ answerOk: false, caseNote: '' })).toEqual([])
  })
  it('flags caseNote over 300 characters', () => {
    expectIssue(issues({ caseNote: 'x'.repeat(301) }), 'characters[0].caseNote')
  })
  it('flags missing sources', () => {
    expectIssue(issues({ sources: [] }), 'characters[0].sources')
  })
  it('flags non-https sources', () => {
    expectIssue(issues({ sources: ['http://example.com'] }), 'characters[0].sources[0]')
  })
  it('flags invalid archetype', () => {
    expectIssue(issues({ archetype: 'tall' as never }), 'characters[0].archetype')
  })
  it('uses the right index', () => {
    const other = char({ id: 'a', name: 'A' })
    expectIssue(issues({ archetype: 'tall' as never }, [other]), `characters[${idx([other])}].archetype`)
  })
})

describe('validateSchedule', () => {
  const chars = [
    char(),
    char({ id: 'rogue', name: 'Rogue' }),
    char({ id: 'doom', name: 'Doom', answerOk: false }),
  ]
  const sched = (days: Schedule['days'], launchDate = '2026-11-06'): Schedule => ({ launchDate, days })

  it('accepts an empty schedule with only a coverage warning', () => {
    expect(validateSchedule(sched({}), chars).filter((i) => i.level === 'error')).toEqual([])
  })
  it('flags a non-ISO launchDate', () => {
    expectIssue(validateSchedule(sched({}, '2026-13-01'), chars), 'launchDate')
  })
  it('flags non-ISO keys', () => {
    expectIssue(validateSchedule(sched({ 'nov 6': { unmasked: 'storm' } }), chars), 'days.nov 6')
  })
  it('flags unknown unmasked ids', () => {
    expectIssue(validateSchedule(sched({ '2026-11-06': { unmasked: 'nobody' } }), chars), 'days.2026-11-06.unmasked')
  })
  it('flags unmasked characters that are not answerOk', () => {
    expectIssue(validateSchedule(sched({ '2026-11-06': { unmasked: 'doom' } }), chars), 'days.2026-11-06.unmasked')
  })
  it('flags repeat within 120 days', () => {
    const list = validateSchedule(
      sched({ '2026-11-06': { unmasked: 'storm' }, '2027-02-01': { unmasked: 'storm' } }), chars)
    expectIssue(list, 'days.2027-02-01.unmasked')
  })
  it('allows repeat after 120 days', () => {
    expect(UNMASKED_COOLDOWN_DAYS).toBe(120)
    const list = validateSchedule(
      sched({ '2026-11-06': { unmasked: 'storm' }, '2027-03-06': { unmasked: 'storm' } }), chars)
    expect(list.filter((i) => i.level === 'error')).toEqual([])
  })
  it('warns when fewer than 60 consecutive days start at launchDate', () => {
    const list = validateSchedule(sched({ '2026-11-06': { unmasked: 'storm' } }), chars)
    expectIssue(list, 'days', 'warning')
  })
  it('does not warn with 60 consecutive days', () => {
    const days: Schedule['days'] = {}
    const base = Date.UTC(2026, 10, 6)
    for (let i = 0; i < 60; i++) {
      days[new Date(base + i * 86400000).toISOString().slice(0, 10)] = { unmasked: i % 2 ? 'storm' : 'rogue' }
    }
    const list = validateSchedule(sched(days), chars)
    expect(list.some((i) => i.path === 'days' && i.level === 'warning')).toBe(false)
  })
})

describe('toPublic', () => {
  it('drops private fields', () => {
    const p = toPublic(char({ otherTeams: ['Foo'] }))
    for (const k of ['sources', 'notes', 'answerOk', 'difficulty', 'otherTeams']) expect(p).not.toHaveProperty(k)
    expect(p.name).toBe('Storm')
  })
})

describe('debutIssue', () => {
  it('is required', () => {
    expectIssue(issues({ debutIssue: '  ' }), 'characters[0].debutIssue')
  })
})
