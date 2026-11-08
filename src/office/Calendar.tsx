import { useEffect, useRef } from 'react'
import { addDays, etDateOf } from '../lib/time'
import type { Character, Issue, Schedule } from '../content/types'
import { FUTURE_DAYS, PAST_DAYS } from './officeStore'
import s from './Office.module.css'

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
const label = (date: string) => DAY.format(new Date(date + 'T00:00:00Z'))

interface Props {
  schedule: Schedule
  chars: Character[]
  issues: Issue[]
  selected: string | null
  onSelect: (date: string) => void
}

export default function Calendar({ schedule, chars, issues, selected, onSelect }: Props) {
  const today = etDateOf(new Date())
  const list = useRef<HTMLUListElement>(null)
  // Open scrolled to today rather than 14 days back.
  useEffect(() => {
    const el = list.current
    const row = el?.querySelector<HTMLElement>('[data-today]')
    if (el && row) el.scrollTop = row.offsetTop
  }, [])
  const byId = new Map(chars.map((c) => [c.id, c]))
  const bad = new Set(issues.filter((i) => i.level === 'error').map((i) => /^days\.([\d-]+)/.exec(i.path)?.[1]))
  const dates = Array.from({ length: PAST_DAYS + FUTURE_DAYS }, (_, i) => addDays(today, i - PAST_DAYS))

  return (
    <ul ref={list} className={s.cal} aria-label="Schedule, past 14 days and next 90">
      {dates.map((d) => {
        const id = schedule.days[d]?.unmasked
        const c = id ? byId.get(id) : undefined
        const missing = id === undefined && d >= today && d < addDays(today, 14)
        const cls = [s.day, d === selected ? s.sel : '', d < today ? s.past : '', missing ? s.missing : ''].join(' ')
        return (
          <li key={d} data-today={d === today ? '' : undefined}>
            <button type="button" className={cls} aria-pressed={d === selected} onClick={() => onSelect(d)}>
              <span className={s.date}>{label(d)}{d === today ? ' · today' : ''}</span>
              <span className={s.who}>{id === undefined ? (missing ? 'UNSCHEDULED' : '—') : (c?.name ?? `? ${id}`)}</span>
              <span className={s.tag}>
                {bad.has(d) ? <b className={s.err}>ERROR</b> : null}
                {c ? `D${c.difficulty}` : ''}
                {schedule.days[d]?.blist ? ' · B' : ''}
                {schedule.days[d]?.retcon ? ' · R' : ''}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
