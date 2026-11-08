import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import type { GameId } from '../../content/types'
import { useProgress } from '../../data/progress'
import { useDay } from '../../data/useDay'
import { useReport } from '../../data/useReport'
import { useToday } from '../../data/useToday'
import { sublevelLabel } from '../../games/blist/logic/game'
import type { UnmaskedResult } from '../../lib/marks'
import { consecutiveShifts, getRecord, shiftComplete } from '../../lib/progress'
import type { BlistReport, RetconReport } from '../../lib/share'
import { formatMemoDate } from '../../lib/time'
import AppShell from '../../ui/AppShell'
import CopyReport from '../../ui/CopyReport'
import DisplayText from '../../ui/DisplayText'
import Paper from '../../ui/Paper'
import TileFloor from '../../ui/TileFloor'
import s from './ShiftPage.module.css'

const GAMES: { id: GameId; title: string; to: string }[] = [
  { id: 'unmasked', title: 'Unmasked', to: '/unmasked' },
  { id: 'blist', title: 'B-List', to: '/b-list' },
  { id: 'retcon', title: 'Retcon', to: '/retcon' },
]

/** One line per game: what was filed, or what is still open. */
function summary(id: GameId, result: unknown, status: 'pending' | 'in_progress' | 'filed'): string {
  if (status === 'pending') return 'Pending'
  if (status === 'in_progress') return 'In progress'
  if (!result) return 'Filed'
  if (id === 'unmasked') {
    const r = result as UnmaskedResult
    return r.solved ? `Identified in ${r.attempts} of 6` : 'Not identified'
  }
  if (id === 'blist') {
    const r = result as BlistReport
    return `${r.score} / 700 · ${sublevelLabel(r.score)}${r.extended ? ' · extended timer' : ''}`
  }
  const r = result as RetconReport
  return `${r.correct} of 5 in order`
}

function Shift() {
  const today = useToday()
  const { status, bundle } = useDay(today)
  const { store } = useProgress()
  const report = useReport()
  const games = useMemo<GameId[]>(
    () => bundle?.games ?? (store.days[today]?.required.length ? store.days[today]!.required : ['unmasked']),
    [bundle, store.days, today],
  )
  const done = shiftComplete(store, today)
  const streak = consecutiveShifts(store, today)
  const number = bundle?.number ?? 0

  return (
    <div className={`wrap ${s.page}`}>
      <TileFloor>
        <div className={s.inner}>
          <header className={s.head}>
            <span className={s.tag}>Form 9S · End of shift</span>
            <h1 className={s.h1}>{done ? 'End of shift' : 'Shift in progress'}</h1>
            <p className={s.lede}>
              {formatMemoDate(today)}
              {number ? ` · Shift #${String(number).padStart(3, '0')}` : ''}
              {status === 'error' ? ' · No signal from the Archive; showing what this device has on file.' : ''}
            </p>
          </header>

          <Paper className={s.sheet}>
            <ol className={s.list} aria-label="Today's assignments">
              {GAMES.filter((g) => games.includes(g.id)).map((g) => {
                const rec = getRecord(store, today, g.id)
                const st = rec?.status ?? 'pending'
                return (
                  <li key={g.id} className={s.item}>
                    <span className={s.game}>{g.title}</span>
                    <span className={st === 'filed' ? s.filed : s.open}>{summary(g.id, rec?.result, st)}</span>
                    {st !== 'filed' ? <Link className={s.go} to={g.to}>Open {g.title}</Link> : null}
                  </li>
                )
              })}
            </ol>
            <div className={s.streak}>
              <span className={s.k}>Consecutive shifts</span>
              <DisplayText text={String(streak)} tone="paper" className={s.big} />
            </div>
          </Paper>

          <section className={s.report} aria-labelledby="report-h">
            <h2 id="report-h" className={s.h2}>Shift report</h2>
            <CopyReport text={report(today, number, games)} />
          </section>

          <nav className={s.links} aria-label="Next">
            <Link to="/agent" className={s.link}>Agent file</Link>
            <Link to="/" className={s.link}>Back to the desk</Link>
          </nav>
        </div>
      </TileFloor>
    </div>
  )
}

export default function ShiftPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'End of shift · Marvelous'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <AppShell section="End of shift">
      <Shift />
    </AppShell>
  )
}
