import { useState } from 'react'
import Button from '../ui/Button'
import { OWNER, REPO } from './github'
import type { OfficeStore } from './officeStore'
import s from './Office.module.css'

export default function TokenSetup({ store }: { store: OfficeStore }) {
  const [draft, setDraft] = useState('')
  const [branchDraft, setBranchDraft] = useState('')
  const hasToken = store.token !== null

  return (
    <section className={s.panel} aria-labelledby="token-h">
      <h2 id="token-h" className={s.h}>Access</h2>
      {hasToken ? (
        <p className={s.row}>
          <span>Token stored in this browser. Saving is on.</span>
          <Button onClick={store.forgetToken}>Forget token</Button>
        </p>
      ) : (
        <>
          <p className={s.note}>
            Without a token the Office is read-only. To save, make a GitHub token that can write to this repository only:
          </p>
          <ol className={s.steps}>
            <li>On GitHub open Settings, then Developer settings, then Personal access tokens, then Fine-grained tokens.</li>
            <li>Choose Generate new token and name it "Marvelous office".</li>
            <li>Set an expiry (30 to 90 days is fine).</li>
            <li>Under Repository access pick Only select repositories, then choose {OWNER}/{REPO}.</li>
            <li>Under Permissions, Repository permissions, set Contents to Read and write.</li>
            <li>Choose Generate token, copy it, and paste it below.</li>
          </ol>
          <form
            className={s.row}
            onSubmit={(e) => {
              e.preventDefault()
              if (draft.trim()) { store.setToken(draft.trim()); setDraft('') }
            }}
          >
            <label className={s.field}>
              <span className={s.lbl}>GitHub token</span>
              <input type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} />
            </label>
            <Button type="submit" variant="solid" disabled={!draft.trim()}>Store token</Button>
          </form>
          <p className={s.note}>It stays in this browser (localStorage) and is only sent to api.github.com.</p>
        </>
      )}
      <form
        className={s.row}
        onSubmit={(e) => {
          e.preventDefault()
          if (branchDraft.trim()) store.setBranch(branchDraft.trim())
        }}
      >
        <label className={s.field}>
          <span className={s.lbl}>Branch (default {store.defaultBranch ?? '…'})</span>
          <input value={branchDraft} placeholder={store.branch ?? ''} onChange={(e) => setBranchDraft(e.target.value)} />
        </label>
        <Button type="submit" disabled={!branchDraft.trim()}>Use branch</Button>
      </form>
    </section>
  )
}
