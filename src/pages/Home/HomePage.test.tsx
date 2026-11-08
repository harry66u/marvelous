import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProgressProvider } from '../../data/progress'
import { useDay } from '../../data/useDay'
import { STORE_KEY, emptyStore, noteRequired, withRecord, type GameRecord, type Store } from '../../lib/progress'
import type { DayBundle } from '../../server/dayBundle'
import HomePage from './HomePage'

vi.mock('../../data/useDay', () => ({ useDay: vi.fn() }))
const useDayMock = vi.mocked(useDay)

const NUMBERS: Record<string, number> = { '2026-11-06': 1, '2026-11-07': 2 }
const bundleFor = (date: string): DayBundle => ({
  date,
  number: NUMBERS[date] ?? 99,
  launchDate: '2026-11-06',
  games: ['unmasked'],
  unmasked: { key: 'k' },
})

const inProgress: GameRecord = { status: 'in_progress', state: {}, startedAt: '2026-11-07T15:00:00Z' }
const filed = (attempts: number, solved: boolean): GameRecord => ({
  status: 'filed',
  state: {},
  result: { attempts, solved },
  startedAt: '2026-11-07T15:00:00Z',
  filedAt: '2026-11-07T15:05:00Z',
})

const seed = (store: Store) => localStorage.setItem(STORE_KEY, JSON.stringify(store))
const storedDays = () => (JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Store).days

function renderHome() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <HomePage />
      </ProgressProvider>
    </MemoryRouter>,
  )
}

const tickets = () => within(screen.getByRole('list', { name: "Today's assignments" })).getAllByRole('listitem')
const monitor = () => screen.getByRole('navigation', { name: 'Branch monitor' })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-07T17:00:00Z')) // noon ET, 7 Nov
  useDayMock.mockImplementation((date) => ({ status: 'ready', bundle: bundleFor(date), retry: () => {} }))
})

afterEach(() => {
  vi.useRealTimers()
  useDayMock.mockReset()
  localStorage.clear()
})

describe('HomePage', () => {
  it.each([
    ['nothing started', undefined, 'Pending'],
    ['a game in progress', inProgress, 'In progress'],
    ['a solved game', filed(3, true), 'Filed 3/6'],
    ['an unsolved game', filed(6, false), 'Filed X/6'],
  ])('HomePage shows three tickets with statuses (%s)', (_, record, unmaskedStatus) => {
    if (record) seed(withRecord(emptyStore(), '2026-11-07', 'unmasked', record))
    renderHome()

    const [unmasked, blist, retcon] = tickets()
    expect(tickets()).toHaveLength(3)
    expect(unmasked).toHaveTextContent('Unmasked')
    expect(unmasked).toHaveTextContent(unmaskedStatus)
    expect(blist).toHaveTextContent('B-List')
    expect(blist).toHaveTextContent('Not issued today')
    expect(retcon).toHaveTextContent('Retcon')
    expect(retcon).toHaveTextContent('Not issued today')
    expect(within(monitor()).getByRole('link')).toHaveTextContent(unmaskedStatus)
  })

  it('links only the games issued today from the branch monitor', () => {
    renderHome()
    const links = within(monitor()).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/unmasked')
    expect(links[0]).toHaveAccessibleName(/Unmasked/)
    expect(within(monitor()).getAllByText('Not issued today')).toHaveLength(2)
  })

  it('opens all three games on a full shift, with each filed result and an end-of-shift link', () => {
    useDayMock.mockReturnValue({ status: 'ready', bundle: { ...bundleFor('2026-11-07'), games: ['unmasked', 'blist', 'retcon'] }, retry: () => {} })
    let store = noteRequired(emptyStore(), '2026-11-07', ['unmasked', 'blist', 'retcon'])
    store = withRecord(store, '2026-11-07', 'unmasked', filed(3, true))
    store = withRecord(store, '2026-11-07', 'blist', { ...filed(0, true), result: { score: 370, extended: false, tiers: [] } })
    seed(store)
    renderHome()
    const [, blist, retcon] = tickets()
    expect(blist).toHaveTextContent('Filed 370/700')
    expect(retcon).toHaveTextContent('Pending')
    expect(within(monitor()).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/unmasked', '/b-list', '/retcon'])
    expect(screen.queryByText('Review the shift report')).not.toBeInTheDocument()
  })

  it('shows the end-of-shift banner when every assignment is filed', () => {
    useDayMock.mockReturnValue({ status: 'ready', bundle: { ...bundleFor('2026-11-07'), games: ['unmasked', 'blist', 'retcon'] }, retry: () => {} })
    let store = noteRequired(emptyStore(), '2026-11-07', ['unmasked', 'blist', 'retcon'])
    store = withRecord(store, '2026-11-07', 'unmasked', filed(3, true))
    store = withRecord(store, '2026-11-07', 'blist', { ...filed(0, true), result: { score: 370, extended: false, tiers: [] } })
    store = withRecord(store, '2026-11-07', 'retcon', { ...filed(0, true), result: { correct: 4, placements: [] } })
    seed(store)
    renderHome()
    expect(tickets()[2]).toHaveTextContent('Filed 4/5')
    expect(screen.getByRole('link', { name: 'Review the shift report' })).toHaveAttribute('href', '/shift')
  })

  it('shows the shift number and date', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'SHIFT #002 · 07 NOV 2026' })).toBeInTheDocument()
  })

  it("notes today's required games in the progress store", () => {
    renderHome()
    expect(storedDays()['2026-11-07']?.required).toEqual(['unmasked'])
  })

  it('shows consecutive shifts and the registration note', () => {
    let store = emptyStore()
    for (const date of ['2026-11-05', '2026-11-06']) {
      store = withRecord(noteRequired(store, date, ['unmasked']), date, 'unmasked', filed(4, true))
    }
    seed(store)
    renderHome()
    expect(within(screen.getByRole('group', { name: 'Consecutive shifts' })).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Agent registration opens soon. Your shifts are kept on this device.')).toBeInTheDocument()
  })

  it('HomePage shows the none state', () => {
    useDayMock.mockReturnValue({ status: 'none', retry: () => {} })
    renderHome()
    expect(
      screen.getByText('No assignments have been issued for this date. Please remain at your desk.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: "Today's assignments" })).not.toBeInTheDocument()
    expect(within(monitor()).queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: '07 NOV 2026' })).toBeInTheDocument()
  })

  it('shows the error state with a working Retry button', () => {
    const retry = vi.fn()
    useDayMock.mockReturnValue({ status: 'error', retry })
    renderHome()
    expect(screen.getByText('Transmission interrupted. Check your connection, then retry.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('HomePage rolls over at midnight', () => {
    vi.setSystemTime(new Date('2026-11-07T04:59:58Z')) // 23:59:58 ET on 6 Nov
    seed(withRecord(noteRequired(emptyStore(), '2026-11-06', ['unmasked']), '2026-11-06', 'unmasked', filed(3, true)))
    renderHome()
    const clock = () => screen.getByRole('figure', { name: /next assignment in/i })

    expect(screen.getByRole('heading', { name: 'SHIFT #001 · 06 NOV 2026' })).toBeInTheDocument()
    expect(clock()).toHaveTextContent('00:00:02')
    expect(tickets()[0]).toHaveTextContent('Filed 3/6')
    expect(screen.queryByText('New assignments issued')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3_000) })

    expect(screen.getByRole('heading', { name: 'SHIFT #002 · 07 NOV 2026' })).toBeInTheDocument()
    expect(clock()).toHaveTextContent(/23:59:5\d/)
    expect(tickets()[0]).toHaveTextContent('Pending')
    expect(within(screen.getByRole('group', { name: 'Consecutive shifts' })).getByText('1')).toBeInTheDocument()
    expect(useDayMock).toHaveBeenLastCalledWith('2026-11-07')
    expect(screen.getByText('New assignments issued')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('New assignments issued.')
  })

  it('opens the settings dialog from the desk', () => {
    renderHome()
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })
})
