import { daysBetween, isIsoDate } from '../lib/time.js'
import { PROMPTS_PER_DAY } from '../games/blist/logic/game.js'
import { RECORDS_PER_DAY } from '../games/retcon/logic/game.js'
import { matchKey } from '../lib/match.js'
import { TIERS, type BlistPrompt, type Issue, type RetconRecord, type Schedule } from './types.js'

/** A prompt or record may not run again within this many days. */
export const BLIST_COOLDOWN_DAYS = 180
export const RETCON_COOLDOWN_DAYS = 180
export const MIN_ANSWERS = 5

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RECORD_DATE = /^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/
const KINDS = new Set(['debut', 'event', 'screen', 'milestone'])

type Add = (level: Issue['level'], path: string, message: string) => void
const collector = (issues: Issue[]): Add => (level, path, message) => issues.push({ level, path, message })

export function validateBlist(prompts: BlistPrompt[]): Issue[] {
  const issues: Issue[] = []
  const add = collector(issues)
  const ids = new Set<string>()
  const texts = new Set<string>()
  prompts.forEach((p, i) => {
    const at = `blist[${i}]`
    if (!KEBAB.test(p.id)) add('error', `${at}.id`, `Prompt id "${p.id}" must be kebab-case.`)
    if (ids.has(p.id)) add('error', `${at}.id`, `Duplicate prompt id "${p.id}".`)
    ids.add(p.id)
    if (!p.text?.trim()) add('error', `${at}.text`, 'Prompt text is empty.')
    if (texts.has(p.text)) add('error', `${at}.text`, `Duplicate prompt text "${p.text}".`)
    texts.add(p.text)
    if (![1, 2, 3].includes(p.difficulty)) add('error', `${at}.difficulty`, 'Difficulty must be 1, 2 or 3.')
    if (!p.category) add('error', `${at}.category`, 'Category is missing.')
    if (!Array.isArray(p.answers) || p.answers.length < MIN_ANSWERS) {
      add('error', `${at}.answers`, `Needs at least ${MIN_ANSWERS} answers.`)
      return
    }
    // Every accepted form must point at exactly one answer, or matching would be ambiguous.
    const owner = new Map<string, number>()
    p.answers.forEach((a, j) => {
      const ap = `${at}.answers[${j}]`
      if (!a.name?.trim()) add('error', `${ap}.name`, 'Answer name is empty.')
      if (!TIERS.includes(a.tier)) add('error', `${ap}.tier`, `Unknown tier "${a.tier}".`)
      if (!(a.share >= 0 && a.share <= 1)) add('error', `${ap}.share`, 'Share must be between 0 and 1.')
      for (const form of new Set([a.name, ...(a.aliases ?? [])].map((n) => matchKey(n).replace(/ /g, '')))) {
        if (!form) continue
        const prev = owner.get(form)
        if (prev !== undefined && prev !== j) {
          add('error', ap, `"${form}" matches both "${p.answers[prev]!.name}" and "${a.name}".`)
        }
        owner.set(form, j)
      }
    })
    if (!p.answers.some((a) => a.tier === 'common')) add('warning', at, `"${p.text}" has no Common Record answer.`)
  })
  return issues
}

export function validateRetcon(records: RetconRecord[]): Issue[] {
  const issues: Issue[] = []
  const add = collector(issues)
  const ids = new Set<string>()
  records.forEach((r, i) => {
    const at = `retcon[${i}]`
    if (!KEBAB.test(r.id)) add('error', `${at}.id`, `Record id "${r.id}" must be kebab-case.`)
    if (ids.has(r.id)) add('error', `${at}.id`, `Duplicate record id "${r.id}".`)
    ids.add(r.id)
    if (!r.text?.trim()) add('error', `${at}.text`, 'Record text is empty.')
    if (!RECORD_DATE.test(r.date)) add('error', `${at}.date`, `Date "${r.date}" must be YYYY-MM or YYYY-MM-DD.`)
    if (!KINDS.has(r.kind)) add('error', `${at}.kind`, `Unknown kind "${r.kind}".`)
    if (!r.sources?.length) add('warning', `${at}.sources`, 'No source on file.')
  })
  return issues
}

/** Schedule rules for B-List and Retcon. Days without either game are fine (pre-launch of that game). */
export function validateGameSchedule(schedule: Schedule, prompts: BlistPrompt[], records: RetconRecord[]): Issue[] {
  const issues: Issue[] = []
  const add = collector(issues)
  const promptById = new Map(prompts.map((p) => [p.id, p]))
  const recordById = new Map(records.map((r) => [r.id, r]))
  const lastPrompt = new Map<string, string>()
  const lastRecord = new Map<string, string>()

  for (const date of Object.keys(schedule.days).sort()) {
    if (!isIsoDate(date)) continue
    const day = schedule.days[date]!
    if (day.blist) {
      const at = `days.${date}.blist`
      if (day.blist.length !== PROMPTS_PER_DAY) add('error', at, `Needs ${PROMPTS_PER_DAY} prompts, has ${day.blist.length}.`)
      if (new Set(day.blist).size !== day.blist.length) add('error', at, 'A prompt appears twice.')
      for (const id of day.blist) {
        if (!promptById.has(id)) add('error', at, `Unknown prompt "${id}".`)
        const prev = lastPrompt.get(id)
        if (prev !== undefined && prev !== date && daysBetween(prev, date) < BLIST_COOLDOWN_DAYS) {
          add('error', at, `Prompt "${id}" already ran on ${prev}; wait ${BLIST_COOLDOWN_DAYS} days.`)
        }
        lastPrompt.set(id, date)
      }
    }
    if (day.retcon) {
      const at = `days.${date}.retcon`
      if (day.retcon.length !== RECORDS_PER_DAY) add('error', at, `Needs ${RECORDS_PER_DAY} records, has ${day.retcon.length}.`)
      const years = new Set<string>()
      for (const id of day.retcon) {
        const r = recordById.get(id)
        if (!r) {
          add('error', at, `Unknown record "${id}".`)
          continue
        }
        const year = r.date.slice(0, 4)
        if (years.has(year)) add('error', at, `Two records share the year ${year}.`)
        years.add(year)
        const prev = lastRecord.get(id)
        if (prev !== undefined && prev !== date && daysBetween(prev, date) < RETCON_COOLDOWN_DAYS) {
          add('error', at, `Record "${id}" already ran on ${prev}; wait ${RETCON_COOLDOWN_DAYS} days.`)
        }
        lastRecord.set(id, date)
      }
    }
  }
  return issues
}
