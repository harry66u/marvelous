import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { CharactersState } from '../../../data/useCharacters'
import type { DayState } from '../../../data/useDay'
import { ProgressProvider } from '../../../data/progress'
import { STORE_KEY } from '../../../lib/progress'
import { puzzleNumber } from '../../../lib/time'
import { encodeAnswer, encodePayload, type DayBundle } from '../../../server/dayBundle'
import BlistPage from './BlistPage'
import { DATE, PROMPTS, ROSTER, blistDay, seedStore, stored } from './fixtures'

const h = vi.hoisted(() => ({
  chars: undefined as unknown as CharactersState,
  day: undefined as unknown as (date: string) => DayState,
}))
vi.mock('../../../data/useCharacters', () => ({ useCharacters: () => h.chars }))
vi.mock('../../../data/useDay', () => ({ useDay: (date: string) => h.day(date) }))

function readyDays() {
  const bundles = new Map<string, DayBundle>()
  const retry = vi.fn()
  return (date: string): DayState => {
    let bundle = bundles.get(date)
    if (!bundle) {
      bundle = {
        date,
        number: puzzleNumber('2026-11-06', date),
        launchDate: '2026-11-06',
        games: ['unmasked', 'blist'],
        unmasked: { key: encodeAnswer('storm', date) },
        blist: { key: encodePayload(PROMPTS, date) },
      }
      bundles.set(date, bundle)
    }
    return { status: 'ready', bundle, retry }
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/b-list']}>
      <ProgressProvider>
        <BlistPage />
      </ProgressProvider>
    </MemoryRouter>,
  )
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })
const answerBox = () => screen.getByRole('textbox', { name: 'Your answer' }) as HTMLInputElement
const timer = () => screen.getByRole('timer', { name: 'Time remaining' })
const announced = (text: string) => screen.getAllByText(text).some((el) => el.closest('[aria-live]'))

function file(text: string) {
  fireEvent.change(answerBox(), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'File' }))
}

/** Let the "Incoming request" beat finish. */
const arrive = () => advance(1000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-11-06T17:00:00Z'))
  h.chars = { status: 'ready', characters: ROSTER, byId: new Map(ROSTER.map((c) => [c.id, c])), retry: vi.fn() }
  h.day = readyDays()
  seedStore()
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('BlistPage', () => {
  it('sets the title and shows the terminal header', () => {
    renderPage()
    expect(document.title).toBe('B-List · Marvelous')
    expect(screen.getByRole('heading', { level: 1, name: 'B-LIST' })).toBeInTheDocument()
    expect(screen.getByText('Form 12C // Records search // Request 1 of 7')).toBeInTheDocument()
  })

  it('runs incoming → valid answer → reveal → next request', () => {
    renderPage()
    expect(screen.getByText('Incoming request')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(stored()).toBeUndefined() // the clock has not started

    arrive()
    expect(screen.getByRole('heading', { name: 'Name a member of the Fantastic Four' })).toBeInTheDocument()
    expect(answerBox()).toHaveFocus()
    expect(timer()).toHaveTextContent('25')
    expect(stored().state.startedAt).toBe(Date.now())

    advance(4000)
    expect(timer()).toHaveTextContent('21')
    file('reed richards')
    expect(screen.getByText('Retrieving record')).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Depth 0 ft · Ground level' })).toBeInTheDocument()

    advance(600)
    const drawer = screen.getByRole('region', { name: 'Mister Fantastic' })
    expect(within(drawer).getByText('Common Record')).toBeInTheDocument()
    expect(within(drawer).getByText('+10 pts')).toBeInTheDocument()
    expect(within(drawer).getByRole('button', { name: 'Next request' })).toHaveFocus()
    expect(screen.getByRole('figure', { name: 'Depth 100 ft · Ground level' })).toBeInTheDocument()
    expect(announced('Record retrieved: Mister Fantastic. Common Record, 10 points. Depth 100 ft, Ground level.')).toBe(true)
    expect(stored().state.results).toEqual([{ answer: 'Mister Fantastic', tier: 'common', points: 10 }])

    fireEvent.click(within(drawer).getByRole('button', { name: 'Next request' }))
    expect(screen.getByText('Incoming request')).toBeInTheDocument()
    arrive()
    expect(screen.getByRole('heading', { name: 'Name a record from drawer 1' })).toBeInTheDocument()
    expect(screen.getByText('Form 12C // Records search // Request 2 of 7')).toBeInTheDocument()
    expect(answerBox()).toHaveValue('')
  })

  it('moves on from a filed record by itself after two seconds', () => {
    renderPage()
    arrive()
    file('lyja')
    advance(600)
    expect(screen.getByRole('region', { name: 'Lyja' })).toBeInTheDocument()
    expect(screen.getByText('Sealed Archive')).toBeInTheDocument()
    advance(2000)
    expect(screen.getByText('Incoming request')).toBeInTheDocument()
    arrive()
    expect(screen.getByRole('heading', { name: 'Name a record from drawer 1' })).toBeInTheDocument()
  })

  it('a miss shows the memo, keeps the text selected and costs 3 seconds', () => {
    renderPage()
    arrive()
    file('Galactus')
    expect(screen.getByText('Record on file, but not responsive to this request: Galactus. −3 s')).toBeInTheDocument()
    expect(announced('Record on file, but not responsive to this request: Galactus. Minus 3 seconds.')).toBe(true)
    expect(timer()).toHaveTextContent('22')
    const box = answerBox()
    expect(box).toHaveValue('Galactus')
    expect(box).toHaveFocus()
    expect([box.selectionStart, box.selectionEnd]).toEqual([0, 'Galactus'.length])

    file('Qwertyuiop')
    expect(screen.getByText('No record on file. −3 s')).toBeInTheDocument()
    expect(timer()).toHaveTextContent('19')

    // the same wrong name is charged once
    file('qwertyuiop')
    expect(screen.getByText('No record on file. Already charged.')).toBeInTheDocument()
    expect(timer()).toHaveTextContent('19')
    expect(stored().state.penaltyMs).toBe(6000)
  })

  it('a timeout files "Request expired" for 0 points and announces 10 and 5 seconds', () => {
    renderPage()
    arrive()
    advance(15_000)
    expect(timer()).toHaveTextContent('10')
    expect(announced('10 seconds')).toBe(true)
    advance(5_000)
    expect(announced('5 seconds')).toBe(true)
    advance(5_100)
    const drawer = screen.getByRole('region', { name: 'Request expired' })
    expect(within(drawer).getByText('0 pts')).toBeInTheDocument()
    expect(stored().state.results).toEqual([{ answer: null, tier: null, points: 0 }])
    expect(stored().state.current).toBe(1)
  })

  it('resumes a running clock after a reload without a new incoming beat', () => {
    seedStore({}, blistDay([['Thing', 'common']], { startedAt: Date.now() - 10_000 }))
    renderPage()
    expect(screen.queryByText('Incoming request')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Name a record from drawer 1' })).toBeInTheDocument()
    expect(timer()).toHaveTextContent('15')
    expect(answerBox()).toHaveFocus()
    expect(screen.getByText('Form 12C // Records search // Request 2 of 7')).toBeInTheDocument()
  })

  it('a reload between requests brings in the next one', () => {
    seedStore({}, blistDay([['Thing', 'common'], null]))
    renderPage()
    expect(screen.getByText('Incoming request')).toBeInTheDocument()
    arrive()
    expect(screen.getByRole('heading', { name: 'Name a record from drawer 2' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Depth 100 ft · Ground level' })).toBeInTheDocument()
  })

  it('the last record closes the file and focuses the verdict', () => {
    const six: [string, 'sealed'][] = [['Lyja', 'sealed'], ...[1, 2, 3, 4, 5].map((i) => [`Echo${i}`, 'sealed'] as [string, 'sealed'])]
    seedStore({}, blistDay(six))
    renderPage()
    arrive()
    file('echo6')
    advance(600)
    fireEvent.click(screen.getByRole('button', { name: 'Close the file' }))
    const verdict = screen.getByRole('heading', { name: 'Search closed at Sublevel B7.' })
    expect(verdict).toHaveFocus()
    expect(screen.getByText('Form 12C // Records search // Search closed')).toBeInTheDocument()
    advance(450)
    expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false')
    expect(stored()).toMatchObject({ status: 'filed', result: { score: 700, extended: false } })
  })

  it('the end screen shows score, tiers and unclaimed records', () => {
    seedStore(
      {},
      blistDay([
        ['Lyja', 'sealed'],
        ['Bravo1', 'filed'],
        ['Alpha2', 'common'],
        ['Charlie3', 'restricted'],
        ['Delta4', 'classified'],
        null,
        ['Delta6', 'classified'],
      ]),
    )
    renderPage()
    expect(screen.getByRole('heading', { name: 'Search closed at Sublevel B3.' })).toBeInTheDocument()
    expect(screen.getByText('370 / 700')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Search ledger' })).getByText('3,700 ft')).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Depth 3,700 ft · Sublevel B3' })).toBeInTheDocument()
    expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false')

    const ledger = screen.getByRole('article', { name: 'Search ledger' })
    const rows = within(ledger).getAllByRole('listitem')
    expect(rows).toHaveLength(7)
    expect(within(rows[0]!).getByText('Lyja')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Sealed Archive')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('100 pts')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Filed')).toBeInTheDocument()
    expect(within(rows[5]!).getByText('Request expired')).toBeInTheDocument()
    expect(within(rows[5]!).getByText('No record')).toBeInTheDocument()
    expect(within(rows[5]!).getByText('0 pts')).toBeInTheDocument()

    const unclaimed = screen.getByRole('region', { name: 'Unclaimed records' })
    const items = within(unclaimed).getAllByText(/^Request \d$/).map((el) => el.closest('li')!)
    // request 1: Lyja was filed, so the classified record is what is left
    expect(within(items[0]!).getByText('Ms. Marvel (Sharon Ventura)')).toBeInTheDocument()
    expect(within(items[0]!).queryByText('Lyja')).toBeNull()
    // request 6 expired: both sealed records are left
    expect(within(items[5]!).getByText('Echo5')).toBeInTheDocument()
    expect(within(items[5]!).getByText('Foxtrot5')).toBeInTheDocument()
    expect(within(items[5]!).queryByText('Delta5')).toBeNull()
  })

  it('Copy report writes the combined report to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    seedStore({}, blistDay([['Lyja', 'sealed'], ['Bravo1', 'filed'], ['Alpha2', 'common'], ['Charlie3', 'restricted'], ['Delta4', 'classified'], null, ['Delta6', 'classified']]))
    renderPage()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy report' }))
    })
    const text = writeText.mock.calls[0]![0] as string
    expect(text).toContain('MARVELOUS #001 · 06 NOV 2026')
    expect(text).toContain('UNMASKED PENDING')
    expect(text).toContain('B-LIST 370/700 · SUBLEVEL B3\n⬛🟨⬜🟧🟥➖🟥')
    expect(text).not.toContain('RETCON')
    expect(screen.getByText('Report copied to the clipboard.')).toBeInTheDocument()
  })

  it('offers the report as selectable text when the clipboard is refused', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true })
    seedStore({}, blistDay(Array.from({ length: 7 }, () => null)))
    renderPage()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy report' }))
    })
    const box = screen.getByRole('textbox', { name: 'Report text' }) as HTMLTextAreaElement
    expect(box.value).toContain('B-LIST 0/700 · GROUND LEVEL')
    expect(box).toHaveFocus()
  })

  it('labels the extended timer and does not move on by itself', () => {
    seedStore({ extendedTimer: true })
    renderPage()
    arrive()
    expect(screen.getByText('Form 12C // Records search // Request 1 of 7 // Extended timer')).toBeInTheDocument()
    expect(timer()).toHaveTextContent('50')
    file('thing')
    advance(600 + 5000)
    expect(screen.getByRole('button', { name: 'Next request' })).toBeInTheDocument()
  })

  it('opens the field manual on the first visit, holds the clock, and remembers it was read', () => {
    seedStore({ seenManual: {} })
    renderPage()
    const dialog = screen.getByRole('dialog', { name: 'Field manual' })
    expect(within(dialog).getByText('Sealed Archive')).toBeInTheDocument()
    advance(3000)
    expect(stored()).toBeUndefined() // the clock waits for the memo to be read
    fireEvent.click(within(dialog).getByRole('button', { name: 'Understood' }))
    expect(screen.queryByRole('dialog', { name: 'Field manual' })).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').settings.seenManual.blist).toBe(true)
    arrive()
    expect(answerBox()).toHaveFocus()
  })

  it('does not reopen the field manual once read', () => {
    renderPage()
    expect(screen.queryByRole('dialog', { name: 'Field manual' })).toBeNull()
  })

  it('opens statistics from the rail with tier counts', () => {
    seedStore({}, blistDay([['Lyja', 'sealed'], ['Bravo1', 'filed'], ['Alpha2', 'common'], ['Charlie3', 'restricted'], ['Delta4', 'classified'], null, ['Delta6', 'classified']]))
    renderPage()
    const rail = screen.getByRole('navigation', { name: 'Terminal menu' })
    fireEvent.click(within(rail).getByRole('button', { name: 'Statistics' }))
    const dialog = screen.getByRole('dialog', { name: 'Statistics' })
    expect(within(dialog).getByText('Best score').nextElementSibling).toHaveTextContent('370')
    expect(within(dialog).getByText('Deepest sublevel').nextElementSibling).toHaveTextContent('B3')
    const classified = within(dialog).getByRole('row', { name: /Classified/ })
    expect(classified).toHaveTextContent('2')
  })

  it('shows the memo for an unscheduled day', () => {
    h.day = () => ({ status: 'none', retry: vi.fn() })
    renderPage()
    expect(screen.getByText('No records requests have been issued for this date. Please remain at your desk.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('offers a retry when the transmission fails', () => {
    const retry = vi.fn()
    h.day = () => ({ status: 'error', retry })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('shows the loading line while the requests are retrieved', () => {
    h.day = () => ({ status: 'loading', retry: vi.fn() })
    renderPage()
    expect(screen.getByText("Retrieving today's requests…")).toBeInTheDocument()
  })

  it('files to the start date when the shift runs past midnight', () => {
    vi.setSystemTime(new Date('2026-11-07T04:59:50Z')) // 23:59:50 Eastern on 6 Nov
    renderPage()
    arrive()
    advance(15_000) // 00:00:05 Eastern on 7 Nov
    file('thing')
    expect(stored(DATE).state.results).toHaveLength(1)
    expect(stored('2026-11-07')).toBeUndefined()
  })
})
