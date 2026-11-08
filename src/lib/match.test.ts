import { describe, expect, it } from 'vitest'
import { buildMatcher, editDistance, matchKey } from './match'

const answers = [
  { name: 'Iceman', aliases: ['Bobby Drake'] },
  { name: 'Jean Grey', aliases: ['Marvel Girl', 'Phoenix'] },
  { name: 'Cyclops', aliases: ['Scott Summers'] },
  { name: 'Beast', aliases: ['Hank McCoy', 'Henry McCoy'] },
  { name: 'Professor X', aliases: ['Charles Xavier'] },
  { name: 'Nightcrawler', aliases: ['Kurt Wagner'] },
  { name: 'Doctor Nemesis', aliases: [] },
  { name: 'Mojo', aliases: [] },
]
const known = ['Iron Man', 'Spider-Man', 'Doctor Doom', 'Cyclops', 'Hulk']
const m = buildMatcher(answers, known)

describe('matchKey', () => {
  it('folds case, accents, punctuation, a leading "the", "&" and common abbreviations', () => {
    expect(matchKey('The Thing')).toBe('thing')
    expect(matchKey('Dr. Nemesis')).toBe('doctor nemesis')
    expect(matchKey('Mr. Fantastic')).toBe('mister fantastic')
    expect(matchKey('Prof X')).toBe('professor x')
    expect(matchKey('  Spider-Man  ')).toBe('spider man')
    expect(matchKey('Rocket & Groot')).toBe('rocket and groot')
    expect(matchKey('Namor the Sub-Mariner')).toBe('namor the sub mariner')
  })
})

describe('editDistance (Damerau-Levenshtein, adjacent swaps count once)', () => {
  it('counts edits', () => {
    expect(editDistance('cyclops', 'cyclops')).toBe(0)
    expect(editDistance('cyclpos', 'cyclops')).toBe(1)
    expect(editDistance('nightcrawlr', 'nightcrawler')).toBe(1)
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })
})

describe('buildMatcher', () => {
  it('accepts names and aliases exactly, in any case or spacing', () => {
    expect(m('jean grey')).toEqual({ kind: 'valid', index: 1, exact: true })
    expect(m('PHOENIX')).toEqual({ kind: 'valid', index: 1, exact: true })
    expect(m('Dr Nemesis')).toEqual({ kind: 'valid', index: 6, exact: true })
    expect(m('Professor X')).toEqual({ kind: 'valid', index: 4, exact: true })
    expect(m('ice man')).toEqual({ kind: 'valid', index: 0, exact: true })
    expect(m('nightcrawler')).toEqual({ kind: 'valid', index: 5, exact: true })
  })

  it('forgives one typo in 5–8 letters and two in 9 or more, never in 4 or fewer', () => {
    expect(m('cyclpos')).toEqual({ kind: 'valid', index: 2, exact: false })
    expect(m('nightcrowlr')).toEqual({ kind: 'valid', index: 5, exact: false })
    expect(m('beest')).toEqual({ kind: 'valid', index: 3, exact: false })
    expect(m('moja')).toEqual({ kind: 'invalid' })
    expect(m('jaen grey')).toEqual({ kind: 'valid', index: 1, exact: false })
    expect(m('cyclxxs')).toEqual({ kind: 'invalid' })
  })

  it('never corrects a different known Marvel name into a valid answer', () => {
    // "Ironman" is one edit from nothing here, but the point is it is a real name that is not valid
    expect(m('Ironman')).toEqual({ kind: 'known', name: 'Iron Man' })
    expect(m('Doctor Doom')).toEqual({ kind: 'known', name: 'Doctor Doom' })
  })

  it('treats a valid answer that is also a known name as valid', () => {
    expect(m('Cyclops')).toEqual({ kind: 'valid', index: 2, exact: true })
  })

  it('rejects ambiguous typo matches', () => {
    const amb = buildMatcher([{ name: 'Sabretooth', aliases: [] }, { name: 'Sabertooth', aliases: [] }, { name: 'Sabretoothe', aliases: [] }], [])
    expect(amb('sabertoth')).toEqual({ kind: 'valid', index: 1, exact: false })
    const tie = buildMatcher([{ name: 'Mandrill', aliases: [] }, { name: 'Mandroid', aliases: [] }], [])
    expect(tie('mandril')).toEqual({ kind: 'valid', index: 0, exact: false })
    expect(tie('mandrxd')).toEqual({ kind: 'invalid' })
  })

  it('returns empty for blank input', () => {
    expect(m('   ')).toEqual({ kind: 'empty' })
  })
})
