import type { BlistPrompt, GameId, RetconKind, RetconRecord, Schedule, Tier } from '../content/types.js'
import { etDateOf, isIsoDate, puzzleNumber } from '../lib/time.js'

export interface DayBundle {
  date: string
  number: number
  launchDate: string
  games: GameId[]
  unmasked?: { key: string }
  /** encoded BlistDay */
  blist?: { key: string }
  /** encoded RetconDay */
  retcon?: { key: string }
}

/** One B-List prompt as shipped: the text and every accepted answer with its tier. */
export interface BlistDayPrompt {
  id: string
  text: string
  /** [display name, aliases, tier] */
  answers: [string, string[], Tier][]
}
export type BlistDay = BlistDayPrompt[]

export interface RetconDayRecord {
  id: string
  text: string
  detail?: string
  date: string
  kind: RetconKind
}
/** The anchor first, then arrival order. */
export type RetconDay = RetconDayRecord[]

export interface GameContent {
  prompts: ReadonlyMap<string, BlistPrompt>
  records: ReadonlyMap<string, RetconRecord>
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

/** Same scrambling for a JSON payload, converted in chunks so large days never overflow the stack. */
export function encodePayload(value: unknown, date: string): string {
  const bytes = xor(new TextEncoder().encode(JSON.stringify(value)), date)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export function decodePayload<T>(key: string, date: string): T {
  return JSON.parse(decodeAnswer(key, date)) as T
}

const blistDay = (ids: string[], content: GameContent): BlistDay | null => {
  const out: BlistDay = []
  for (const id of ids) {
    const p = content.prompts.get(id)
    if (!p) return null
    out.push({ id, text: p.text, answers: p.answers.map((a) => [a.name, a.aliases, a.tier]) })
  }
  return out
}

const retconDay = (ids: string[], content: GameContent): RetconDay | null => {
  const out: RetconDay = []
  for (const id of ids) {
    const r = content.records.get(id)
    if (!r) return null
    out.push({ id, text: r.text, ...(r.detail ? { detail: r.detail } : {}), date: r.date, kind: r.kind })
  }
  return out
}

const EMPTY: GameContent = { prompts: new Map(), records: new Map() }

export function buildDayBundle(schedule: Schedule, date: string | null, now: Date, content: GameContent = EMPTY): DayResult {
  const today = etDateOf(now)
  const day = date ?? today
  if (!isIsoDate(day)) return fail(400)
  if (day > today) return fail(403)
  const entry = day < schedule.launchDate ? undefined : schedule.days[day]
  if (!entry?.unmasked) return fail(404)
  const bundle: DayBundle = {
    date: day,
    number: puzzleNumber(schedule.launchDate, day),
    launchDate: schedule.launchDate,
    games: ['unmasked'],
    unmasked: { key: encodeAnswer(entry.unmasked, day) },
  }
  const b = entry.blist ? blistDay(entry.blist, content) : null
  if (b) {
    bundle.games.push('blist')
    bundle.blist = { key: encodePayload(b, day) }
  }
  const r = entry.retcon ? retconDay(entry.retcon, content) : null
  if (r) {
    bundle.games.push('retcon')
    bundle.retcon = { key: encodePayload(r, day) }
  }
  return { ok: true, bundle }
}
