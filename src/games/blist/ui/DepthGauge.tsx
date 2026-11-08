import { useId, type CSSProperties } from 'react'
import { MAX_SCORE, sublevelLabel } from '../logic/game'
import { feet } from './labels'
import s from './DepthGauge.module.css'

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7]

/**
 * The shaft: ground level at the top, Sublevel B7 (7,000 ft) at the bottom. Vertical beside the
 * play area; horizontal above it on phones. The caption is the accessible reading.
 */
export default function DepthGauge({ score, className }: { score: number; className?: string }) {
  const captionId = useId()
  const d = Math.min(Math.max(score, 0), MAX_SCORE) / MAX_SCORE
  return (
    <figure
      className={[s.gauge, className].filter(Boolean).join(' ')}
      aria-labelledby={captionId}
      style={{ '--d': d } as CSSProperties}>
      <figcaption id={captionId} className={s.readout}>
        <span className={s.label}>Depth</span> <b className={s.feet}>{feet(score)}</b>
        <span className={s.sep}> · </span>
        <span className={s.level}>{sublevelLabel(score)}</span>
      </figcaption>
      <div className={s.shaft} aria-hidden="true">
        <i className={s.fill} />
        <i className={s.car} />
        {LEVELS.map((n) => (
          <span key={n} className={s.mark} style={{ '--at': n / 7 } as CSSProperties}>
            {n === 0 ? 'GL' : `B${n}`}
          </span>
        ))}
      </div>
    </figure>
  )
}
