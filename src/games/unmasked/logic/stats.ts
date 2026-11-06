import type { UnmaskedResult } from '../../../lib/marks'
import { MAX_ATTEMPTS } from './game'

export interface UnmaskedStats {
  played: number
  solved: number
  /** solved games by attempt count; index 0 is one attempt */
  distribution: number[]
}

export function unmaskedStats(results: readonly UnmaskedResult[]): UnmaskedStats {
  const distribution = Array<number>(MAX_ATTEMPTS).fill(0)
  let solved = 0
  for (const r of results) {
    if (!r.solved) continue
    solved++
    const i = Math.min(Math.max(r.attempts, 1), MAX_ATTEMPTS) - 1
    distribution[i] = (distribution[i] ?? 0) + 1
  }
  return { played: results.length, solved, distribution }
}
