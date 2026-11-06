import { formatMemoDate } from './time'
import type { Mark, UnmaskedShare } from './marks'

export interface ReportInput {
  number: number
  date: string
  unmasked?: UnmaskedShare | 'pending'
  shifts: number
  url: string
}

const SQUARE: Record<Mark, string> = { exact: '🟧', close: '🟨', no: '⬛' }

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
  if (input.shifts > 0) {
    lines.push(`${input.shifts} consecutive shift${input.shifts === 1 ? '' : 's'}`)
  }
  lines.push(input.url)
  return lines.join('\n')
}
