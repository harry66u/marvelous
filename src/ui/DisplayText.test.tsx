import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DisplayText from './DisplayText'

describe('DisplayText', () => {
  it('renders the text once in the accessibility tree', () => {
    render(<DisplayText text="UNMASKED" />)
    expect(screen.getAllByText('UNMASKED')).toHaveLength(1)
  })

  it('carries the text in data-text for the shade layer', () => {
    render(<DisplayText text="B-LIST" />)
    expect(screen.getByText('B-LIST')).toHaveAttribute('data-text', 'B-LIST')
  })

  it('renders a span by default', () => {
    render(<DisplayText text="RETCON" />)
    expect(screen.getByText('RETCON').tagName).toBe('SPAN')
  })

  it('uses the requested element', () => {
    render(<DisplayText text="UNMASKED" as="h1" />)
    const heading = screen.getByRole('heading', { level: 1, name: 'UNMASKED' })
    expect(heading).toHaveAttribute('data-text', 'UNMASKED')
  })

  it('keeps the caller class and marks the tone', () => {
    const { rerender } = render(<DisplayText text="CASE CLOSED" className="title" />)
    const el = screen.getByText('CASE CLOSED')
    expect(el).toHaveClass('title')
    expect(el).toHaveAttribute('data-tone', 'paper')
    rerender(<DisplayText text="CASE CLOSED" className="title" tone="dark" />)
    expect(screen.getByText('CASE CLOSED')).toHaveAttribute('data-tone', 'dark')
  })
})
