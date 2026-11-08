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
  /** seven B-List prompt ids, in play order */
  blist?: string[]
  /** six Retcon record ids: the anchor first, then the order they arrive in */
  retcon?: string[]
}

/** B-List rarity tiers, most common first. */
export const TIERS = ['common', 'filed', 'restricted', 'classified', 'sealed'] as const
export type Tier = (typeof TIERS)[number]

export interface BlistAnswer {
  /** display name, e.g. "Jean Grey" */
  name: string
  /** other accepted names: codenames, real names, common spellings */
  aliases: string[]
  tier: Tier
  /** estimated share of agents who would give this answer (0–1), used to set the preset tier */
  share: number
}

export interface BlistPrompt {
  id: string
  /** the request as the player sees it, e.g. "Name a member of the Fantastic Four" */
  text: string
  /** grouping for scheduling variety: team, creator, ability, mcu, wordplay, ... */
  category: string
  difficulty: 1 | 2 | 3
  answers: BlistAnswer[]
  sources: string[]
  notes?: string
}

export type RetconKind = 'debut' | 'event' | 'screen' | 'milestone'

export interface RetconRecord {
  id: string
  /** what happened, e.g. "First appearance: Wolverine" */
  text: string
  /** one supporting line, e.g. "The Incredible Hulk #180 · James Howlett" */
  detail?: string
  /** "YYYY-MM" (comics: cover month) or "YYYY-MM-DD" (screen: first U.S. release) */
  date: string
  kind: RetconKind
  /** 1 (widely known) to 5 (deep cut); balances each day's set */
  difficulty?: number
  sources: string[]
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
