import type { CSSProperties } from 'react'
import Dialog from '../../../ui/Dialog'
import type { UnmaskedStats } from '../logic/stats'
import s from './StatsDialog.module.css'

interface Props {
  open: boolean
  onClose: () => void
  stats: UnmaskedStats
  /** consecutive shifts ending today (or yesterday) */
  current: number
  best: number
  /** attempts used on today's solved case, marked in the distribution */
  highlight?: number | null
}

export default function StatsDialog({ open, onClose, stats, current, best, highlight = null }: Props) {
  const rate = stats.played > 0 ? `${Math.round((stats.solved / stats.played) * 100)}%` : '–'
  const max = Math.max(1, ...stats.distribution)
  const tiles: [label: string, value: string][] = [
    ['Played', String(stats.played)],
    ['Solved', rate],
    ['Current shifts', String(current)],
    ['Best shifts', String(best)],
  ]
  return (
    <Dialog open={open} onClose={onClose} title="Statistics">
      <dl className={s.tiles}>
        {tiles.map(([label, value]) => (
          <div key={label} className={s.tile}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <table className={s.dist}>
        <caption>Solved by attempt</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">Attempts</th>
            <th scope="col" className="sr-only">Cases solved</th>
          </tr>
        </thead>
        <tbody>
          {stats.distribution.map((n, i) => {
            const today = highlight === i + 1
            return (
              <tr key={i} className={today ? s.today : undefined}>
                <th scope="row">{i + 1}</th>
                <td>
                  <div className={s.track} style={{ '--f': n / max } as CSSProperties}>
                    <span className={s.bar} aria-hidden="true" />
                    <span className={s.count}>{n}</span>
                    {today ? <span className={s.tag}>Today</span> : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className={s.note}>
        {stats.played === 0 ? 'No cases filed yet. ' : ''}Statistics are kept on this device.
      </p>
    </Dialog>
  )
}
