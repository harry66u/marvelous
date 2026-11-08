import { useCallback, useEffect, useState } from 'react'
import { playSfx } from '../../../audio/sfx'
import type { BlistState } from '../logic/game'
import type { SubmitOutcome } from './useBlistGame'

/** "Incoming request" beat before the clock starts. */
export const INCOMING_MS = 1000
/** "Retrieving record" pause between a valid answer and the drawer. */
export const RETRIEVE_MS = 600
/** How long a filed record stays out before the next request comes in on its own. */
export const ADVANCE_MS = 2000

/**
 * What the play area shows. `index` is the request on screen, which can trail `state.current`:
 * once an answer or a timeout is filed the stored game has already moved on, while the drawer
 * still shows the record just filed.
 */
export type View =
  | { kind: 'incoming'; index: number }
  | { kind: 'live'; index: number }
  | { kind: 'retrieving'; index: number }
  | { kind: 'filed'; index: number }
  | { kind: 'end' }

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

/** Where a page load picks up: a running clock resumes, otherwise the request comes in. */
export function initialView(state: BlistState): View {
  if (state.status === 'done') return { kind: 'end' }
  return state.startedAt !== null ? { kind: 'live', index: state.current } : { kind: 'incoming', index: state.current }
}

interface Options {
  state: BlistState | null
  start: () => void
  submit: (input: string) => SubmitOutcome
  /** a dialog is open: hold the next request (a running clock cannot be held) */
  paused: boolean
  /** move on from a filed record by itself; off for the extended timer */
  autoAdvance: boolean
}

export interface RequestFlow {
  view: View | null
  /** the game closed during this visit (the stamp slams and the verdict takes focus) */
  closedHere: boolean
  submit: (input: string) => SubmitOutcome
  next: () => void
}

/** Sequences one request at a time: incoming → live → retrieving → filed → next (or the end). */
export function useRequestFlow({ state, start, submit, paused, autoAdvance }: Options): RequestFlow {
  const [phase, setPhase] = useState<View | null>(null)
  const [closedHere, setClosedHere] = useState(false)
  let view = phase ?? (state ? initialView(state) : null)

  // The clock ran out (tick or a final penalty filed it): show the expired record.
  if (view?.kind === 'live' && state && (state.current > view.index || state.status === 'done')) {
    view = { kind: 'filed', index: view.index }
    setPhase(view)
  }

  const kind = view?.kind ?? null
  const index = view && view.kind !== 'end' ? view.index : -1
  const done = state?.status === 'done'

  useEffect(() => {
    if (kind !== 'incoming' || paused) return
    playSfx('incoming')
    const t = window.setTimeout(
      () => {
        start()
        setPhase({ kind: 'live', index })
      },
      reducedMotion() ? 0 : INCOMING_MS,
    )
    return () => clearTimeout(t)
  }, [kind, index, paused, start])

  useEffect(() => {
    if (kind !== 'retrieving') return
    const t = window.setTimeout(() => setPhase({ kind: 'filed', index }), RETRIEVE_MS)
    return () => clearTimeout(t)
  }, [kind, index])

  const current = state?.current ?? 0
  const next = useCallback(() => {
    if (done) {
      setClosedHere(true)
      setPhase({ kind: 'end' })
    } else {
      setPhase({ kind: 'incoming', index: current })
    }
  }, [done, current])

  useEffect(() => {
    if (kind !== 'filed' || paused || !autoAdvance) return
    const t = window.setTimeout(next, ADVANCE_MS)
    return () => clearTimeout(t)
  }, [kind, index, paused, autoAdvance, next])

  const file = useCallback(
    (input: string): SubmitOutcome => {
      const out = submit(input)
      if (out.kind === 'valid' && index >= 0) setPhase({ kind: 'retrieving', index })
      return out
    },
    [submit, index],
  )

  return { view, closedHere, submit: file, next }
}
