import type { GameId, Schedule } from '../content/types.js'
import { etDateOf, isIsoDate, puzzleNumber } from '../lib/time.js'

export interface DayBundle {
  date: string
  number: number
  launchDate: string
  games: GameId[]
  unmasked?: { key: string }
}

export type DayResult =
  | { ok: true; bundle: DayBundle }
  | { ok: false; status: 400 | 403 | 404; error: string }

const ERRORS = {
  400: 'Malformed date. Use YYYY-MM-DD.',
  403: 'That date has not happened yet. The Archive does not issue assignments in advance.',
  404: 'No assignments have been issued for this date.',
} as const

const fail = (status: 400 | 403 | 404): DayResult => ({ ok: false, status, error: ERRORS[status] })

function xor(bytes: Uint8Array, date: string): Uint8Array {
  const key = new TextEncoder().encode(`${[...date].reverse().join("")}:marvelous`)
  return bytes.map((b, i) => b ^ key[i % key.length]!)
}

/** Reversed date leads the key so short ids still differ per day. Obfuscation only: keeps the answer out of casual view in the network tab. */
export function encodeAnswer(id: string, date: string): string {
  const bytes = xor(new TextEncoder().encode(id), date)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeAnswer(key: string, date: string): string {
  const b64 = key.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(xor(Uint8Array.from(bin, (c) => c.charCodeAt(0)), date))
}

export function buildDayBundle(schedule: Schedule, date: string | null, now: Date): DayResult {
  const today = etDateOf(now)
  const day = date ?? today
  if (!isIsoDate(day)) return fail(400)
  if (day > today) return fail(403)
  const entry = day < schedule.launchDate ? undefined : schedule.days[day]
  if (!entry?.unmasked) return fail(404)
  return {
    ok: true,
    bundle: {
      date: day,
      number: puzzleNumber(schedule.launchDate, day),
      launchDate: schedule.launchDate,
      games: ['unmasked'],
      unmasked: { key: encodeAnswer(entry.unmasked, day) },
    },
  }
}
