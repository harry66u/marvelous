import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProgressProvider } from '../../../data/progress'
import { encodeAnswer, encodePayload, type DayBundle } from '../../../server/dayBundle'
import BlistPage from './BlistPage'
import { DATE, PROMPTS, ROSTER, seedStore, stored } from './fixtures'

/** Goes through the real data layer: /api/day and the character file are served by a stubbed fetch. */
const bundle: DayBundle = {
  date: DATE,
  number: 1,
  launchDate: DATE,
  games: ['unmasked', 'blist'],
  unmasked: { key: encodeAnswer('storm', DATE) },
  blist: { key: encodePayload(PROMPTS, DATE) },
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

const flush = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-11-06T17:00:00Z'))
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => Promise.resolve(String(url).startsWith('/api/day') ? json(bundle) : json(ROSTER))),
  )
  seedStore({ motion: 'reduce' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})

it('plays a whole shift from a served day bundle', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  render(
    <MemoryRouter initialEntries={['/b-list']}>
      <ProgressProvider>
        <BlistPage />
      </ProgressProvider>
    </MemoryRouter>,
  )
  expect(screen.getByText("Retrieving today's requests…")).toBeInTheDocument()
  await flush()
  expect(fetch).toHaveBeenCalledWith('/api/day?date=2026-11-06')

  const answers = ['mr fantastic', 'Echo1', 'Delta2', 'Charlie3', 'Bravo4', 'Alpha5', 'Foxtrott6']
  for (const [i, answer] of answers.entries()) {
    await flush() // reduced motion: the incoming beat is immediate
    expect(screen.getByRole('heading', { name: PROMPTS[i]!.text })).toBeInTheDocument()
    const box = screen.getByRole('textbox', { name: 'Your answer' })
    expect(box).toHaveFocus()
    fireEvent.change(box, { target: { value: answer } })
    fireEvent.submit(box.closest('form')!)
    await flush(600)
    fireEvent.click(screen.getByRole('button', { name: i === 6 ? 'Close the file' : 'Next request' }))
  }

  // 10 + 100 + 85 + 60 + 30 + 10 + 100 ("Foxtrott6" is forgiven as Foxtrot6)
  expect(screen.getByRole('heading', { name: 'Search closed at Sublevel B3.' })).toHaveFocus()
  expect(screen.getByText('395 / 700')).toBeInTheDocument()
  expect(stored()).toMatchObject({ status: 'filed', result: { score: 395, tiers: ['common', 'sealed', 'classified', 'restricted', 'filed', 'common', 'sealed'] } })

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }))
  })
  expect(writeText.mock.calls[0]![0]).toContain('B-LIST 395/700 · SUBLEVEL B3\n⬜⬛🟥🟧🟨⬜⬛')
})
