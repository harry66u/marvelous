import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import type { PublicCharacter } from '../../../content/types'
import Button from '../../../ui/Button'
import type { UnmaskedState } from '../logic/game'
import { MAX_ATTEMPTS } from '../logic/game'
import CaseFile from './CaseFile'
import s from './EndPanel.module.css'

export const LOSS_COPY = 'Subject at large. The file has been closed anyway.'
export const winCopy = (attempts: number) => `Identity confirmed in ${attempts} of ${MAX_ATTEMPTS} attempts.`

interface Props {
  state: UnmaskedState
  answer: PublicCharacter
  number: number
  date: string
  /** the case closed during this visit */
  closedHere: boolean
  /** whether the stamp has landed yet */
  stamped: boolean
  /** builds the share report at the moment it is copied */
  report: () => string
  onStats: () => void
  verdictRef: RefObject<HTMLHeadingElement | null>
}

type Copy = { state: 'idle' } | { state: 'copied' } | { state: 'manual'; text: string }

export default function EndPanel({ state, answer, number, date, closedHere, stamped, report, onStats, verdictRef }: Props) {
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
      <p className={s.kicker}>{state.status === 'won' ? 'Subject identified' : 'Case closed unsolved'}</p>
      <h2 id={verdictId} ref={verdictRef} tabIndex={-1} className={s.verdict}>
        {state.status === 'won' ? winCopy(state.guesses.length) : LOSS_COPY}
      </h2>
      <CaseFile character={answer} number={number} date={date} slam={closedHere} stamped={stamped} />
      <div className={s.actions}>
        <Button variant="solid" onClick={() => void copyReport()}>Copy report</Button>
        <Button onClick={onStats}>Statistics</Button>
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
