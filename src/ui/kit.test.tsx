import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ActionList from './ActionList'
import Clock24 from './Clock24'
import Dialog from './Dialog'
import Stamp from './Stamp'
import Ticket from './Ticket'
import IconRail from './IconRail'
import AppShell from './AppShell'
import { useAnnounce } from './LiveRegion'

afterEach(() => {
  document.documentElement.removeAttribute('data-motion')
})

describe('Dialog', () => {
  it('calls onClose on Escape and on the close button', async () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Settings">
        <p>body</p>
      </Dialog>,
    )
    const dlg = document.querySelector('dialog') as HTMLDialogElement
    expect(dlg.open).toBe(true)
    dlg.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('closes the native dialog when open becomes false', () => {
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="T">x</Dialog>,
    )
    rerender(<Dialog open={false} onClose={() => {}} title="T">x</Dialog>)
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false)
  })
})

describe('ActionList', () => {
  it('numbers items 1. to 3.', () => {
    render(
      <ActionList
        title="Actions"
        items={[{ label: 'Alpha' }, { label: 'Beta', href: '/b' }, { label: 'Gamma', onSelect: () => {} }]}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual(['1.Alpha', '2.Beta', '3.Gamma'])
  })
  it('calls onSelect', async () => {
    const fn = vi.fn()
    render(<ActionList title="A" items={[{ label: 'Go', onSelect: fn }]} />)
    await userEvent.click(screen.getByRole('button', { name: /go/i }))
    expect(fn).toHaveBeenCalled()
  })
})

describe('Ticket', () => {
  it('exposes its status text', () => {
    render(<Ticket no="01" title="Unmasked" subtitle="Identify" status="filed" statusText="Filed 3/6" />)
    expect(screen.getByText('Filed 3/6')).toBeInTheDocument()
    expect(screen.getByText('Unmasked')).toBeInTheDocument()
  })
  it('is a link when href is given', () => {
    render(<Ticket no="01" title="Unmasked" subtitle="s" status="pending" statusText="Open" href="/unmasked" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/unmasked')
  })
})

describe('Clock24', () => {
  it('labels 37,020,000 ms as 10 hours 17 minutes', () => {
    render(<Clock24 msRemaining={37_020_000} />)
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      '10 hours 17 minutes until the next assignment',
    )
  })
  it('uses singular units', () => {
    render(<Clock24 msRemaining={3_660_000} />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '1 hour 1 minute until the next assignment')
  })
})

describe('Stamp', () => {
  it('animates when play is true', () => {
    render(<Stamp text="CLOSED" play />)
    expect(screen.getByTestId('stamp').className).toMatch(/slam/)
  })
  it('has no animation class under reduced motion', () => {
    document.documentElement.setAttribute('data-motion', 'reduce')
    render(<Stamp text="CLOSED" play />)
    expect(screen.getByTestId('stamp').className).not.toMatch(/slam/)
  })
  it('is hidden until played', () => {
    render(<Stamp text="CLOSED" play={false} />)
    expect(screen.getByTestId('stamp').className).not.toMatch(/slam/)
  })
})

describe('IconRail', () => {
  it('renders labelled buttons and links with pressed state', () => {
    render(
      <IconRail
        items={[
          { id: 'home', label: 'Home', icon: 'home', href: '/' },
          { id: 's', label: 'Sound is off', icon: 'sound-off', pressed: false, onSelect: () => {} },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Sound is off' })).toHaveAttribute('aria-pressed', 'false')
  })
})

function Announcer() {
  const announce = useAnnounce()
  return <button onClick={() => announce('Filed.')}>go</button>
}

describe('AppShell', () => {
  it('renders the footer, status strip and announces politely', async () => {
    render(
      <AppShell section="Kit">
        <Announcer />
      </AppShell>,
    )
    expect(
      screen.getByText(
        'Marvelous is an unofficial fan game. Not affiliated with, endorsed by, or sponsored by Marvel or Disney. Character names are used for identification only. All artwork is original.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/M\.A\.R\.V\.E\.L\.O\.U\.S\./)).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'go' }))
    const live = screen.getByRole('status')
    expect(within(live).getByText('Filed.')).toBeInTheDocument()
    expect(live).toHaveAttribute('aria-live', 'polite')
  })
  it('ticks the ET clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T15:00:00Z'))
    render(<AppShell section="Kit">x</AppShell>)
    expect(screen.getByText(/10:00:00 ET/)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText(/10:00:02 ET/)).toBeInTheDocument()
    vi.useRealTimers()
  })
})
