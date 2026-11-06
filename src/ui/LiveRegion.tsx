import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Announce = (text: string) => void

const AnnounceContext = createContext<Announce>(() => {})

/** Returns a function that speaks a polite message to screen readers. */
export function useAnnounce(): Announce {
  return useContext(AnnounceContext)
}

export function LiveRegion({ message }: { message: { text: string; n: number } }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      <span key={message.n}>{message.text}</span>
    </div>
  )
}

/** Mounted once by AppShell: owns the message and renders the live region. */
export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState({ text: '', n: 0 })
  const announce = useCallback<Announce>((text) => setMessage((m) => ({ text, n: m.n + 1 })), [])
  const value = useMemo(() => announce, [announce])
  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <LiveRegion message={message} />
    </AnnounceContext.Provider>
  )
}
