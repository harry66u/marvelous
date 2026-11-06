import { useEffect, useState } from 'react'
import { etDateOf, msUntilNextPuzzle } from '../lib/time'

/** Today's puzzle date (Eastern). Re-renders at the next Eastern midnight and when the tab regains focus. */
export function useToday(): string {
  const [today, setToday] = useState(() => etDateOf(new Date()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      clearTimeout(timer)
      // +250 ms so the timer lands just after midnight, never just before it
      timer = setTimeout(() => {
        setToday(etDateOf(new Date()))
        schedule()
      }, msUntilNextPuzzle(new Date()) + 250)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setToday(etDateOf(new Date()))
        schedule()
      }
    }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return today
}
