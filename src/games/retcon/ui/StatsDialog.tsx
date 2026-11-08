import type { CSSProperties } from 'react'
import Dialog from '../../../ui/Dialog'
import { PLACEMENTS } from '../logic/game'
import type { RetconStats } from './stats'
import s from './StatsDialog.module.css'

interface Props {
  open: boolean
  onClose: () => void
  stats: RetconStats
  /** records in order on today's filed case, marked in the distribution */
  highlight?: number | null
}

export default function StatsDialog({ open, onClose, stats, highlight = null }: Props) {
  const max = Math.max(1, ...stats.distribution)
  const tiles: [label: string, value: string][] = [
    ['Cases filed', String(stats.filed)],
    ['Perfect days', String(stats.perfect)],
    ['Average in order', stats.average === null ? '–' : `${stats.average.toFixed(1)}/${PLACEMENTS}`],
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
        <caption>Records in order per case</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">Records in order</th>
            <th scope="col" className="sr-only">Cases</th>
          </tr>
        </thead>
        <tbody>
          {stats.distribution.map((n, i) => {
            const today = highlight === i
            return (
              <tr key={i} className={today ? s.today : undefined}>
                <th scope="row">{i}</th>
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
        {stats.filed === 0 ? 'No cases filed yet. ' : ''}A perfect day is all {PLACEMENTS} records in order. Statistics
        are kept on this device.
      </p>
    </Dialog>
  )
}
