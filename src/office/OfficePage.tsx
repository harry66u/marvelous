import { useState } from 'react'
import AppShell from '../ui/AppShell'
import TerminalFrame from '../ui/TerminalFrame'
import Button from '../ui/Button'
import TokenSetup from './TokenSetup'
import Calendar from './Calendar'
import DayEditor from './DayEditor'
import CharacterEditor from './CharacterEditor'
import { useOfficeStore } from './officeStore'
import s from './Office.module.css'

type Tab = 'schedule' | 'characters'

export default function OfficePage() {
  const store = useOfficeStore()
  const [tab, setTab] = useState<Tab>('schedule')
  const [date, setDate] = useState<string | null>(null)
  const { load, schedule, chars } = store
  const issues = [...store.scheduleIssues, ...store.characterIssues]
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')

  let saveWhy: string | null = null
  if (store.token === null) saveWhy = 'Read-only: no token stored, so nothing can be saved. Add a token under Access to enable Save.'
  else if (errors.length > 0) saveWhy = `Fix ${errors.length} validation error${errors.length === 1 ? '' : 's'} before saving.`
  else if (store.changedFiles.length === 0) saveWhy = 'No changes to save.'

  return (
    <AppShell section="OFFICE">
      <div className="wrap">
        <TerminalFrame label="Scheduling Office" codes={{ tl: 'SCHEDULING OFFICE', tr: store.branch ? `BRANCH ${store.branch}` : '' }}>
          <h1 className={s.title}>Scheduling Office</h1>
          <TokenSetup store={store} />

          {load.status === 'loading' ? <p className="hud" role="status">Reading content from GitHub…</p> : null}
          {load.status === 'error' ? (
            <p className={s.err} role="alert">{load.message} <Button onClick={store.reload}>Retry</Button></p>
          ) : null}

          {load.status === 'ready' && schedule && chars ? (
            <>
              <div className={s.tabs} role="group" aria-label="Section">
                <Button variant={tab === 'schedule' ? 'solid' : 'outline'} aria-pressed={tab === 'schedule'} onClick={() => setTab('schedule')}>Schedule</Button>
                <Button variant={tab === 'characters' ? 'solid' : 'outline'} aria-pressed={tab === 'characters'} onClick={() => setTab('characters')}>Characters</Button>
                <Button onClick={store.reload}>Reload</Button>
              </div>

              {errors.length > 0 || warnings.length > 0 ? (
                <details className={s.panel} open={errors.length > 0}>
                  <summary className={s.lbl}>Validation: {errors.length} errors, {warnings.length} warnings</summary>
                  <ul className={s.issues} tabIndex={0} aria-label="Validation issues">
                    {issues.slice(0, 50).map((i) => (
                      <li key={i.path + i.message} className={i.level === 'error' ? s.err : s.warn}>
                        <code>{i.path}</code> {i.message}
                      </li>
                    ))}
                    {issues.length > 50 ? <li>…and {issues.length - 50} more.</li> : null}
                  </ul>
                </details>
              ) : null}

              {tab === 'schedule' ? (
                <div className={s.split}>
                  <section className={s.panel} aria-labelledby="cal-h">
                    <h2 id="cal-h" className={s.h}>Calendar</h2>
                    <p className={s.row}>
                      <span className={s.note}>Empty days from today get an unused Unmasked answer, seven unused B-List requests and six unused Retcon records.</span>
                      <Button onClick={store.autofill}>Auto-fill</Button>
                    </p>
                    <Calendar schedule={schedule} chars={chars} issues={store.scheduleIssues} selected={date} onSelect={setDate} />
                  </section>
                  {date ? (
                    <DayEditor
                      key={date} date={date} schedule={schedule} chars={chars} issues={store.scheduleIssues}
                      onPick={(id) => store.setDay(date, id)} onClear={() => store.setDay(date, undefined)}
                      prompts={store.prompts} records={store.records}
                      onGame={(game, reroll) => store.setDayGame(date, game, reroll)}
                    />
                  ) : <p className={s.note}>Pick a day to edit its answer.</p>}
                </div>
              ) : (
                <CharacterEditor chars={chars} issues={store.characterIssues} onChange={store.updateChar} onAdd={store.addChar} />
              )}

              <section className={`${s.panel} ${s.savebar}`} aria-label="Save">
                <p className={s.note}>
                  {store.changedFiles.length > 0 ? `Changed: ${store.changedFiles.join(', ')}` : 'No unsaved changes.'}
                </p>
                <Button variant="solid" disabled={!store.canSave} aria-describedby="save-why" onClick={store.save}>
                  {store.saving ? 'Saving…' : 'Save'}
                </Button>
                <p id="save-why" className={s.note}>{saveWhy}</p>
                {store.saveError ? <p className={s.err} role="alert">{store.saveError}</p> : null}
                {store.commits.length > 0 ? (
                  <p role="status">
                    Committed:{' '}
                    {store.commits.map((c) => (
                      <a key={c.url} href={c.url} target="_blank" rel="noreferrer">{c.file}</a>
                    ))}
                    . Vercel redeploys in about a minute.
                  </p>
                ) : null}
              </section>
            </>
          ) : null}
        </TerminalFrame>
      </div>
    </AppShell>
  )
}
