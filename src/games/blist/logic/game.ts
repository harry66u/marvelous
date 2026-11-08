import type { Tier } from '../../../content/types'

/**
 * B-List rules (spec §8): seven prompts, 25 seconds each (50 with the extended timer), one answer per
 * prompt, a wrong answer costs 3 seconds, rarer answers score more. Time is computed from stored
 * timestamps, so reloading the page never resets the clock.
 */

export const PROMPTS_PER_DAY = 7
export const LIMIT_MS = 25_000
export const EXTENDED_LIMIT_MS = 50_000
export const PENALTY_MS = 3_000
export const MAX_SCORE = 700
export const FEET_PER_POINT = 10

export const TIER_POINTS: Record<Tier, number> = {
  common: 10,
  filed: 30,
  restricted: 60,
  classified: 85,
  sealed: 100,
}

export const TIER_LABEL: Record<Tier, string> = {
  common: 'Common Record',
  filed: 'Filed',
  restricted: 'Restricted',
  classified: 'Classified',
  sealed: 'Sealed Archive',
}

/** One prompt's outcome. `answer` is the display name on file; null for a timeout. */
export interface BlistResult {
  answer: string | null
  tier: Tier | null
  points: number
}

export interface BlistState {
  date: string
  extended: boolean
  /** index of the prompt in play, or PROMPTS_PER_DAY when done */
  current: number
  /** epoch ms when the current prompt's clock started; null between prompts */
  startedAt: number | null
  /** penalty seconds accrued on the current prompt, in ms */
  penaltyMs: number
  /** wrong answers on the current prompt, so a retype of the same miss is not charged twice */
  misses: string[]
  results: BlistResult[]
  status: 'playing' | 'done'
}

export function newBlist(date: string, extended: boolean): BlistState {
  return { date, extended, current: 0, startedAt: null, penaltyMs: 0, misses: [], results: [], status: 'playing' }
}

export const limitMs = (s: Pick<BlistState, 'extended'>) => (s.extended ? EXTENDED_LIMIT_MS : LIMIT_MS)

/** Time left on the current prompt, never below zero. Full time before the clock starts. */
export function remainingMs(s: BlistState, now: number): number {
  if (s.status === 'done') return 0
  if (s.startedAt === null) return limitMs(s)
  return Math.max(0, limitMs(s) - (now - s.startedAt) - s.penaltyMs)
}

/** Start the clock on the current prompt (after the "Incoming request" beat). Idempotent. */
export function startPrompt(s: BlistState, now: number): BlistState {
  if (s.status === 'done' || s.startedAt !== null) return s
  return { ...s, startedAt: now, penaltyMs: 0, misses: [] }
}

function advance(s: BlistState, result: BlistResult): BlistState {
  const results = [...s.results, result]
  const current = s.current + 1
  return {
    ...s,
    results,
    current,
    startedAt: null,
    penaltyMs: 0,
    misses: [],
    status: current >= PROMPTS_PER_DAY ? 'done' : 'playing',
  }
}

/** If the current prompt's time has run out, file it as a timeout. */
export function expire(s: BlistState, now: number): BlistState {
  if (s.status === 'done' || s.startedAt === null || remainingMs(s, now) > 0) return s
  return advance(s, { answer: null, tier: null, points: 0 })
}

/** A valid answer ends the prompt. */
export function fileAnswer(s: BlistState, now: number, answer: string, tier: Tier): BlistState {
  const live = expire(s, now)
  if (live !== s || s.status === 'done' || s.startedAt === null) return live
  return advance(s, { answer, tier, points: TIER_POINTS[tier] })
}

/** A wrong answer costs PENALTY_MS once per distinct wrong input. */
export function fileMiss(s: BlistState, now: number, key: string): BlistState {
  const live = expire(s, now)
  if (live !== s || s.status === 'done' || s.startedAt === null) return live
  if (s.misses.includes(key)) return s
  const next = { ...s, penaltyMs: s.penaltyMs + PENALTY_MS, misses: [...s.misses, key] }
  return expire(next, now)
}

export const totalScore = (s: Pick<BlistState, 'results'>) => s.results.reduce((n, r) => n + r.points, 0)

/** Sublevel reached: B0 (ground) below 100 points, then one level per 100, B7 at a perfect 700. */
export const sublevel = (score: number) => Math.min(7, Math.floor(score / 100))
export const depthFeet = (score: number) => score * FEET_PER_POINT
export const sublevelLabel = (score: number) => (sublevel(score) === 0 ? 'Ground level' : `Sublevel B${sublevel(score)}`)

/** What the share report and stats need from a filed B-List game. */
export interface BlistShare {
  score: number
  extended: boolean
  tiers: (Tier | null)[]
}

export const blistShare = (s: BlistState): BlistShare => ({
  score: totalScore(s),
  extended: s.extended,
  tiers: s.results.map((r) => r.tier),
})

/**
 * Live rarity (spec §8, off at launch): today's pick rate blended with the preset tier's share as a
 * prior worth `k` pseudo-agents, mapped to a tier by the spec's thresholds.
 */
export function blendedShare(picks: number, attempts: number, prior: number, k = 200): number {
  return (picks + k * prior) / (attempts + k)
}

export function tierForShare(share: number): Tier {
  if (share >= 0.1) return 'common'
  if (share >= 0.03) return 'filed'
  if (share >= 0.01) return 'restricted'
  if (share >= 0.002) return 'classified'
  return 'sealed'
}
