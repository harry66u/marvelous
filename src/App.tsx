import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import HomePage from './pages/Home/HomePage'
import { ProgressProvider } from './data/progress'
import RouteErrorBoundary from './ui/RouteErrorBoundary'
import RouteFocus from './ui/RouteFocus'
import { useEffect } from 'react'

const UnmaskedPage = lazy(() => import('./games/unmasked/ui/UnmaskedPage'))
const ManualPage = lazy(() => import('./pages/Manual/ManualPage'))
const OfficePage = lazy(() => import('./office/OfficePage'))
const KitPage = lazy(() => import('./pages/Kit/KitPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Loading() {
  return (
    <p className="hud" role="status" style={{ padding: '24px' }}>
      Retrieving form…
    </p>
  )
}

export default function App() {
  // Fetch the game page in the background so it still opens if the connection drops later.
  useEffect(() => {
    const prefetch = () => void import('./games/unmasked/ui/UnmaskedPage').catch(() => {})
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(prefetch)
    else setTimeout(prefetch, 1500)
  }, [])
  return (
    <ProgressProvider>
      <RouteFocus />
      <RouteErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/unmasked" element={<UnmaskedPage />} />
          <Route path="/manual" element={<ManualPage />} />
          <Route path="/office/*" element={<OfficePage />} />
          <Route path="/kit" element={<KitPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </RouteErrorBoundary>
    </ProgressProvider>
  )
}
