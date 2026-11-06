import { useId } from 'react'
import type { Archetype, Origin } from '../../content/types'
import { ARCHETYPE_PATHS } from './archetypes'
import { EMBLEMS } from './emblems'
import s from './Portrait.module.css'

interface Props {
  archetype: Archetype
  origin: Origin
  /** short tag printed in the corner, e.g. "K-7" */
  monogram: string
  /** accessible name */
  title: string
  className?: string
}

/** Sepia ID photo: an original silhouette, an origin emblem badge and a monogram tag. */
export default function Portrait({ archetype, origin, monogram, title, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const paths = ARCHETYPE_PATHS[archetype]
  return (
    <svg className={`${s.portrait} ${className ?? ''}`} viewBox="0 0 160 190" role="img" aria-label={title}>
      <defs>
        <radialGradient id={`${uid}-sep`} cx="45%" cy="35%" r="80%">
          <stop offset="0" className={s.sep0} />
          <stop offset=".6" className={s.sep1} />
          <stop offset="1" className={s.sep2} />
        </radialGradient>
        <pattern id={`${uid}-ht`} width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r=".7" className={s.dot} />
        </pattern>
        <radialGradient id={`${uid}-vig`} cx="50%" cy="45%" r="70%">
          <stop offset=".55" className={s.vig0} />
          <stop offset="1" className={s.vig1} />
        </radialGradient>
      </defs>
      <rect width="160" height="190" fill={`url(#${uid}-sep)`} />
      {paths.map((d, i) => (
        <path key={i} d={d} fillRule="evenodd" className={i === paths.length - 1 ? s.head : s.body} />
      ))}
      <rect width="160" height="190" fill={`url(#${uid}-ht)`} />
      <rect width="160" height="190" fill={`url(#${uid}-vig)`} />
      <g transform="translate(6 6)" aria-hidden="true">
        <rect width={8 + monogram.length * 7} height="14" className={s.tag} />
        <text x="4" y="10.5" className={s.tagText}>{monogram}</text>
      </g>
      <g transform="translate(130 162)" aria-hidden="true">
        <circle r="17" className={s.badge} />
        <g transform="translate(-10.2 -10.2) scale(.85)" className={s.emblem}>
          {EMBLEMS[origin].map((d, i) => <path key={i} d={d} />)}
        </g>
      </g>
    </svg>
  )
}
