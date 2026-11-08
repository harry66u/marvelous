import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import { buildSearchIndex, searchCharacters } from '../games/unmasked/logic/search'
import { toPublic, UNMASKED_COOLDOWN_DAYS } from '../content/validate'
import { daysBetween, etDateOf } from '../lib/time'
import type { BlistPrompt, Character, Issue, RetconRecord, Schedule } from '../content/types'
import s from './Office.module.css'

interface Props {
  date: string
  schedule: Schedule
  chars: Character[]
  issues: Issue[]
  onPick: (id: string) => void
  onClear: () => void
  prompts?: readonly BlistPrompt[]
  records?: readonly RetconRecord[]
  /** clear a day's B-List or Retcon set; `reroll` fills it again */
  onGame?: (game: 'blist' | 'retcon', reroll: boolean) => void
}

const TIER_ORDER = ['common', 'filed', 'restricted', 'classified', 'sealed'] as const

export default function DayEditor({ date, schedule, chars, issues, onPick, onClear, prompts = [], records = [], onGame }: Props) {
  const [query, setQuery] = useState('')
  const [unlocked, setUnlocked] = useState<string | null>(null)
  // Today and earlier have already been issued: players may be mid-case with the current answer.
  const issued = daysBetween(etDateOf(new Date()), date) <= 0
  const locked = issued && unlocked !== date
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
        {current ? <Button onClick={onClear} disabled={locked}>Clear day</Button> : null}
      </p>
      {issued ? (
        <label className={s.warn}>
          <input type="checkbox" checked={!locked} onChange={(e) => setUnlocked(e.target.checked ? date : null)} />{' '}
          This day has already been issued. Changing it affects agents who are mid-case; I understand.
        </label>
      ) : null}
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
              <button type="button" className={s.result} disabled={blocked || locked} onClick={() => { onPick(c.id); setQuery('') }}>
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
      <GameSets date={date} schedule={schedule} prompts={prompts} records={records} locked={locked} onGame={onGame} />
    </section>
  )
}

function GameSets({ date, schedule, prompts, records, locked, onGame }: {
  date: string
  schedule: Schedule
  prompts: readonly BlistPrompt[]
  records: readonly RetconRecord[]
  locked: boolean
  onGame?: (game: 'blist' | 'retcon', reroll: boolean) => void
}) {
  const promptById = useMemo(() => new Map(prompts.map((p) => [p.id, p])), [prompts])
  const recordById = useMemo(() => new Map(records.map((r) => [r.id, r])), [records])
  const day = schedule.days[date]
  const blist = day?.blist ?? []
  const retcon = day?.retcon ?? []
  const tools = (game: 'blist' | 'retcon', has: boolean) =>
    onGame ? (
      <span className={s.row}>
        <Button onClick={() => onGame(game, true)} disabled={locked || !day?.unmasked}>{has ? 'Re-roll' : 'Fill'}</Button>
        {has ? <Button onClick={() => onGame(game, false)} disabled={locked}>Clear</Button> : null}
      </span>
    ) : null
  return (
    <>
      <h3 className={s.h}>B-List requests</h3>
      {tools('blist', blist.length > 0)}
      {blist.length === 0 ? <p className={s.note}>No B-List shift on this day.</p> : (
        <ol className={s.results}>
          {blist.map((id) => {
            const p = promptById.get(id)
            const counts = p ? TIER_ORDER.map((t) => p.answers.filter((a) => a.tier === t).length) : []
            return (
              <li key={id} className={s.result}>
                <span className={s.who}>{p?.text ?? `unknown (${id})`}</span>
                {p ? <span className={s.tag}>D{p.difficulty}</span> : null}
                {p ? <span className={s.sub}>{p.answers.length} answers · {counts.join(' / ')} by tier</span> : null}
              </li>
            )
          })}
        </ol>
      )}
      <h3 className={s.h}>Retcon records</h3>
      {tools('retcon', retcon.length > 0)}
      {retcon.length === 0 ? <p className={s.note}>No Retcon case on this day.</p> : (
        <ol className={s.results}>
          {retcon.map((id, i) => {
            const r = recordById.get(id)
            return (
              <li key={id} className={s.result}>
                <span className={s.who}>{r?.text ?? `unknown (${id})`}{i === 0 ? ' · anchor' : ''}</span>
                {r ? <span className={s.tag}>{r.date}</span> : null}
                {r?.detail ? <span className={s.sub}>{r.detail}</span> : null}
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
