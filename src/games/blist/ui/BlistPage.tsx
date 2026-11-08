import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { playSfx, setSfxEnabled } from '../../../audio/sfx'
import type { GameId } from '../../../content/types'
import { useProgress, useSettings } from '../../../data/progress'
import { useReport } from '../../../data/useReport'
import { etWallClock, formatMemoDate } from '../../../lib/time'
import SettingsDialog from '../../../settings/SettingsDialog'
import ActionList from '../../../ui/ActionList'
import AppShell from '../../../ui/AppShell'
import Button from '../../../ui/Button'
import DisplayText from '../../../ui/DisplayText'
import IconRail from '../../../ui/IconRail'
import TerminalFrame from '../../../ui/TerminalFrame'
import { PROMPTS_PER_DAY, totalScore } from '../logic/game'
import DepthGauge from './DepthGauge'
import EndPanel from './EndPanel'
import FieldManual from './FieldManual'
import { caseCode } from './labels'
import RequestDesk from './RequestDesk'
import { blistStats, filedBlistGames } from './stats'
import StatsDialog from './StatsDialog'
import { useBlistGame } from './useBlistGame'
import { useRequestFlow } from './useRequestFlow'
import s from './BlistPage.module.css'

const ALL_GAMES: GameId[] = ['unmasked', 'blist', 'retcon']

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

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
    <TerminalFrame label="B-List terminal" rail={rail} codes={{ ...codes, bl: `${time} ET` }}>
      {children}
    </TerminalFrame>
  )
}

function Meter({ filed }: { filed: number }) {
  return (
    <div className={s.meter} role="img" aria-label={`${filed} of ${PROMPTS_PER_DAY} requests filed`}>
      {Array.from({ length: PROMPTS_PER_DAY }, (_, i) => (
        <i key={i} className={i < filed ? s.used : undefined} />
      ))}
    </div>
  )
}

type DialogName = 'manual' | 'stats' | 'settings'

function Game() {
  const game = useBlistGame()
  const { store } = useProgress()
  const [settings, patchSettings] = useSettings()
  const buildReport = useReport()
  const [dialog, setDialog] = useState<DialogName | null>(() => (settings.seenManual.blist ? null : 'manual'))
  const [shake, setShake] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const verdictRef = useRef<HTMLHeadingElement>(null)

  const { state, prompts } = game
  const ready = game.status === 'ready' && state !== null && prompts !== null && game.number !== null
  const flow = useRequestFlow({
    state: ready ? state : null,
    start: game.start,
    submit: game.submit,
    paused: dialog !== null,
    autoAdvance: !game.extended,
  })
  const { view } = flow

  const closeDialog = () => {
    if (dialog === 'manual' && !settings.seenManual.blist) {
      patchSettings({ seenManual: { ...settings.seenManual, blist: true } })
    }
    setDialog(null)
  }

  const toggleSound = () => {
    const on = !settings.sound
    patchSettings({ sound: on })
    setSfxEnabled(on)
    if (on) playSfx('submit')
  }

  const onMiss = () => {
    if (!reducedMotion()) setShake((n) => n + 1)
  }

  const stats = useMemo(() => blistStats(filedBlistGames(store)), [store])

  const report = () => {
    const required = game.games.length > 0 ? game.games : store.days[game.date]?.required
    return buildReport(game.date, game.number ?? 0, required?.length ? required : ALL_GAMES)
  }

  const results = state?.results ?? []
  const filed = results.length
  const ended = view?.kind === 'end'
  // The gauge holds its depth while the record is retrieved, then drops with the tier stamp.
  const score = totalScore({ results })
  const shown =
    view?.kind === 'retrieving' || view?.kind === 'live' || view?.kind === 'incoming'
      ? totalScore({ results: results.slice(0, view.index) })
      : score

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
      ? { label: 'Review ledger', onSelect: () => verdictRef.current?.focus() }
      : { label: 'Resume search', onSelect: () => inputRef.current?.focus() },
    { label: 'Field manual', onSelect: () => setDialog('manual') },
    { label: 'File statistics', onSelect: () => setDialog('stats') },
    { label: 'Back to the desk', href: '/' },
  ]

  let play: ReactNode
  if (game.status === 'loading') {
    play = <p className={s.loading} role="status">Retrieving today's requests…</p>
  } else if (game.status === 'none') {
    play = (
      <div className={s.notice}>
        <p>No records requests have been issued for this date. Please remain at your desk.</p>
        <Link className={s.link} to="/">Back to the desk</Link>
      </div>
    )
  } else if (!ready || !view) {
    play = (
      <div className={s.notice}>
        <p>
          {game.status === 'error'
            ? 'Transmission interrupted. Check your connection, then retry.'
            : 'These requests do not match any form on file. Retry, or return to your desk.'}
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
              ? 'Return to your desk for the new requests.'
              : `This search still files under ${formatMemoDate(game.date)}.`}
          </p>
        ) : null}
        <div className={s.desk}>
          <DepthGauge score={shown} className={s.gauge} />
          <div className={s.slot}>
            {view.kind === 'end' ? (
              <EndPanel
                state={state}
                prompts={prompts}
                number={game.number ?? 0}
                date={game.date}
                closedHere={flow.closedHere}
                report={report}
                onStats={() => setDialog('stats')}
                verdictRef={verdictRef}
              />
            ) : (
              <RequestDesk
                view={view}
                state={state}
                prompts={prompts}
                paused={dialog !== null}
                submit={flow.submit}
                tick={game.tick}
                next={flow.next}
                onMiss={onMiss}
                inputRef={inputRef}
              />
            )}
          </div>
        </div>
      </>
    )
  }

  const onScreen = view && view.kind !== 'end' ? view.index + 1 : filed + 1
  const progress = ready
    ? ended
      ? 'Search closed'
      : `Request ${Math.min(onScreen, PROMPTS_PER_DAY)} of ${PROMPTS_PER_DAY}`
    : 'Awaiting requests'
  const codes = {
    tl: game.number !== null ? caseCode(game.number) : 'Case pending',
    tr: formatMemoDate(game.date),
    br: ready ? `${filed} of ${PROMPTS_PER_DAY} filed` : undefined,
  }

  return (
    <>
      <div className={shake ? (shake % 2 ? s.shakeA : s.shakeB) : undefined}>
        <Terminal codes={codes} rail={rail}>
          <header className={s.head}>
            <DisplayText as="h1" text="B-LIST" tone="dark" className={s.title} />
            <p className={s.form}>
              Form 12C // Records search // {progress}
              {ready && game.extended ? ' // Extended timer' : ''}
            </p>
            <Meter filed={filed} />
          </header>
          <div className={s.body}>
            <div className={s.play}>{play}</div>
            <div className={s.aside}>
              <ActionList title="Action list" items={actions} />
            </div>
          </div>
        </Terminal>
      </div>
      <FieldManual open={dialog === 'manual'} onClose={closeDialog} />
      <StatsDialog open={dialog === 'stats'} onClose={closeDialog} stats={stats} />
      <SettingsDialog open={dialog === 'settings'} onClose={closeDialog} />
    </>
  )
}

export default function BlistPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'B-List · Marvelous'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <AppShell section="B-List">
      <div className={`wrap ${s.page}`}>
        <Game />
      </div>
    </AppShell>
  )
}
