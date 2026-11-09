import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FieldManual from './FieldManual'

describe('FieldManual', () => {
  it('explains every count and every mark in plain words', () => {
    render(<FieldManual open onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Field manual' })
    for (const term of ['World', 'Debut', 'Alignment', 'Origin', 'Gender', 'MCU']) {
      expect(within(dialog).getByText(term, { selector: 'dt' })).toBeInTheDocument()
    }
    expect(within(dialog).getByText(/Exact \(orange\)/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Close \(mustard\)/)).toBeInTheDocument()
    expect(within(dialog).getByText(/No match \(brown\)/)).toBeInTheDocument()
    expect(within(dialog).getByText(/six attempts/)).toBeInTheDocument()
  })

  it('closes from its own button', async () => {
    const onClose = vi.fn()
    render(<FieldManual open onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Understood' }))
    expect(onClose).toHaveBeenCalled()
  })
})
