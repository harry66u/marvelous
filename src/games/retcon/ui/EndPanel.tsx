import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import { formatMemoDate } from '../../../lib/time'
import type { RetconDayRecord } from '../../../server/dayBundle'
import Button from '../../../ui/Button'
import Paper from '../../../ui/Paper'
import Stamp from '../../../ui/Stamp'
import { PLACEMENTS, yearOf, type Placement } from '../logic/game'
import { OUTCOME_LABEL, OUTCOME_MARK, caseCode } from './labels'
import s from './EndPanel.module.css'

export const LIMIT_COPY = 'Variance limit reached'
export const scoreCopy = (correct: number) => `${correct}/${PLACEMENTS} records in order`

interface Props {
  won: boolean
  correct: number
  /** the five placed records in arrival order, with how each was filed */
  filed: { record: RetconDayRecord; outcome: Placement }[]
  number: number
  date: string
  /** whether the stamp has landed yet */
  stamped: boolean
  /** the case closed during this visit: the stamp slams instead of sitting there */
  slam: boolean
  /** builds the share report at the moment it is copied */
  report: () => string
  onStats: () => void
  verdictRef: RefObject<HTMLHeadingElement | null>
}

type Copy = { state: 'idle' } | { state: 'copied' } | { state: 'manual'; text: string }

function memo(won: boolean, correct: number): string {
  if (!won) return `${scoreCopy(correct)}. The remaining records were filed automatically.`
  if (correct === PLACEMENTS) return 'The main line holds. No corrections were required.'
  return 'Records filed out of order have been moved to their true slots and noted on your file.'
}

export default function EndPanel({ won, correct, filed, number, date, stamped, slam, report, onStats, verdictRef }: Props) {
  const verdictId = useId()
  const [copy, setCopy] = useState<Copy>({ state: 'idle' })
  const manualRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <section className={s.end} aria-labelledby={verdictId}>
      <p className={s.kicker}>{won ? 'Timeline repaired' : 'Case closed'}</p>
      <h2 id={verdictId} ref={verdictRef} tabIndex={-1} className={s.verdict}>
        {won ? scoreCopy(correct) : LIMIT_COPY}
      </h2>
      <p className={s.memo}>{memo(won, correct)}</p>
      <Paper className={s.slip}>
        <p className={s.slipHead}>
          <span>Form 4R // Repair slip</span>
          <span>{caseCode(number)}</span>
        </p>
        <ol className={s.outcomes} aria-label="Placements on file">
          {filed.map(({ record, outcome }) => (
            <li key={record.id} data-outcome={outcome}>
              <span className={s.chip}>
                <span aria-hidden="true">{OUTCOME_MARK[outcome]} </span>
                {OUTCOME_LABEL[outcome]}
              </span>
              <span className="sr-only">: </span>
              <span className={s.what}>{record.text}</span>
              <span className="sr-only">, </span>
              <span className={s.year}>{yearOf(record.date)}</span>
            </li>
          ))}
        </ol>
        <Stamp
          text="CASE CLOSED"
          sub={`Filed ${formatMemoDate(date)}`}
          play={stamped}
          className={slam ? s.stamp : `${s.stamp} ${s.settled}`}
        />
      </Paper>
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
