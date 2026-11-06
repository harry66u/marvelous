import { describe, expect, it } from 'vitest'
import { TEAMS, teamName, teamShort } from './teams'

describe('teams', () => {
  it('has 71 teams with unique ids and short labels of at most 12 characters', () => {
    expect(TEAMS).toHaveLength(71)
    expect(new Set(TEAMS.map((t) => t.id)).size).toBe(71)
    for (const t of TEAMS) expect(t.short.length).toBeLessThanOrEqual(12)
  })
  it('resolves names and short labels', () => {
    expect(teamName('x-men')).toBe('X-Men')
    expect(teamShort('great-lakes-avengers')).toBe('GLA')
  })
  it("maps 'none' to None", () => {
    expect(teamName('none')).toBe('None')
    expect(teamShort('none')).toBe('None')
  })
})
