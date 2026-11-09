import type { BlistPrompt, RetconRecord, Schedule } from '../content/types'
import { BLIST_COOLDOWN_DAYS, RETCON_COOLDOWN_DAYS, RETCON_MIN_YEAR_GAP } from '../content/validateGames'
import { PROMPTS_PER_DAY } from '../games/blist/logic/game'
import { RECORDS_PER_DAY } from '../games/retcon/logic/game'
import { pick, seededRandom } from '../lib/random'
import { addDays, daysBetween, weekday } from '../lib/time'

/** Mon–Thu are easier days, Fri–Sun harder (same rhythm as Unmasked). */
const hardDay = (date: string) => {
  const d = weekday(date) // 0 = Sunday
  return d === 0 || d >= 5
}

function lastUses(schedule: Schedule, field: 'blist' | 'retcon'): Map<string, string[]> {
  const uses = new Map<string, string[]>()
  for (const [date, e] of Object.entries(schedule.days)) {
    for (const id of e[field] ?? []) uses.set(id, [...(uses.get(id) ?? []), date])
  }
  return uses
}

const cooled = (uses: Map<string, string[]>, id: string, date: string, days: number) =>
  (uses.get(id) ?? []).every((d) => Math.abs(daysBetween(d, date)) >= days)

/**
 * Family for variety caps: MCU prompts by kind ("mcu-cast", "mcu-actor", "mcu-curated", ...), the
 * rest by top level ("team-pair" -> "team"), so a day mixes casts, actors, places and teams.
 */
export const promptFamily = (p: Pick<BlistPrompt, 'category'>) =>
  p.category.startsWith('mcu') ? p.category : p.category.split('-')[0]!

/** What a prompt is about, so two prompts on one day never share a subject. */
export function promptSubjects(p: Pick<BlistPrompt, 'id' | 'category'>): string[] {
  const id = p.id
    .replace(/^(team|enemy|creator|creators|both|ability|species|occupation|debut-in|debut|mcu-cast|mcu-actor|mcu-intro|mcu)-/, '')
    .replace(/-(19|20)\d0s$/, '')
    .replace(/^the-/, '')
    .replace(/^mcu-/, '')
  // The first word names the subject: "guardians-of-the-galaxy-vol-3", "guardians-of-the-galaxy-films"
  // and the MCU "guardians" roster are all "guardians"; "avengers-roster" and "avengers" are one subject.
  return [id.split('-')[0]!]
}

/**
 * Fill empty B-List days in [from, to] (only days that already have an Unmasked answer). Each day:
 * seven prompts not used in the cooldown, at most two from one family (three for MCU), no shared
 * subject. Weekdays take six easy prompts and one medium, weekends five and two. Hard prompts
 * (difficulty 3) are never scheduled. Ordered easiest first. Seeded by date, so reruns agree.
 */
export function autofillBlist(schedule: Schedule, prompts: readonly BlistPrompt[], from: string, to: string, salt = ''): Schedule {
  const days = { ...schedule.days }
  const uses = lastUses(schedule, 'blist')
  const pool = [...prompts].sort((a, b) => a.id.localeCompare(b.id))
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const entry = days[date]
    if (!entry?.unmasked || entry.blist) continue
    const rand = seededRandom(`blist:${date}${salt}`)
    // Screen-known prompts only (MCU, and comics prompts an MCU fan can answer), easy or medium.
    const free = pool.filter((p) => p.screen !== false && p.difficulty <= 2 && cooled(uses, p.id, date, BLIST_COOLDOWN_DAYS))
    const mediumSlots = hardDay(date) ? 2 : 1
    let chosen: BlistPrompt[] = []
    // Strict first; if the remaining pool cannot make a day, relax the family cap step by step.
    // Two prompts per family; relaxed only if the remaining pool cannot make a day.
    for (const step of [0, 1, 2]) {
      const familyCap = () => (step === 2 ? PROMPTS_PER_DAY : 2 + step)
      chosen = []
      const fits = (p: BlistPrompt) => {
        if (chosen.includes(p)) return false
        if (chosen.filter((c) => promptFamily(c) === promptFamily(p)).length >= familyCap()) return false
        const subj = new Set(chosen.flatMap(promptSubjects))
        return !promptSubjects(p).some((s) => subj.has(s))
      }
      // Draw from the family with the most prompts left, so families run down together and the
      // last days of the window are as varied as the first.
      const left = new Map<string, number>()
      for (const p of free) left.set(promptFamily(p), (left.get(promptFamily(p)) ?? 0) + 1)
      const take = (want: (p: BlistPrompt) => boolean, n: number) => {
        for (let i = 0; i < n; i++) {
          const options = free.filter((p) => want(p) && fits(p))
          if (options.length === 0) return
          const most = Math.max(...options.map((p) => left.get(promptFamily(p)) ?? 0))
          const top = options.filter((p) => (left.get(promptFamily(p)) ?? 0) >= most * 0.6)
          const chosenOne = pick(rand, top)
          chosen.push(chosenOne)
          left.set(promptFamily(chosenOne), (left.get(promptFamily(chosenOne)) ?? 1) - 1)
        }
      }
      take((p) => p.difficulty === 2, mediumSlots)
      take((p) => p.difficulty === 1, PROMPTS_PER_DAY - chosen.length)
      take(() => true, PROMPTS_PER_DAY - chosen.length) // relax difficulty if a band ran dry
      if (chosen.length === PROMPTS_PER_DAY) break
    }
    if (chosen.length < PROMPTS_PER_DAY) continue // pool exhausted; validation reports the gap
    chosen.sort((a, b) => a.difficulty - b.difficulty)
    days[date] = { ...entry, blist: chosen.map((p) => p.id) }
    for (const p of chosen) uses.set(p.id, [...(uses.get(p.id) ?? []), date])
  }
  return { ...schedule, days }
}

const recordDifficulty = (r: RetconRecord) => r.difficulty ?? (r.kind === 'debut' ? 3 : 1)
const decade = (r: RetconRecord) => r.date.slice(0, 3)

/**
 * Fill empty Retcon days in [from, to] (only days with an Unmasked answer). Each day: six records
 * not used in the cooldown, at least RETCON_MIN_YEAR_GAP years apart, at most two per decade, at
 * most four first appearances, at most one harder record (difficulty 4), never a deep cut
 * (difficulty 5), and a well-known anchor first.
 */
export function autofillRetcon(schedule: Schedule, records: readonly RetconRecord[], from: string, to: string, salt = ''): Schedule {
  const days = { ...schedule.days }
  const uses = lastUses(schedule, 'retcon')
  const pool = [...records].sort((a, b) => a.id.localeCompare(b.id))
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const entry = days[date]
    if (!entry?.unmasked || entry.retcon) continue
    const rand = seededRandom(`retcon:${date}${salt}`)
    const free = pool.filter((r) => recordDifficulty(r) <= 4 && cooled(uses, r.id, date, RETCON_COOLDOWN_DAYS))
    let chosen: RetconRecord[] = []
    // Strict first; relax the decade, first-appearance and deep-cut caps if the pool runs thin.
    // Six different years is a hard rule and never relaxes.
    for (const [perDecade, debuts, deep, gap] of [
      [2, 4, 1, RETCON_MIN_YEAR_GAP], [2, 5, 1, RETCON_MIN_YEAR_GAP], [3, 5, 2, RETCON_MIN_YEAR_GAP], [3, 6, 2, 1], [6, 6, 6, 1],
    ] as const) {
      chosen = []
      const year = (r: RetconRecord) => Number(r.date.slice(0, 4))
      const fits = (r: RetconRecord) =>
        !chosen.includes(r) &&
        !chosen.some((c) => Math.abs(year(c) - year(r)) < gap) &&
        chosen.filter((c) => decade(c) === decade(r)).length < perDecade &&
        (r.kind !== 'debut' || chosen.filter((c) => c.kind === 'debut').length < debuts) &&
        (recordDifficulty(r) < 4 || chosen.filter((c) => recordDifficulty(c) >= 4).length < deep)
      const take = (want: (r: RetconRecord) => boolean) => {
        const options = free.filter((r) => want(r) && fits(r))
        if (options.length > 0) chosen.push(pick(rand, options))
      }
      take((r) => recordDifficulty(r) <= 2) // the anchor
      if (chosen.length === 0) take((r) => recordDifficulty(r) <= 3)
      take((r) => r.kind !== 'debut') // a screen release or event when any are left
      while (chosen.length < RECORDS_PER_DAY) {
        const before = chosen.length
        take(() => true)
        if (chosen.length === before) break
      }
      if (chosen.length === RECORDS_PER_DAY) break
    }
    if (chosen.length < RECORDS_PER_DAY) continue
    // Anchor first, the rest shuffled so arrival order gives nothing away.
    const [anchor, ...rest] = chosen
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[rest[i], rest[j]] = [rest[j]!, rest[i]!]
    }
    days[date] = { ...entry, retcon: [anchor!, ...rest].map((r) => r.id) }
    for (const r of chosen) uses.set(r.id, [...(uses.get(r.id) ?? []), date])
  }
  return { ...schedule, days }
}
