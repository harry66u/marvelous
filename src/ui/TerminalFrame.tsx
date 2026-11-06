import type { ReactNode } from 'react'
import s from './TerminalFrame.module.css'

interface Props {
  codes?: { tl?: string; tr?: string; bl?: string; br?: string }
  rail?: ReactNode
  children: ReactNode
  label: string
}

export default function TerminalFrame({ codes, rail, children, label }: Props) {
  return (
    <section className={`${s.term} ${rail ? s.hasRail : ''}`} aria-label={label}>
      {codes?.tl ? <span className={`${s.code} ${s.tl}`}>{codes.tl}</span> : null}
      {codes?.tr ? <span className={`${s.code} ${s.tr}`}>{codes.tr}</span> : null}
      {codes?.bl ? <span className={`${s.code} ${s.bl}`}>{codes.bl}</span> : null}
      {codes?.br ? <span className={`${s.code} ${s.br}`}>{codes.br}</span> : null}
      {rail}
      <div className={s.main}>{children}</div>
    </section>
  )
}
