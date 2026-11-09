import type { PublicCharacter } from '../../../content/types'
import type { Mark } from '../../../lib/marks'

export interface Feedback {
  name: Mark
  affiliation: Mark
  debut: Mark
  /** where the answer sits relative to the guess; null when the decades match */
  debutDir: 'later' | 'earlier' | null
  alignment: Mark
  origin: Mark
  gender: Mark
  mcu: Mark
}

export const ATTRIBUTE_ORDER = ['affiliation', 'debut', 'alignment', 'origin', 'gender', 'mcu'] as const

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10
}

function teamSet(c: PublicCharacter): Set<string> {
  const s = new Set([...c.teams, c.primaryTeam])
  s.delete('none')
  return s
}

function same<T>(a: T, b: T): Mark {
  return a === b ? 'exact' : 'no'
}

export function compareCharacters(guess: PublicCharacter, answer: PublicCharacter): Feedback {
  // The world clue: exact for the same world; close when the worlds differ but the two share a team.
  let affiliation: Mark = 'no'
  if (guess.world === answer.world) affiliation = 'exact'
  else {
    const mine = teamSet(guess)
    if ([...teamSet(answer)].some((t) => mine.has(t))) affiliation = 'close'
  }

  const gd = decadeOf(guess.debutYear)
  const ad = decadeOf(answer.debutYear)
  const gap = Math.abs(gd - ad)
  const debut: Mark = gap === 0 ? 'exact' : gap === 10 ? 'close' : 'no'
  const debutDir = ad === gd ? null : ad > gd ? 'later' : 'earlier'

  return {
    name: same(guess.id, answer.id),
    affiliation,
    debut,
    debutDir,
    alignment: same(guess.alignment, answer.alignment),
    origin: same(guess.origin, answer.origin),
    gender: same(guess.gender, answer.gender),
    mcu: same(guess.mcu, answer.mcu),
  }
}

export function feedbackMarks(f: Feedback): Mark[] {
  return ATTRIBUTE_ORDER.map((k) => f[k])
}
