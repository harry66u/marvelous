import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { playSfx } from '../../../audio/sfx'
import { useAnnounce } from '../../../ui/LiveRegion'
import { limitMs, remainingMs, type BlistState } from '../logic/game'
import s from './Countdown.module.css'

export const TICK_MS = 100

/**
 * The prompt clock. It owns the 100 ms interval so only this component re-renders that often, and
 * calls `onTick` each time so a timeout gets filed. Screen readers hear 10 and 5 seconds; the
 * last five seconds tick (when sound is on).
 */
export default function Countdown({ state, onTick }: { state: BlistState; onTick: () => void }) {
  const announce = useAnnounce()
  const [now, setNow] = useState(() => Date.now())
  const tickRef = useRef(onTick)
  useEffect(() => {
    tickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
      tickRef.current()
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  const ms = remainingMs(state, Math.max(now, state.startedAt ?? now))
  const secs = Math.ceil(ms / 1000)

  // Cues fire only when the clock crosses a mark, never for the second it resumed on.
  const last = useRef(secs)
  useEffect(() => {
    const prev = last.current
    last.current = secs
    if (secs >= prev || secs <= 0) return
    if (prev > 10 && secs <= 10) announce(`${secs} seconds`)
    else if (prev > 5 && secs <= 5) announce(`${secs} seconds`)
    if (secs <= 5) playSfx('tick')
  }, [secs, announce])

  const level = secs <= 5 ? 'critical' : secs <= 10 ? 'low' : 'ok'
  return (
    <div className={s.clock} data-level={level}>
      <p className={s.readout} role="timer" aria-label="Time remaining" aria-live="off">
        <span className={s.num}>{secs}</span>
        <span className={s.unit}>sec</span>
      </p>
      <div className={s.bar} aria-hidden="true">
        <i style={{ '--f': ms / limitMs(state) } as CSSProperties} />
      </div>
    </div>
  )
}
