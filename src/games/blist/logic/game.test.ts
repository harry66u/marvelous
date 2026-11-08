import { describe, expect, it } from 'vitest'
import {
  EXTENDED_LIMIT_MS, LIMIT_MS, PENALTY_MS, blendedShare, blistShare, depthFeet, expire, fileAnswer, fileMiss,
  newBlist, remainingMs, startPrompt, sublevel, sublevelLabel, tierForShare, totalScore,
} from './game'

const T0 = 1_000_000

describe('B-List clock', () => {
  it('has full time before the clock starts and counts down after', () => {
    const s = newBlist('2026-11-08', false)
    expect(remainingMs(s, T0)).toBe(LIMIT_MS)
    const started = startPrompt(s, T0)
    expect(remainingMs(started, T0 + 4_000)).toBe(LIMIT_MS - 4_000)
    expect(startPrompt(started, T0 + 9_000)).toBe(started)
  })

  it('gives 50 seconds with the extended timer', () => {
    expect(remainingMs(startPrompt(newBlist('d', true), T0), T0)).toBe(EXTENDED_LIMIT_MS)
  })

  it('charges 3 seconds per distinct wrong answer, never below zero', () => {
    let s = startPrompt(newBlist('d', false), T0)
    s = fileMiss(s, T0 + 1_000, 'ironman')
    expect(remainingMs(s, T0 + 1_000)).toBe(LIMIT_MS - 1_000 - PENALTY_MS)
    const again = fileMiss(s, T0 + 2_000, 'ironman')
    expect(again).toBe(s)
    s = fileMiss(s, T0 + 23_000, 'thor')
    expect(s.current).toBe(1)
    expect(s.results[0]).toEqual({ answer: null, tier: null, points: 0 })
  })

  it('files a timeout when the clock runs out', () => {
    const s = startPrompt(newBlist('d', false), T0)
    expect(expire(s, T0 + LIMIT_MS - 1)).toBe(s)
    const out = expire(s, T0 + LIMIT_MS)
    expect(out.results).toEqual([{ answer: null, tier: null, points: 0 }])
    expect(out.startedAt).toBeNull()
  })

  it('refuses an answer that arrives after the deadline', () => {
    const s = startPrompt(newBlist('d', false), T0)
    const late = fileAnswer(s, T0 + LIMIT_MS + 50, 'Cyclops', 'sealed')
    expect(late.results[0]!.points).toBe(0)
  })

  it('ignores answers before the clock starts', () => {
    const s = newBlist('d', false)
    expect(fileAnswer(s, T0, 'Cyclops', 'common')).toBe(s)
    expect(fileMiss(s, T0, 'x')).toBe(s)
  })
})

describe('B-List scoring', () => {
  const play = () => {
    let s = newBlist('d', false)
    const tiers = ['common', 'filed', 'restricted', 'classified', 'sealed', null, 'filed'] as const
    tiers.forEach((tier, i) => {
      s = startPrompt(s, T0 + i * 100_000)
      s = tier ? fileAnswer(s, T0 + i * 100_000 + 5_000, `A${i}`, tier) : expire(s, T0 + i * 100_000 + LIMIT_MS)
    })
    return s
  }

  it('scores tiers 10/30/60/85/100 and ends after seven prompts', () => {
    const s = play()
    expect(s.status).toBe('done')
    expect(totalScore(s)).toBe(10 + 30 + 60 + 85 + 100 + 0 + 30)
    expect(blistShare(s)).toEqual({
      score: 315,
      extended: false,
      tiers: ['common', 'filed', 'restricted', 'classified', 'sealed', null, 'filed'],
    })
  })

  it('measures depth: 10 ft per point, a sublevel per 100', () => {
    expect(depthFeet(315)).toBe(3150)
    expect(sublevel(99)).toBe(0)
    expect(sublevel(370)).toBe(3)
    expect(sublevel(700)).toBe(7)
    expect(sublevelLabel(40)).toBe('Ground level')
    expect(sublevelLabel(370)).toBe('Sublevel B3')
  })
})

describe('live rarity blend', () => {
  it('starts at the preset and moves toward the real pick rate', () => {
    expect(blendedShare(0, 0, 0.05)).toBeCloseTo(0.05)
    expect(blendedShare(1000, 2000, 0.05)).toBeCloseTo((1000 + 10) / 2200)
  })

  it('maps shares to tiers by the spec thresholds', () => {
    expect(tierForShare(0.1)).toBe('common')
    expect(tierForShare(0.05)).toBe('filed')
    expect(tierForShare(0.01)).toBe('restricted')
    expect(tierForShare(0.002)).toBe('classified')
    expect(tierForShare(0.0019)).toBe('sealed')
  })
})
