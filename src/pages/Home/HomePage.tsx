import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameId } from '../../content/types'
import { useProgress } from '../../data/progress'
import { useDay, type DayStatus } from '../../data/useDay'
import { useToday } from '../../data/useToday'
import type { UnmaskedResult } from '../../lib/marks'
import { assignmentStatus, consecutiveShifts, getRecord, noteRequired, shiftComplete, type Store } from '../../lib/progress'
import type { BlistReport, RetconReport } from '../../lib/share'
import { formatCountdown, formatMemoDate } from '../../lib/time'
import AppShell from '../../ui/AppShell'
import Honeycomb from '../../ui/Honeycomb'
import { useAnnounce } from '../../ui/LiveRegion'
import type { TicketStatus } from '../../ui/Ticket'
import WalnutWall from '../../ui/WalnutWall'
import BranchMonitor from './BranchMonitor'
import ShiftDesk from './ShiftDesk'
import { useCountdown } from './useCountdown'
import s from './HomePage.module.css'

/** One of today's three assignments, as the monitor and the desk show it. */
export interface Assignment {
  id: GameId
  no: string
  title: string
  subtitle: string
  status: TicketStatus
  statusText: string
  /** route to the game, when it can be opened now */
  to?: string
}

type Standing = Pick<Assignment, 'status' | 'statusText' | 'to'>

const ROUTES: Record<GameId, string> = { unmasked: '/unmasked', blist: '/b-list', retcon: '/retcon' }

/** "Filed 3/6", "Filed 370/700", "Filed 4/5"; plain "Filed" if the result is missing. */
function filedText(store: Store, date: string, game: GameId): string {
  const result = getRecord(store, date, game)?.result
  if (!result) return 'Filed'
  if (game === 'unmasked') {
    const r = result as UnmaskedResult
    return `Filed ${r.solved ? r.attempts : 'X'}/6`
  }
  if (game === 'blist') return `Filed ${(result as BlistReport).score}/700`
  return `Filed ${(result as RetconReport).correct}/5`
}

function standing(store: Store, date: string, day: DayStatus, games: readonly GameId[] | undefined, game: GameId): Standing {
  if (day === 'none') return { status: 'unavailable', statusText: 'Not issued' }
  if (day === 'error') return { status: 'unavailable', statusText: 'No signal' }
  // Unmasked always runs; the other two only on days that schedule them.
  if (games && !games.includes(game)) return { status: 'unavailable', statusText: 'Not issued today' }
  const status = assignmentStatus(store, date, game)
  const to = ROUTES[game]
  if (status === 'pending') return { status, statusText: 'Pending', to }
  if (status === 'in_progress') return { status, statusText: 'In progress', to }
  return { status, statusText: filedText(store, date, game), to }
}

function buildAssignments(store: Store, date: string, day: DayStatus, games: readonly GameId[] | undefined): Assignment[] {
  return [
    { id: 'unmasked', no: '01', title: 'Unmasked', subtitle: 'Identify the variant', ...standing(store, date, day, games, 'unmasked') },
    { id: 'blist', no: '02', title: 'B-List', subtitle: 'Records search', ...standing(store, date, day, games, 'blist') },
    { id: 'retcon', no: '03', title: 'Retcon', subtitle: 'Timeline repair', ...standing(store, date, day, games, 'retcon') },
  ]
}

function Home() {
  const today = useToday()
  const { status, bundle, retry } = useDay(today)
  const { store, update } = useProgress()
  const msRemaining = useCountdown()
  const announce = useAnnounce()
  const [rolledOver, setRolledOver] = useState(false)

  // Streaks count a shift as complete when every required game is filed, so record today's list once.
  const noted = useRef<string | null>(null)
  useEffect(() => {
    if (status !== 'ready' || !bundle || noted.current === bundle.date) return
    noted.current = bundle.date
    update((st) => noteRequired(st, bundle.date, bundle.games))
  }, [status, bundle, update])

  // Midnight with the page open: everything follows `today`; this only tells the agent.
  const shownDate = useRef(today)
  useEffect(() => {
    if (shownDate.current === today) return
    shownDate.current = today
    setRolledOver(true)
    announce('New assignments issued.')
  }, [today, announce])

  const games = status === 'ready' ? bundle?.games : undefined
  const assignments = useMemo(() => buildAssignments(store, today, status, games), [store, today, status, games])
  const date = formatMemoDate(today)
  const heading = bundle ? `SHIFT #${String(bundle.number).padStart(3, '0')} · ${date}` : date

  return (
    <>
      <h1 className="sr-only">Marvelous</h1>
      <div className={s.scene}>
        <Honeycomb />
        <WalnutWall>
          <div className={`wrap ${s.room}`}>
            <BranchMonitor
              date={today}
              assignments={assignments}
              shiftNo={bundle?.number}
              countdown={formatCountdown(msRemaining)}
            />
            <ShiftDesk
              heading={heading}
              status={status}
              assignments={assignments}
              onRetry={retry}
              consecutive={consecutiveShifts(store, today)}
              msRemaining={msRemaining}
              notice={rolledOver ? 'New assignments issued' : undefined}
              shiftDone={shiftComplete(store, today)}
            />
          </div>
        </WalnutWall>
      </div>
    </>
  )
}

export default function HomePage() {
  return (
    <AppShell section="Front desk">
      <Home />
    </AppShell>
  )
}
