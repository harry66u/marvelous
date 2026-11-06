/** Puzzle-day timekeeping. The puzzle day is the calendar date in America/New_York. */
export const ET_ZONE = 'America/New_York'

const etParts = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export interface WallClock {
  date: string
  hour: number
  minute: number
  second: number
}

export function etWallClock(instant: Date): WallClock {
  const p: Record<string, string> = {}
  for (const part of etParts.formatToParts(instant)) p[part.type] = part.value
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
  }
}

export function etDateOf(instant: Date): string {
  return etWallClock(instant).date
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDate(s: string): boolean {
  const m = ISO.exec(s)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

function toUtcMs(date: string): number {
  const m = ISO.exec(date)
  if (!m) throw new Error(`Not an ISO date: ${date}`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

const DAY_MS = 86_400_000

export function addDays(date: string, n: number): string {
  return new Date(toUtcMs(date) + n * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS)
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(date: string): number {
  return new Date(toUtcMs(date)).getUTCDay()
}

export function puzzleNumber(launchDate: string, date: string): number {
  return daysBetween(launchDate, date) + 1
}

/**
 * The exact instant of the next 00:00 in America/New_York after `instant`.
 * DST changes happen at 02:00 local time, so midnight is never skipped or repeated.
 */
export function nextEtMidnight(instant: Date): Date {
  const target = addDays(etDateOf(instant), 1)
  // First guess: midnight Eastern is 05:00 UTC in standard time.
  let guess = toUtcMs(target) + 5 * 3_600_000
  for (let i = 0; i < 3; i++) {
    const wall = etWallClock(new Date(guess))
    const dayOffset = daysBetween(target, wall.date)
    const offsetMs = ((dayOffset * 24 + wall.hour) * 60 + wall.minute) * 60_000 + wall.second * 1000
    if (offsetMs === 0) break
    guess -= offsetMs
  }
  return new Date(guess)
}

export function msUntilNextPuzzle(instant: Date): number {
  return nextEtMidnight(instant).getTime() - instant.getTime()
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${pad2(Math.floor(total / 3600))}:${pad2(Math.floor((total % 3600) / 60))}:${pad2(total % 60)}`
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function formatMemoDate(date: string): string {
  const m = ISO.exec(date)
  if (!m) return date
  return `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}
