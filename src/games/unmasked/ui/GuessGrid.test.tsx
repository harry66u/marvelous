import { render, screen, within } from '@testing-library/react'
import { galactus, rogue, storm } from '../logic/fixtures'
import GuessGrid from './GuessGrid'
import { describeGuess } from './labels'

describe('GuessGrid', () => {
  it('lists each guess with its full screen-reader row text, in filing order', () => {
    render(<GuessGrid guesses={[galactus, rogue]} answer={storm} fresh={new Set()} nextAttempt={3} />)
    const list = screen.getByRole('list', { name: 'Attempts on file' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText(describeGuess(galactus, storm).text)).toBeInTheDocument()
    expect(within(items[1]!).getByText(describeGuess(rogue, storm).text)).toBeInTheDocument()
  })

  it('hides the visual cells from assistive tech but shows labels, marks and arrows', () => {
    const { container } = render(
      <GuessGrid guesses={[galactus]} answer={storm} fresh={new Set()} nextAttempt={2} />,
    )
    const visual = container.querySelector('li [aria-hidden="true"]')
    expect(visual).not.toBeNull()
    const text = visual?.textContent ?? ''
    for (const piece of ['Galactus', '✕', 'None', '1960s', '▲', '≈', 'Villain', 'Cosmic', 'Male', '✓']) {
      expect(text).toContain(piece)
    }
  })

  it('flips only the rows filed in this session', () => {
    render(<GuessGrid guesses={[galactus, rogue]} answer={storm} fresh={new Set(['rogue'])} nextAttempt={3} />)
    const [first, second] = within(screen.getByRole('list', { name: 'Attempts on file' })).getAllByRole('listitem')
    expect(first?.className).not.toMatch(/flip/)
    expect(second?.className).toMatch(/flip/)
  })

  it('shows the column header, the next empty attempt and the legend', () => {
    render(<GuessGrid guesses={[galactus]} answer={storm} fresh={new Set()} nextAttempt={2} />)
    expect(screen.getByText('— Attempt 2 —')).toBeInTheDocument()
    for (const h of ['Affil.', 'Align.', 'Gender']) expect(screen.getAllByText(h).length).toBeGreaterThan(0)
    expect(screen.getByText('Exact')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
    expect(screen.getByText('No match')).toBeInTheDocument()
  })

  it('has no empty-attempt row once the case is closed', () => {
    render(<GuessGrid guesses={[storm]} answer={storm} fresh={new Set()} nextAttempt={null} />)
    expect(screen.queryByText(/— Attempt/)).toBeNull()
  })
})
