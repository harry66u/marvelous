import { describe, expect, it } from 'vitest'
import type { Schedule } from '../content/types'
import { buildDayBundle, decodeAnswer, encodeAnswer, decodePayload, encodePayload } from './dayBundle'

const schedule: Schedule = {
  launchDate: '2026-11-06',
  days: { '2026-11-06': { unmasked: 'storm' }, '2026-11-07': { unmasked: 'cable' } },
}
const now = new Date('2026-11-07T04:00:00Z') // still Nov 6 in New York

describe('buildDayBundle', () => {
  it('400 for a malformed date', () => {
    expect(buildDayBundle(schedule, '2026-13-01', now)).toEqual({
      ok: false, status: 400, error: 'Malformed date. Use YYYY-MM-DD.',
    })
  })
  it('403 for tomorrow ET', () => {
    expect(buildDayBundle(schedule, '2026-11-07', now)).toEqual({
      ok: false, status: 403,
      error: 'That date has not happened yet. The Archive does not issue assignments in advance.',
    })
  })
  it('404 for an unscheduled past date', () => {
    expect(buildDayBundle(schedule, '2026-11-05', now)).toEqual({
      ok: false, status: 404, error: 'No assignments have been issued for this date.',
    })
    const later = new Date('2026-11-09T17:00:00Z')
    expect(buildDayBundle(schedule, '2026-11-08', later).ok).toBe(false)
  })
  it('200 for the launch date', () => {
    const r = buildDayBundle(schedule, '2026-11-06', now)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.bundle).toMatchObject({ date: '2026-11-06', number: 1, launchDate: '2026-11-06', games: ['unmasked'] })
    expect(decodeAnswer(r.bundle.unmasked!.key, '2026-11-06')).toBe('storm')
  })
  it('null date means today ET', () => {
    const r = buildDayBundle(schedule, null, now)
    expect(r.ok && r.bundle.date).toBe('2026-11-06')
  })
})

describe('answer encoding', () => {
  it('round-trips, including non-ASCII', () => {
    expect(decodeAnswer(encodeAnswer('storm', '2026-11-06'), '2026-11-06')).toBe('storm')
    expect(decodeAnswer(encodeAnswer('hellström', '2026-11-06'), '2026-11-06')).toBe('hellström')
  })
  it('differs between dates', () => {
    expect(encodeAnswer('storm', '2026-11-06')).not.toBe(encodeAnswer('storm', '2026-11-07'))
  })
  it('is base64url', () => {
    expect(encodeAnswer('storm', '2026-11-06')).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('B-List and Retcon payloads', () => {
  const prompts = new Map([
    ['ff', { id: 'ff', text: 'Name a member of the Fantastic Four', category: 'team', difficulty: 1 as const, sources: [],
      answers: [{ name: 'Mister Fantastic', aliases: ['Reed Richards'], tier: 'common' as const, share: 0.4 }] }],
  ])
  const records = new Map([
    ['spidey', { id: 'spidey', text: 'Spider-Man debuts', date: '1962-08', kind: 'debut' as const, sources: [] }],
  ])
  const sched = {
    launchDate: '2026-11-06',
    days: { '2026-11-07': { unmasked: 'wolverine', blist: ['ff'], retcon: ['spidey'] }, '2026-11-08': { unmasked: 'x', blist: ['missing'] } },
  }
  const now = new Date('2026-11-08T15:00:00Z')

  it('ships each scheduled game and decodes back to the prompts and records', () => {
    const r = buildDayBundle(sched, '2026-11-07', now, { prompts, records })
    if (!r.ok) throw new Error('expected a bundle')
    expect(r.bundle.games).toEqual(['unmasked', 'blist', 'retcon'])
    expect(JSON.stringify(r.bundle)).not.toContain('Fantastic')
    expect(decodePayload(r.bundle.blist!.key, '2026-11-07')).toEqual([
      { id: 'ff', text: 'Name a member of the Fantastic Four', answers: [['Mister Fantastic', ['Reed Richards'], 'common']] },
    ])
    expect(decodePayload(r.bundle.retcon!.key, '2026-11-07')).toEqual([
      { id: 'spidey', text: 'Spider-Man debuts', date: '1962-08', kind: 'debut' },
    ])
  })

  it('leaves a game out when its content is missing', () => {
    const r = buildDayBundle(sched, '2026-11-08', now, { prompts, records })
    if (!r.ok) throw new Error('expected a bundle')
    expect(r.bundle.games).toEqual(['unmasked'])
  })

  it('round-trips a large payload with non-ASCII text', () => {
    const big = Array.from({ length: 5000 }, (_, i) => `Ñamor ${i} — Wakanda`)
    expect(decodePayload(encodePayload(big, '2026-11-07'), '2026-11-07')).toEqual(big)
  })
})
