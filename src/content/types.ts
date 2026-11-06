/** Shared content types. Used by the app, the build script, the API function and the Office. */

export type GameId = 'unmasked' | 'blist' | 'retcon'

export type Alignment = 'hero' | 'villain' | 'antihero'

export const ORIGINS = [
  'mutant', 'inhuman', 'mutate', 'super-soldier', 'tech', 'magic',
  'cosmic', 'deity', 'alien', 'synthetic', 'trained',
] as const
export type Origin = (typeof ORIGINS)[number]

export type Gender = 'male' | 'female' | 'other'

export const ARCHETYPES = [
  'caped', 'cowl', 'armored', 'helmeted', 'hooded', 'horned', 'winged',
  'longhair', 'shorthair', 'bald', 'synthetic', 'brute', 'creature',
] as const
export type Archetype = (typeof ARCHETYPES)[number]

/** Team/affiliation id from content/teams.json, or 'none' (primaryTeam only). */
export type TeamId = string

export interface Character {
  id: string
  name: string
  aliases: string[]
  realName: string | null
  primaryTeam: TeamId
  teams: TeamId[]
  otherTeams?: string[]
  debutYear: number
  debutIssue: string
  /** "YYYY-MM" cover month, or "YYYY" when the month is unknown */
  debutDate: string
  alignment: Alignment
  origin: Origin
  gender: Gender
  mcu: boolean
  mcuFirst: string | null
  answerOk: boolean
  difficulty: 1 | 2 | 3 | 4 | 5
  caseNote: string
  archetype: Archetype
  sources: string[]
  notes: string
}

/** The fields shipped to browsers in /data/characters.json. */
export type PublicCharacter = Omit<Character, 'sources' | 'notes' | 'answerOk' | 'difficulty' | 'otherTeams'>

export interface Team {
  id: TeamId
  name: string
  /** label for narrow feedback cells, ≤ 12 characters */
  short: string
}

export interface DayEntry {
  /** character id of the Unmasked answer */
  unmasked?: string
}

export interface Schedule {
  /** ISO date of puzzle #1 */
  launchDate: string
  days: Record<string, DayEntry>
}

export interface Issue {
  level: 'error' | 'warning'
  path: string
  message: string
}
