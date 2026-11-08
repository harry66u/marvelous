import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { playSfx, setSfxEnabled } from '../../../audio/sfx'
import type { GameId } from '../../../content/types'
import { useProgress, useSettings } from '../../../data/progress'
import { useReport } from '../../../data/useReport'
import { etWallClock, formatMemoDate } from '../../../lib/time'
import type { RetconDayRecord } from '../../../server/dayBundle'
import SettingsDialog from '../../../settings/SettingsDialog'
import ActionList from '../../../ui/ActionList'
import AppShell from '../../../ui/AppShell'
import Button from '../../../ui/Button'
import DisplayText from '../../../ui/DisplayText'
import IconRail from '../../../ui/IconRail'
import { useAnnounce } from '../../../ui/LiveRegion'
import TerminalFrame from '../../../ui/TerminalFrame'
import {
  ALLOWANCES,
  PLACEMENTS,
  correctCount,
  pending,
  timeline,
  yearOf,
  type Placement,
  type RetconState,
} from '../logic/game'
import EndPanel, { scoreCopy } from './EndPanel'
import FieldManual from './FieldManual'
import IncomingCard from './IncomingCard'
import { allowancesLeft, caseCode, whereItBelongs, type Outcome } from './labels'
import { retconStats } from './stats'
import StatsDialog from './StatsDialog'
import Timeline, { COLLAPSE_MS, settleMs, type LastPlaced, type Phase } from './Timeline'
import { useRetconGame } from './useRetconGame'
import s from './RetconPage.module.css'

const ALL_GAMES: GameId[] = ['unmasked', 'blist', 'retcon']

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

/** Focus is on <body>, or still on a control inside a dialog that just closed. */
function focusIsStranded(): boolean {
  const active = document.activeElement
  return !active || active === document.body || active.closest('dialog:not([open])') !== null
}

const pad = (n: number) => String(n).padStart(2, '0')

function useEtTime(): string {
  const read = () => {
    const w = etWallClock(new Date())
    return `${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`
  }
  const [time, setTime] = useState(read)
  useEffect(() => {
    const id = setInterval(() => setTime(read()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

/** The frame owns the ticking clock, so only the edge code re-renders every second. */
function Terminal({ codes, rail, children }: { codes: { tl: string; tr: string; br?: string }; rail: ReactNode; children: ReactNode }) {
  const time = useEtTime()
  return (
    <TerminalFrame label="Retcon terminal" rail={rail} codes={{ ...codes, bl: `${time} ET` }}>
      {children}
    </TerminalFrame>
  )
}

/** Three pips: lit while the allowance is available, struck through once spent. */
function Meter({ left, justLost }: { left: number; justLost: boolean }) {
  return (
    <div className={s.meter} role="img" aria-label={`${left} of ${ALLOWANCES} variance allowances left`}>
      <span className={s.meterLabel} aria-hidden="true">Variance allowances</span>
      <span className={s.pips} aria-hidden="true">
        {Array.from({ length: ALLOWANCES }, (_, i) => {
          const spent = i >= left
          const cls = [spent ? s.spent : s.lit, spent && justLost && i === left ? s.lost : ''].filter(Boolean).join(' ')
          return <i key={i} className={cls} />
        })}
      </span>
    </div>
  )
}

/** Placed records, oldest first, as the full day records. */
function lineOf(state: RetconState, cards: ReadonlyMap<string, RetconDayRecord>): RetconDayRecord[] {
  return timeline(state, cards).flatMap((c) => cards.get(c.id) ?? [])
}

type DialogName = 'manual' | 'stats' | 'settings'

function Game() {
  const game = useRetconGame()
  const { store } = useProgress()
  const [settings, patchSettings] = useSettings()
  const announce = useAnnounce()
  const shiftReport = useReport()
  const [dialog, setDialog] = useState<DialogName | null>(() => (settings.seenManual.retcon ? null : 'manual'))
  const [last, setLast] = useState<LastPlaced | null>(null)
  const [closedHere, setClosedHere] = useState(false)
  const [phase, setPhase] = useState<Phase>('open')
  const [stamped, setStamped] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const verdictRef = useRef<HTMLHeadingElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  const focusSlot = () => boardRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus()

  // The first-visit manual opens on its own, so closing it leaves focus nowhere. With a mouse or
  // keyboard, hand it to the slots (as soon as the case has loaded); on touch screens, leave it.
  const lastDialog = useRef(dialog)
  const slotWantsFocus = useRef(false)
  useEffect(() => {
    const closed = lastDialog.current !== null && dialog === null
    lastDialog.current = dialog
    if (closed && typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches) {
      slotWantsFocus.current = true
    }
  }, [dialog])
  useEffect(() => {
    if (!slotWantsFocus.current || !boardRef.current) return
    slotWantsFocus.current = false
    if (focusIsStranded()) focusSlot()
  }, [dialog, game.status])

  const { state, cards } = game
  const ended = state !== null && state.status !== 'playing'
  const line = useMemo(() => (state ? lineOf(state, cards) : []), [state, cards])
  const outcomes = useMemo(() => {
    const map = new Map<string, Outcome>()
    state?.order.forEach((id, i) => {
      const p = i === 0 ? 'anchor' : state.placements[i - 1]
      if (p) map.set(id, p)
    })
    return map
  }, [state])
  const filed = useMemo(
    () =>
      (state?.order.slice(1, 1 + state.placements.length) ?? []).flatMap((id, i) => {
        const record = cards.get(id)
        const outcome: Placement | undefined = state?.placements[i]
        return record && outcome ? [{ record, outcome }] : []
      }),
    [state, cards],
  )
  const pendingId = state ? pending(state) : null
  const incoming = pendingId ? cards.get(pendingId) : undefined

  // The verdict takes focus as soon as the case closes; the view follows once the stamp lands.
  useEffect(() => {
    if (ended && closedHere) verdictRef.current?.focus({ preventScroll: !reducedMotion() })
  }, [ended, closedHere])

  const onPlace = (slot: number) => {
    if (!state || !pendingId) return
    const record = cards.get(pendingId)
    const out = game.place(slot)
    if (!out || !record) return
    setLast({ id: record.id, correct: out.correct, n: (last?.n ?? 0) + 1 })
    playSfx(out.correct ? 'place' : 'miss')

    // Where it went among the records already on the line (records filed automatically come later).
    const year = yearOf(record.date)
    const after = [...line.slice(0, out.slot), record, ...line.slice(out.slot)]
    const parts = [
      out.correct
        ? `Correct. ${record.text}, ${year}.`
        : `Out of order. It belongs ${whereItBelongs(after, out.slot)}, filed under ${year}. ${allowancesLeft(out.state.allowances)}.`,
    ]
    const next = pending(out.state)
    if (out.state.status === 'playing') {
      const nextRecord = next ? cards.get(next) : undefined
      if (nextRecord) parts.push(`Incoming record: ${nextRecord.text}.`)
      announce(parts.join(' '))
      return
    }

    const won = out.state.status === 'won'
    const autos = out.state.placements.filter((p) => p === 'auto').length
    if (!won) {
      parts.push(
        autos > 0
          ? `Variance limit reached. The remaining ${autos === 1 ? 'record was' : `${autos} records were`} filed automatically.`
          : 'Variance limit reached.',
      )
    }
    parts.push(`Case closed. ${scoreCopy(correctCount(out.state))}.`)
    announce(parts.join(' '))

    setClosedHere(true)
    setStamped(false)
    const land = () => {
      setPhase('closed')
      setStamped(true)
      playSfx('stamp')
      later(() => playSfx(won ? 'win' : 'lose'), 320)
      endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
    }
    if (reducedMotion()) {
      land()
      return
    }
    // The last record settles, the branches retract into the main line, then the stamp lands.
    setPhase('open')
    const settle = settleMs(out.correct, autos)
    later(() => setPhase('collapse'), settle)
    later(land, settle + COLLAPSE_MS + 120)
  }

  const closeDialog = () => {
    if (dialog === 'manual' && !settings.seenManual.retcon) {
      patchSettings({ seenManual: { ...settings.seenManual, retcon: true } })
    }
    setDialog(null)
  }

  const toggleSound = () => {
    const on = !settings.sound
    patchSettings({ sound: on })
    setSfxEnabled(on)
    if (on) playSfx('submit')
  }

  const stats = useMemo(() => retconStats(store), [store])

  const report = () => {
    const required = game.games.length > 0 ? game.games : store.days[game.date]?.required
    return shiftReport(game.date, game.number ?? 0, required && required.length > 0 ? required : ALL_GAMES)
  }

  const placed = state?.placements.length ?? 0
  const ready = game.status === 'ready' && state !== null && game.number !== null

  const rail = (
    <IconRail
      items={[
        { id: 'home', label: 'Back to the desk', icon: 'home', href: '/' },
        { id: 'manual', label: 'Field manual', icon: 'manual', onSelect: () => setDialog('manual') },
        { id: 'stats', label: 'Statistics', icon: 'stats', onSelect: () => setDialog('stats') },
        {
          id: 'sound',
          label: 'Sound effects',
          icon: settings.sound ? 'sound-on' : 'sound-off',
          pressed: settings.sound,
          onSelect: toggleSound,
        },
        { id: 'settings', label: 'Settings', icon: 'settings', onSelect: () => setDialog('settings') },
      ]}
    />
  )

  const actions = [
    ended
      ? { label: 'Review case file', onSelect: () => verdictRef.current?.focus() }
      : { label: 'Resume case', onSelect: focusSlot },
    { label: 'Field manual', onSelect: () => setDialog('manual') },
    { label: 'File statistics', onSelect: () => setDialog('stats') },
    { label: 'Back to the desk', href: '/' },
  ]

  let play: ReactNode
  if (game.status === 'loading') {
    play = <p className={s.loading} role="status">Retrieving the case file…</p>
  } else if (game.status === 'none') {
    play = (
      <div className={s.notice}>
        <p>No assignments have been issued for this date. Please remain at your desk.</p>
        <Link className={s.link} to="/">Back to the desk</Link>
      </div>
    )
  } else if (!ready) {
    play = (
      <div className={s.notice}>
        <p>
          {game.status === 'error'
            ? 'Transmission interrupted. Check your connection, then retry.'
            : 'This case file does not match any record on file. Retry, or return to your desk.'}
        </p>
        <Button onClick={game.retry}>Retry</Button>
      </div>
    )
  } else {
    play = (
      <>
        {game.date !== game.today ? (
          <p className={s.rollover}>
            New assignments were issued at midnight Eastern.{' '}
            {ended
              ? 'Return to your desk for the new case.'
              : `This case still files under ${formatMemoDate(game.date)}.`}
          </p>
        ) : null}
        {incoming && !ended ? <IncomingCard record={incoming} index={placed + 1} /> : null}
        <div ref={boardRef}>
          <Timeline
            line={line}
            outcomes={outcomes}
            placing={!ended && incoming !== undefined}
            onPlace={onPlace}
            last={last}
            animateAuto={closedHere && !reducedMotion()}
            phase={!ended ? 'open' : closedHere ? phase : 'closed'}
          />
        </div>
        {ended ? (
          <div ref={endRef}>
            <EndPanel
              won={state.status === 'won'}
              correct={correctCount(state)}
              filed={filed}
              number={game.number ?? 0}
              date={game.date}
              stamped={!closedHere || stamped}
              slam={closedHere}
              report={report}
              onStats={() => setDialog('stats')}
              verdictRef={verdictRef}
            />
          </div>
        ) : null}
      </>
    )
  }

  const progress = ready ? (ended ? 'Case closed' : `Record ${placed + 1} of ${PLACEMENTS}`) : 'Awaiting the file'
  const codes = {
    tl: game.number !== null ? caseCode(game.number) : 'Case pending',
    tr: formatMemoDate(game.date),
    br: ready ? `${placed} of ${PLACEMENTS} filed` : undefined,
  }
  const lastWrong = last !== null && !last.correct

  return (
    <>
      <Terminal codes={codes} rail={rail}>
        <header className={s.head}>
          <DisplayText as="h1" text="RETCON" tone="dark" className={s.title} />
          <p className={s.form}>Form 4R // Timeline repair // {progress}</p>
          <Meter key={last?.n ?? 0} left={state?.allowances ?? ALLOWANCES} justLost={lastWrong} />
        </header>
        <div className={s.body}>
          <div className={s.play}>{play}</div>
          <div className={s.aside}>
            <ActionList title="Action list" items={actions} />
          </div>
        </div>
      </Terminal>
      <FieldManual open={dialog === 'manual'} onClose={closeDialog} />
      <StatsDialog
        open={dialog === 'stats'}
        onClose={closeDialog}
        stats={stats}
        highlight={game.record?.status === 'filed' ? (game.record.result?.correct ?? null) : null}
      />
      <SettingsDialog open={dialog === 'settings'} onClose={closeDialog} />
    </>
  )
}

export default function RetconPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Retcon · Marvelous'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <AppShell section="Retcon">
      <div className={`wrap ${s.page}`}>
        <Game />
      </div>
    </AppShell>
  )
}
