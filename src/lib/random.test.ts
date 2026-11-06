import { pick, seededRandom } from './random'

describe('seededRandom', () => {
  it('is deterministic per seed', () => {
    const a = seededRandom('2026-11-06'), b = seededRandom('2026-11-06')
    const xs = Array.from({ length: 5 }, () => a())
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs)
  })
  it('differs across seeds and stays in [0, 1)', () => {
    const a = seededRandom('alpha'), b = seededRandom('beta')
    const xs = Array.from({ length: 200 }, () => a())
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(Array.from({ length: 200 }, () => b())).not.toEqual(xs)
  })
  it('picks items from a list', () => {
    const r = seededRandom('pick')
    const items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 20; i++) expect(items).toContain(pick(r, items))
  })
})
