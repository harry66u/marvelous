import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { FOOTER_TEXT } from '../../ui/AppShell'
import ManualPage from './ManualPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/manual']}>
      <ManualPage />
    </MemoryRouter>,
  )
}

describe('ManualPage', () => {
  it('holds the Unmasked field manual with every count and the mark legend', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Field manual' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Unmasked/ })).toBeInTheDocument()
    for (const term of ['Affiliation', 'Debut', 'Alignment', 'Origin', 'Gender', 'MCU']) {
      expect(screen.getByText(term, { selector: 'dt' })).toBeInTheDocument()
    }
    expect(screen.getByText(/Exact \(orange\)/)).toBeInTheDocument()
  })

  it('has an About section with the exact disclaimer', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    // once in About, once in the footer
    expect(screen.getAllByText(FOOTER_TEXT)).toHaveLength(2)
  })

  it('credits the typefaces with their licenses and the sources', () => {
    renderPage()
    const credits = screen.getByRole('region', { name: 'Credits and licenses' })
    for (const text of [
      /Marvelous Display.*original.*SIL Open Font License/s,
      /Share Tech Mono.*SIL Open Font License/s,
      /IBM Plex Mono.*SIL Open Font License/s,
      /Special Elite.*Apache License 2\.0/s,
      /Wikipedia/,
    ]) {
      expect(credits.textContent).toMatch(text)
    }
  })

  it('links back to the desk', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Back to the desk' })).toHaveAttribute('href', '/')
  })
})
