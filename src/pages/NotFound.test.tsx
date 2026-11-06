import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import NotFound from './NotFound'

describe('NotFound', () => {
  it('says the form is missing and links back to the desk', () => {
    render(
      <MemoryRouter initialEntries={['/nowhere']}>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Form not found.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to your desk.' })).toHaveAttribute('href', '/')
  })
})
