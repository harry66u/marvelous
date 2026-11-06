import type { GameId } from '../content/types'
import { DEFAULT_SETTINGS, type Settings } from '../settings/settings'
import { addDays } from './time'

export interface GameRecord<S = unknown, R = unknown> {
  status: 'in_progress' | 'filed'
  state: S
  result?: R
  startedAt: string
  filedAt?: string
}

export interface DayRecord {
  required: GameId[]
  games: Partial<Record<GameId, GameRecord>>
}

export interface Store {
  version: 1
  days: Record<string, DayRecord>
  settings: Settings
}

export const STORE_KEY = 'marvelous:v1'

export function emptyStore(): Store {
  return { version: 1, days: {}, settings: { ...DEFAULT_SETTINGS, seenManual: {} } }
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function loadStore(storage: Storage | null = defaultStorage()): Store {
  try {
    const raw = storage?.getItem(STORE_KEY)
    if (!raw) return emptyStore()
    const data: unknown = JSON.parse(raw)
    if (!isObject(data) || data.version !== 1 || !isObject(data.days)) return emptyStore()
    const settings = isObject(data.settings) ? data.settings : {}
    return {
      version: 1,
      days: data.days as Store['days'],
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings,
        seenManual: isObject(settings.seenManual) ? settings.seenManual : {},
      } as Settings,
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: Store, storage: Storage | null = defaultStorage()): void {
  try {
    storage?.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // quota or privacy mode: progress stays in memory
  }
}

export function getRecord(store: Store, date: string, game: GameId): GameRecord | undefined {
  return store.days[date]?.games[game]
}

export function withRecord(store: Store, date: string, game: GameId, rec: GameRecord): Store {
  const day = store.days[date] ?? { required: [], games: {} }
  return {
    ...store,
    days: { ...store.days, [date]: { ...day, games: { ...day.games, [game]: rec } } },
  }
}

export function noteRequired(store: Store, date: string, required: GameId[]): Store {
  const day = store.days[date] ?? { required: [], games: {} }
  return { ...store, days: { ...store.days, [date]: { ...day, required: [...required] } } }
}

export function assignmentStatus(
  store: Store,
  date: string,
  game: GameId,
): 'pending' | 'in_progress' | 'filed' {
  return getRecord(store, date, game)?.status ?? 'pending'
}

export function shiftComplete(store: Store, date: string): boolean {
  const day = store.days[date]
  if (!day || day.required.length === 0) return false
  return day.required.every((g) => day.games[g]?.status === 'filed')
}

export function consecutiveShifts(store: Store, today: string): number {
  let d = shiftComplete(store, today) ? today : addDays(today, -1)
  let n = 0
  while (shiftComplete(store, d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function bestShifts(store: Store): number {
  const dates = Object.keys(store.days).filter((d) => shiftComplete(store, d)).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of dates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}
