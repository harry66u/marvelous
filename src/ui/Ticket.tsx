import type { ReactNode } from 'react'
import s from './Ticket.module.css'

export type TicketStatus = 'pending' | 'in_progress' | 'filed' | 'unavailable'

interface Props {
  no: string
  title: string
  subtitle: string
  status: TicketStatus
  statusText: string
  href?: string
}

const CLASS: Record<TicketStatus, string> = {
  pending: s.pending, in_progress: s.progress, filed: s.filed, unavailable: s.unavailable,
}

export default function Ticket({ no, title, subtitle, status, statusText, href }: Props) {
  const body: ReactNode = (
    <>
      <span className={s.no} aria-hidden="true">{no}</span>
      <span className={s.name}>{title}</span>
      <span className={s.sub}>{subtitle}</span>
      <span className={s.status}>{statusText}</span>
    </>
  )
  const cls = `${s.ticket} ${CLASS[status]}`
  return href ? (
    <a className={`${cls} ${s.link}`} href={href} data-status={status}>{body}</a>
  ) : (
    <div className={cls} data-status={status}>{body}</div>
  )
}
