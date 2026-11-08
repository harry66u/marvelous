import { formatMemoDate } from './time'
import type { Mark, UnmaskedShare } from './marks'
import type { Tier } from '../content/types'

/** B-List part of the report: the score and one tier (or null for a timeout) per prompt. */
export interface BlistReport {
  score: number
  extended: boolean
  tiers: (Tier | null)[]
}

/** Retcon part of the report: one outcome per placed record. */
export interface RetconReport {
  correct: number
  placements: ('correct' | 'wrong' | 'auto')[]
}

export interface ReportInput {
  number: number
  date: string
  unmasked?: UnmaskedShare | 'pending'
  blist?: BlistReport | 'pending'
  retcon?: RetconReport | 'pending'
  shifts: number
  url: string
}

const SQUARE: Record<Mark, string> = { exact: '🟧', close: '🟨', no: '⬛' }
export const TIER_SQUARE: Record<Tier, string> = { common: '⬜', filed: '🟨', restricted: '🟧', classified: '🟥', sealed: '⬛' }
export const MISS_SQUARE = '➖'

const level = (score: number) => {
  const b = Math.min(7, Math.floor(score / 100))
  return b === 0 ? 'GROUND LEVEL' : `SUBLEVEL B${b}`
}

export function buildReport(input: ReportInput): string {
  const title = input.number < 1 ? 'PREVIEW' : `#${String(input.number).padStart(3, '0')}`
  const lines = [`MARVELOUS ${title} · ${formatMemoDate(input.date)}`]
  const u = input.unmasked
  if (u === 'pending') {
    lines.push('UNMASKED PENDING')
  } else if (u) {
    lines.push(`UNMASKED ${u.solved ? u.attempts : 'X'}/6`)
    for (const row of u.rows) lines.push(row.map((m) => SQUARE[m]).join(''))
  }
  const b = input.blist
  if (b === 'pending') {
    lines.push('B-LIST PENDING')
  } else if (b) {
    lines.push(`B-LIST ${b.score}/700 · ${level(b.score)}${b.extended ? ' · EXTENDED TIMER' : ''}`)
    lines.push(b.tiers.map((t) => (t ? TIER_SQUARE[t] : MISS_SQUARE)).join(''))
  }
  const r = input.retcon
  if (r === 'pending') {
    lines.push('RETCON PENDING')
  } else if (r) {
    lines.push(`RETCON ${r.correct}/5`)
    lines.push(r.placements.map((p) => (p === 'correct' ? '🟧' : '⬛')).join(''))
  }
  if (input.shifts > 0) {
    lines.push(`${input.shifts} consecutive shift${input.shifts === 1 ? '' : 's'}`)
  }
  lines.push(input.url)
  return lines.join('\n')
}
