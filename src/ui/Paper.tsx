import type { ReactNode } from 'react'
import './surfaces.css'
import s from './Paper.module.css'

export default function Paper({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[s.paper, className].filter(Boolean).join(' ')}>{children}</div>
}
