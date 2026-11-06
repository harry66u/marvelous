import type { ReactNode } from 'react'
import s from './TileFloor.module.css'

export default function TileFloor({ children }: { children: ReactNode }) {
  return (
    <div className={s.floor}>
      <div className={s.tiles} aria-hidden="true" />
      <div className={s.content}>{children}</div>
    </div>
  )
}
