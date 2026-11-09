import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { PublicCharacter } from '../../../content/types'
import type { CharactersState } from '../../../data/useCharacters'
import type { DayState } from '../../../data/useDay'
import { ProgressProvider } from '../../../data/progress'
import { STORE_KEY } from '../../../lib/progress'
import { buildReport } from '../../../lib/share'
import { puzzleNumber } from '../../../lib/time'
import { encodeAnswer, type DayBundle } from '../../../server/dayBundle'
import { galactus, miles, modok, peter, rogue, storm, strange } from '../logic/fixtures'
import UnmaskedPage from './UnmaskedPage'

const h = vi.hoisted(() => ({
  chars: undefined as unknown as CharactersState,
  day: undefined as unknown as (date: string) => DayState,
}))
vi.mock('../../../data/useCharacters', () => ({ useCharacters: () => h.chars }))
vi.mock('../../../data/useDay', () => ({ useDay: (date: string) => h.day(date) }))

const subject: PublicCharacter = {
  ...storm,
  debutIssue: 'Giant-Size X-Men #1',
  debutDate: '1975-05',
  caseNote: 'Subject commands weather on a planetary scale.',
}
const roster = [subject, rogue, galactus, peter, miles, modok, strange]
const ROGUE_ROW =
  'Rogue. World X-Men, exact. Debut 1980s, close, the subject debuted earlier. ' +
  'Alignment Hero, exact. Origin Mutant, exact. Gender Female, exact. MCU No, exact. Not the subject.'

function readyCharacters(): CharactersState {
  return { status: 'ready', characters: roster, byId: new Map(roster.map((c) => [c.id, c])), retry: vi.fn() }
}

/** A day hook that serves a stable bundle per date; `answers` overrides the default answer (Storm). */
function readyDays(answers: Record<string, string> = {}) {
  const bundles = new Map<string, DayBundle>()
  const retry = vi.fn()
  return (date: string): DayState => {
    let bundle = bundles.get(date)
    if (!bundle) {
      bundle = {
        date,
        number: puzzleNumber('2026-11-06', date),
        launchDate: '2026-11-06',
        games: ['unmasked'],
        unmasked: { key: encodeAnswer(answers[date] ?? 'storm', date) },
      }
      bundles.set(date, bundle)
    }
    return { status: 'ready', bundle, retry }
  }
}

function seedStore(settings: Record<string, unknown> = {}) {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      version: 1,
      days: {},
      settings: { sound: false, motion: 'reduce', seenManual: { unmasked: true }, ...settings },
    }),
  )
}

function stored(date = '2026-11-06') {
  return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').days?.[date]?.games?.unmasked
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/unmasked']}>
      <ProgressProvider>
        <UnmaskedPage />
      </ProgressProvider>
    </MemoryRouter>,
  )
}

const searchBox = () => screen.getByRole('combobox', { name: 'Enter subject name' })

async function guess(user: UserEvent, query: string) {
  await user.clear(searchBox())
  await user.type(searchBox(), `${query}{Enter}`)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T17:00:00Z'))
  h.chars = readyCharacters()
  h.day = readyDays()
  seedStore()
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('UnmaskedPage', () => {
  it('typing "sto" + Enter files Storm', async () => {
    const user = userEvent.setup()
    renderPage()
    await guess(user, 'sto')
    const list = screen.getByRole('list', { name: 'Attempts on file' })
    expect(within(list).getByText(/^Storm\. World X-Men, exact\./)).toBeInTheDocument()
    expect(stored().state.guesses).toEqual(['storm'])
  })

  it('blocks a repeat guess', async () => {
    const user = userEvent.setup()
    renderPage()
    await guess(user, 'rogue')
    await guess(user, 'rogue')
    const list = screen.getByRole('list', { name: 'Attempts on file' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Rogue is already on file. Choose another subject.')).toBeInTheDocument()
    expect(stored().state.guesses).toEqual(['rogue'])
  })

  it('six misses show the loss copy and the ID card', async () => {
    const user = userEvent.setup()
    renderPage()
    for (const q of ['rogue', 'galactus', 'modok', 'doctor strange', 'miles', 'peter']) await guess(user, q)
    expect(
      screen.getByRole('heading', { name: 'Subject at large. The file has been closed anyway.' }),
    ).toBeInTheDocument()
    const card = screen.getByRole('article', { name: 'Confirm identity' })
    expect(within(card).getByText('Storm', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(stored()).toMatchObject({ status: 'filed', result: { attempts: 6, solved: false } })
  })

  it('the correct guess shows the win copy and the stamp', async () => {
    const user = userEvent.setup()
    renderPage()
    await guess(user, 'rogue')
    await guess(user, 'storm')
    const verdict = screen.getByRole('heading', { name: 'Identity confirmed in 2 of 6 attempts.' })
    expect(verdict).toHaveFocus()
    await waitFor(() => expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false'))
    expect(screen.getByTestId('stamp')).toHaveTextContent('CASE CLOSED')
    expect(screen.getByTestId('stamp')).toHaveTextContent('Filed 06 NOV 2026')
    expect(stored()).toMatchObject({ status: 'filed', result: { attempts: 2, solved: true } })
  })

  it('announces each filed row to screen readers', async () => {
    const user = userEvent.setup()
    renderPage()
    await guess(user, 'rogue')
    const list = screen.getByRole('list', { name: 'Attempts on file' })
    expect(within(list).getByText(ROGUE_ROW)).toBeInTheDocument()
    expect(screen.getAllByText(ROGUE_ROW).some((el) => el.closest('[aria-live]'))).toBe(true)
  })

  it('restores the state after a remount', async () => {
    const user = userEvent.setup()
    const first = renderPage()
    await guess(user, 'rogue')
    await guess(user, 'galactus')
    first.unmount()
    renderPage()
    const list = screen.getByRole('list', { name: 'Attempts on file' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getByText(ROGUE_ROW)).toBeInTheDocument()
    expect(screen.getByText(/Attempt 3 of 6/)).toBeInTheDocument()
  })

  it('restores a closed case with the stamp already applied', async () => {
    const user = userEvent.setup()
    const first = renderPage()
    await guess(user, 'storm')
    first.unmount()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Identity confirmed in 1 of 6 attempts.' })).toBeInTheDocument()
    expect(screen.getByTestId('stamp')).toHaveAttribute('aria-hidden', 'false')
  })

  it('finishing after midnight files to the start date', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-11-07T04:58:00Z')) // 23:58 Eastern on 6 Nov
    h.day = readyDays({ '2026-11-07': 'galactus' })
    renderPage()
    const file = (query: string) => {
      fireEvent.change(searchBox(), { target: { value: query } })
      fireEvent.keyDown(searchBox(), { key: 'Enter' })
    }
    file('rogue')
    act(() => {
      vi.advanceTimersByTime(5 * 60_000) // 00:03 Eastern on 7 Nov
    })
    file('storm')
    expect(stored('2026-11-06')).toMatchObject({ status: 'filed', result: { attempts: 2, solved: true } })
    expect(stored('2026-11-07')).toBeUndefined()
    expect(screen.getByRole('heading', { name: 'Identity confirmed in 2 of 6 attempts.' })).toBeInTheDocument()
  })

  it('a reload after midnight resumes the unfinished case from the day before', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-11-07T04:58:00Z')) // 23:58 Eastern on 6 Nov
    h.day = readyDays({ '2026-11-07': 'galactus' })
    const first = renderPage()
    fireEvent.change(searchBox(), { target: { value: 'rogue' } })
    fireEvent.keyDown(searchBox(), { key: 'Enter' })
    first.unmount()
    vi.setSystemTime(new Date('2026-11-07T05:03:00Z')) // 00:03 Eastern on 7 Nov, fresh mount
    renderPage()
    fireEvent.change(searchBox(), { target: { value: 'storm' } })
    fireEvent.keyDown(searchBox(), { key: 'Enter' })
    expect(stored('2026-11-06')).toMatchObject({ status: 'filed', result: { attempts: 2, solved: true } })
    expect(stored('2026-11-07')).toBeUndefined()
  })

  it('Copy report writes the buildReport text to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()
    await guess(user, 'rogue')
    await guess(user, 'storm')
    await user.click(screen.getByRole('button', { name: 'Copy report' }))
    expect(writeText).toHaveBeenCalledWith(
      buildReport({
        number: 1,
        date: '2026-11-06',
        unmasked: {
          attempts: 2,
          solved: true,
          rows: [
            ['exact', 'close', 'exact', 'exact', 'exact', 'exact'],
            ['exact', 'exact', 'exact', 'exact', 'exact', 'exact'],
          ],
        },
        shifts: 1,
        url: `${window.location.origin}/`,
      }),
    )
    expect(await screen.findByText('Report copied to the clipboard.')).toBeInTheDocument()
  })

  it('offers the report as selectable text when the clipboard is refused', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage()
    await guess(user, 'storm')
    await user.click(screen.getByRole('button', { name: 'Copy report' }))
    const box = await screen.findByRole('textbox', { name: 'Report text' })
    expect((box as HTMLTextAreaElement).value).toMatch(/^MARVELOUS #001 · 06 NOV 2026\nUNMASKED 1\/6\n/)
    expect(box).toHaveFocus()
  })

  it('shows the memo for an unscheduled day', () => {
    h.day = () => ({ status: 'none', retry: vi.fn() })
    renderPage()
    expect(
      screen.getByText('No assignments have been issued for this date. Please remain at your desk.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('offers a retry when the transmission fails', async () => {
    const retry = vi.fn()
    h.day = () => ({ status: 'error', retry })
    renderPage()
    expect(screen.getByText('Transmission interrupted. Check your connection, then retry.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('opens the field manual on the first visit and remembers it was read', async () => {
    seedStore({ seenManual: {} })
    renderPage()
    const dialog = screen.getByRole('dialog', { name: 'Field manual' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Understood' }))
    expect(screen.queryByRole('dialog', { name: 'Field manual' })).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').settings.seenManual.unmasked).toBe(true)
  })

  it('does not reopen the field manual once read', () => {
    renderPage()
    expect(screen.queryByRole('dialog', { name: 'Field manual' })).toBeNull()
  })

  it('opens statistics from the rail', async () => {
    renderPage()
    const rail = screen.getByRole('navigation', { name: 'Terminal menu' })
    await userEvent.click(within(rail).getByRole('button', { name: 'Statistics' }))
    expect(screen.getByRole('dialog', { name: 'Statistics' })).toBeInTheDocument()
  })

  it('toggles sound from the rail', async () => {
    renderPage()
    const rail = screen.getByRole('navigation', { name: 'Terminal menu' })
    const sound = within(rail).getByRole('button', { name: 'Sound effects' })
    expect(sound).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(sound)
    expect(sound).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').settings.sound).toBe(true)
  })

  it('notes the required games for the day', () => {
    renderPage()
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').days['2026-11-06'].required).toEqual(['unmasked'])
  })
})
