import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProgressProvider } from '../data/progress'
import { STORE_KEY } from '../lib/progress'
import SettingsDialog from './SettingsDialog'

afterEach(() => localStorage.clear())

const setup = () =>
  render(
    <ProgressProvider>
      <SettingsDialog open onClose={() => {}} />
    </ProgressProvider>,
  )

describe('SettingsDialog', () => {
  it('has two labelled radio groups', () => {
    setup()
    expect(screen.getByRole('radiogroup', { name: /sound/i })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: /motion/i })).toBeInTheDocument()
  })

  it('persists sound:true when Sound On is chosen', async () => {
    setup()
    await userEvent.click(screen.getByRole('radio', { name: 'On' }))
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').settings.sound).toBe(true)
    expect(screen.getByText(/Audio: On/)).toBeInTheDocument()
  })

  it('choosing Reduced sets the motion attribute', async () => {
    setup()
    await userEvent.click(screen.getByRole('radio', { name: 'Reduced' }))
    expect(document.documentElement.dataset.motion).toBe('reduce')
  })
})
