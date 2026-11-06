import { describe, expect, it } from 'vitest'
import { filler, galactus, miles, modok, peter, rogue, storm, strange } from './fixtures'
import { buildSearchIndex, searchCharacters } from './search'

const index = buildSearchIndex([storm, rogue, galactus, peter, miles, modok, strange, ...filler])
const ids = (q: string) => searchCharacters(index, q).map((e) => e.id)

describe('searchCharacters', () => {
  it('"spiderman" finds both Spider-Man entries first', () => {
    expect(ids('spiderman').slice(0, 2).sort()).toEqual(['spider-man-miles', 'spider-man-peter'])
  })
  it('"spider man" and "Spider-Man" work too', () => {
    expect(ids('spider man').slice(0, 2).sort()).toEqual(['spider-man-miles', 'spider-man-peter'])
    expect(ids('Spider-Man')).toHaveLength(2)
  })
  it('"modok" finds M.O.D.O.K.', () => expect(ids('modok')[0]).toBe('modok'))
  it('"ororo" finds Storm via real name', () => expect(ids('Ororo')).toEqual(['storm']))
  it('"dr strange" finds Doctor Strange via alias', () => expect(ids('dr strange')[0]).toBe('doctor-strange'))
  it('ranks exact before prefix before word-start before real name', () => {
    const idx = buildSearchIndex([
      { ...storm, id: 'a', name: 'Big Storm' },
      { ...storm, id: 'b', name: 'Stormy' },
      { ...storm, id: 'c', name: 'Storm' },
      { ...rogue, id: 'd', name: 'Zed', realName: 'Storm Man' },
      { ...rogue, id: 'e', name: 'Hailstorms' },
    ])
    expect(searchCharacters(idx, 'storm').map((e) => e.id)).toEqual(['c', 'b', 'a', 'd', 'e'])
  })
  it('limits results', () => {
    expect(ids('x').length).toBeLessThanOrEqual(8)
    expect(ids('x').length).toBe(8)
  })
  it('empty query returns nothing', () => {
    expect(ids('')).toEqual([])
    expect(ids('  ')).toEqual([])
  })
})
