import { Component, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/**
 * Keeps a failed page load (offline, or a file replaced by a new deploy) from blanking the
 * whole site. Shows the memo-voice error with a Retry that reloads.
 */
export default class RouteErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="wrap" style={{ paddingBlock: '48px', display: 'grid', gap: '16px', justifyItems: 'start' }}>
        <p className="hud">Transmission interrupted</p>
        <p style={{ margin: 0, maxWidth: '60ch' }}>Transmission interrupted. Check your connection, then retry.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            font: '13px/1 var(--f-hud)', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '10px 16px',
            background: 'var(--orange)', color: 'var(--ink)', border: '1px solid var(--orange)',
          }}
        >
          Retry
        </button>
      </main>
    )
  }
}
