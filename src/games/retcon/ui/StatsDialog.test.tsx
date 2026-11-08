import { render, screen, within } from '@testing-library/react'
import { emptyStore, withRecord, type Store } from '../../../lib/progress'
import { newRetcon, type Placement } from '../logic/game'
import { retconStats } from './stats'
import StatsDialog from './StatsDialog'

function filed(store: Store, date: string, placements: Placement[]): Store {
  const correct = placements.filter((p) => p === 'correct').length
  const state = { ...newRetcon(date, ['a', 'b', 'c', 'd', 'e', 'f']), placements, status: 'won' as const }
  return withRecord(store, date, 'retcon', {
    status: 'filed',
    state,
    result: { correct, placements },
    startedAt: `${date}T12:00:00Z`,
    filedAt: `${date}T12:05:00Z`,
  })
}

const C: Placement = 'correct'
const W: Placement = 'wrong'
const A: Placement = 'auto'

describe('retconStats', () => {
  it('counts filed cases, perfect days, the average and the distribution', () => {
    let store = emptyStore()
    store = filed(store, '2026-11-06', [C, C, C, C, C])
    store = filed(store, '2026-11-07', [C, W, C, C, C])
    store = filed(store, '2026-11-08', [W, W, W, A, A])
    store = withRecord(store, '2026-11-09', 'retcon', {
      status: 'in_progress',
      state: newRetcon('2026-11-09', ['a', 'b', 'c', 'd', 'e', 'f']),
      startedAt: '2026-11-09T12:00:00Z',
    })
    expect(retconStats(store)).toEqual({ filed: 3, perfect: 1, average: 3, distribution: [1, 0, 0, 0, 1, 1] })
  })

  it('has no average before the first case', () => {
    expect(retconStats(emptyStore())).toEqual({ filed: 0, perfect: 0, average: null, distribution: [0, 0, 0, 0, 0, 0] })
  })
})

describe('StatsDialog', () => {
  it('shows the tiles and marks today in the distribution', () => {
    render(
      <StatsDialog open onClose={() => {}} stats={{ filed: 3, perfect: 1, average: 3, distribution: [1, 0, 0, 0, 1, 1] }} highlight={4} />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Statistics' })
    expect(within(dialog).getByText('Cases filed').nextElementSibling).toHaveTextContent('3')
    expect(within(dialog).getByText('Perfect days').nextElementSibling).toHaveTextContent('1')
    expect(within(dialog).getByText('Average in order').nextElementSibling).toHaveTextContent('3.0/5')
    const rows = within(dialog).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['0', '1', '2', '3', '4', '5'])
    expect(rows[4]).toHaveTextContent('Today')
  })
})
