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
