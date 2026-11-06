import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatsDialog from './StatsDialog'

const stats = { played: 4, solved: 3, distribution: [0, 1, 2, 0, 0, 0] }

/** The figure shown under a stat label. */
function tile(label: string): string | null | undefined {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent
}

describe('StatsDialog', () => {
  it('shows played, solved %, and current and best consecutive shifts', () => {
    render(<StatsDialog open onClose={() => {}} stats={stats} current={2} best={5} highlight={3} />)
    expect(screen.getByRole('dialog', { name: 'Statistics' })).toBeInTheDocument()
    expect(tile('Played')).toBe('4')
    expect(tile('Solved')).toBe('75%')
    expect(tile('Current shifts')).toBe('2')
    expect(tile('Best shifts')).toBe('5')
  })

  it('tabulates the guess distribution and marks today', () => {
    render(<StatsDialog open onClose={() => {}} stats={stats} current={2} best={5} highlight={3} />)
    const table = screen.getByRole('table', { name: 'Solved by attempt' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(rows.map((r) => within(r).getByRole('cell').textContent?.replace(/\D+$/, ''))).toEqual([
      '0', '1', '2', '0', '0', '0',
    ])
    expect(rows[2]).toHaveTextContent('Today')
    expect(rows[1]).not.toHaveTextContent('Today')
  })

  it('reads a dash for the solve rate before any case is filed', () => {
    render(
      <StatsDialog
        open
        onClose={() => {}}
        stats={{ played: 0, solved: 0, distribution: [0, 0, 0, 0, 0, 0] }}
        current={0}
        best={0}
      />,
    )
    expect(tile('Solved')).toBe('–')
    expect(screen.getByText(/No cases filed yet/)).toBeInTheDocument()
  })

  it('closes from its close button', async () => {
    const onClose = vi.fn()
    render(<StatsDialog open onClose={onClose} stats={stats} current={0} best={0} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
