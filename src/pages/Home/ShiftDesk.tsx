import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { DayStatus } from '../../data/useDay'
import { formatCountdown } from '../../lib/time'
import SettingsDialog from '../../settings/SettingsDialog'
import Button from '../../ui/Button'
import Clock24 from '../../ui/Clock24'
import DisplayText from '../../ui/DisplayText'
import { Icon } from '../../ui/icons'
import Ticket from '../../ui/Ticket'
import type { Assignment } from './HomePage'
import s from './ShiftDesk.module.css'

const REGISTRATION_NOTE = 'Agent registration opens soon. Your shifts are kept on this device.'
const NONE_COPY = 'No assignments have been issued for this date. Please remain at your desk.'
const ERROR_COPY = 'Transmission interrupted. Check your connection, then retry.'

export interface ShiftDeskProps {
  /** e.g. "SHIFT #002 · 07 NOV 2026" */
  heading: string
  status: DayStatus
  assignments: Assignment[]
  onRetry: () => void
  consecutive: number
  msRemaining: number
  /** shown beside the heading, e.g. after the midnight rollover */
  notice?: string
  /** every assignment today is filed */
  shiftDone?: boolean
}

function Tickets({ assignments }: { assignments: Assignment[] }) {
  return (
    <ol className={s.tickets} role="list" aria-label="Today's assignments">
      {assignments.map((a) => {
        const ticket = (
          <Ticket no={a.no} title={a.title} subtitle={a.subtitle} status={a.status} statusText={a.statusText} />
        )
        return (
          <li key={a.id}>
            {a.to ? <Link to={a.to} className={s.ticketLink}>{ticket}</Link> : ticket}
          </li>
        )
      })}
    </ol>
  )
}

function DayNotice({ status, onRetry }: { status: 'none' | 'error'; onRetry: () => void }) {
  return status === 'none' ? (
    <div className={s.memo} role="status">
      <p className={s.memoText}>{NONE_COPY}</p>
    </div>
  ) : (
    <div className={s.memo} role="alert">
      <p className={s.memoText}>{ERROR_COPY}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  )
}

/** Below the monitor: today's tickets, consecutive shifts and the wall clock. */
export default function ShiftDesk({ heading, status, assignments, onRetry, consecutive, msRemaining, notice, shiftDone }: ShiftDeskProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const headingId = useId()
  const shiftsId = useId()
  const captionId = useId()
  return (
    <section className={s.desk} aria-labelledby={headingId}>
      <header className={s.bar}>
        <h2 id={headingId} className={s.heading}>{heading}</h2>
        {notice ? <p className={s.notice}>{notice}</p> : null}
        <div className={s.tools}>
          <Link to="/agent" className={s.tool}>
            <Icon name="stats" className={s.icon} />Agent file
          </Link>
          <Link to="/manual" className={s.tool}>
            <Icon name="manual" className={s.icon} />Field manual
          </Link>
          <button type="button" className={s.tool} onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" className={s.icon} />Settings
          </button>
        </div>
      </header>

      {shiftDone ? (
        <div className={s.endShift} role="status">
          <p className={s.endText}>End of shift. Every assignment is filed.</p>
          <Link to="/shift" className={s.endLink}>Review the shift report</Link>
        </div>
      ) : null}

      <div className={s.grid}>
        {status === 'none' || status === 'error' ? (
          <DayNotice status={status} onRetry={onRetry} />
        ) : (
          <Tickets assignments={assignments} />
        )}

        <div className={s.shifts} role="group" aria-labelledby={shiftsId}>
          <p id={shiftsId} className={s.k}>Consecutive shifts</p>
          <DisplayText text={String(consecutive)} className={s.big} tone="dark" />
          <p className={s.note}>{REGISTRATION_NOTE}</p>
        </div>

        <figure className={s.clock} aria-labelledby={captionId}>
          <Clock24 msRemaining={msRemaining} />
          <figcaption id={captionId} className={s.caption}>
            <span className={s.k}>Next assignment in</span>{' '}
            <span className={s.cd}>{formatCountdown(msRemaining)}</span>
          </figcaption>
        </figure>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </section>
  )
}
