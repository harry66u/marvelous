import { TIERS, type Tier } from '../../../content/types'
import type { Store } from '../../../lib/progress'
import { sublevel, totalScore, type BlistResult } from '../logic/game'
import { readBlist } from './useBlistGame'

export interface BlistStats {
  /** filed shifts */
  played: number
  /** mean score, rounded; null before the first filed shift */
  average: number | null
  best: number | null
  /** deepest sublevel reached (0 = ground level) */
  deepest: number | null
  tiers: Record<Tier, number>
  expired: number
}

export function blistStats(games: readonly { results: readonly BlistResult[] }[]): BlistStats {
  const tiers = Object.fromEntries(TIERS.map((t) => [t, 0])) as Record<Tier, number>
  let expired = 0
  const scores: number[] = []
  for (const g of games) {
    scores.push(totalScore({ results: [...g.results] }))
    for (const r of g.results) {
      if (r.tier) tiers[r.tier] += 1
      else expired += 1
    }
  }
  const best = scores.length ? Math.max(...scores) : null
  return {
    played: scores.length,
    average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    best,
    deepest: best === null ? null : sublevel(best),
    tiers,
    expired,
  }
}

/** Every filed B-List shift on this device. */
export function filedBlistGames(store: Store) {
  return Object.keys(store.days).flatMap((date) => {
    const rec = readBlist(store, date)
    return rec?.status === 'filed' ? [rec.state] : []
  })
}
