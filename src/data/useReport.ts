import { useCallback } from 'react'
import { readBlist } from '../games/blist/ui/useBlistGame'
import { readRetcon } from '../games/retcon/ui/useRetconGame'
import { unmaskedShare } from '../games/unmasked/logic/game'
import { readUnmasked } from '../games/unmasked/ui/useUnmaskedGame'
import type { GameId } from '../content/types'
import { consecutiveShifts } from '../lib/progress'
import { buildReport } from '../lib/share'
import { useProgress } from './progress'
import { useCharacters } from './useCharacters'

/**
 * The combined share report for one shift, built from local progress. Games the shift includes but
 * that are not filed read "PENDING"; games the day did not schedule are left out.
 */
export function useReport(): (date: string, number: number, games: readonly GameId[]) => string {
  const { store } = useProgress()
  const { byId } = useCharacters()
  return useCallback(
    (date, number, games) => {
      const u = readUnmasked(store, date)
      const b = readBlist(store, date)
      const r = readRetcon(store, date)
      return buildReport({
        number,
        date,
        unmasked: games.includes('unmasked') ? (u?.status === 'filed' ? unmaskedShare(u.state, byId) : 'pending') : undefined,
        blist: games.includes('blist') ? (b?.status === 'filed' && b.result ? b.result : 'pending') : undefined,
        retcon: games.includes('retcon') ? (r?.status === 'filed' && r.result ? r.result : 'pending') : undefined,
        shifts: consecutiveShifts(store, date),
        url: `${window.location.origin}/`,
      })
    },
    [store, byId],
  )
}
