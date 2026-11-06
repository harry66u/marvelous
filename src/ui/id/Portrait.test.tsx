import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ARCHETYPES, ORIGINS } from '../../content/types'
import { ARCHETYPE_PATHS } from './archetypes'
import { EMBLEMS } from './emblems'
import Portrait from './Portrait'

describe('silhouette and emblem data', () => {
  it.each(ARCHETYPES)('archetype %s has path data', (a) => {
    expect(ARCHETYPE_PATHS[a].length).toBeGreaterThan(0)
    for (const d of ARCHETYPE_PATHS[a]) expect(d).toMatch(/^M/)
  })
  it.each(ORIGINS)('origin %s has emblem paths', (o) => {
    expect(EMBLEMS[o].length).toBeGreaterThan(0)
    for (const d of EMBLEMS[o]) expect(d).toMatch(/^M/)
  })
})

describe('Portrait', () => {
  it('renders an img role with the given label and monogram', () => {
    render(<Portrait archetype="caped" origin="alien" monogram="K-7" title="Sample subject portrait" />)
    expect(screen.getByRole('img', { name: 'Sample subject portrait' })).toBeInTheDocument()
    expect(screen.getByText('K-7')).toBeInTheDocument()
  })
  it('gives each instance unique gradient ids', () => {
    const { container } = render(
      <>
        <Portrait archetype="cowl" origin="magic" monogram="A" title="a" />
        <Portrait archetype="bald" origin="tech" monogram="B" title="b" />
      </>,
    )
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
