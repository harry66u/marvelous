import type { Store } from '../../../lib/progress'
import { PLACEMENTS } from '../logic/game'
import { readRetcon } from './useRetconGame'

export interface RetconStats {
  /** cases filed */
  filed: number
  /** cases with every record in order */
  perfect: number
  /** mean records in order per filed case, or null before the first */
  average: number | null
  /** cases by records in order: index 0…5 */
  distribution: number[]
}

/** Retcon statistics from every filed case on this device. */
export function retconStats(store: Store): RetconStats {
  const distribution = Array<number>(PLACEMENTS + 1).fill(0)
  let filed = 0
  let total = 0
  for (const date of Object.keys(store.days)) {
    const rec = readRetcon(store, date)
    if (rec?.status !== 'filed' || !rec.result) continue
    const n = Math.max(0, Math.min(PLACEMENTS, rec.result.correct))
    distribution[n]! += 1
    filed += 1
    total += n
  }
  return { filed, perfect: distribution[PLACEMENTS]!, average: filed > 0 ? total / filed : null, distribution }
}
