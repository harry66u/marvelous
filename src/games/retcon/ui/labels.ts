import type { RetconKind } from '../../../content/types'
import type { RetconDayRecord } from '../../../server/dayBundle'
import { yearOf, type Placement } from '../logic/game'

export const KIND_LABEL: Record<RetconKind, string> = {
  debut: 'First appearance',
  screen: 'Screen release',
  event: 'Event',
  milestone: 'Milestone',
}

/** How a record came to be on the line: the anchor, or how its placement went. */
export type Outcome = Placement | 'anchor'

export const OUTCOME_LABEL: Record<Outcome, string> = {
  anchor: 'Anchor',
  correct: 'In order',
  wrong: 'Refiled',
  auto: 'Auto-filed',
}

/** Shape marks so the outcome never rests on color alone. */
export const OUTCOME_MARK: Record<Outcome, string> = { anchor: '◆', correct: '✓', wrong: '✕', auto: '↧' }

export function caseCode(number: number): string {
  return `Case ${String(number).padStart(4, '0')}-R`
}

/** "First appearance: Spider-Man, 1962" */
export const describeRecord = (r: Pick<RetconDayRecord, 'text' | 'date'>) => `${r.text}, ${yearOf(r.date)}`

/** What a slot button says to a screen reader. Slot 0 is before everything; slot n is after the latest record. */
export function slotLabel(line: readonly RetconDayRecord[], slot: number): string {
  const next = line[slot]
  if (slot === 0 && next) return `Place before everything, ahead of ${describeRecord(next)}`
  if (next) return `Place before ${describeRecord(next)}`
  const last = line[line.length - 1]
  return last ? `Place after ${describeRecord(last)}` : 'Place on the main line'
}

/** The short visible face of a slot: "Place before 1962", "Place after 2008". */
export function slotFace(line: readonly RetconDayRecord[], slot: number): { lead: string; year: string } {
  const next = line[slot]
  if (next) return { lead: 'Place before', year: String(yearOf(next.date)) }
  const last = line[line.length - 1]
  return { lead: 'Place after', year: last ? String(yearOf(last.date)) : '' }
}

/** "before X", "between X and Y" or "after Y", for a record at `index` on the line it now sits on. */
export function whereItBelongs(line: readonly RetconDayRecord[], index: number): string {
  const prev = line[index - 1]
  const next = line[index + 1]
  if (prev && next) return `between ${prev.text} and ${next.text}`
  if (next) return `before ${next.text}`
  if (prev) return `after ${prev.text}`
  return 'on the main line'
}

export function allowancesLeft(n: number): string {
  if (n <= 0) return 'No allowances left'
  return `${n} allowance${n === 1 ? '' : 's'} left`
}
