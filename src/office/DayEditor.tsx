import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import { buildSearchIndex, searchCharacters } from '../games/unmasked/logic/search'
import { toPublic, UNMASKED_COOLDOWN_DAYS } from '../content/validate'
import { daysBetween } from '../lib/time'
import type { Character, Issue, Schedule } from '../content/types'
import s from './Office.module.css'

interface Props {
  date: string
  schedule: Schedule
  chars: Character[]
  issues: Issue[]
  onPick: (id: string) => void
  onClear: () => void
}

export default function DayEditor({ date, schedule, chars, issues, onPick, onClear }: Props) {
  const [query, setQuery] = useState('')
  const pool = useMemo(() => chars.filter((c) => c.answerOk), [chars])
  const index = useMemo(() => buildSearchIndex(pool.map(toPublic)), [pool])
  const byId = useMemo(() => new Map(chars.map((c) => [c.id, c])), [chars])
  const current = schedule.days[date]?.unmasked

  /** Nearest other day (before or after) this character is scheduled. */
  const nearest = (id: string) => {
    let best: string | null = null
    for (const [d, e] of Object.entries(schedule.days)) {
      if (d === date || e.unmasked !== id) continue
      if (best === null || Math.abs(daysBetween(d, date)) < Math.abs(daysBetween(best, date))) best = d
    }
    return best
  }

  const results = searchCharacters(index, query, 8)
  const mine = issues.filter((i) => i.path.startsWith(`days.${date}`))

  return (
    <section className={s.panel} aria-labelledby="day-h">
      <h2 id="day-h" className={s.h}>Day {date}</h2>
      <p className={s.row}>
        <span>Answer: <strong>{current ? (byId.get(current)?.name ?? `unknown (${current})`) : 'none'}</strong></span>
        {current ? <Button onClick={onClear}>Clear day</Button> : null}
      </p>
      {mine.map((i) => <p key={i.path + i.message} className={i.level === 'error' ? s.err : s.warn} role="alert">{i.message}</p>)}
      <label className={s.field}>
        <span className={s.lbl}>Search answer pool ({pool.length})</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, alias or real name" />
      </label>
      <ul className={s.results}>
        {results.map((r) => {
          const c = byId.get(r.id)!
          const last = nearest(c.id)
          const blocked = last !== null && Math.abs(daysBetween(last, date)) < UNMASKED_COOLDOWN_DAYS
          return (
            <li key={c.id}>
              <button type="button" className={s.result} disabled={blocked} onClick={() => { onPick(c.id); setQuery('') }}>
                <span className={s.who}>{c.name}</span>
                <span className={s.tag}>D{c.difficulty}</span>
                <span className={s.sub}>
                  {last ? `${blocked ? 'Cooldown: ' : 'Also '}${last}` : 'Never used'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
