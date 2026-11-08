import type { CSSProperties, Ref } from 'react'
import type { RetconDayRecord } from '../../../server/dayBundle'
import { yearOf } from '../logic/game'
import { KIND_LABEL, OUTCOME_LABEL, OUTCOME_MARK, type Outcome } from './labels'
import s from './Timeline.module.css'

interface Props {
  record: RetconDayRecord
  outcome: Outcome
  /** placed during this visit: a correct record pulses as it locks in */
  fresh: boolean
  /** filed automatically during this visit: its place in the filing queue, for the stagger */
  autoIndex: number | null
  /** row on the line, for the collapse stagger */
  row: number
  ref?: Ref<HTMLDivElement>
}

/** One record on the main line: its year, what kind of record it is, and how it got there. */
export default function RecordEntry({ record, outcome, fresh, autoIndex, row, ref }: Props) {
  const cls = [s.record, fresh ? s.fresh : '', autoIndex !== null ? s.autoIn : ''].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={cls} data-outcome={outcome} style={{ '--k': autoIndex ?? 0, '--r': row } as CSSProperties}>
      <span className={s.branch} aria-hidden="true" />
      <span className={s.node} aria-hidden="true" />
      <div className={s.card}>
        <p className={s.meta}>
          <span className={s.year}>{yearOf(record.date)}</span>
          <span className="sr-only">, </span>
          <span className={s.kind}>{KIND_LABEL[record.kind]}</span>
          <span className="sr-only">, </span>
          <span className={s.tag}>
            <span aria-hidden="true">{OUTCOME_MARK[outcome]} </span>
            {OUTCOME_LABEL[outcome]}
          </span>
          <span className="sr-only">: </span>
        </p>
        <p className={s.text}>{record.text}</p>
        {record.detail ? <p className={s.detail}>{record.detail}</p> : null}
      </div>
    </div>
  )
}
