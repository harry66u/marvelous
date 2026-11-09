import { fireEvent, render, screen } from '@testing-library/react'
import DayEditor from './DayEditor'
import type { Character, Schedule } from '../content/types'

const ch = (id: string, name: string): Character => ({
  id, name, aliases: [], realName: null, primaryTeam: 'none', teams: [], world: 'avengers', debutYear: 1970, debutIssue: 'X #1',
  debutDate: '1970-01', alignment: 'hero', origin: 'mutant', gender: 'male', mcu: false, mcuFirst: null,
  answerOk: true, difficulty: 2, caseNote: 'Subject exists.', archetype: 'caped', sources: ['https://x'], notes: '',
})
const chars = [ch('storm', 'Storm'), ch('rogue', 'Rogue')]
const schedule: Schedule = { launchDate: '2026-11-01', days: { '2026-11-02': { unmasked: 'storm' } } }

afterEach(() => vi.useRealTimers())

function setup(date: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T18:00:00Z'))
  const onPick = vi.fn()
  const onClear = vi.fn()
  render(<DayEditor date={date} schedule={schedule} chars={chars} issues={[]} onPick={onPick} onClear={onClear} />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'rogue' } })
  return { onPick, onClear }
}

describe('DayEditor', () => {
  it('locks days already issued until the owner confirms', () => {
    const { onPick } = setup('2026-11-06')
    const pick = screen.getByRole('button', { name: /rogue/i })
    expect(pick).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /already been issued/i }))
    fireEvent.click(screen.getByRole('button', { name: /rogue/i }))
    expect(onPick).toHaveBeenCalledWith('rogue')
  })

  it('leaves future days editable', () => {
    const { onPick } = setup('2026-11-20')
    fireEvent.click(screen.getByRole('button', { name: /rogue/i }))
    expect(onPick).toHaveBeenCalledWith('rogue')
  })
})
