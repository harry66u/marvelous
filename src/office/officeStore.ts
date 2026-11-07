import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Character, Issue, Schedule } from '../content/types'
import { TEAMS } from '../content/teams'
import { validateCharacters, validateSchedule } from '../content/validate'
import { addDays, etDateOf } from '../lib/time'
import { autofillSchedule } from './autofill'
import {
  BRANCH_KEY, GitHubError, OWNER, REPO, clearToken, getDefaultBranch, loadToken, readJsonFile, saveToken,
  writeJsonFile, type RepoRef,
} from './github'

export const SCHEDULE_PATH = 'content/schedule.json'
export const CHARACTERS_PATH = 'content/characters.json'
export const PAST_DAYS = 14
export const FUTURE_DAYS = 90

type Loaded = { schedule: Schedule; chars: Character[]; shas: { schedule: string; characters: string } }
export type Load = { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'ready' } & Loaded)
export interface SavedCommit { file: string; url: string }

const sortDays = (s: Schedule): Schedule => ({
  ...s,
  days: Object.fromEntries(Object.entries(s.days).sort(([a], [b]) => a.localeCompare(b))),
})

const readBranch = () => { try { return localStorage.getItem(BRANCH_KEY) } catch { return null } }

export function conflictMessage(e: unknown): string {
  if (e instanceof GitHubError && (e.status === 409 || e.status === 422)) {
    return 'Someone else changed this file since you loaded it. Reload to get their version, then redo your edit.'
  }
  if (e instanceof GitHubError && (e.status === 401 || e.status === 403)) {
    if (!loadToken()) return 'GitHub would not serve the file without a token (rate limit or private repository). Add a token under Access, then reload.'
    return 'GitHub refused the token. Check that it has Contents: Read and write on harry66u/marvelous, and has not expired.'
  }
  return e instanceof Error ? e.message : 'Something went wrong.'
}

export function useOfficeStore() {
  const [token, setTokenState] = useState<string | null>(loadToken)
  const [branch, setBranchState] = useState<string | null>(readBranch)
  const [defaultBranch, setDefaultBranch] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [original, setOriginal] = useState<{ schedule: string; chars: string }>({ schedule: '', chars: '' })
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [chars, setChars] = useState<Character[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [commits, setCommits] = useState<SavedCommit[]>([])

  const effectiveBranch = branch ?? defaultBranch

  useEffect(() => {
    let live = true
    setLoad({ status: 'loading' })
    ;(async () => {
      try {
        const b = branch ?? (await getDefaultBranch(OWNER, REPO, token))
        if (!live) return
        setDefaultBranch((d) => d ?? b)
        const ref: RepoRef = { owner: OWNER, repo: REPO, branch: b }
        const [s, c] = await Promise.all([
          readJsonFile<Schedule>(ref, SCHEDULE_PATH, token),
          readJsonFile<Character[]>(ref, CHARACTERS_PATH, token),
        ])
        if (!live) return
        setSchedule(s.data)
        setChars(c.data)
        setOriginal({ schedule: JSON.stringify(sortDays(s.data)), chars: JSON.stringify(c.data) })
        setCommits([])
        setSaveError(null)
        setLoad({ status: 'ready', schedule: s.data, chars: c.data, shas: { schedule: s.sha, characters: c.sha } })
      } catch (e) {
        if (live) setLoad({ status: 'error', message: `Could not read the repository: ${conflictMessage(e)}` })
      }
    })()
    return () => { live = false }
    // token only matters for rate limits on reads, so it does not trigger a reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, reloadKey])

  const scheduleDirty = schedule !== null && JSON.stringify(sortDays(schedule)) !== original.schedule
  const charsDirty = chars !== null && JSON.stringify(chars) !== original.chars
  const changedFiles = [scheduleDirty ? SCHEDULE_PATH : null, charsDirty ? CHARACTERS_PATH : null].filter(
    (f): f is string => f !== null,
  )

  const scheduleIssues: Issue[] = useMemo(
    () => (schedule && chars ? validateSchedule(schedule, chars) : []),
    [schedule, chars],
  )
  const characterIssues: Issue[] = useMemo(() => (chars ? validateCharacters(chars, TEAMS) : []), [chars])
  const errorCount = [...scheduleIssues, ...characterIssues].filter((i) => i.level === 'error').length

  const setDay = useCallback((date: string, id: string | undefined) => {
    setSchedule((s) => {
      if (!s) return s
      const days = { ...s.days }
      if (id === undefined) delete days[date]
      else days[date] = { ...days[date], unmasked: id }
      return { ...s, days }
    })
  }, [])

  const autofill = useCallback(() => {
    setSchedule((s) => {
      if (!s || !chars) return s
      const from = etDateOf(new Date())
      return autofillSchedule(s, chars, from, addDays(from, FUTURE_DAYS - 1))
    })
  }, [chars])

  const updateChar = useCallback((index: number, next: Character) => {
    setChars((cs) => (cs ? cs.map((c, i) => (i === index ? next : c)) : cs))
  }, [])
  const addChar = useCallback((c: Character) => setChars((cs) => (cs ? [...cs, c] : cs)), [])

  const setToken = (t: string) => { saveToken(t); setTokenState(t) }
  const forgetToken = () => { clearToken(); setTokenState(null) }
  const setBranch = (b: string) => {
    try { localStorage.setItem(BRANCH_KEY, b) } catch { /* not remembered */ }
    setBranchState(b)
  }
  const reload = () => setReloadKey((k) => k + 1)

  const canSave = token !== null && load.status === 'ready' && changedFiles.length > 0 && errorCount === 0 && !saving

  const save = async () => {
    if (!token || load.status !== 'ready' || !schedule || !chars || !effectiveBranch) return
    const ref: RepoRef = { owner: OWNER, repo: REPO, branch: effectiveBranch }
    setSaving(true)
    setSaveError(null)
    const shas = { ...load.shas }
    const done: SavedCommit[] = []
    try {
      if (charsDirty) {
        const r = await writeJsonFile(ref, CHARACTERS_PATH, chars, shas.characters, 'office: update characters', token)
        done.push({ file: CHARACTERS_PATH, url: r.commitUrl })
        setOriginal((o) => ({ ...o, chars: JSON.stringify(chars) }))
        setLoad((l) => (l.status === 'ready' ? { ...l, shas: { ...l.shas, characters: r.sha } } : l))
      }
      if (scheduleDirty) {
        const out = sortDays(schedule)
        const r = await writeJsonFile(ref, SCHEDULE_PATH, out, shas.schedule, 'office: update schedule', token)
        shas.schedule = r.sha
        done.push({ file: SCHEDULE_PATH, url: r.commitUrl })
        setOriginal((o) => ({ ...o, schedule: JSON.stringify(out) }))
        setLoad((l) => (l.status === 'ready' ? { ...l, shas: { ...l.shas, schedule: r.sha } } : l))
      }
    } catch (e) {
      setSaveError(conflictMessage(e))
    } finally {
      setCommits((c) => [...c, ...done])
      setSaving(false)
    }
  }

  return {
    load, token, setToken, forgetToken, branch: effectiveBranch, setBranch, defaultBranch, reload,
    schedule, chars, setDay, autofill, updateChar, addChar,
    scheduleIssues, characterIssues, errorCount, changedFiles, canSave, saving, save, saveError, commits,
  }
}
export type OfficeStore = ReturnType<typeof useOfficeStore>
