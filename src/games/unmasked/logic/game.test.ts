import { describe, expect, it } from 'vitest'
import { filler, galactus, rogue, storm } from './fixtures'
import { applyGuess, MAX_ATTEMPTS, newUnmasked, unmaskedShare } from './game'
import { compareCharacters, feedbackMarks } from './compare'

const all = [storm, rogue, galactus, ...filler]
const known = new Set(all.map((c) => c.id))
const byId = new Map(all.map((c) => [c.id, c]))

describe('applyGuess', () => {
  it('loses after six wrong guesses', () => {
    let s = newUnmasked('2026-11-06', 'storm')
    for (const c of [rogue, galactus, ...filler.slice(0, 4)]) s = applyGuess(s, c.id, known)
    expect(s.guesses).toHaveLength(MAX_ATTEMPTS)
    expect(s.status).toBe('lost')
  })
  it('wins on the correct guess and ignores later ones', () => {
    let s = applyGuess(newUnmasked('d', 'storm'), 'storm', known)
    expect(s.status).toBe('won')
    expect(applyGuess(s, 'rogue', known)).toBe(s)
  })
  it('ignores repeats and unknown ids', () => {
    const s = applyGuess(newUnmasked('d', 'storm'), 'rogue', known)
    expect(applyGuess(s, 'rogue', known)).toBe(s)
    expect(applyGuess(s, 'nobody', known)).toBe(s)
  })
})

describe('unmaskedShare', () => {
  it('rows match feedbackMarks per guess', () => {
    let s = newUnmasked('d', 'storm')
    s = applyGuess(applyGuess(s, 'rogue', known), 'galactus', known)
    const share = unmaskedShare(s, byId)
    expect(share.attempts).toBe(2)
    expect(share.solved).toBe(false)
    expect(share.rows).toEqual([
      feedbackMarks(compareCharacters(rogue, storm)),
      feedbackMarks(compareCharacters(galactus, storm)),
    ])
  })
})
