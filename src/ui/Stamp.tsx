import type { CSSProperties } from 'react'
import './surfaces.css'
import DisplayText from './DisplayText'
import s from './Stamp.module.css'

const reducedMotion = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'reduce'

/** Rubber stamp. Hidden until `play`; then drops and slams unless motion is reduced. Position it
 *  inside a `position: relative` parent; it is centred at 64% / 58% by default. */
export default function Stamp({
  text, sub, play, className, style,
}: { text: string; sub?: string; play: boolean; className?: string; style?: CSSProperties }) {
  const cls = [s.stamp, play ? (reducedMotion() ? s.shown : s.slam) : s.hidden, className]
  return (
    <div className={cls.filter(Boolean).join(' ')} style={style} data-testid="stamp" aria-hidden={!play}>
      <DisplayText text={text} className={s.text} />
      {sub ? <small className={s.sub}>{sub}</small> : null}
    </div>
  )
}
