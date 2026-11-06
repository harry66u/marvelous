/**
 * Validates content/ and emits public/data/characters.json (public fields only).
 * Scaffold version: emit only. Task 4 adds validation and a non-zero exit on errors.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Character, PublicCharacter } from '../src/content/types'

const characters = JSON.parse(readFileSync('content/characters.json', 'utf8')) as Character[]
const publicOnes: PublicCharacter[] = characters.map(
  ({ sources: _s, notes: _n, answerOk: _a, difficulty: _d, otherTeams: _o, ...rest }) => rest,
)
mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/characters.json', JSON.stringify(publicOnes))
console.log(`content: ${publicOnes.length} characters written to public/data/characters.json`)
