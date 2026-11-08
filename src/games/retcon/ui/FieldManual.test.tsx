import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FieldManual from './FieldManual'

describe('FieldManual', () => {
  it('covers the anchor, allowances, auto-filing, dates and keys', () => {
    render(<FieldManual open onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Field manual' })
    expect(within(dialog).getByText(/The first record is the\s+anchor/)).toBeInTheDocument()
    expect(within(dialog).getByText(/^You have 3\. /)).toBeInTheDocument()
    expect(within(dialog).getByText(/remaining records are filed automatically/)).toBeInTheDocument()
    expect(within(dialog).getByText(/use the cover date/)).toBeInTheDocument()
    expect(within(dialog).getByText(/first U\.S\. release/)).toBeInTheDocument()
    for (const keys of ['Up / Down', 'Home / End', 'Enter / Space']) {
      expect(within(dialog).getByText(keys, { selector: 'dt' })).toBeInTheDocument()
    }
  })

  it('closes from its own button', async () => {
    const onClose = vi.fn()
    render(<FieldManual open onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Understood' }))
    expect(onClose).toHaveBeenCalled()
  })
})
