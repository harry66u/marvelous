import type { Tier } from '../../../content/types'
import { TIER_LABEL } from '../logic/game'
import s from './TierChip.module.css'

/** A tier marker that always carries the tier's name, so color is never the only signal. */
export default function TierChip({ tier, label, className }: { tier: Tier | null; label?: string; className?: string }) {
  return (
    <span className={[s.chip, className].filter(Boolean).join(' ')} data-tier={tier ?? 'none'}>
      <i className={s.swatch} aria-hidden="true">{tier ? null : '–'}</i>
      {label ?? (tier ? TIER_LABEL[tier] : 'No record')}
    </span>
  )
}

