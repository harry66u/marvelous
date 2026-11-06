import { ch, galactus, modok, rogue, storm } from '../logic/fixtures'
import { caseCode, describeGuess, firstRecord, monogram } from './labels'

describe('describeGuess', () => {
  it('reads the Rogue fixture row in full for screen readers', () => {
    expect(describeGuess(rogue, storm).text).toBe(
      'Rogue. Affiliation X-Men, exact. Debut 1980s, close, the subject debuted earlier. ' +
        'Alignment Hero, exact. Origin Mutant, exact. Gender Female, exact. MCU No, exact. Not the subject.',
    )
  })

  it('builds six cells with short labels, marks and the debut arrow', () => {
    const row = describeGuess(galactus, storm)
    expect(row.nameMark).toBe('no')
    expect(row.cells.map((c) => [c.key, c.label, c.mark, c.arrow])).toEqual([
      ['affiliation', 'None', 'no', null],
      ['debut', '1960s', 'close', '▲'],
      ['alignment', 'Villain', 'no', null],
      ['origin', 'Cosmic', 'no', null],
      ['gender', 'Male', 'no', null],
      ['mcu', 'No', 'exact', null],
    ])
  })

  it('confirms the subject when the guess is correct', () => {
    const row = describeGuess(storm, storm)
    expect(row.nameMark).toBe('exact')
    expect(row.text).toMatch(/Debut 1970s, exact\. .*MCU No, exact\. Subject identified\.$/)
  })

  it('does not double the full stop after a name that ends in one', () => {
    expect(describeGuess(modok, storm).text.startsWith('M.O.D.O.K. Affiliation None, no match.')).toBe(true)
  })

  it('uses the short team label in the cell and the full name for screen readers', () => {
    const reed = ch('reed', 'Mister Fantastic', { primaryTeam: 'fantastic-four', teams: ['fantastic-four'] })
    const row = describeGuess(reed, storm)
    expect(row.cells[0]?.label).toBe('F. Four')
    expect(row.text).toContain('Affiliation Fantastic Four, no match.')
  })
})

describe('firstRecord', () => {
  it('adds the cover month and year', () => {
    expect(firstRecord({ debutIssue: 'Giant-Size X-Men #1', debutDate: '1975-05', debutYear: 1975 })).toBe(
      'Giant-Size X-Men #1 (May 1975)',
    )
  })
  it('falls back to the year when the month is unknown', () => {
    expect(firstRecord({ debutIssue: 'Strange Tales #110', debutDate: '1963', debutYear: 1963 })).toBe(
      'Strange Tales #110 (1963)',
    )
  })
})

describe('monogram', () => {
  it.each([
    ['Storm', 'S'],
    ['Doctor Strange', 'DS'],
    ['Spider-Man (Peter Parker)', 'SM'],
    ['M.O.D.O.K.', 'M'],
    ['Captain America of the Old Guard', 'CAO'],
  ])('%s -> %s', (name, expected) => {
    expect(monogram(name)).toBe(expected)
  })
})

describe('caseCode', () => {
  it('pads the puzzle number', () => {
    expect(caseCode(1)).toBe('Case 0001-U')
    expect(caseCode(123)).toBe('Case 0123-U')
  })
})
