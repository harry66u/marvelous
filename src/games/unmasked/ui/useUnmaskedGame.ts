import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PublicCharacter } from '../../../content/types'
import { useProgress } from '../../../data/progress'
import { useCharacters } from '../../../data/useCharacters'
import { useDay } from '../../../data/useDay'
import { useToday } from '../../../data/useToday'
import type { UnmaskedResult } from '../../../lib/marks'
import { getRecord, noteRequired, withRecord, type GameRecord, type Store } from '../../../lib/progress'
import { decodeAnswer } from '../../../server/dayBundle'
import { applyGuess, newUnmasked, type UnmaskedState } from '../logic/game'
import { buildSearchIndex, type SearchEntry } from '../logic/search'

export type UnmaskedRecord = GameRecord<UnmaskedState, UnmaskedResult>

export type FileResult = { ok: true; next: UnmaskedState } | { ok: false; reason: 'repeat' | 'unknown' | 'closed' }

export interface UnmaskedGame {
  status: 'loading' | 'none' | 'error' | 'invalid' | 'ready'
  /** the case date: today's, until the first attempt fixes it */
  date: string
  today: string
  number: number | null
  answer: PublicCharacter | null
  state: UnmaskedState | null
  record: UnmaskedRecord | undefined
  characters: ReadonlyMap<string, PublicCharacter>
  index: readonly SearchEntry[]
  file: (id: string) => FileResult
  retry: () => void
}

const STATUSES: ReadonlySet<unknown> = new Set(['playing', 'won', 'lost'])

function isState(v: unknown, date: string): v is UnmaskedState {
  if (typeof v !== 'object' || v === null) return false
  const st = v as Record<string, unknown>
  return (
    st.date === date &&
    typeof st.answerId === 'string' &&
    Array.isArray(st.guesses) &&
    st.guesses.every((g) => typeof g === 'string') &&
    STATUSES.has(st.status)
  )
}

/** The stored Unmasked record for `date`, ignored if hand-edited into an unusable shape. */
export function readUnmasked(store: Store, date: string): UnmaskedRecord | undefined {
  const rec = getRecord(store, date, 'unmasked')
  return rec && isState(rec.state, date) ? (rec as UnmaskedRecord) : undefined
}

function safeDecode(key: string, date: string): string | null {
  try {
    return decodeAnswer(key, date)
  } catch {
    return null
  }
}

const sameList = (a: readonly string[] | undefined, b: readonly string[]) =>
  a !== undefined && a.length === b.length && a.every((x, i) => x === b[i])

/** Today's Unmasked case: data loading, the stored game, and filing attempts. */
export function useUnmaskedGame(): UnmaskedGame {
  const today = useToday()
  const [pinned, setPinned] = useState<string | null>(null)
  const date = pinned ?? today
  const day = useDay(date)
  const chars = useCharacters()
  const { store, update } = useProgress()
  const record = readUnmasked(store, date)
  const started = record !== undefined

  // Once a case has a record its date stays put, so finishing after midnight files under the start date.
  useEffect(() => {
    if (started && pinned === null) setPinned(date)
  }, [started, pinned, date])

  const bundle = day.status === 'ready' ? day.bundle : undefined
  useEffect(() => {
    if (!bundle) return
    update((s) => (sameList(s.days[bundle.date]?.required, bundle.games) ? s : noteRequired(s, bundle.date, bundle.games)))
  }, [bundle, update])

  const known = useMemo(() => new Set(chars.byId.keys()), [chars.byId])
  const index = useMemo(() => buildSearchIndex(chars.characters), [chars.characters])

  const answerId =
    record?.state.answerId ?? (bundle?.unmasked ? safeDecode(bundle.unmasked.key, bundle.date) : null)
  const answer = (answerId !== null && chars.byId.get(answerId)) || null
  const fresh = useMemo(() => (answer ? newUnmasked(date, answer.id) : null), [date, answer])
  const state = record?.state ?? fresh

  let status: UnmaskedGame['status'] = 'ready'
  if (day.status === 'none') status = 'none'
  else if (day.status === 'error' || chars.status === 'error') status = 'error'
  else if (day.status === 'loading' || chars.status === 'loading') status = 'loading'
  else if (!answer || !state) status = 'invalid'

  const file = useCallback(
    (id: string): FileResult => {
      if (!state || state.status !== 'playing') return { ok: false, reason: 'closed' }
      if (state.guesses.includes(id)) return { ok: false, reason: 'repeat' }
      if (!known.has(id)) return { ok: false, reason: 'unknown' }
      const now = new Date().toISOString()
      setPinned(date)
      update((s) => {
        const prev = readUnmasked(s, date)
        const current = prev?.state ?? state
        const next = applyGuess(current, id, known)
        if (next === current) return s
        const done = next.status !== 'playing'
        const rec: UnmaskedRecord = {
          status: done ? 'filed' : 'in_progress',
          state: next,
          startedAt: prev?.startedAt ?? now,
          ...(done ? { result: { attempts: next.guesses.length, solved: next.status === 'won' }, filedAt: now } : {}),
        }
        return withRecord(s, date, 'unmasked', rec)
      })
      return { ok: true, next: applyGuess(state, id, known) }
    },
    [state, known, date, update],
  )

  const { retry: retryDay } = day
  const { retry: retryChars } = chars
  const retry = useCallback(() => {
    retryDay()
    retryChars()
  }, [retryDay, retryChars])

  return {
    status,
    date,
    today,
    number: bundle?.number ?? null,
    answer,
    state,
    record,
    characters: chars.byId,
    index,
    file,
    retry,
  }
}
