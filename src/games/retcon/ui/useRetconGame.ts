import { useCallback, useEffect, useMemo } from 'react'
import type { GameId } from '../../../content/types'
import { useProgress } from '../../../data/progress'
import { useCaseDate } from '../../../data/useCaseDate'
import { useDay } from '../../../data/useDay'
import { useToday } from '../../../data/useToday'
import { getRecord, noteRequired, withRecord, type GameRecord, type Store } from '../../../lib/progress'
import { decodePayload, type RetconDay, type RetconDayRecord } from '../../../server/dayBundle'
import { RECORDS_PER_DAY, newRetcon, place, retconShare, type PlaceOutcome, type RetconShare, type RetconState } from '../logic/game'

export type RetconRecordState = GameRecord<RetconState, RetconShare>

function isState(v: unknown, date: string): v is RetconState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    s.date === date &&
    Array.isArray(s.order) &&
    Array.isArray(s.placements) &&
    typeof s.allowances === 'number' &&
    (s.status === 'playing' || s.status === 'won' || s.status === 'lost')
  )
}

export function readRetcon(store: Store, date: string): RetconRecordState | undefined {
  const rec = getRecord(store, date, 'retcon')
  return rec && isState(rec.state, date) ? (rec as RetconRecordState) : undefined
}

export interface RetconGame {
  status: 'loading' | 'none' | 'error' | 'invalid' | 'ready'
  date: string
  today: string
  number: number | null
  /** the games issued on this case's date, for the share report */
  games: GameId[]
  cards: ReadonlyMap<string, RetconDayRecord>
  state: RetconState | null
  record: RetconRecordState | undefined
  place: (slot: number) => PlaceOutcome | null
  retry: () => void
}

function safeDay(key: string, date: string): RetconDay | null {
  try {
    const d = decodePayload<RetconDay>(key, date)
    return Array.isArray(d) && d.length === RECORDS_PER_DAY ? d : null
  } catch {
    return null
  }
}

const sameList = (a: readonly string[] | undefined, b: readonly string[]) =>
  a !== undefined && a.length === b.length && a.every((x, i) => x === b[i])

/** Today's Retcon case: the records, the stored game, and placing records on the timeline. */
export function useRetconGame(): RetconGame {
  const today = useToday()
  const { store, update } = useProgress()
  const { date, pin } = useCaseDate(today, readRetcon)
  const day = useDay(date)
  const record = readRetcon(store, date)

  const bundle = day.status === 'ready' ? day.bundle : undefined
  useEffect(() => {
    if (!bundle) return
    update((s) => (sameList(s.days[bundle.date]?.required, bundle.games) ? s : noteRequired(s, bundle.date, bundle.games)))
  }, [bundle, update])

  const records = useMemo(() => (bundle?.retcon ? safeDay(bundle.retcon.key, bundle.date) : null), [bundle])
  const cards = useMemo(() => new Map((records ?? []).map((r) => [r.id, r])), [records])
  const fresh = useMemo(() => (records ? newRetcon(date, records.map((r) => r.id)) : null), [date, records])
  const state = record?.state ?? fresh

  let status: RetconGame['status'] = 'ready'
  if (day.status === 'none' || (bundle && !bundle.retcon)) status = 'none'
  else if (day.status === 'error') status = 'error'
  else if (day.status === 'loading') status = 'loading'
  else if (!records || !state || state.order.some((id) => !cards.has(id))) status = 'invalid'

  const placeAt = useCallback(
    (slot: number): PlaceOutcome | null => {
      if (!state || !fresh) return null
      const outcome = place(state, cards, slot)
      if (!outcome) return null
      const now = new Date().toISOString()
      pin(date)
      update((s) => {
        const prev = readRetcon(s, date)
        const current = prev?.state ?? fresh
        const out = place(current, cards, slot)
        if (!out) return s
        const done = out.state.status !== 'playing'
        const rec: RetconRecordState = {
          status: done ? 'filed' : 'in_progress',
          state: out.state,
          startedAt: prev?.startedAt ?? now,
          ...(done ? { result: retconShare(out.state), filedAt: now } : {}),
        }
        return withRecord(s, date, 'retcon', rec)
      })
      return outcome
    },
    [state, fresh, cards, date, pin, update],
  )

  return { status, date, today, number: bundle?.number ?? null, games: bundle?.games ?? [], cards, state, record, place: placeAt, retry: day.retry }
}
