import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadStore, saveStore, type Store } from '../lib/progress'
import { applyMotionAttribute, effectiveReducedMotion, type Settings } from '../settings/settings'

interface ProgressContextValue {
  store: Store
  /** Apply an immutable update; persisted to localStorage when available. */
  update: (updater: (store: Store) => Store) => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

const prefersReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Single source of truth for local progress and settings. Mount once, around the app. */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const update = useCallback((updater: (store: Store) => Store) => {
    setStore((prev) => {
      const next = updater(prev)
      saveStore(next)
      return next
    })
  }, [])

  // Keep <html data-motion> in sync with the setting and the OS preference.
  useEffect(() => {
    applyMotionAttribute(effectiveReducedMotion(store.settings, prefersReduced()))
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => applyMotionAttribute(effectiveReducedMotion(store.settings, mq.matches))
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [store.settings])

  const value = useMemo(() => ({ store, update }), [store, update])
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>')
  return ctx
}

/** [settings, patch] — persisted through the progress store. */
export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const { store, update } = useProgress()
  const patch = useCallback(
    (p: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...p } })),
    [update],
  )
  return [store.settings, patch]
}
