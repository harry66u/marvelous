import { caseCode, depthText, feet, levelCode, unclaimed } from './labels'
import { PROMPTS } from './fixtures'
import { blistStats } from './stats'

describe('B-List labels', () => {
  it('formats depth', () => {
    expect(feet(185)).toBe('1,850 ft')
    expect(depthText(185)).toBe('Depth 1,850 ft · Sublevel B1')
    expect(depthText(40)).toBe('Depth 400 ft · Ground level')
    expect(levelCode(700)).toBe('B7')
    expect(levelCode(99)).toBe('GL')
    expect(caseCode(12)).toBe('Case 0012-B')
  })

  it('lists sealed records first, then classified, skipping the one given', () => {
    expect(unclaimed(PROMPTS[0]!, null)).toEqual([
      { name: 'Lyja', tier: 'sealed' },
      { name: 'Ms. Marvel (Sharon Ventura)', tier: 'classified' },
    ])
    expect(unclaimed(PROMPTS[0]!, 'Lyja')).toEqual([{ name: 'Ms. Marvel (Sharon Ventura)', tier: 'classified' }])
    expect(unclaimed(PROMPTS[1]!, 'Echo1').map((n) => n.name)).toEqual(['Foxtrot1', 'Delta1'])
  })
})

describe('blistStats', () => {
  it('is empty before any shift is filed', () => {
    expect(blistStats([])).toMatchObject({ played: 0, average: null, best: null, deepest: null, expired: 0 })
  })

  it('averages scores and counts tiers', () => {
    const r = (tier: 'common' | 'sealed' | null, points: number) => ({ answer: tier ? 'x' : null, tier, points })
    const stats = blistStats([
      { results: [r('sealed', 100), r('sealed', 100), r(null, 0)] },
      { results: [r('common', 10), r(null, 0)] },
    ])
    expect(stats).toMatchObject({ played: 2, average: 105, best: 200, deepest: 2, expired: 2 })
    expect(stats.tiers).toEqual({ common: 1, filed: 0, restricted: 0, classified: 0, sealed: 2 })
  })
})
