import { useId } from 'react'
import Dialog from '../ui/Dialog'
import { useSettings } from '../data/progress'
import type { Settings } from './settings'
import s from './SettingsDialog.module.css'

interface Props { open: boolean; onClose: () => void }

interface Choice<T> { value: T; label: string }

function Group<T extends string>({ legend, name, choices, value, onChange, note }: {
  legend: string
  name: string
  choices: Choice<T>[]
  value: T
  onChange: (v: T) => void
  note: string
}) {
  const noteId = useId()
  return (
    <div className={s.group} role="radiogroup" aria-label={legend} aria-describedby={noteId}>
      <div className={s.legend} aria-hidden="true">{legend}</div>
      <div className={s.choices}>
        {choices.map((c) => (
          <label key={c.value} className={s.choice}>
            <input
              type="radio"
              name={name}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
      <p id={noteId} className={s.note}>{note}</p>
    </div>
  )
}

const SOUND_NOTE = { off: 'Audio: Off. The Archive prefers silence.', on: 'Audio: On. Keys will be audible. Colleagues may object.' }
const MOTION_NOTE: Record<Settings['motion'], string> = {
  system: 'Motion: System. The Archive defers to your device.',
  reduce: 'Motion: Reduced. Stamps arrive without ceremony.',
  full: 'Motion: Full. Stamps will be applied with ceremony.',
}

const TIMER_NOTE = {
  standard: 'B-List timer: 25 seconds per request.',
  extended: 'B-List timer: 50 seconds per request. Applies from your next B-List shift and is noted on the report.',
}

export default function SettingsDialog({ open, onClose }: Props) {
  const [settings, patch] = useSettings()
  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <div className={s.body}>
        <Group
          legend="Sound"
          name="sound"
          choices={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
          value={settings.sound ? 'on' : 'off'}
          onChange={(v) => patch({ sound: v === 'on' })}
          note={settings.sound ? SOUND_NOTE.on : SOUND_NOTE.off}
        />
        <Group
          legend="Motion"
          name="motion"
          choices={[
            { value: 'system', label: 'System' },
            { value: 'reduce', label: 'Reduced' },
            { value: 'full', label: 'Full' },
          ]}
          value={settings.motion}
          onChange={(v) => patch({ motion: v })}
          note={MOTION_NOTE[settings.motion]}
        />
        <Group
          legend="B-List timer"
          name="extended-timer"
          choices={[{ value: 'standard', label: 'Standard' }, { value: 'extended', label: 'Extended' }]}
          value={settings.extendedTimer ? 'extended' : 'standard'}
          onChange={(v) => patch({ extendedTimer: v === 'extended' })}
          note={settings.extendedTimer ? TIMER_NOTE.extended : TIMER_NOTE.standard}
        />
      </div>
    </Dialog>
  )
}
