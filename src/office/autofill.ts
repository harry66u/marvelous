import type { Character, Schedule } from '../content/types'
import { UNMASKED_COOLDOWN_DAYS } from '../content/validate'
import { addDays, daysBetween, weekday } from '../lib/time'
import { pick, seededRandom } from '../lib/random'

/** Mon-Thu favour the best-known answers, Fri-Sun slightly less famous ones. */
function band(date: string): [number, number] {
  const d = weekday(date) // 0 = Sunday
  return d >= 1 && d <= 4 ? [1, 2] : [2, 3]
}

/** Deep cuts (difficulty 4 and 5) are never daily answers; they stay in the pool as guesses. */
export const MAX_ANSWER_DIFFICULTY = 3

/**
 * Fill empty days in [from, to] with answerOk characters of difficulty 3 or less: band by
 * weekday, cooldown both ways, never the same primary team two days running, seeded by date.
 * Existing days are kept.
 */
export function autofillSchedule(schedule: Schedule, chars: readonly Character[], from: string, to: string): Schedule {
  const byId = new Map(chars.map((c) => [c.id, c]))
  const pool = chars.filter((c) => c.answerOk && c.difficulty <= MAX_ANSWER_DIFFICULTY).sort((a, b) => a.id.localeCompare(b.id))
  const days = { ...schedule.days }
  const uses = new Map<string, string[]>()
  for (const [date, e] of Object.entries(days)) {
    if (e.unmasked) uses.set(e.unmasked, [...(uses.get(e.unmasked) ?? []), date])
  }
  const cooled = (id: string, date: string) =>
    (uses.get(id) ?? []).every((d) => Math.abs(daysBetween(d, date)) >= UNMASKED_COOLDOWN_DAYS)

  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (days[date]?.unmasked !== undefined) continue
    const prevTeam = byId.get(days[addDays(date, -1)]?.unmasked ?? '')?.primaryTeam
    const [lo, hi] = band(date)
    const eligible = pool.filter((c) => cooled(c.id, date))
    const inBand = (c: Character) => c.difficulty >= lo && c.difficulty <= hi
    const newTeam = (c: Character) => c.primaryTeam !== prevTeam
    // Relax the soft preferences in order: team rule is kept longest.
    const options =
      [eligible.filter((c) => inBand(c) && newTeam(c)), eligible.filter(newTeam), eligible.filter(inBand), eligible]
        .find((o) => o.length > 0) ?? []
    if (options.length === 0) continue // pool exhausted by cooldown; validation will report the gap
    const chosen = pick(seededRandom(date), options)
    days[date] = { unmasked: chosen.id }
    uses.set(chosen.id, [...(uses.get(chosen.id) ?? []), date])
  }
  return { ...schedule, days }
}
