import { fetchDay } from '../config'
import { useCallback, useEffect, useState } from 'react'
import type { DayBundle } from '../server/dayBundle'

export type DayStatus = 'loading' | 'ready' | 'none' | 'error'

export interface DayState {
  status: DayStatus
  bundle?: DayBundle
  retry: () => void
}

export const dayCacheKey = (date: string) => `marvelous:day:${date}`

function readCache(date: string): DayBundle | undefined {
  try {
    const raw = localStorage.getItem(dayCacheKey(date))
    return raw ? (JSON.parse(raw) as DayBundle) : undefined
  } catch {
    return undefined
  }
}

function writeCache(date: string, bundle: DayBundle): void {
  try {
    localStorage.setItem(dayCacheKey(date), JSON.stringify(bundle))
  } catch {
    // storage full or blocked: the bundle still works for this session
  }
}

/**
 * The puzzle bundle for `date` from /api/day.
 * A cached bundle shows immediately and covers offline play; a 403 (client clock ahead of the
 * server at midnight) is retried a few seconds later.
 */
export function useDay(date: string): DayState {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ date: string; status: DayStatus; bundle?: DayBundle }>(() => {
    const cached = readCache(date)
    return cached ? { date, status: 'ready', bundle: cached } : { date, status: 'loading' }
  })

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const cached = readCache(date)
    setState(cached ? { date, status: 'ready', bundle: cached } : { date, status: 'loading' })

    const load = async (skewRetries: number) => {
      try {
        const res = await fetchDay(date)
        if (cancelled) return
        if (res.ok) {
          const bundle = (await res.json()) as DayBundle
          if (cancelled) return
          writeCache(date, bundle)
          setState({ date, status: 'ready', bundle })
        } else if (res.status === 404) {
          setState({ date, status: 'none' })
        } else if (res.status === 403 && skewRetries > 0) {
          retryTimer = setTimeout(() => void load(skewRetries - 1), 5000)
        } else if (!cached) {
          setState({ date, status: 'error' })
        }
      } catch {
        if (!cancelled && !cached) setState({ date, status: 'error' })
      }
    }
    void load(3)
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [date, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  if (state.date !== date) return { status: 'loading', retry }
  return { status: state.status, bundle: state.bundle, retry }
}
