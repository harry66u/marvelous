import type { CSSProperties } from 'react'
import { TIERS } from '../../../content/types'
import Dialog from '../../../ui/Dialog'
import { TIER_LABEL } from '../logic/game'
import type { BlistStats } from './stats'
import TierChip from './TierChip'
import s from './StatsDialog.module.css'

interface Props {
  open: boolean
  onClose: () => void
  stats: BlistStats
}

const dash = (n: number | null) => (n === null ? '–' : String(n))

export default function StatsDialog({ open, onClose, stats }: Props) {
  const tiles: [label: string, value: string][] = [
    ['Shifts filed', String(stats.played)],
    ['Average score', dash(stats.average)],
    ['Best score', dash(stats.best)],
    ['Deepest sublevel', stats.deepest === null ? '–' : stats.deepest === 0 ? 'Ground' : `B${stats.deepest}`],
  ]
  const rows = [...TIERS.map((t) => ({ key: t, tier: t, label: TIER_LABEL[t], n: stats.tiers[t] })),
    { key: 'expired', tier: null, label: 'Expired', n: stats.expired }]
  const max = Math.max(1, ...rows.map((r) => r.n))
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
        <caption>Records filed by tier</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">Tier</th>
            <th scope="col" className="sr-only">Records</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">
                <TierChip tier={r.tier} label={r.label} />
              </th>
              <td>
                <div className={s.track} style={{ '--f': r.n / max } as CSSProperties}>
                  <span className={s.bar} aria-hidden="true" />
                  <span className={s.count}>{r.n}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.note}>
        {stats.played === 0 ? 'No searches filed yet. ' : ''}Statistics are kept on this device.
      </p>
    </Dialog>
  )
}
