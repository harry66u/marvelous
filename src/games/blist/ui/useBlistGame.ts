import { useCallback, useEffect, useMemo } from 'react'
import type { GameId, Tier } from '../../../content/types'
import { useProgress, useSettings } from '../../../data/progress'
import { useCaseDate } from '../../../data/useCaseDate'
import { useCharacters } from '../../../data/useCharacters'
import { useDay } from '../../../data/useDay'
import { useToday } from '../../../data/useToday'
import { buildMatcher, matchKey, type MatchResult } from '../../../lib/match'
import { getRecord, noteRequired, withRecord, type GameRecord, type Store } from '../../../lib/progress'
import { decodePayload, type BlistDay } from '../../../server/dayBundle'
import {
  PROMPTS_PER_DAY, TIER_POINTS, blistShare, expire, fileAnswer, fileMiss, newBlist, startPrompt,
  type BlistShare, type BlistState,
} from '../logic/game'

export type BlistRecord = GameRecord<BlistState, BlistShare>

function isState(v: unknown, date: string): v is BlistState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    s.date === date &&
    typeof s.current === 'number' &&
    Array.isArray(s.results) &&
    Array.isArray(s.misses) &&
    (s.status === 'playing' || s.status === 'done')
  )
}

/** The stored B-List record for `date`, ignored if it is not a usable shape. */
export function readBlist(store: Store, date: string): BlistRecord | undefined {
  const rec = getRecord(store, date, 'blist')
  return rec && isState(rec.state, date) ? (rec as BlistRecord) : undefined
}

export type SubmitOutcome =
  | { kind: 'valid'; answer: string; tier: Tier; points: number; exact: boolean }
  | { kind: 'miss'; known: string | null }
  | { kind: 'ignored' }

export interface BlistGame {
  status: 'loading' | 'none' | 'error' | 'invalid' | 'ready'
  date: string
  today: string
  number: number | null
  /** the games issued on this shift's date, for the share report */
  games: GameId[]
  prompts: BlistDay | null
  state: BlistState | null
  record: BlistRecord | undefined
  extended: boolean
  /** start the clock on the current prompt (after the "Incoming request" beat) */
  start: () => void
  submit: (input: string) => SubmitOutcome
  /** file a timeout if the clock has run out */
  tick: () => void
  retry: () => void
}

function safeDay(key: string, date: string): BlistDay | null {
  try {
    const d = decodePayload<BlistDay>(key, date)
    return Array.isArray(d) && d.length === PROMPTS_PER_DAY ? d : null
  } catch {
    return null
  }
}

const sameList = (a: readonly string[] | undefined, b: readonly string[]) =>
  a !== undefined && a.length === b.length && a.every((x, i) => x === b[i])

/** Today's B-List shift: the prompts, the stored game, and filing answers against the clock. */
export function useBlistGame(): BlistGame {
  const today = useToday()
  const { store, update } = useProgress()
  const [settings] = useSettings()
  const { date, pin } = useCaseDate(today, readBlist)
  const day = useDay(date)
  const chars = useCharacters()
  const record = readBlist(store, date)

  const bundle = day.status === 'ready' ? day.bundle : undefined
  useEffect(() => {
    if (!bundle) return
    update((s) => (sameList(s.days[bundle.date]?.required, bundle.games) ? s : noteRequired(s, bundle.date, bundle.games)))
  }, [bundle, update])

  const prompts = useMemo(() => (bundle?.blist ? safeDay(bundle.blist.key, bundle.date) : null), [bundle])

  // Names on file that are not answers still count as "known", so they are never typo-corrected.
  const known = useMemo(() => {
    const names: string[] = []
    for (const c of chars.characters) names.push(c.name, ...c.aliases, ...(c.realName ? [c.realName] : []))
    for (const p of prompts ?? []) for (const [n, aliases] of p.answers) names.push(n, ...aliases)
    return names
  }, [chars.characters, prompts])
  const matchers = useMemo(
    () => (prompts ?? []).map((p) => buildMatcher(p.answers.map(([name, aliases]) => ({ name, aliases })), known)),
    [prompts, known],
  )

  // The timer setting applies when a shift starts; a shift in progress keeps its own.
  const fresh = useMemo(() => newBlist(date, settings.extendedTimer), [date, settings.extendedTimer])
  const state = record?.state ?? (prompts ? fresh : null)

  let status: BlistGame['status'] = 'ready'
  if (day.status === 'none' || (bundle && !bundle.blist)) status = 'none'
  else if (day.status === 'error' || chars.status === 'error') status = 'error'
  else if (day.status === 'loading' || chars.status === 'loading') status = 'loading'
  else if (!prompts || !state) status = 'invalid'

  const commit = useCallback(
    (step: (s: BlistState) => BlistState) => {
      const now = new Date().toISOString()
      pin(date)
      update((s) => {
        const prev = readBlist(s, date)
        const current = prev?.state ?? fresh
        const next = step(current)
        if (next === current) return s
        const done = next.status === 'done'
        const rec: BlistRecord = {
          status: done ? 'filed' : 'in_progress',
          state: next,
          startedAt: prev?.startedAt ?? now,
          ...(done ? { result: blistShare(next), filedAt: now } : {}),
        }
        return withRecord(s, date, 'blist', rec)
      })
    },
    [date, fresh, pin, update],
  )

  const start = useCallback(() => commit((s) => startPrompt(s, Date.now())), [commit])
  const tick = useCallback(() => {
    if (state && state.startedAt !== null && expire(state, Date.now()) !== state) commit((s) => expire(s, Date.now()))
  }, [state, commit])

  const submit = useCallback(
    (input: string): SubmitOutcome => {
      if (!state || state.status !== 'playing' || state.startedAt === null || !prompts) return { kind: 'ignored' }
      const now = Date.now()
      if (expire(state, now) !== state) {
        commit((s) => expire(s, now))
        return { kind: 'ignored' }
      }
      const prompt = prompts[state.current]
      const match = matchers[state.current]
      if (!prompt || !match) return { kind: 'ignored' }
      const m: MatchResult = match(input)
      if (m.kind === 'empty') return { kind: 'ignored' }
      if (m.kind === 'valid') {
        const [name, , tier] = prompt.answers[m.index]!
        commit((s) => fileAnswer(s, now, name, tier))
        return { kind: 'valid', answer: name, tier, points: TIER_POINTS[tier], exact: m.exact }
      }
      commit((s) => fileMiss(s, now, matchKey(input)))
      return { kind: 'miss', known: m.kind === 'known' ? m.name : null }
    },
    [state, prompts, matchers, commit],
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
    games: bundle?.games ?? [],
    prompts,
    state,
    record,
    extended: state?.extended ?? settings.extendedTimer,
    start,
    submit,
    tick,
    retry,
  }
}
