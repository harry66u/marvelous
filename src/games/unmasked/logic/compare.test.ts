import { describe, expect, it } from 'vitest'
import { ch, galactus, rogue, storm } from './fixtures'
import { ATTRIBUTE_ORDER, compareCharacters, decadeOf, feedbackMarks } from './compare'

describe('compareCharacters', () => {
  it('Storm answer vs Rogue guess', () => {
    expect(compareCharacters(rogue, storm)).toEqual({
      name: 'no', affiliation: 'exact', debut: 'close', debutDir: 'earlier',
      alignment: 'exact', origin: 'exact', gender: 'exact', mcu: 'exact',
    })
  })
  it('Galactus guess vs Storm answer', () => {
    const f = compareCharacters(galactus, storm)
    expect(f.affiliation).toBe('no')
    expect(f.debut).toBe('close')
    expect(f.debutDir).toBe('later')
  })
  it('same decade gives exact with no direction; far apart gives no', () => {
    const a = compareCharacters(ch('a', 'A', { debutYear: 1971 }), ch('b', 'B', { debutYear: 1979 }))
    expect([a.debut, a.debutDir]).toEqual(['exact', null])
    expect(compareCharacters(ch('a', 'A', { debutYear: 1940 }), ch('b', 'B', { debutYear: 2000 })).debut).toBe('no')
  })
  it('the world clue is exact for the same world, whatever the teams', () => {
    const a = ch('a', 'A', { world: 'spider-man', primaryTeam: 'avengers', teams: ['avengers'] })
    const b = ch('b', 'B', { world: 'spider-man', primaryTeam: 'sinister-six', teams: ['sinister-six'] })
    expect(compareCharacters(a, b).affiliation).toBe('exact')
  })
  it('different worlds that share a team are close', () => {
    const a = ch('a', 'A', { world: 'x-men', primaryTeam: 'x-men', teams: ['x-men', 'avengers'] })
    const b = ch('b', 'B', { world: 'avengers', primaryTeam: 'avengers', teams: ['avengers'] })
    expect(compareCharacters(a, b).affiliation).toBe('close')
  })
  it('different worlds with no shared team are no match; none never counts as a shared team', () => {
    const a = ch('a', 'A', { world: 'cosmic', primaryTeam: 'none', teams: ['none'] })
    const b = ch('b', 'B', { world: 'mystic', primaryTeam: 'none', teams: ['none'] })
    expect(compareCharacters(a, b).affiliation).toBe('no')
  })
  it('name is exact only for the same id', () => {
    expect(compareCharacters(storm, storm).name).toBe('exact')
  })
  it('feedbackMarks follows ATTRIBUTE_ORDER', () => {
    const f = compareCharacters(rogue, storm)
    expect(feedbackMarks(f)).toEqual(ATTRIBUTE_ORDER.map((k) => f[k]))
    expect(decadeOf(1981)).toBe(1980)
  })
})
