import Button from '../../../ui/Button'
import Dialog from '../../../ui/Dialog'
import { ALLOWANCES, PLACEMENTS, RECORDS_PER_DAY } from '../logic/game'
import s from './FieldManual.module.css'

const KEYS: [keys: string, action: string][] = [
  ['Tab', 'Reaches the slots on the main line.'],
  ['Up / Down', 'Moves to the slot above or below.'],
  ['Home / End', 'Jumps to the first or the last slot.'],
  ['Enter / Space', 'Places the record in the slot.'],
]

/** The Retcon rules, shared by the in-game dialog (dark) and the /manual page (paper). */
export function RetconRules({ tone = 'dark' }: { tone?: 'dark' | 'paper' }) {
  return (
    <div className={tone === 'paper' ? `${s.rules} ${s.paper}` : s.rules}>
      <p>
        Put today's {RECORDS_PER_DAY} records in date order, oldest at the top. The first record is the
        anchor: it is already on the main line, with its year shown.
      </p>
      <h3>Placing records</h3>
      <p>
        The other {PLACEMENTS} records arrive one at a time, without their years. Choose the slot where each
        one belongs: before, between or after the records already on the line. A record placed in order
        locks in and shows its year.
      </p>
      <h3>Variance allowances</h3>
      <p>
        You have {ALLOWANCES}. A record placed out of order costs one allowance, and the Archive moves it to its
        true slot with its year shown. It does not count as in order.
      </p>
      <p>
        When the last allowance is spent, the remaining records are filed automatically, with their years, and
        none of them count as in order. The Archive will not be rushed, but it will be finished.
      </p>
      <h3>Dates on file</h3>
      <ul className={s.list}>
        <li>Comics, events and publishing milestones use the cover date: month and year.</li>
        <li>Films and series use their first U.S. release.</li>
        <li>No two records on the same case share a year.</li>
      </ul>
      <h3>Keyboard</h3>
      <dl className={s.keys}>
        {KEYS.map(([keys, action]) => (
          <div key={keys}>
            <dt>{keys}</dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
      <h3>Filing</h3>
      <p>
        The case closes after {PLACEMENTS} placements, or when the allowances run out. Everyone receives the same
        records, and a new case is issued at midnight Eastern. Filings are final. Retroactive corrections are, for
        once, not permitted.
      </p>
    </div>
  )
}

export default function FieldManual({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Field manual">
      <p className={s.form}>Form 4R-M // Retcon: timeline repair</p>
      <RetconRules />
      <div className={s.actions}>
        <Button variant="solid" onClick={onClose}>Understood</Button>
      </div>
    </Dialog>
  )
}
