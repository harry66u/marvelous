import SmartLink from './SmartLink'
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

const cssClass = (status: TicketStatus) => s[status === 'in_progress' ? 'progress' : status] ?? ''

export default function Ticket({ no, title, subtitle, status, statusText, href }: Props) {
  const body: ReactNode = (
    <>
      <span className={s.no} aria-hidden="true">{no}</span>
      <span className={s.name}>{title}</span>
      <span className={s.sub}>{subtitle}</span>
      <span className={s.status}>{statusText}</span>
    </>
  )
  const cls = `${s.ticket} ${cssClass(status)}`
  return href ? (
    <SmartLink className={`${cls} ${s.link ?? ''}`} href={href} data-status={status}>{body}</SmartLink>
  ) : (
    <div className={cls} data-status={status}>{body}</div>
  )
}
