import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { RetconDayRecord } from '../../../server/dayBundle'
import { slotFace, slotLabel, type Outcome } from './labels'
import RecordEntry from './RecordEntry'
import s from './Timeline.module.css'

/** The record placed most recently during this visit. `n` changes with every placement. */
export interface LastPlaced {
  id: string
  correct: boolean
  n: number
}

export type Phase = 'open' | 'collapse' | 'closed'

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
/** a correct record drops into its slot */
const LOCK_MS = 320
/** a wrong record shakes where it was put, then slides to its true slot */
const SHAKE_MS = 450
const MISS_MS = 1000
/** auto-filed records file in one after another once the last miss has settled */
const AUTO_STEP_MS = 140
const AUTO_IN_MS = 420
/** branches retract one after another (keep in step with Timeline.module.css) */
export const COLLAPSE_MS = 600 + 5 * 60

/** How long the line takes to settle after a placement, before the collapse can start. */
export function settleMs(correct: boolean, autoFiled: number): number {
  const placed = correct ? LOCK_MS : MISS_MS
  return autoFiled > 0 ? MISS_MS + (autoFiled - 1) * AUTO_STEP_MS + AUTO_IN_MS : placed
}

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

const missFrames = (dy: number): Keyframe[] => [
  { transform: `translate(0, ${dy}px)`, offset: 0 },
  { transform: `translate(-7px, ${dy}px)`, offset: 0.09 },
  { transform: `translate(7px, ${dy}px)`, offset: 0.18 },
  { transform: `translate(-5px, ${dy}px)`, offset: 0.27 },
  { transform: `translate(3px, ${dy}px)`, offset: 0.36 },
  { transform: `translate(0, ${dy}px)`, offset: SHAKE_MS / MISS_MS },
  { transform: 'none', offset: 1 },
]

interface Snapshot {
  /** each record's top, relative to the list, before the placement */
  rects: Map<string, number>
  /** the centre of the slot that was chosen, relative to the list */
  from: number | null
  /** focus was on a slot, so it should stay in the slot group */
  hadFocus: boolean
}

interface Props {
  /** placed records, oldest first */
  line: readonly RetconDayRecord[]
  outcomes: ReadonlyMap<string, Outcome>
  /** slots are offered while a record is waiting to be placed */
  placing: boolean
  onPlace: (slot: number) => void
  last: LastPlaced | null
  /** records filed automatically during this visit file in with a stagger */
  animateAuto: boolean
  phase: Phase
}

/**
 * The main line, drawn vertically so it works on phones: placed records oldest at the top, with a
 * slot button before, between and after them. The slots are one roving-tabindex group.
 */
export default function Timeline({ line, outcomes, placing, onPlace, last, animateAuto, phase }: Props) {
  const hintId = useId()
  const listRef = useRef<HTMLOListElement>(null)
  const records = useRef(new Map<string, HTMLDivElement>())
  const slots = useRef<(HTMLButtonElement | null)[]>([])
  const snapshot = useRef<Snapshot | null>(null)
  const [active, setActive] = useState(line.length)
  const current = Math.min(active, line.length)

  const recordRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) records.current.set(id, el)
      else records.current.delete(id)
    },
    [],
  )

  const choose = (slot: number) => {
    const list = listRef.current
    if (list) {
      const top = list.getBoundingClientRect().top
      const rects = new Map<string, number>()
      records.current.forEach((el, id) => rects.set(id, el.getBoundingClientRect().top - top))
      const b = slots.current[slot]?.getBoundingClientRect()
      snapshot.current = {
        rects,
        from: b ? b.top + b.height / 2 - top : null,
        hadFocus: list.contains(document.activeElement),
      }
    }
    onPlace(slot)
  }

  const move = (slot: number) => {
    const next = Math.max(0, Math.min(line.length, slot))
    setActive(next)
    slots.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, slot: number) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        move(slot - 1)
        break
      case 'ArrowDown':
      case 'ArrowRight':
        move(slot + 1)
        break
      case 'Home':
        move(0)
        break
      case 'End':
        move(line.length)
        break
      default:
        return
    }
    e.preventDefault()
  }

  // After a placement: keep focus in the slot group, just below the record that was placed, and
  // play the FLIP (first, last, invert, play) from where things were to where they now are.
  const lastN = last?.n
  useLayoutEffect(() => {
    const snap = snapshot.current
    snapshot.current = null
    if (!last) return
    const idx = line.findIndex((r) => r.id === last.id)
    if (idx >= 0 && placing) {
      setActive(idx + 1)
      if (snap?.hadFocus) slots.current[idx + 1]?.focus()
    }
    const list = listRef.current
    if (!snap || !list || reducedMotion()) return
    const top = list.getBoundingClientRect().top
    records.current.forEach((el, id) => {
      if (typeof el.animate !== 'function') return
      const now = el.getBoundingClientRect()
      const nowTop = now.top - top
      if (id === last.id) {
        if (snap.from === null) return
        const dy = snap.from - (nowTop + now.height / 2)
        if (last.correct) {
          el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: LOCK_MS, easing: EASE })
        } else {
          el.animate(missFrames(dy), { duration: MISS_MS, easing: 'ease-in-out' })
        }
        return
      }
      const was = snap.rects.get(id)
      if (was === undefined) return
      const dy = was - nowTop
      if (Math.abs(dy) < 1) return
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
        duration: last.correct ? LOCK_MS : MISS_MS - SHAKE_MS,
        delay: last.correct ? 0 : SHAKE_MS,
        easing: EASE,
        fill: 'backwards',
      })
    })
    // Only a new placement replays this; `line` and `placing` change along with it.
  }, [lastN])

  let autoQueue = 0
  const slot = (i: number) => {
    const face = slotFace(line, i)
    return (
      <button
        ref={(el) => {
          slots.current[i] = el
        }}
        type="button"
        className={s.slot}
        tabIndex={i === current ? 0 : -1}
        aria-label={slotLabel(line, i)}
        onClick={() => choose(i)}
        onFocus={() => setActive(i)}
        onKeyDown={(e) => onKeyDown(e, i)}
      >
        <span className={s.ring} aria-hidden="true" />
        <span className={s.face} aria-hidden="true">
          {face.lead} <b>{face.year}</b>
        </span>
      </button>
    )
  }

  return (
    <div className={s.board} data-phase={phase}>
      {placing ? (
        <p id={hintId} className={s.hint}>
          Choose a slot. Arrow keys move between slots; Enter places the record.
        </p>
      ) : null}
      <div
        role={placing ? 'group' : undefined}
        aria-label={placing ? 'Timeline slots' : undefined}
        aria-describedby={placing ? hintId : undefined}
      >
        <ol ref={listRef} className={s.list} aria-label="Main line, oldest first">
          {line.map((r, i) => {
            const outcome = outcomes.get(r.id) ?? 'anchor'
            const auto = animateAuto && outcome === 'auto' ? autoQueue++ : null
            return (
              <li key={r.id} className={s.row}>
                {placing ? slot(i) : null}
                <RecordEntry
                  ref={recordRef(r.id)}
                  record={r}
                  outcome={outcome}
                  fresh={last?.id === r.id}
                  autoIndex={auto}
                  row={i}
                />
                {placing && i === line.length - 1 ? slot(line.length) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
