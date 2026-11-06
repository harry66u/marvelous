import type { ReactNode } from 'react'
import './surfaces.css'
import s from './WalnutWall.module.css'

export default function WalnutWall({ children }: { children: ReactNode }) {
  return <div className={s.wall}>{children}</div>
}
