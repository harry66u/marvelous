import { act, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import RouteFocus from './RouteFocus'

it('moves focus to the new page heading after navigation, not on first load', async () => {
  vi.useFakeTimers()
  render(
    <MemoryRouter>
      <RouteFocus />
      <Routes>
        <Route path="/" element={<main><h1>Desk</h1><Link to="/next">Go</Link></main>} />
        <Route path="/next" element={<main><h1>Next form</h1></main>} />
      </Routes>
    </MemoryRouter>,
  )
  act(() => { vi.advanceTimersByTime(500) })
  expect(document.activeElement).not.toBe(screen.getByRole('heading', { name: 'Desk' }))
  act(() => { screen.getByRole('link', { name: 'Go' }).click() })
  act(() => { vi.advanceTimersByTime(500) })
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Next form' }))
  vi.useRealTimers()
})
