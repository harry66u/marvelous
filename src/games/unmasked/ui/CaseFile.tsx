import { useId } from 'react'
import { teamName } from '../../../content/teams'
import type { PublicCharacter } from '../../../content/types'
import { formatMemoDate } from '../../../lib/time'
import Portrait from '../../../ui/id/Portrait'
import Paper from '../../../ui/Paper'
import Stamp from '../../../ui/Stamp'
import { ALIGNMENT_LABEL, ORIGIN_LABEL, caseCode, firstRecord, monogram } from './labels'
import s from './CaseFile.module.css'

interface Props {
  character: PublicCharacter
  number: number
  /** the case's puzzle date, printed on the stamp */
  date: string
  /** the case closed during this visit: the card slides in and the stamp slams */
  slam: boolean
  /** false holds the stamp back until the last row has flipped */
  stamped?: boolean
}

/** Board Form 06: the subject's ID card, revealed when the case closes. */
export default function CaseFile({ character: c, number, date, slam, stamped = true }: Props) {
  const titleId = useId()
  const origin = ORIGIN_LABEL[c.origin]
  const fields: [label: string, value: string][] = [
    ['Subject', c.name],
    ['Known as', c.realName ?? 'Not on file'],
    ['Affiliation', teamName(c.primaryTeam)],
    ['First record', firstRecord(c)],
    ['Classification', `${ALIGNMENT_LABEL[c.alignment]} · ${origin}`],
    ['MCU', c.mcuFirst ?? 'Not on file'],
  ]
  return (
    <article className={slam ? `${s.wrap} ${s.enter}` : s.wrap} aria-labelledby={titleId}>
      <Paper className={slam && stamped ? `${s.card} ${s.thud}` : s.card}>
        <header className={s.band}>
          <h3 id={titleId} className={s.title}>Confirm identity</h3>
          <b className={s.code}>{caseCode(number)}</b>
        </header>
        <div className={s.body}>
          <figure className={s.photo}>
            <Portrait
              archetype={c.archetype}
              origin={c.origin}
              monogram={monogram(c.name)}
              title={`Original silhouette on file for ${c.name}, with the ${origin.toLowerCase()} origin emblem`}
            />
            <figcaption>Silhouette on file</figcaption>
          </figure>
          <dl className={s.fields}>
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <Stamp
            text="CASE CLOSED"
            sub={`Filed ${formatMemoDate(date)}`}
            play={stamped}
            className={slam ? s.stamp : `${s.stamp} ${s.settled}`}
          />
        </div>
        {c.caseNote ? (
          <p className={s.notes}>
            <b>Case notes</b>
            {c.caseNote}
          </p>
        ) : null}
      </Paper>
    </article>
  )
}
