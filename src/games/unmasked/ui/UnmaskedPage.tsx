import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { playSfx, setSfxEnabled } from '../../../audio/sfx'
import { useProgress, useSettings } from '../../../data/progress'
import type { UnmaskedResult } from '../../../lib/marks'
import { bestShifts, consecutiveShifts } from '../../../lib/progress'
import { buildReport } from '../../../lib/share'
import { etWallClock, formatMemoDate } from '../../../lib/time'
import SettingsDialog from '../../../settings/SettingsDialog'
import ActionList from '../../../ui/ActionList'
import AppShell from '../../../ui/AppShell'
import Button from '../../../ui/Button'
import DisplayText from '../../../ui/DisplayText'
import IconRail from '../../../ui/IconRail'
import { useAnnounce } from '../../../ui/LiveRegion'
import TerminalFrame from '../../../ui/TerminalFrame'
import { MAX_ATTEMPTS, unmaskedShare } from '../logic/game'
import { unmaskedStats } from '../logic/stats'
import EndPanel from './EndPanel'
import FieldManual from './FieldManual'
import GuessGrid from './GuessGrid'
import { caseCode, describeGuess } from './labels'
import StatsDialog from './StatsDialog'
import SubjectSearch from './SubjectSearch'
import { useUnmaskedGame } from './useUnmaskedGame'
import s from './UnmaskedPage.module.css'

/** Six cells, 500 ms each, 120 ms apart, then a beat before the stamp lands. */
const FLIP_MS = 500 + 5 * 120 + 150

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

const isResult = (r: unknown): r is UnmaskedResult =>
  typeof r === 'object' && r !== null && typeof (r as UnmaskedResult).attempts === 'number'

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
    <TerminalFrame label="Unmasked terminal" rail={rail} codes={{ ...codes, bl: `${time} ET` }}>
      {children}
    </TerminalFrame>
  )
}

function Meter({ used }: { used: number }) {
  return (
    <div className={s.meter} role="img" aria-label={`${used} of ${MAX_ATTEMPTS} attempts used`}>
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
        <i key={i} className={i < used ? s.used : undefined} />
      ))}
    </div>
  )
}

type DialogName = 'manual' | 'stats' | 'settings'

function Game() {
  const game = useUnmaskedGame()
  const { store } = useProgress()
  const [settings, patchSettings] = useSettings()
  const announce = useAnnounce()
  const [dialog, setDialog] = useState<DialogName | null>(() => (settings.seenManual.unmasked ? null : 'manual'))
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set())
  const [closedHere, setClosedHere] = useState(false)
  const [stamped, setStamped] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const verdictRef = useRef<HTMLHeadingElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => setSfxEnabled(settings.sound), [settings.sound])
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  const { state, answer, characters } = game
  const ended = state !== null && state.status !== 'playing'
  const guesses = useMemo(
    () => (state?.guesses ?? []).flatMap((id) => characters.get(id) ?? []),
    [state, characters],
  )
  const guessed = useMemo(() => new Set(state?.guesses), [state])

  useEffect(() => {
    if (ended && closedHere) verdictRef.current?.focus()
  }, [ended, closedHere])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const onFile = (id: string) => {
    const result = game.file(id)
    const guess = characters.get(id)
    if (!result.ok || !guess || !answer) return
    setFresh((f) => new Set(f).add(id))
    playSfx('submit')
    if (settings.sound && !reducedMotion()) {
      for (let i = 0; i < 6; i++) later(() => playSfx('flip'), 120 * i + 120)
    }
    if (result.next.status === 'playing') {
      announce(describeGuess(guess, answer).text)
      return
    }
    // The card arrives with the last row; the stamp waits for the flip to finish.
    setClosedHere(true)
    setStamped(false)
    const won = result.next.status === 'won'
    later(
      () => {
        setStamped(true)
        playSfx('stamp')
        later(() => playSfx(won ? 'win' : 'lose'), 320)
      },
      reducedMotion() ? 0 : FLIP_MS,
    )
  }

  const closeDialog = () => {
    if (dialog === 'manual' && !settings.seenManual.unmasked) {
      patchSettings({ seenManual: { ...settings.seenManual, unmasked: true } })
    }
    setDialog(null)
  }

  const toggleSound = () => {
    const on = !settings.sound
    patchSettings({ sound: on })
    setSfxEnabled(on)
    if (on) playSfx('submit')
  }

  const stats = useMemo(
    () =>
      unmaskedStats(
        Object.values(store.days).flatMap((d) => {
          const r = d.games.unmasked
          return r?.status === 'filed' && isResult(r.result) ? [r.result] : []
        }),
      ),
    [store.days],
  )

  const report = () =>
    buildReport({
      number: game.number ?? 0,
      date: game.date,
      unmasked: state ? unmaskedShare(state, characters) : 'pending',
      shifts: consecutiveShifts(store, game.date),
      url: `${window.location.origin}/`,
    })

  const used = state?.guesses.length ?? 0
  const ready = game.status === 'ready' && state !== null && answer !== null && game.number !== null

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
      : { label: 'Resume case', onSelect: () => inputRef.current?.focus() },
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
        {ended ? (
          <EndPanel
            state={state}
            answer={answer}
            number={game.number ?? 0}
            date={game.date}
            closedHere={closedHere}
            stamped={!closedHere || stamped}
            report={report}
            onStats={() => setDialog('stats')}
            verdictRef={verdictRef}
          />
        ) : (
          <SubjectSearch index={game.index} guessed={guessed} onFile={onFile} inputRef={inputRef} />
        )}
        <GuessGrid
          guesses={guesses}
          answer={answer}
          fresh={fresh}
          nextAttempt={ended ? null : used + 1}
          follow={!ended}
        />
      </>
    )
  }

  const progress = ready ? (ended ? 'Case closed' : `Attempt ${used + 1} of ${MAX_ATTEMPTS}`) : 'Awaiting the file'
  const codes = {
    tl: game.number !== null ? caseCode(game.number) : 'Case pending',
    tr: formatMemoDate(game.date),
    br: ready ? `${used} of ${MAX_ATTEMPTS} filed` : undefined,
  }

  return (
    <>
      <Terminal codes={codes} rail={rail}>
        <header className={s.head}>
          <DisplayText as="h1" text="UNMASKED" tone="dark" className={s.title} />
          <p className={s.form}>Form 7B // Identify the variant // {progress}</p>
          <Meter used={used} />
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
        current={consecutiveShifts(store, game.today)}
        best={bestShifts(store)}
        highlight={game.record?.result?.solved ? game.record.result.attempts : null}
      />
      <SettingsDialog open={dialog === 'settings'} onClose={closeDialog} />
    </>
  )
}

export default function UnmaskedPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Unmasked · Marvelous'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <AppShell section="Unmasked">
      <div className={`wrap ${s.page}`}>
        <Game />
      </div>
    </AppShell>
  )
}
