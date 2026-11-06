import { isIsoDate, daysBetween } from '../lib/time'
import { ARCHETYPES, ORIGINS } from './types'
import type { Character, Issue, PublicCharacter, Schedule, Team } from './types'

export const UNMASKED_COOLDOWN_DAYS = 120
const MIN_COVERAGE_DAYS = 60

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const DEBUT_DATE = /^\d{4}(-\d{2})?$/
const ALIGNMENTS = ['hero', 'villain', 'antihero']
const GENDERS = ['male', 'female', 'other']

export function validateCharacters(chars: Character[], teams: Team[]): Issue[] {
  const issues: Issue[] = []
  const add = (level: Issue['level'], path: string, message: string) => issues.push({ level, path, message })
  const teamIds = new Set(teams.map((t) => t.id))
  const ids = new Set<string>()
  const names = new Map<string, number>()
  for (const c of chars) names.set(c.name.trim().toLowerCase(), 1)

  const seenNames = new Set<string>()
  chars.forEach((c, i) => {
    const p = `characters[${i}]`

    if (ids.has(c.id)) add('error', `${p}.id`, `Duplicate id "${c.id}".`)
    ids.add(c.id)
    if (!KEBAB.test(c.id)) add('error', `${p}.id`, `Id "${c.id}" is not kebab-case.`)

    const nameKey = c.name.trim().toLowerCase()
    if (!nameKey) add('error', `${p}.name`, 'Name is empty.')
    else if (seenNames.has(nameKey)) add('error', `${p}.name`, `Duplicate name "${c.name}".`)
    seenNames.add(nameKey)

    if (c.aliases.length > 8) add('error', `${p}.aliases`, `${c.aliases.length} aliases; at most 8.`)
    c.aliases.forEach((a, j) => {
      const k = a.trim().toLowerCase()
      if (k !== nameKey && names.has(k)) add('warning', `${p}.aliases[${j}]`, `Alias "${a}" is another character's name.`)
    })

    if (c.primaryTeam !== 'none' && !teamIds.has(c.primaryTeam)) {
      add('error', `${p}.primaryTeam`, `Unknown team "${c.primaryTeam}".`)
    }
    c.teams.forEach((t, j) => {
      if (!teamIds.has(t)) add('error', `${p}.teams[${j}]`, `Unknown team "${t}".`)
    })
    if (c.teams.length > 5) add('error', `${p}.teams`, `${c.teams.length} teams; at most 5.`)
    if (c.primaryTeam !== 'none' && !c.teams.includes(c.primaryTeam)) {
      add('error', `${p}.teams`, 'teams must include primaryTeam.')
    }

    if (!Number.isInteger(c.debutYear) || c.debutYear < 1930 || c.debutYear > 2026) {
      add('error', `${p}.debutYear`, 'debutYear must be 1930-2026.')
    }
    if (!DEBUT_DATE.test(c.debutDate) || !c.debutDate.startsWith(String(c.debutYear))) {
      add('error', `${p}.debutDate`, 'debutDate must be YYYY or YYYY-MM and start with debutYear.')
    }

    if (!ALIGNMENTS.includes(c.alignment)) add('error', `${p}.alignment`, `Invalid alignment "${c.alignment}".`)
    if (!(ORIGINS as readonly string[]).includes(c.origin)) add('error', `${p}.origin`, `Invalid origin "${c.origin}".`)
    if (!GENDERS.includes(c.gender)) add('error', `${p}.gender`, `Invalid gender "${c.gender}".`)
    if (!(ARCHETYPES as readonly string[]).includes(c.archetype)) {
      add('error', `${p}.archetype`, `Invalid archetype "${c.archetype}".`)
    }

    const hasFirst = c.mcuFirst != null && c.mcuFirst !== ''
    if (c.mcu !== hasFirst) add('error', `${p}.mcuFirst`, 'mcu is true exactly when mcuFirst is non-empty.')

    if (![1, 2, 3, 4, 5].includes(c.difficulty)) add('error', `${p}.difficulty`, 'difficulty must be 1-5.')
    if (c.answerOk && c.difficulty > 4) add('error', `${p}.answerOk`, 'answerOk requires difficulty 4 or lower.')
    if (c.answerOk && c.caseNote.length === 0) add('error', `${p}.caseNote`, 'answerOk requires a caseNote.')
    if (c.caseNote.length > 300) add('error', `${p}.caseNote`, `caseNote is ${c.caseNote.length} characters; at most 300.`)

    if (c.sources.length === 0) add('error', `${p}.sources`, 'At least one source is required.')
    c.sources.forEach((s, j) => {
      if (!s.startsWith('https://')) add('error', `${p}.sources[${j}]`, 'Sources must be https:// URLs.')
    })
  })
  return issues
}

export function validateSchedule(schedule: Schedule, chars: Character[]): Issue[] {
  const issues: Issue[] = []
  const add = (level: Issue['level'], path: string, message: string) => issues.push({ level, path, message })
  const byId = new Map(chars.map((c) => [c.id, c]))

  if (!isIsoDate(schedule.launchDate)) add('error', 'launchDate', 'launchDate must be YYYY-MM-DD.')

  const dates = Object.keys(schedule.days).sort()
  const lastSeen = new Map<string, string>()
  for (const date of dates) {
    if (!isIsoDate(date)) {
      add('error', `days.${date}`, 'Schedule keys must be YYYY-MM-DD.')
      continue
    }
    const id = schedule.days[date]?.unmasked
    if (id === undefined) continue
    const path = `days.${date}.unmasked`
    const c = byId.get(id)
    if (!c) add('error', path, `Unknown character "${id}".`)
    else if (!c.answerOk) add('error', path, `"${id}" is not answerOk.`)
    const prev = lastSeen.get(id)
    if (prev !== undefined && daysBetween(prev, date) < UNMASKED_COOLDOWN_DAYS) {
      add('error', path, `"${id}" already ran on ${prev}; wait ${UNMASKED_COOLDOWN_DAYS} days.`)
    }
    lastSeen.set(id, date)
  }

  if (isIsoDate(schedule.launchDate)) {
    let run = 0
    while (run < MIN_COVERAGE_DAYS) {
      const d = new Date(Date.parse(schedule.launchDate + 'T00:00:00Z') + run * 86400000).toISOString().slice(0, 10)
      if (!(d in schedule.days)) break
      run++
    }
    if (run < MIN_COVERAGE_DAYS) {
      add('warning', 'days', `Only ${run} consecutive days scheduled from launchDate; want ${MIN_COVERAGE_DAYS}.`)
    }
  }
  return issues
}

export function toPublic(c: Character): PublicCharacter {
  const { sources: _s, notes: _n, answerOk: _a, difficulty: _d, otherTeams: _o, ...rest } = c
  return rest
}
