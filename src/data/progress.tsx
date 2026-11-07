import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadStore, STORE_KEY, type Store } from '../lib/progress'
import { applyMotionAttribute, effectiveReducedMotion, type Settings } from '../settings/settings'
import { setSfxEnabled } from '../audio/sfx'

interface ProgressContextValue {
  store: Store
  /** Apply an immutable update; persisted to localStorage when available. */
  update: (updater: (store: Store) => Store) => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

/** The store on disk, or null when storage is unavailable or holds nothing yet. */
function readDisk(): Store | null {
  try {
    return localStorage.getItem(STORE_KEY) ? loadStore() : null
  } catch {
    return null
  }
}

function writeDisk(store: Store): boolean {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

const prefersReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Single source of truth for local progress and settings. Mount once, around the app. */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  // True while the last write failed (storage full or blocked): memory is then newer than disk.
  const memoryAhead = useRef(false)

  // Every write starts from what is on disk, so a tab left open never overwrites progress
  // another tab saved since; this tab only applies its own change on top.
  const update = useCallback((updater: (store: Store) => Store) => {
    setStore((prev) => {
      const next = updater((!memoryAhead.current && readDisk()) || prev)
      memoryAhead.current = !writeDisk(next)
      return next
    })
  }, [])

  // Pick up progress saved by other tabs.
  useEffect(() => {
    const refresh = () => {
      if (memoryAhead.current) return
      const disk = readDisk()
      if (disk) setStore(disk)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORE_KEY) refresh()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
    }
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

  // Sound effects follow the setting (off by default).
  useEffect(() => {
    setSfxEnabled(store.settings.sound)
  }, [store.settings.sound])

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
