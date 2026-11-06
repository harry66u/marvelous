import { useEffect, useState } from 'react'
import { msUntilNextPuzzle } from '../../lib/time'

/** Lands each tick just after the second turns over, so the floored display never skips or lags. */
const SLACK_MS = 5

/** Milliseconds until the next puzzle (00:00 Eastern), updated every second. */
export function useCountdown(): number {
  const [ms, setMs] = useState(() => msUntilNextPuzzle(new Date()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        setMs(msUntilNextPuzzle(new Date()))
        schedule()
      }, 1000 - (Date.now() % 1000) + SLACK_MS)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])
  return ms
}
