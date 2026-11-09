import { render, screen, within } from '@testing-library/react'
import { ch, storm } from '../logic/fixtures'
import CaseFile from './CaseFile'

const subject = {
  ...storm,
  debutIssue: 'Giant-Size X-Men #1',
  debutDate: '1975-05',
  archetype: 'longhair' as const,
  caseNote: 'Subject commands weather on a planetary scale. Agents are advised not to schedule picnics.',
}

/** The value printed under a field label on the card. */
function field(label: string): string | null | undefined {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent
}

describe('CaseFile', () => {
  it('fills the ID card from the character record', () => {
    render(<CaseFile character={subject} number={1} date="2026-11-06" slam={false} />)
    const card = screen.getByRole('article', { name: 'Confirm identity' })
    expect(within(card).getByText('Case 0001-U')).toBeInTheDocument()
    expect(field('Subject')).toBe('Storm')
    expect(field('Known as')).toBe('Ororo Munroe')
    expect(field('World')).toBe('X-Men')
    expect(field('First record')).toBe('Giant-Size X-Men #1 (May 1975)')
    expect(field('Classification')).toBe('Hero · Mutant')
    expect(field('MCU')).toBe('Not on file')
    expect(within(card).getByText(/Agents are advised not to schedule picnics\./)).toBeInTheDocument()
  })

  it('shows an original portrait with the archetype, origin emblem and monogram', () => {
    render(<CaseFile character={subject} number={1} date="2026-11-06" slam={false} />)
    expect(screen.getByRole('img', { name: /Storm/ })).toBeInTheDocument()
    expect(screen.getByText('S', { selector: 'text' })).toBeInTheDocument()
  })

  it('names the first MCU appearance and a missing real name', () => {
    const hulk = ch('hulk', 'Hulk', { mcu: true, mcuFirst: 'The Incredible Hulk', realName: null })
    render(<CaseFile character={hulk} number={12} date="2026-11-17" slam={false} />)
    expect(field('MCU')).toBe('The Incredible Hulk')
    expect(field('Known as')).toBe('Not on file')
  })

  it('stamps the card CASE CLOSED with the filing date', () => {
    render(<CaseFile character={subject} number={1} date="2026-11-06" slam />)
    const stamp = screen.getByTestId('stamp')
    expect(stamp).toHaveTextContent('CASE CLOSED')
    expect(stamp).toHaveTextContent('Filed 06 NOV 2026')
  })

  it('keeps the stamp hidden until it is applied', () => {
    render(<CaseFile character={subject} number={1} date="2026-11-06" slam stamped={false} />)
    expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'true')
  })
})
