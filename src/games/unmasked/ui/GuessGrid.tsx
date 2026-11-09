import { WORLDS, WORLD_HINT, WORLD_LABEL } from '../../../content/types'
import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react'
import type { PublicCharacter } from '../../../content/types'
import { ATTRIBUTE_ORDER } from '../logic/compare'
import { ATTRIBUTE_SHORT, MARK_SYMBOL, describeGuess, type GuessRow } from './labels'
import s from './GuessGrid.module.css'

interface Props {
  guesses: readonly PublicCharacter[]
  answer: PublicCharacter
  /** ids filed during this visit; only these rows flip in */
  fresh: ReadonlySet<string>
  /** number of the next empty attempt, or null once the case is closed */
  nextAttempt: number | null
  /** scroll a newly filed row into view (off once the case closes and focus moves to the verdict) */
  follow?: boolean
}

/**
 * The attempts so far. Each row is one list item: a sentence for screen readers, and the
 * name plus six marked cells for everyone else (hidden from assistive tech, which already
 * has the sentence).
 */
export default function GuessGrid({ guesses, answer, fresh, nextAttempt, follow = false }: Props) {
  const headingId = useId()
  const rows = useMemo(() => guesses.map((g) => describeGuess(g, answer)), [guesses, answer])
  return (
    <section className={s.grid} aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">Attempts on file</h2>
      <div className={s.head} aria-hidden="true">
        {ATTRIBUTE_ORDER.map((k) => (
          <span key={k}>{ATTRIBUTE_SHORT[k]}</span>
        ))}
      </div>
      {rows.length > 0 ? (
        <ol className={s.rows} aria-labelledby={headingId}>
          {rows.map((row) => (
            <Row key={row.id} row={row} flip={fresh.has(row.id)} follow={follow} />
          ))}
        </ol>
      ) : null}
      {nextAttempt !== null ? <EmptyRow n={nextAttempt} /> : null}
      <ul className={s.legend} aria-label="Key">
        <li><i className={`${s.chip} ${s.exact}`}>{MARK_SYMBOL.exact}</i>Exact</li>
        <li><i className={`${s.chip} ${s.close}`}>{MARK_SYMBOL.close}</i>Close</li>
        <li><i className={`${s.chip} ${s.no}`}>{MARK_SYMBOL.no}</i>No match</li>
        <li>▲ ▼ Subject debuted later / earlier</li>
      </ul>
      <div className={s.worlds}>
        <h3 className={s.worldsHead}>Worlds on file</h3>
        <ul className={s.worldList}>
          {WORLDS.map((w) => (
            <li key={w}><b>{WORLD_LABEL[w]}</b> <span>{WORLD_HINT[w]}</span></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Row({ row, flip, follow }: { row: GuessRow; flip: boolean; follow: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  // Mount-only on purpose: a row filed during this visit is brought into view once, as it appears.
  useEffect(() => {
    if (!flip || !follow) return
    const smooth = document.documentElement.dataset.motion !== 'reduce'
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  }, [])
  return (
    <li ref={ref} className={flip ? `${s.row} ${s.flip}` : s.row}>
      <span className="sr-only">{row.text}</span>
      <div className={s.visual} aria-hidden="true">
        <p className={s.name}>
          <span className={`${s.chip} ${s[row.nameMark]}`}>{MARK_SYMBOL[row.nameMark]}</span>
          <span>{row.name}</span>
        </p>
        <div className={s.cells}>
          {row.cells.map((c, i) => (
            <span key={c.key} className={`${s.cell} ${s[c.mark]}`} style={{ '--i': i } as CSSProperties}>
              <span className={s.cap}>{ATTRIBUTE_SHORT[c.key]}</span>
              <span className={s.val}>
                {c.label}
                {c.arrow ? ` ${c.arrow}` : null}
              </span>
              <span className={s.mk}>{MARK_SYMBOL[c.mark]}</span>
            </span>
          ))}
        </div>
      </div>
    </li>
  )
}

function EmptyRow({ n }: { n: number }) {
  return (
    <div className={s.row} aria-hidden="true">
      <p className={s.name}>— Attempt {n} —</p>
      <div className={s.cells}>
        {ATTRIBUTE_ORDER.map((k) => (
          <span key={k} className={`${s.cell} ${s.blank}`}>
            <span className={s.cap}>{ATTRIBUTE_SHORT[k]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
