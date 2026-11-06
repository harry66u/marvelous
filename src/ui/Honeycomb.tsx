import s from './Honeycomb.module.css'

/** Ceiling of amber hex lamps in perspective. Decorative. */
export default function Honeycomb({ height }: { height?: number }) {
  return (
    <div className={s.ceiling} style={height ? { height } : undefined} aria-hidden="true">
      <div className={s.plane} />
    </div>
  )
}
