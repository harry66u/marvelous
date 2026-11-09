import Button from '../../../ui/Button'
import Dialog from '../../../ui/Dialog'
import { MARK_SYMBOL } from './labels'
import s from './FieldManual.module.css'

const COUNTS: [term: string, definition: string][] = [
  ['World', 'Which corner of Marvel the subject belongs to (listed below the grid). Exact when it matches; close when the worlds differ but the two have been on the same team.'],
  [
    'Debut',
    'Decade of first published appearance. Exact for the same decade, close for the decade either side. ▲ means the subject debuted later, ▼ earlier.',
  ],
  ['Alignment', 'Hero, Villain or Antihero.'],
  ['Origin', 'Mutant, Inhuman, Mutate, Super-soldier, Tech, Magic, Cosmic, Deity, Alien, Synthetic or Trained human.'],
  ['Gender', 'Male, Female or Other.'],
  [
    'MCU',
    'Yes if the character has appeared in a live-action Marvel Studios film or Disney+ series. Voice-only and animated roles do not count.',
  ],
]

/** The Unmasked rules, shared by the in-game dialog (dark) and the /manual page (paper). */
export function UnmaskedRules({ tone = 'dark' }: { tone?: 'dark' | 'paper' }) {
  return (
    <div className={tone === 'paper' ? `${s.rules} ${s.paper}` : s.rules}>
      <p>
        Name today's subject in six attempts or fewer. Type a codename, alias or real name, pick the
        match from the list, and file it. Arrow keys move through the list; Enter files the highlighted
        name, or the top match.
      </p>
      <h3>The six counts</h3>
      <p>Each attempt is checked against the subject on six counts.</p>
      <dl className={s.counts}>
        {COUNTS.map(([term, definition]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
      <h3>Marks</h3>
      <ul className={s.marks}>
        <li>
          <i className={`${s.chip} ${s.exact}`} aria-hidden="true">{MARK_SYMBOL.exact}</i>
          <span><b>Exact (orange):</b> the count matches the subject.</span>
        </li>
        <li>
          <i className={`${s.chip} ${s.close}`} aria-hidden="true">{MARK_SYMBOL.close}</i>
          <span><b>Close (mustard):</b> near, as defined above. Only World and Debut can be close.</span>
        </li>
        <li>
          <i className={`${s.chip} ${s.no}`} aria-hidden="true">{MARK_SYMBOL.no}</i>
          <span><b>No match (brown):</b> the count does not match.</span>
        </li>
      </ul>
      <p>
        The mark beside each name says whether you named the subject. Two characters can match on all six
        counts, so read the name mark as well.
      </p>
      <h3>Filing</h3>
      <p>
        The case closes when you name the subject or file the sixth attempt. Everyone receives the same
        subject, and a new case is issued at midnight Eastern. Filings are final. The Archive does not accept
        corrections.
      </p>
    </div>
  )
}

export default function FieldManual({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Field manual">
      <p className={s.form}>Form 7B-M // Unmasked: identify the variant</p>
      <UnmaskedRules />
      <div className={s.actions}>
        <Button variant="solid" onClick={onClose}>Understood</Button>
      </div>
    </Dialog>
  )
}
