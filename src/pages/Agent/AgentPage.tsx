import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import type { GameId } from '../../content/types'
import { useProgress } from '../../data/progress'
import { useToday } from '../../data/useToday'
import { blistStats, filedBlistGames } from '../../games/blist/ui/stats'
import { retconStats } from '../../games/retcon/ui/stats'
import { unmaskedStats } from '../../games/unmasked/logic/stats'
import type { UnmaskedResult } from '../../lib/marks'
import { bestShifts, consecutiveShifts, shiftComplete, type Store } from '../../lib/progress'
import { addDays, formatMemoDate } from '../../lib/time'
import AppShell from '../../ui/AppShell'
import Paper from '../../ui/Paper'
import s from './AgentPage.module.css'

const HISTORY_DAYS = 35

type DayMark = 'complete' | 'partial' | 'none'

function dayMark(store: Store, date: string): DayMark {
  if (shiftComplete(store, date)) return 'complete'
  const games = store.days[date]?.games ?? {}
  return Object.values(games).some((g) => g?.status === 'filed') ? 'partial' : 'none'
}

const MARK_TEXT: Record<DayMark, string> = { complete: 'shift complete', partial: 'partly filed', none: 'no assignments filed' }
const MARK_GLYPH: Record<DayMark, string> = { complete: '■', partial: '◩', none: '·' }

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className={s.stat}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}

function Agent() {
  const today = useToday()
  const { store } = useProgress()
  const shiftsWorked = Object.keys(store.days).filter((d) => shiftComplete(store, d)).length
  const unmasked = useMemo(
    () =>
      unmaskedStats(
        Object.values(store.days).flatMap((d) => {
          const r = d.games.unmasked
          return r?.status === 'filed' && r.result ? [r.result as UnmaskedResult] : []
        }),
      ),
    [store.days],
  )
  const blist = useMemo(() => blistStats(filedBlistGames(store)), [store])
  const retcon = useMemo(() => retconStats(store), [store])
  const filed = (g: GameId) => Object.values(store.days).filter((d) => d.games[g]?.status === 'filed').length
  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(today, i - HISTORY_DAYS + 1))

  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.head}>
        <span className={s.tag}>Form 2A · Agent file</span>
        <h1 className={s.h1}>Agent file</h1>
        <p className={s.lede}>Agent registration opens soon. Until then, this file is kept on this device only.</p>
      </header>

      <Paper className={s.card}>
        <dl className={s.grid}>
          <Stat k="Agent number" v="Unregistered" />
          <Stat k="Shifts worked" v={shiftsWorked} />
          <Stat k="Consecutive shifts" v={consecutiveShifts(store, today)} />
          <Stat k="Best run" v={bestShifts(store)} />
        </dl>
      </Paper>

      <section className={s.section} aria-labelledby="games-h">
        <h2 id="games-h" className={s.h2}>Assignments on file</h2>
        <div className={s.games}>
          <Paper className={s.game}>
            <h3 className={s.h3}>Unmasked</h3>
            <dl className={s.grid}>
              <Stat k="Cases filed" v={filed('unmasked')} />
              <Stat k="Identified" v={unmasked.played ? `${Math.round((unmasked.solved / unmasked.played) * 100)}%` : '—'} />
              <Stat k="Most often in" v={unmasked.solved ? `${unmasked.distribution.indexOf(Math.max(...unmasked.distribution)) + 1} attempts` : '—'} />
            </dl>
          </Paper>
          <Paper className={s.game}>
            <h3 className={s.h3}>B-List</h3>
            <dl className={s.grid}>
              <Stat k="Shifts filed" v={blist.played} />
              <Stat k="Average" v={blist.average ?? '—'} />
              <Stat k="Best" v={blist.best ?? '—'} />
              <Stat k="Deepest" v={blist.deepest === null ? '—' : blist.deepest === 0 ? 'Ground level' : `B${blist.deepest}`} />
            </dl>
          </Paper>
          <Paper className={s.game}>
            <h3 className={s.h3}>Retcon</h3>
            <dl className={s.grid}>
              <Stat k="Cases filed" v={retcon.filed} />
              <Stat k="Perfect days" v={retcon.perfect} />
              <Stat k="Average in order" v={retcon.average === null ? '—' : retcon.average.toFixed(1)} />
            </dl>
          </Paper>
        </div>
      </section>

      <section className={s.section} aria-labelledby="hist-h">
        <h2 id="hist-h" className={s.h2}>Last {HISTORY_DAYS} days</h2>
        <ol className={s.history} aria-label={`Shift history, last ${HISTORY_DAYS} days`}>
          {history.map((d) => {
            const m = dayMark(store, d)
            return (
              <li key={d} className={`${s.cell} ${s[m]}`} title={`${formatMemoDate(d)}: ${MARK_TEXT[m]}`}>
                <span aria-hidden="true">{MARK_GLYPH[m]}</span>
                <span className="sr-only">{`${formatMemoDate(d)}: ${MARK_TEXT[m]}`}</span>
              </li>
            )
          })}
        </ol>
        <p className={s.legend}>■ shift complete · ◩ partly filed · · nothing filed</p>
      </section>

      <Link to="/" className={s.back}>Back to the desk</Link>
    </div>
  )
}

export default function AgentPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Agent file · Marvelous'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <AppShell section="Agent file">
      <Agent />
    </AppShell>
  )
}
