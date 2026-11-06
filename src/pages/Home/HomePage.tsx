import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameId } from '../../content/types'
import { useProgress } from '../../data/progress'
import { useDay, type DayStatus } from '../../data/useDay'
import { useToday } from '../../data/useToday'
import type { UnmaskedResult } from '../../lib/marks'
import { assignmentStatus, consecutiveShifts, getRecord, noteRequired, type Store } from '../../lib/progress'
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

const AWAITING: Standing = { status: 'unavailable', statusText: 'Awaiting clearance' }

function unmaskedStanding(store: Store, date: string, day: DayStatus): Standing {
  if (day === 'none') return { status: 'unavailable', statusText: 'Not issued' }
  if (day === 'error') return { status: 'unavailable', statusText: 'No signal' }
  const status = assignmentStatus(store, date, 'unmasked')
  const to = '/unmasked'
  if (status === 'pending') return { status, statusText: 'Pending', to }
  if (status === 'in_progress') return { status, statusText: 'In progress', to }
  const result = getRecord(store, date, 'unmasked')?.result as UnmaskedResult | undefined
  if (!result) return { status, statusText: 'Filed', to }
  return { status, statusText: `Filed ${result.solved ? result.attempts : 'X'}/6`, to }
}

function buildAssignments(store: Store, date: string, day: DayStatus): Assignment[] {
  return [
    { id: 'unmasked', no: '01', title: 'Unmasked', subtitle: 'Identify the variant', ...unmaskedStanding(store, date, day) },
    { id: 'blist', no: '02', title: 'B-List', subtitle: 'Records search', ...AWAITING },
    { id: 'retcon', no: '03', title: 'Retcon', subtitle: 'Timeline repair', ...AWAITING },
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

  const assignments = useMemo(() => buildAssignments(store, today, status), [store, today, status])
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
