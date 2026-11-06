import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import BranchMonitor from './BranchMonitor'
import type { Assignment } from './HomePage'

const ASSIGNMENTS: Assignment[] = [
  { id: 'unmasked', no: '01', title: 'Unmasked', subtitle: 'Identify the variant', status: 'pending', statusText: 'Pending', to: '/unmasked' },
  { id: 'blist', no: '02', title: 'B-List', subtitle: 'Records search', status: 'unavailable', statusText: 'Awaiting clearance' },
  { id: 'retcon', no: '03', title: 'Retcon', subtitle: 'Timeline repair', status: 'unavailable', statusText: 'Awaiting clearance' },
]

function renderMonitor(date = '2026-11-06') {
  return render(
    <MemoryRouter>
      <BranchMonitor date={date} assignments={ASSIGNMENTS} shiftNo={1} countdown="06:12:33" />
    </MemoryRouter>,
  )
}

const drawnPaths = (date: string) => {
  const { container, unmount } = renderMonitor(date)
  const paths = [...container.querySelectorAll('svg path')].map((p) => p.getAttribute('d'))
  unmount()
  return paths
}

beforeEach(() => {
  delete document.documentElement.dataset.motion
})

afterEach(() => vi.useRealTimers())

describe('BranchMonitor', () => {
  it('labels each branch in HTML, linking only playable assignments', () => {
    renderMonitor()
    const nav = screen.getByRole('navigation', { name: 'Branch monitor' })
    const items = within(nav).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByRole('link', { name: /Unmasked/ })).toHaveAttribute('href', '/unmasked')
    expect(within(items[0]!).getByRole('link')).toHaveTextContent('Pending')
    for (const item of items.slice(1)) {
      expect(within(item).queryByRole('link')).not.toBeInTheDocument()
      expect(item).toHaveTextContent('Awaiting clearance')
    }
  })

  it('seeds the decorative branches with the date', () => {
    const first = drawnPaths('2026-11-06')
    expect(first.length).toBeGreaterThan(10)
    expect(drawnPaths('2026-11-06')).toEqual(first)
    expect(drawnPaths('2026-11-07')).not.toEqual(first)
  })

  it('draws the branches on once per mount', () => {
    document.documentElement.dataset.motion = 'full'
    vi.useFakeTimers()
    const { rerender } = renderMonitor()
    const nav = screen.getByRole('navigation', { name: 'Branch monitor' })
    expect(nav).toHaveAttribute('data-drawing')

    act(() => { vi.advanceTimersByTime(5_000) })
    expect(nav).not.toHaveAttribute('data-drawing')

    rerender(
      <MemoryRouter>
        <BranchMonitor date="2026-11-07" assignments={ASSIGNMENTS} shiftNo={2} countdown="23:59:59" />
      </MemoryRouter>,
    )
    expect(nav).not.toHaveAttribute('data-drawing')
  })

  it('never animates under reduced motion', () => {
    document.documentElement.dataset.motion = 'reduce'
    const { container } = renderMonitor()
    expect(screen.getByRole('navigation', { name: 'Branch monitor' })).not.toHaveAttribute('data-drawing')
    expect(container.querySelector('animateMotion')).toBeNull()
  })
})
