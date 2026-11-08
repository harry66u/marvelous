/**
 * Retcon rules (spec §9): six dated records. The first is the anchor; the other five arrive one at a
 * time and the agent picks the slot on the timeline where each belongs. A wrong slot costs one of
 * three variance allowances and the record snaps to its true place. Running out of allowances files
 * the remaining records automatically.
 */

export const RECORDS_PER_DAY = 6
export const PLACEMENTS = RECORDS_PER_DAY - 1
export const ALLOWANCES = 3

export interface RetconCard {
  id: string
  /** "YYYY-MM" or "YYYY-MM-DD"; strings compare chronologically */
  date: string
}

export type Placement = 'correct' | 'wrong' | 'auto'

export interface RetconState {
  date: string
  /** record ids: the anchor first, then arrival order */
  order: string[]
  /** outcome of each placed record, in arrival order (excludes the anchor) */
  placements: Placement[]
  allowances: number
  status: 'playing' | 'won' | 'lost'
}

export function newRetcon(date: string, order: string[]): RetconState {
  return { date, order: [...order], placements: [], allowances: ALLOWANCES, status: 'playing' }
}

/** Records already on the timeline (the anchor plus each placed record), oldest first. */
export function timeline(s: RetconState, cards: ReadonlyMap<string, RetconCard>): RetconCard[] {
  return s.order
    .slice(0, 1 + s.placements.length)
    .flatMap((id) => cards.get(id) ?? [])
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The record waiting to be placed, or null when the case is closed. */
export function pending(s: RetconState): string | null {
  return s.status === 'playing' ? (s.order[1 + s.placements.length] ?? null) : null
}

/** The slot (0 = before everything) where a record truly belongs on the current timeline. */
export function trueSlot(line: readonly RetconCard[], card: RetconCard): number {
  const i = line.findIndex((c) => card.date < c.date)
  return i === -1 ? line.length : i
}

export interface PlaceOutcome {
  state: RetconState
  correct: boolean
  slot: number
}

/** Place the pending record in `slot` (0…timeline length). Out-of-range or closed cases are ignored. */
export function place(s: RetconState, cards: ReadonlyMap<string, RetconCard>, slot: number): PlaceOutcome | null {
  const id = pending(s)
  const card = id ? cards.get(id) : undefined
  if (!card) return null
  const line = timeline(s, cards)
  if (!Number.isInteger(slot) || slot < 0 || slot > line.length) return null
  const truth = trueSlot(line, card)
  const correct = truth === slot
  const allowances = correct ? s.allowances : s.allowances - 1
  let placements: Placement[] = [...s.placements, correct ? 'correct' : 'wrong']
  let status: RetconState['status'] = 'playing'
  if (allowances <= 0) {
    placements = [...placements, ...Array<Placement>(PLACEMENTS - placements.length).fill('auto')]
    status = 'lost'
  } else if (placements.length >= PLACEMENTS) {
    status = 'won'
  }
  return { state: { ...s, placements, allowances, status }, correct, slot: truth }
}

export const correctCount = (s: Pick<RetconState, 'placements'>) => s.placements.filter((p) => p === 'correct').length

/** What the share report and stats need from a filed Retcon game. */
export interface RetconShare {
  correct: number
  placements: Placement[]
}

export const retconShare = (s: RetconState): RetconShare => ({ correct: correctCount(s), placements: [...s.placements] })

/** "1962" from "1962-08"; the year is what the timeline shows. */
export const yearOf = (date: string) => Number(date.slice(0, 4))
