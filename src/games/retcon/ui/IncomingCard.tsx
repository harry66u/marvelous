import type { RetconDayRecord } from '../../../server/dayBundle'
import { PLACEMENTS } from '../logic/game'
import { KIND_LABEL } from './labels'
import s from './IncomingCard.module.css'

interface Props {
  record: RetconDayRecord
  /** 1-based number of this record among the five to place */
  index: number
}

/** The record waiting to be placed: what it is, never when. */
export default function IncomingCard({ record, index }: Props) {
  return (
    <section className={s.incoming} aria-label="Incoming record">
      <p className={s.kicker}>
        <span>Incoming record</span>
        <span>
          {index} of {PLACEMENTS}
        </span>
      </p>
      <div key={record.id} className={s.card}>
        <p className={s.meta}>
          <span className={s.year} aria-hidden="true">
            ----
          </span>
          <span className="sr-only">Year withheld. </span>
          <span className={s.kind}>{KIND_LABEL[record.kind]}</span>
        </p>
        <p className={s.text}>{record.text}</p>
        {record.detail ? <p className={s.detail}>{record.detail}</p> : null}
      </div>
    </section>
  )
}
