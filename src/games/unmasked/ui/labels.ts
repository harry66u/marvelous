import { teamName, teamShort } from '../../../content/teams'
import type { Alignment, Gender, Origin, PublicCharacter } from '../../../content/types'
import type { Mark } from '../../../lib/marks'
import { ATTRIBUTE_ORDER, compareCharacters, decadeOf } from '../logic/compare'

export type Attribute = (typeof ATTRIBUTE_ORDER)[number]

export const ALIGNMENT_LABEL: Record<Alignment, string> = { hero: 'Hero', villain: 'Villain', antihero: 'Antihero' }

export const ORIGIN_LABEL: Record<Origin, string> = {
  mutant: 'Mutant',
  inhuman: 'Inhuman',
  mutate: 'Mutate',
  'super-soldier': 'Super-soldier',
  tech: 'Tech',
  magic: 'Magic',
  cosmic: 'Cosmic',
  deity: 'Deity',
  alien: 'Alien',
  synthetic: 'Synthetic',
  trained: 'Trained human',
}

export const GENDER_LABEL: Record<Gender, string> = { male: 'Male', female: 'Female', other: 'Other' }

export const ATTRIBUTE_NAME: Record<Attribute, string> = {
  affiliation: 'Affiliation',
  debut: 'Debut',
  alignment: 'Alignment',
  origin: 'Origin',
  gender: 'Gender',
  mcu: 'MCU',
}

/** Column headers for the guess grid. */
export const ATTRIBUTE_SHORT: Record<Attribute, string> = {
  affiliation: 'Affil.',
  debut: 'Debut',
  alignment: 'Align.',
  origin: 'Origin',
  gender: 'Gender',
  mcu: 'MCU',
}

export const MARK_SYMBOL: Record<Mark, string> = { exact: '✓', close: '≈', no: '✕' }
export const MARK_WORD: Record<Mark, string> = { exact: 'exact', close: 'close', no: 'no match' }

export interface Cell {
  key: Attribute
  /** short label for the narrow cell */
  label: string
  /** full wording for screen readers */
  full: string
  mark: Mark
  /** ▲ the subject debuted later, ▼ earlier */
  arrow: '▲' | '▼' | null
}

export interface GuessRow {
  id: string
  name: string
  nameMark: Mark
  cells: Cell[]
  /** the whole row as one sentence for screen readers */
  text: string
}

/** Feedback for one guess against the subject, in display and screen-reader form. */
export function describeGuess(guess: PublicCharacter, answer: PublicCharacter): GuessRow {
  const f = compareCharacters(guess, answer)
  const decade = `${decadeOf(guess.debutYear)}s`
  const values: Record<Attribute, [label: string, full: string]> = {
    affiliation: [teamShort(guess.primaryTeam), teamName(guess.primaryTeam)],
    debut: [decade, decade],
    alignment: [ALIGNMENT_LABEL[guess.alignment], ALIGNMENT_LABEL[guess.alignment]],
    origin: [ORIGIN_LABEL[guess.origin], ORIGIN_LABEL[guess.origin]],
    gender: [GENDER_LABEL[guess.gender], GENDER_LABEL[guess.gender]],
    mcu: guess.mcu ? ['Yes', 'Yes'] : ['No', 'No'],
  }
  const cells = ATTRIBUTE_ORDER.map((key): Cell => {
    const [label, full] = values[key]
    const arrow = key === 'debut' && f.debutDir ? (f.debutDir === 'later' ? '▲' : '▼') : null
    return { key, label, full, mark: f[key], arrow }
  })
  const sentences = cells.map((c) => {
    const direction = c.key === 'debut' && f.debutDir ? `, the subject debuted ${f.debutDir}` : ''
    return `${ATTRIBUTE_NAME[c.key]} ${c.full}, ${MARK_WORD[c.mark]}${direction}.`
  })
  const lead = guess.name.endsWith('.') ? guess.name : `${guess.name}.`
  const verdict = f.name === 'exact' ? 'Subject identified.' : 'Not the subject.'
  return { id: guess.id, name: guess.name, nameMark: f.name, cells, text: [lead, ...sentences, verdict].join(' ') }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "Giant-Size X-Men #1 (May 1975)"; the year alone when the cover month is unknown. */
export function firstRecord(c: Pick<PublicCharacter, 'debutIssue' | 'debutDate' | 'debutYear'>): string {
  const month = MONTHS[Number(c.debutDate.slice(5, 7)) - 1]
  return `${c.debutIssue} (${month ? `${month} ` : ''}${c.debutYear})`
}

/** Initials of the codename, without any "(Real Name)" suffix: "Spider-Man (Peter Parker)" -> "SM". */
export function monogram(name: string): string {
  const codename = name.replace(/\s*\(.*\)\s*$/, '')
  const words = codename.split(/[\s-]+/).filter((w) => /[a-z0-9]/i.test(w))
  return words
    .map((w) => w.match(/[a-z0-9]/i)?.[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

export function caseCode(number: number): string {
  return `Case ${String(number).padStart(4, '0')}-U`
}
