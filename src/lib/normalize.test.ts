import { normalizeName } from './normalize'

describe('normalizeName', () => {
  it('turns punctuation into spaces and lowercases', () => {
    expect(normalizeName('Spider-Man')).toBe('spider man')
  })
  it('drops periods so initialisms collapse', () => {
    expect(normalizeName('M.O.D.O.K.')).toBe('modok')
    expect(normalizeName('H.E.R.B.I.E.')).toBe('herbie')
  })
  it('trims, collapses spaces and drops a leading "the"', () => {
    expect(normalizeName('  The  Thing ')).toBe('thing')
    expect(normalizeName('Thena')).toBe('thena')
  })
  it('strips diacritics', () => {
    expect(normalizeName('Daimon Hellström')).toBe('daimon hellstrom')
  })
  it('removes apostrophes inside words', () => {
    expect(normalizeName("Jack O'Lantern")).toBe('jack olantern')
    expect(normalizeName('M’Baku')).toBe('mbaku')
  })
  it('spells out ampersands', () => {
    expect(normalizeName('Cloak & Dagger')).toBe('cloak and dagger')
  })
  it('returns an empty string for blank input', () => {
    expect(normalizeName('   ')).toBe('')
  })
})
