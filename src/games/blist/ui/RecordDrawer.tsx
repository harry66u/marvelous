import { useEffect, useId, useRef } from 'react'
import { playSfx } from '../../../audio/sfx'
import Button from '../../../ui/Button'
import { useAnnounce } from '../../../ui/LiveRegion'
import Paper from '../../../ui/Paper'
import { PROMPTS_PER_DAY, TIER_LABEL, sublevelLabel, type BlistResult } from '../logic/game'
import { EXPIRED, feet, tierRank } from './labels'
import s from './RecordDrawer.module.css'

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

interface Props {
  index: number
  prompt: string
  result: BlistResult
  /** total score with this result filed, for the announcement */
  score: number
  last: boolean
  onNext: () => void
}

/** Board motion for B-List: the record drawer slides out and the tier card stamps in. */
export default function RecordDrawer({ index, prompt, result, score, last, onNext }: Props) {
  const titleId = useId()
  const announce = useAnnounce()
  const actionsRef = useRef<HTMLDivElement>(null)
  const { answer, tier, points } = result

  useEffect(() => {
    actionsRef.current?.querySelector('button')?.focus()
    const depth = `Depth ${feet(score)}, ${sublevelLabel(score)}.`
    if (answer && tier) {
      announce(`Record retrieved: ${answer}. ${TIER_LABEL[tier]}, ${points} points. ${depth}`)
      const calm = reducedMotion()
      const timers = [
        window.setTimeout(() => playSfx('stamp'), calm ? 0 : 380),
        window.setTimeout(() => playSfx('drop'), calm ? 160 : 620),
      ]
      return () => timers.forEach((t) => clearTimeout(t))
    }
    announce(`${EXPIRED}. No record filed, 0 points. ${depth}`)
    playSfx('miss')
    return undefined
  }, [index]) // once per filed request

  return (
    <section className={s.drawer} aria-labelledby={titleId} data-tier={tier ?? 'none'}>
      <div className={s.face} aria-hidden="true">
        <span>Drawer 12C-{index + 1}</span>
        <i className={s.handle} />
        <span>{answer ? 'Record retrieved' : 'No record'}</span>
      </div>
      <div className={s.track}>
        <Paper className={s.card}>
          <p className={s.request}>
            Request {index + 1} of {PROMPTS_PER_DAY}: {prompt}
          </p>
          <h2 id={titleId} className={s.name}>{answer ?? EXPIRED}</h2>
          {tier ? (
            <p className={s.stamp} data-rank={tierRank(tier)}>
              <span className={s.tier}>{TIER_LABEL[tier]}</span>
              <span className={s.points}>+{points} pts</span>
            </p>
          ) : (
            <p className={`${s.stamp} ${s.void}`}>
              <span className={s.tier}>Expired</span>
              <span className={s.points}>0 pts</span>
            </p>
          )}
        </Paper>
      </div>
      <div className={s.actions} ref={actionsRef}>
        <Button variant="solid" onClick={onNext}>{last ? 'Close the file' : 'Next request'}</Button>
      </div>
    </section>
  )
}
