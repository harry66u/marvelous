import { useMemo, useState, type ReactNode } from 'react'
import Button from '../ui/Button'
import { TEAMS } from '../content/teams'
import { ARCHETYPES, ORIGINS, type Character, type Issue } from '../content/types'
import s from './Office.module.css'

const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)
const blank = (): Character => ({
  id: 'new-character', name: 'New character', aliases: [], realName: null, primaryTeam: 'none', teams: [],
  debutYear: 2000, debutIssue: '', debutDate: '2000', alignment: 'hero', origin: 'mutant', gender: 'other',
  mcu: false, mcuFirst: null, answerOk: false, difficulty: 3, caseNote: '', archetype: 'caped', sources: [], notes: '',
})

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={s.field}><span className={s.lbl}>{label}</span>{children}</label>
}

interface Props {
  chars: Character[]
  issues: Issue[]
  onChange: (index: number, c: Character) => void
  onAdd: (c: Character) => void
}

export default function CharacterEditor({ chars, issues, onChange, onAdd }: Props) {
  const [filter, setFilter] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return chars.map((c, i) => ({ c, i })).filter(({ c }) => !q || c.name.toLowerCase().includes(q) || c.id.includes(q)).slice(0, 40)
  }, [chars, filter])
  const c = sel === null ? undefined : chars[sel]
  const mine = sel === null ? [] : issues.filter((i) => i.path.startsWith(`characters[${sel}]`))
  const set = (patch: Partial<Character>) => { if (c && sel !== null) onChange(sel, { ...c, ...patch }) }
  const opt = (v: string) => <option key={v} value={v}>{v}</option>

  return (
    <div className={s.split}>
      <section className={s.panel} aria-labelledby="chars-h">
        <h2 id="chars-h" className={s.h}>Characters ({chars.length})</h2>
        <Field label="Filter">
          <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </Field>
        <ul className={s.results}>
          {shown.map(({ c: ch, i }) => (
            <li key={ch.id}>
              <button type="button" className={`${s.result} ${i === sel ? s.sel : ''}`} aria-pressed={i === sel} onClick={() => setSel(i)}>
                <span className={s.who}>{ch.name}</span>
                <span className={s.tag}>{ch.answerOk ? `D${ch.difficulty}` : 'off'}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button onClick={() => { onAdd(blank()); setSel(chars.length) }}>Add character</Button>
      </section>

      {c ? (
        <section className={s.panel} aria-labelledby="edit-h">
          <h2 id="edit-h" className={s.h}>Edit {c.name}</h2>
          {mine.map((i) => <p key={i.path + i.message} className={i.level === 'error' ? s.err : s.warn} role="alert">{i.message}</p>)}
          <div className={s.form}>
            <Field label="Id (kebab-case)"><input value={c.id} onChange={(e) => set({ id: e.target.value })} /></Field>
            <Field label="Name"><input value={c.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="Real name"><input value={c.realName ?? ''} onChange={(e) => set({ realName: e.target.value || null })} /></Field>
            <Field label="Aliases (one per line)">
              <textarea rows={3} defaultValue={c.aliases.join('\n')} key={`al-${sel}`} onChange={(e) => set({ aliases: lines(e.target.value) })} />
            </Field>
            <Field label="Primary team">
              <select value={c.primaryTeam} onChange={(e) => set({ primaryTeam: e.target.value })}>
                <option value="none">none</option>
                {TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <fieldset className={s.checks}>
              <legend className={s.lbl}>Teams</legend>
              {TEAMS.map((t) => (
                <label key={t.id}>
                  <input
                    type="checkbox" checked={c.teams.includes(t.id)}
                    onChange={(e) => set({ teams: e.target.checked ? [...c.teams, t.id] : c.teams.filter((x) => x !== t.id) })}
                  />{' '}{t.name}
                </label>
              ))}
            </fieldset>
            <Field label="Other teams (one per line)">
              <textarea rows={2} defaultValue={(c.otherTeams ?? []).join('\n')} key={`ot-${sel}`} onChange={(e) => set({ otherTeams: lines(e.target.value) })} />
            </Field>
            <Field label="Debut year"><input type="number" value={c.debutYear} onChange={(e) => set({ debutYear: Number(e.target.value) })} /></Field>
            <Field label="Debut issue"><input value={c.debutIssue} onChange={(e) => set({ debutIssue: e.target.value })} /></Field>
            <Field label="Debut date (YYYY or YYYY-MM)"><input value={c.debutDate} onChange={(e) => set({ debutDate: e.target.value })} /></Field>
            <Field label="Alignment">
              <select value={c.alignment} onChange={(e) => set({ alignment: e.target.value as Character['alignment'] })}>{['hero', 'villain', 'antihero'].map(opt)}</select>
            </Field>
            <Field label="Origin">
              <select value={c.origin} onChange={(e) => set({ origin: e.target.value as Character['origin'] })}>{ORIGINS.map(opt)}</select>
            </Field>
            <Field label="Gender">
              <select value={c.gender} onChange={(e) => set({ gender: e.target.value as Character['gender'] })}>{['male', 'female', 'other'].map(opt)}</select>
            </Field>
            <Field label="Archetype">
              <select value={c.archetype} onChange={(e) => set({ archetype: e.target.value as Character['archetype'] })}>{ARCHETYPES.map(opt)}</select>
            </Field>
            <label className={s.check}>
              <input type="checkbox" checked={c.mcu} onChange={(e) => set({ mcu: e.target.checked, mcuFirst: e.target.checked ? c.mcuFirst : null })} /> In the MCU
            </label>
            <Field label="First MCU appearance"><input value={c.mcuFirst ?? ''} onChange={(e) => set({ mcuFirst: e.target.value || null })} /></Field>
            <label className={s.check}>
              <input type="checkbox" checked={c.answerOk} onChange={(e) => set({ answerOk: e.target.checked })} /> In the answer pool
            </label>
            <Field label="Difficulty (1-5)">
              <select value={c.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) as Character['difficulty'] })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </Field>
            <Field label={`Case note (${c.caseNote.length}/300)`}>
              <textarea rows={4} value={c.caseNote} onChange={(e) => set({ caseNote: e.target.value })} />
            </Field>
            <Field label="Sources (one https URL per line)">
              <textarea rows={3} defaultValue={c.sources.join('\n')} key={`so-${sel}`} onChange={(e) => set({ sources: lines(e.target.value) })} />
            </Field>
            <Field label="Notes"><textarea rows={3} value={c.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
          </div>
        </section>
      ) : null}
    </div>
  )
}
