import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import OfficePage from './OfficePage'
import { addDays, etDateOf } from '../lib/time'
import type { Character } from '../content/types'

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
const today = etDateOf(new Date())
const chars: Character[] = [0, 1, 2].map((i) => ({
  id: `char-${i}`, name: `Char ${i}`, aliases: [], realName: null, primaryTeam: 'none', teams: [],
  debutYear: 1970, debutIssue: '#1', debutDate: '1970', alignment: 'hero', origin: 'mutant', gender: 'other',
  mcu: false, mcuFirst: null, answerOk: true, difficulty: 2, caseNote: 'n', archetype: 'caped',
  sources: ['https://example.com'], notes: '',
}))
const schedule = { launchDate: today, days: { [today]: { unmasked: 'char-0' }, [addDays(today, 1)]: { unmasked: 'char-1' } } }

function stubApi() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const body = url.endsWith('/repos/harry66u/marvelous')
      ? { default_branch: 'main' }
      : url.includes('schedule.json')
        ? { content: b64(JSON.stringify(schedule)), sha: 's1' }
        : { content: b64(JSON.stringify(chars)), sha: 'c1' }
    return new Response(JSON.stringify(body), { status: 200 })
  }))
}

beforeEach(() => { localStorage.clear(); stubApi() })
afterEach(() => vi.unstubAllGlobals())

const renderPage = () => render(<MemoryRouter><OfficePage /></MemoryRouter>)

describe('OfficePage', () => {
  it('without a token disables Save and explains why', async () => {
    renderPage()
    expect(await screen.findByText('Char 0')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: /^save$/i })
    expect(save).toBeDisabled()
    expect(save).toHaveAccessibleDescription(/read-only.*no token/i)
  })

  it('shows the token steps and stores a pasted token', async () => {
    renderPage()
    await screen.findByText('Char 0')
    expect(screen.getByText(/Fine-grained tokens/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/token/i), 'ghp_test')
    await userEvent.click(screen.getByRole('button', { name: /store token/i }))
    expect(localStorage.getItem('marvelous:office:token')).toBe('ghp_test')
    expect(screen.getByRole('button', { name: /forget/i })).toBeInTheDocument()
  })

  it('flags unscheduled days in the next 14', async () => {
    renderPage()
    await screen.findByText('Char 0')
    await waitFor(() => expect(screen.getAllByText(/unscheduled/i).length).toBeGreaterThan(0))
  })
})
