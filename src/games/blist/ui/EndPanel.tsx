import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import { playSfx } from '../../../audio/sfx'
import { formatMemoDate } from '../../../lib/time'
import type { BlistDay } from '../../../server/dayBundle'
import Button from '../../../ui/Button'
import DisplayText from '../../../ui/DisplayText'
import Paper from '../../../ui/Paper'
import Stamp from '../../../ui/Stamp'
import { MAX_SCORE, sublevel, sublevelLabel, totalScore, type BlistState } from '../logic/game'
import { EXPIRED, caseCode, feet, unclaimed } from './labels'
import TierChip from './TierChip'
import s from './EndPanel.module.css'

/** The stamp lands once the ledger has settled in. */
const STAMP_DELAY_MS = 450

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

export const verdictCopy = (score: number) =>
  sublevel(score) === 0 ? 'Search closed at ground level.' : `Search closed at ${sublevelLabel(score)}.`

interface Props {
  state: BlistState
  prompts: BlistDay
  number: number
  date: string
  /** the search closed during this visit: the stamp slams and the verdict takes focus */
  closedHere: boolean
  /** builds the share report at the moment it is copied */
  report: () => string
  onStats: () => void
  verdictRef: RefObject<HTMLHeadingElement | null>
}

type Copy = { state: 'idle' } | { state: 'copied' } | { state: 'manual'; text: string }

export default function EndPanel({ state, prompts, number, date, closedHere, report, onStats, verdictRef }: Props) {
  const verdictId = useId()
  const ledgerId = useId()
  const unclaimedId = useId()
  const score = totalScore(state)
  const [stamped, setStamped] = useState(!closedHere)
  const [copy, setCopy] = useState<Copy>({ state: 'idle' })
  const manualRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!closedHere) return
    verdictRef.current?.focus()
    const timers: number[] = []
    timers.push(
      window.setTimeout(
        () => {
          setStamped(true)
          playSfx('stamp')
          timers.push(window.setTimeout(() => playSfx(score > 0 ? 'win' : 'lose'), 320))
        },
        reducedMotion() ? 0 : STAMP_DELAY_MS,
      ),
    )
    return () => timers.forEach((t) => clearTimeout(t))
  }, [closedHere, verdictRef, score])

  useEffect(() => {
    if (copy.state !== 'manual') return
    manualRef.current?.focus()
    manualRef.current?.select()
  }, [copy])

  const copyReport = async () => {
    const text = report()
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setCopy({ state: 'copied' })
    } catch {
      setCopy({ state: 'manual', text })
    }
  }

  const leftovers = prompts.map((p, i) => ({ prompt: p, i, names: unclaimed(p, state.results[i]?.answer ?? null) }))

  return (
    <section className={s.end} aria-labelledby={verdictId}>
      <p className={s.kicker}>Records search complete</p>
      <h2 id={verdictId} ref={verdictRef} tabIndex={-1} className={s.verdict}>{verdictCopy(score)}</h2>

      <article className={closedHere ? `${s.ledger} ${s.enter}` : s.ledger} aria-labelledby={ledgerId}>
        <Paper className={s.paper}>
          <header className={s.band}>
            <h3 id={ledgerId} className={s.bandTitle}>Search ledger</h3>
            <b className={s.code}>{caseCode(number)}</b>
          </header>
          <div className={s.summary}>
            <dl className={s.totals}>
              <div>
                <dt>Score</dt>
                <dd><DisplayText text={`${score} / ${MAX_SCORE}`} className={s.score} /></dd>
              </div>
              <div>
                <dt>Reached</dt>
                <dd>{sublevelLabel(score)}</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>{feet(score)}</dd>
              </div>
            </dl>
            <Stamp
              text="CASE CLOSED"
              sub={`Filed ${formatMemoDate(date)}`}
              play={stamped}
              className={closedHere ? s.stamp : `${s.stamp} ${s.settled}`}
            />
          </div>
          <ol className={s.rows}>
            {prompts.map((p, i) => {
              const r = state.results[i]
              return (
                <li key={p.id} className={s.row}>
                  <span className={s.num} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <div className={s.rowBody}>
                    <p className={s.prompt}>{p.text}</p>
                    <p className={r?.answer ? s.answer : `${s.answer} ${s.expired}`}>{r?.answer ?? EXPIRED}</p>
                  </div>
                  <div className={s.rowScore}>
                    <TierChip tier={r?.tier ?? null} />
                    <b className={s.points}>{r?.points ?? 0} pts</b>
                  </div>
                </li>
              )
            })}
          </ol>
        </Paper>
      </article>

      <section className={s.unclaimed} aria-labelledby={unclaimedId}>
        <h3 id={unclaimedId} className={s.subhead}>Unclaimed records</h3>
        <p className={s.note}>
          Sealed and classified records left in the drawers today. The Archive does not yet compare notes
          between agents, so these are the rarest records you did not file.
        </p>
        <ul className={s.leftovers}>
          {leftovers.map(({ prompt, i, names }) => (
            <li key={prompt.id}>
              <span className={s.leftReq}>Request {i + 1}</span>
              {names.length ? (
                <ul className={s.names}>
                  {names.map((n) => (
                    <li key={n.name}>
                      <span className={s.leftName}>{n.name}</span> <TierChip tier={n.tier} />
                    </li>
                  ))}
                </ul>
              ) : (
                <span className={s.none}>Nothing rarer left on file.</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className={s.actions}>
        <Button variant="solid" onClick={() => void copyReport()}>Copy report</Button>
        <Button onClick={onStats}>File statistics</Button>
        <Link className={s.link} to="/">Back to the desk</Link>
        <p role="status" className={s.copied}>
          {copy.state === 'copied' ? 'Report copied to the clipboard.' : ''}
          {copy.state === 'manual' ? 'The clipboard is not available here. Select the report below and copy it.' : ''}
        </p>
      </div>
      {copy.state === 'manual' ? (
        <textarea
          ref={manualRef}
          className={s.manual}
          aria-label="Report text"
          readOnly
          rows={copy.text.split('\n').length}
          value={copy.text}
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </section>
  )
}
