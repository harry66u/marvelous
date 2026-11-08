import { useEffect, useState } from 'react'
import { useProgress } from './progress'
import type { Store } from '../lib/progress'
import { addDays } from '../lib/time'

type Reader = (store: Store, date: string) => { status: 'in_progress' | 'filed' } | undefined

/**
 * The date a game files under. It is today's date, except that a game started before midnight stays
 * open and still counts for its own date (spec §5): with nothing filed for today, an unfinished game
 * from yesterday is resumed. Once a game has a record, its date never moves.
 */
export function useCaseDate(today: string, read: Reader): { date: string; pin: (date: string) => void } {
  const { store } = useProgress()
  const [pinned, setPinned] = useState<string | null>(() => {
    const yesterday = addDays(today, -1)
    return !read(store, today) && read(store, yesterday)?.status === 'in_progress' ? yesterday : null
  })
  const date = pinned ?? today
  const started = read(store, date) !== undefined
  useEffect(() => {
    if (started && pinned === null) setPinned(date)
  }, [started, pinned, date])
  return { date, pin: setPinned }
}
