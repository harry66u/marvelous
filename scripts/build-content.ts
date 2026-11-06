/**
 * Validates content/ and emits public/data/characters.json (public fields only).
 * Exits 1 on any error-level issue; warnings are printed.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import characters from '../content/characters.json' with { type: 'json' }
import teams from '../content/teams.json' with { type: 'json' }
import schedule from '../content/schedule.json' with { type: 'json' }
import type { Character, Schedule, Team } from '../src/content/types'
import { toPublic, validateCharacters, validateSchedule } from '../src/content/validate'

const chars = characters as Character[]
const issues = [
  ...validateCharacters(chars, teams as Team[]),
  ...validateSchedule(schedule as Schedule, chars),
]
for (const i of issues) console.log(`${i.level.toUpperCase()} ${i.path}: ${i.message}`)
const errors = issues.filter((i) => i.level === 'error').length
if (errors > 0) {
  console.error(`content: ${errors} error(s); nothing written.`)
  process.exit(1)
}

const publicOnes = chars.map(toPublic).sort((a, b) => a.name.localeCompare(b.name))
mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/characters.json', JSON.stringify(publicOnes))
console.log(`content: ${publicOnes.length} characters written to public/data/characters.json`)
