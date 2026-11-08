import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { MemoryRouter } from 'react-router'
import { ProgressProvider } from '../../../data/progress'
import { STORE_KEY } from '../../../lib/progress'
import { encodeAnswer, encodePayload, type DayBundle, type RetconDayRecord } from '../../../server/dayBundle'
import { newRetcon, place } from '../logic/game'
import RetconPage from './RetconPage'
import type { RetconGame } from './useRetconGame'

const h = vi.hoisted(() => ({ fake: null as null | (() => RetconGame) }))
vi.mock('./useRetconGame', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useRetconGame')>()
  return { ...actual, useRetconGame: () => (h.fake ? h.fake() : actual.useRetconGame()) }
})

const DATE = '2026-11-06'

/** The anchor first, then arrival order. In date order the right slots are 0, 2, 2, 3, 0. */
const RECORDS: RetconDayRecord[] = [
  { id: 'spidey', text: 'First appearance: Spider-Man', detail: 'Amazing Fantasy #15 · Peter Parker', date: '1962-08', kind: 'debut' },
  { id: 'ff', text: 'First appearance: Fantastic Four', detail: 'The Fantastic Four #1', date: '1961-11', kind: 'debut' },
  { id: 'iron-man', text: 'Iron Man', detail: 'MCU film · U.S. release', date: '2008-05-02', kind: 'screen' },
  { id: 'wolverine', text: 'First appearance: Wolverine', detail: 'The Incredible Hulk #180 · James Howlett', date: '1974-10', kind: 'debut' },
  { id: 'secret-wars', text: 'Secret Wars begins', detail: 'Marvel Super Heroes Secret Wars #1', date: '1984-05', kind: 'event' },
  { id: 'cap', text: 'First appearance: Captain America', detail: 'Captain America Comics #1 · Steve Rogers', date: '1941-03', kind: 'debut' },
]
const CARDS = new Map(RECORDS.map((r) => [r.id, r]))

/** A stand-in for the hook: the real rules over React state, without storage or the network. */
function useFakeGame(): RetconGame {
  const [state, setState] = useState(() => newRetcon(DATE, RECORDS.map((r) => r.id)))
  const current = useRef(state)
  return {
    status: 'ready',
    date: DATE,
    today: DATE,
    number: 1,
    games: ['unmasked', 'blist', 'retcon'],
    cards: CARDS,
    state,
    record: undefined,
    place: (slot) => {
      const out = place(current.current, CARDS, slot)
      if (out) {
        current.current = out.state
        setState(out.state)
      }
      return out
    },
    retry: () => {},
  }
}

function bundle(): DayBundle {
  return {
    date: DATE,
    number: 1,
    launchDate: DATE,
    games: ['unmasked', 'retcon'],
    unmasked: { key: encodeAnswer('storm', DATE) },
    retcon: { key: encodePayload(RECORDS, DATE) },
  }
}

/** /api/day serves `day` (or 404 when null); the character file is empty. */
function stubFetch(day: DayBundle | null = bundle()) {
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.startsWith('/api/day')) {
      return day ? new Response(JSON.stringify(day), { status: 200 }) : new Response('{"error":"x"}', { status: 404 })
    }
    return new Response('[]', { status: 200 })
  })
  vi.stubGlobal('fetch', fetchFn)
  return fetchFn
}

function seedStore(settings: Record<string, unknown> = {}) {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      version: 1,
      days: {},
      settings: { sound: false, motion: 'reduce', seenManual: { retcon: true }, extendedTimer: false, ...settings },
    }),
  )
}

const stored = () => JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').days?.[DATE]?.games?.retcon

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/retcon']}>
      <ProgressProvider>
        <RetconPage />
      </ProgressProvider>
    </MemoryRouter>,
  )
}

/** Let the character file (used by the share report) finish loading. */
const settle = () => act(async () => {})

const mainLine = () => screen.getByRole('list', { name: 'Main line, oldest first' })
const rows = () => within(mainLine()).getAllByRole('listitem')
const slotGroup = () => screen.getByRole('group', { name: 'Timeline slots' })
const slots = () => within(slotGroup()).getAllByRole('button', { name: /^Place / })
const announced = (text: string) => screen.getAllByText(text).some((el) => el.closest('[aria-live]'))

/** Place the pending record in each slot, in turn. */
async function placeAll(user: ReturnType<typeof userEvent.setup>, order: number[]) {
  for (const i of order) await user.click(slots()[i]!)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T17:00:00Z'))
  h.fake = useFakeGame
  stubFetch()
  seedStore()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('RetconPage', () => {
  it('sets the title and shows the anchor with its year and the incoming record without one', async () => {
    renderPage()
    await settle()
    expect(document.title).toBe('Retcon · Marvelous')
    expect(screen.getByRole('heading', { level: 1, name: 'RETCON' })).toBeInTheDocument()
    expect(screen.getByText('Form 4R // Timeline repair // Record 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 variance allowances left' })).toBeInTheDocument()
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('1962')
    expect(rows()[0]).toHaveTextContent('Anchor')
    const incoming = screen.getByRole('region', { name: 'Incoming record' })
    expect(incoming).toHaveTextContent('First appearance: Fantastic Four')
    expect(incoming).toHaveTextContent('The Fantastic Four #1')
    expect(incoming).not.toHaveTextContent('1961')
    expect(slots().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Place before everything, ahead of First appearance: Spider-Man, 1962',
      'Place after First appearance: Spider-Man, 1962',
    ])
  })

  it('a correct placement locks in and shows its year', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Place before everything, ahead of First appearance: Spider-Man, 1962' }))
    const [first, second] = rows()
    expect(first).toHaveTextContent('First appearance: Fantastic Four')
    expect(first).toHaveTextContent('1961')
    expect(first).toHaveTextContent('In order')
    expect(second).toHaveTextContent('First appearance: Spider-Man')
    expect(screen.getByRole('img', { name: '3 of 3 variance allowances left' })).toBeInTheDocument()
    expect(announced('Correct. First appearance: Fantastic Four, 1961. Incoming record: Iron Man.')).toBe(true)
    expect(screen.getByRole('region', { name: 'Incoming record' })).toHaveTextContent('Iron Man')
    expect(screen.getByText('Form 4R // Timeline repair // Record 2 of 5')).toBeInTheDocument()
  })

  it('a wrong placement costs an allowance and files the record in its true slot', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Place after First appearance: Spider-Man, 1962' }))
    const [first] = rows()
    expect(first).toHaveTextContent('First appearance: Fantastic Four')
    expect(first).toHaveTextContent('1961')
    expect(first).toHaveTextContent('Refiled')
    expect(screen.getByRole('img', { name: '2 of 3 variance allowances left' })).toBeInTheDocument()
    expect(
      announced(
        'Out of order. It belongs before First appearance: Spider-Man, filed under 1961. 2 allowances left. Incoming record: Iron Man.',
      ),
    ).toBe(true)
  })

  it('arrow keys move between slots and Enter places', async () => {
    const user = userEvent.setup()
    renderPage()
    const [before, after] = slots()
    expect(slots().filter((b) => b.tabIndex === 0)).toEqual([after])
    act(() => after!.focus())
    await user.keyboard('{ArrowUp}')
    expect(before).toHaveFocus()
    expect(before).toHaveAttribute('tabindex', '0')
    expect(after).toHaveAttribute('tabindex', '-1')
    await user.keyboard('{End}')
    expect(after).toHaveFocus()
    await user.keyboard('{Home}')
    expect(before).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(before).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(rows()[0]).toHaveTextContent('First appearance: Fantastic Four')
    expect(rows()[0]).toHaveTextContent('In order')
    // focus stays in the slot group, just below the record that was placed
    expect(screen.getByRole('button', { name: 'Place before First appearance: Spider-Man, 1962' })).toHaveFocus()
    await user.keyboard('{End}[Space]')
    expect(rows()[2]).toHaveTextContent('Iron Man')
    expect(rows()[2]).toHaveTextContent('2008')
  })

  it('running out of allowances files the rest automatically and closes the case', async () => {
    const user = userEvent.setup()
    renderPage()
    await placeAll(user, [1, 0, 0])
    expect(screen.queryByRole('group', { name: 'Timeline slots' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Incoming record' })).toBeNull()
    expect(screen.getByRole('img', { name: '0 of 3 variance allowances left' })).toBeInTheDocument()
    expect(rows().map((r) => r.querySelector('p')?.textContent?.slice(0, 4))).toEqual(['1941', '1961', '1962', '1974', '1984', '2008'])
    expect(within(mainLine()).getAllByText('Auto-filed')).toHaveLength(2)
    expect(rows()[0]).toHaveTextContent('Auto-filed')
    const verdict = screen.getByRole('heading', { name: 'Variance limit reached' })
    expect(verdict).toHaveFocus()
    expect(screen.getByText('0/5 records in order. The remaining records were filed automatically.')).toBeInTheDocument()
    expect(
      announced(
        'Out of order. It belongs between First appearance: Spider-Man and Iron Man, filed under 1974. No allowances left. ' +
          'Variance limit reached. The remaining 2 records were filed automatically. Case closed. 0/5 records in order.',
      ),
    ).toBe(true)
    await waitFor(() => expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false'))
    expect(screen.getByTestId('stamp')).toHaveTextContent('CASE CLOSED')
  })

  it('the end screen shows the score, the five outcomes and the report button', async () => {
    const user = userEvent.setup()
    renderPage()
    await placeAll(user, [0, 2, 2, 4, 0])
    expect(screen.getByRole('heading', { name: '4/5 records in order' })).toHaveFocus()
    expect(screen.getByText('Form 4R // Timeline repair // Case closed')).toBeInTheDocument()
    const outcomes = within(screen.getByRole('list', { name: 'Placements on file' })).getAllByRole('listitem')
    expect(outcomes.map((li) => li.getAttribute('data-outcome'))).toEqual(['correct', 'correct', 'correct', 'wrong', 'correct'])
    expect(outcomes[3]).toHaveTextContent('Secret Wars begins')
    expect(outcomes[3]).toHaveTextContent('1984')
    expect(screen.getByRole('button', { name: 'Copy report' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'File statistics' }))
    expect(screen.getByRole('dialog', { name: 'Statistics' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false'))
  })

  it('opens the field manual on the first visit and remembers it was read', async () => {
    seedStore({ seenManual: {} })
    renderPage()
    const dialog = screen.getByRole('dialog', { name: 'Field manual' })
    expect(within(dialog).getByText(/^You have 3\. /)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Understood' }))
    expect(screen.queryByRole('dialog', { name: 'Field manual' })).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').settings.seenManual.retcon).toBe(true)
  })

  it('does not reopen the field manual once read', async () => {
    renderPage()
    await settle()
    expect(screen.queryByRole('dialog', { name: 'Field manual' })).toBeNull()
  })

  it('with motion on, the branches retract before the stamp lands', async () => {
    vi.useRealTimers() // so the timer list below replaces the Date-only fake from beforeEach
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-11-06T17:00:00Z'))
    seedStore({ motion: 'full' })
    renderPage()
    await settle()
    for (const i of [1, 0, 0]) act(() => slots()[i]!.click())
    const board = mainLine().closest('[data-phase]')!
    expect(screen.getByRole('heading', { name: 'Variance limit reached' })).toHaveFocus()
    expect(board).toHaveAttribute('data-phase', 'open')
    expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'true')
    // the last miss settles and the two auto-filed records file in: 1000 + 140 + 420 ms
    act(() => vi.advanceTimersByTime(1560))
    expect(board).toHaveAttribute('data-phase', 'collapse')
    expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'true')
    act(() => vi.advanceTimersByTime(1100))
    expect(board).toHaveAttribute('data-phase', 'closed')
    expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false')
  })

  describe('through the real hook', () => {
    beforeEach(() => {
      h.fake = null
    })

    it('loads the case from /api/day, files it, and copies the report', async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      renderPage()
      expect(await screen.findByRole('region', { name: 'Incoming record' })).toHaveTextContent('First appearance: Fantastic Four')

      await user.click(slots()[0]!)
      expect(rows()[0]).toHaveTextContent('1961')
      expect(stored()).toMatchObject({ status: 'in_progress', state: { placements: ['correct'], allowances: 3 } })

      await placeAll(user, [2, 2, 4, 0])
      expect(screen.getByRole('heading', { name: '4/5 records in order' })).toHaveFocus()
      expect(stored()).toMatchObject({
        status: 'filed',
        result: { correct: 4, placements: ['correct', 'correct', 'correct', 'wrong', 'correct'] },
      })

      await user.click(screen.getByRole('button', { name: 'Copy report' }))
      expect(writeText).toHaveBeenCalledTimes(1)
      const text = writeText.mock.calls[0]![0] as string
      expect(text).toMatch(/^MARVELOUS #001 · 06 NOV 2026\n/)
      expect(text).toContain('UNMASKED PENDING')
      expect(text).toContain('RETCON 4/5\n🟧🟧🟧⬛🟧')
      expect(await screen.findByText('Report copied to the clipboard.')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'File statistics' }))
      const dialog = screen.getByRole('dialog', { name: 'Statistics' })
      expect(within(dialog).getByText('Cases filed').nextElementSibling).toHaveTextContent('1')
      expect(within(dialog).getByText('Average in order').nextElementSibling).toHaveTextContent('4.0/5')
    })

    it('restores a closed case with the stamp already applied', async () => {
      const user = userEvent.setup()
      const first = renderPage()
      await screen.findByRole('region', { name: 'Incoming record' })
      await placeAll(user, [1, 0, 0])
      first.unmount()
      renderPage()
      expect(await screen.findByRole('heading', { name: 'Variance limit reached' })).toBeInTheDocument()
      expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false')
      expect(within(mainLine()).getAllByText('Auto-filed')).toHaveLength(2)
    })

    it('shows the memo for an unscheduled day', async () => {
      stubFetch(null)
      renderPage()
      expect(
        await screen.findByText('No assignments have been issued for this date. Please remain at your desk.'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Timeline slots' })).toBeNull()
    })
  })
})
