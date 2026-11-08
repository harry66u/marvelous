import { describe, expect, it } from 'vitest'
import { buildReport, type ReportInput } from './share'

const base: ReportInput = {
  number: 12,
  date: '2026-11-07',
  unmasked: {
    attempts: 3,
    solved: true,
    rows: [
      ['no', 'close', 'no', 'no', 'no', 'no'],
      ['exact', 'close', 'exact', 'exact', 'exact', 'exact'],
      ['exact', 'exact', 'exact', 'exact', 'exact', 'exact'],
    ],
  },
  shifts: 12,
  url: 'https://marvelous.vercel.app/',
}

describe('buildReport', () => {
  it('matches the spec format', () => {
    expect(buildReport(base)).toBe(
      'MARVELOUS #012 · 07 NOV 2026\nUNMASKED 3/6\n⬛🟨⬛⬛⬛⬛\n🟧🟨🟧🟧🟧🟧\n🟧🟧🟧🟧🟧🟧\n12 consecutive shifts\nhttps://marvelous.vercel.app/',
    )
  })
  it('unsolved shows X/6', () => {
    const r = buildReport({ ...base, unmasked: { ...base.unmasked as object, solved: false, attempts: 6 } as never })
    expect(r).toContain('UNMASKED X/6')
  })
  it('pending', () => {
    expect(buildReport({ ...base, unmasked: 'pending' })).toBe(
      'MARVELOUS #012 · 07 NOV 2026\nUNMASKED PENDING\n12 consecutive shifts\nhttps://marvelous.vercel.app/',
    )
  })
  it('singular shift', () => {
    expect(buildReport({ ...base, shifts: 1 })).toContain('\n1 consecutive shift\n')
  })
  it('no shifts line at 0', () => {
    expect(buildReport({ ...base, shifts: 0 })).not.toContain('consecutive')
  })
  it('preview when number < 1', () => {
    expect(buildReport({ ...base, number: 0 }).startsWith('MARVELOUS PREVIEW · 07 NOV 2026\n')).toBe(true)
  })
})

describe('buildReport with all three games', () => {
  it('matches the spec format', () => {
    const r = buildReport({
      ...base,
      blist: { score: 370, extended: false, tiers: ['filed', 'classified', 'common', 'restricted', 'sealed', null, 'classified'] },
      retcon: { correct: 4, placements: ['correct', 'correct', 'wrong', 'correct', 'correct'] },
    })
    expect(r).toBe(
      [
        'MARVELOUS #012 · 07 NOV 2026',
        'UNMASKED 3/6',
        '⬛🟨⬛⬛⬛⬛',
        '🟧🟨🟧🟧🟧🟧',
        '🟧🟧🟧🟧🟧🟧',
        'B-LIST 370/700 · SUBLEVEL B3',
        '🟨🟥⬜🟧⬛➖🟥',
        'RETCON 4/5',
        '🟧🟧⬛🟧🟧',
        '12 consecutive shifts',
        'https://marvelous.vercel.app/',
      ].join('\n'),
    )
  })

  it('labels the extended timer and ground level, and lists pending games', () => {
    const r = buildReport({ ...base, blist: { score: 40, extended: true, tiers: [] }, retcon: 'pending' })
    expect(r).toContain('B-LIST 40/700 · GROUND LEVEL · EXTENDED TIMER')
    expect(r).toContain('RETCON PENDING')
  })

  it('shows auto-filed Retcon records as misses', () => {
    expect(buildReport({ ...base, retcon: { correct: 0, placements: ['wrong', 'wrong', 'wrong', 'auto', 'auto'] } })).toContain(
      'RETCON 0/5\n⬛⬛⬛⬛⬛',
    )
  })
})
