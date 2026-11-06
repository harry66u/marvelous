import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildSearchIndex } from '../logic/search'
import { filler, galactus, miles, modok, peter, rogue, storm, strange } from '../logic/fixtures'
import SubjectSearch from './SubjectSearch'

const index = buildSearchIndex([storm, rogue, galactus, peter, miles, modok, strange, ...filler])

function setup(guessed: ReadonlySet<string> = new Set()) {
  const user = userEvent.setup()
  const onFile = vi.fn()
  render(<SubjectSearch index={index} guessed={guessed} onFile={onFile} />)
  const input = screen.getByRole('combobox', { name: 'Enter subject name' })
  return { user, onFile, input }
}

describe('SubjectSearch', () => {
  it('is an ARIA 1.2 combobox wired to its listbox', async () => {
    const { user, input } = setup()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    await user.type(input, 'x')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    const listbox = screen.getByRole('listbox')
    expect(input).toHaveAttribute('aria-controls', listbox.id)
    const options = within(listbox).getAllByRole('option')
    expect(options).toHaveLength(8)
    expect(input).not.toHaveAttribute('aria-activedescendant')
    await user.keyboard('{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}{ArrowUp}{ArrowUp}')
    expect(input).toHaveAttribute('aria-activedescendant', options[7]?.id)
  })

  it('shows the name and the real name in each option', async () => {
    const { user, input } = setup()
    await user.type(input, 'sto')
    const option = screen.getByRole('option', { name: /Storm/ })
    expect(option).toHaveTextContent('Ororo Munroe')
  })

  it('Enter files the top match and clears the field', async () => {
    const { user, input, onFile } = setup()
    await user.type(input, 'sto{Enter}')
    expect(onFile).toHaveBeenCalledWith('storm')
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('ArrowDown and Enter file the highlighted option', async () => {
    const { user, input, onFile } = setup()
    await user.type(input, 'spider')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onFile).toHaveBeenCalledWith('spider-man-miles')
  })

  it('clicking an option files it', async () => {
    const { user, input, onFile } = setup()
    await user.type(input, 'spider')
    await user.click(screen.getByRole('option', { name: /Miles Morales/ }))
    expect(onFile).toHaveBeenCalledWith('spider-man-miles')
  })

  it('dims names already on file and will not file them again', async () => {
    const { user, input, onFile } = setup(new Set(['storm']))
    await user.type(input, 'storm')
    expect(screen.getByRole('option', { name: /Storm/ })).toHaveAttribute('aria-disabled', 'true')
    await user.keyboard('{Enter}')
    expect(onFile).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Storm is already on file. Choose another subject.')
  })

  it('Escape closes the list, and a second Escape clears the field', async () => {
    const { user, input } = setup()
    await user.type(input, 'rog')
    await user.keyboard('{Escape}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveValue('rog')
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('')
  })

  it('the File button files the top match', async () => {
    const { user, input, onFile } = setup()
    await user.type(input, 'gal')
    await user.click(screen.getByRole('button', { name: 'File' }))
    expect(onFile).toHaveBeenCalledWith('galactus')
    expect(input).toHaveFocus()
  })

  it('says what to do when nothing matches', async () => {
    const { user, input, onFile } = setup()
    await user.type(input, 'zzzz{Enter}')
    expect(onFile).not.toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('No record on file. Try a codename, an alias or a real name.')
  })
})
