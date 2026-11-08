import { TIERS, type Tier } from '../../../content/types'
import Button from '../../../ui/Button'
import Dialog from '../../../ui/Dialog'
import { PROMPTS_PER_DAY, TIER_POINTS } from '../logic/game'
import TierChip from './TierChip'
import s from './FieldManual.module.css'

const MEANING: Record<Tier, string> = {
  common: 'Household names. Most agents file these.',
  filed: 'Known to most moviegoers.',
  restricted: 'Known to regular comic readers.',
  classified: 'Deep cuts.',
  sealed: 'True obscurities. Few agents have opened these drawers.',
}

/** The B-List rules, shared by the in-game dialog (dark) and the /manual page (paper). */
export function BlistRules({ tone = 'dark' }: { tone?: 'dark' | 'paper' }) {
  return (
    <div className={tone === 'paper' ? `${s.rules} ${s.paper}` : s.rules}>
      <p>
        {PROMPTS_PER_DAY} records requests arrive one at a time, for example "Name a member of the Fantastic
        Four". Each request allows 25 seconds and one answer. Type a name and press Enter, or File.
      </p>
      <h3>Timing</h3>
      <ul className={s.list}>
        <li>The clock starts when the request arrives and keeps running if you leave the page.</li>
        <li>A name with no record on file costs 3 seconds. The same wrong name is only charged once.</li>
        <li>When the clock reaches zero the request expires and scores nothing.</li>
        <li>Typing errors are forgiven within reason, and aliases and real names are accepted. A different real name is never corrected into a right one.</li>
      </ul>
      <h3>Rarity</h3>
      <p>Rarer records score more. Every answer is filed under one of five tiers.</p>
      <table className={s.tiers}>
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col">Points</th>
            <th scope="col" className={s.meaningCol}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((t) => (
            <tr key={t}>
              <th scope="row"><TierChip tier={t} /></th>
              <td className={s.pts}>{TIER_POINTS[t]}</td>
              <td className={s.meaningCol}>{MEANING[t]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Depth</h3>
      <p>
        Every point takes you 10 feet further into the Archive. Each 100 points opens a new sublevel, B1 to
        B7. A perfect shift scores 700 and reaches 7,000 feet.
      </p>
      <h3>Extended timer</h3>
      <p>
        Agents who need longer may switch on the extended timer in Settings: 50 seconds per request. It
        applies from the next shift you start, and your report is labelled "Extended timer".
      </p>
      <h3>Filing</h3>
      <p>
        Everyone receives the same requests, and new ones are issued at midnight Eastern. Filings are final.
        The Archive does not accept corrections.
      </p>
    </div>
  )
}

export default function FieldManual({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Field manual">
      <p className={s.form}>Form 12C-M // B-List: records search</p>
      <BlistRules />
      <div className={s.actions}>
        <Button variant="solid" onClick={onClose}>Understood</Button>
      </div>
    </Dialog>
  )
}
