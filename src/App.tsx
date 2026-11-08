import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import HomePage from './pages/Home/HomePage'
import { ProgressProvider } from './data/progress'
import RouteErrorBoundary from './ui/RouteErrorBoundary'
import RouteFocus from './ui/RouteFocus'
import { useEffect } from 'react'

const UnmaskedPage = lazy(() => import('./games/unmasked/ui/UnmaskedPage'))
const BlistPage = lazy(() => import('./games/blist/ui/BlistPage'))
const RetconPage = lazy(() => import('./games/retcon/ui/RetconPage'))
const ShiftPage = lazy(() => import('./pages/Shift/ShiftPage'))
const AgentPage = lazy(() => import('./pages/Agent/AgentPage'))
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
  // Fetch the game pages in the background so they still open if the connection drops later.
  useEffect(() => {
    const prefetch = () => {
      void import('./games/unmasked/ui/UnmaskedPage').catch(() => {})
      void import('./games/blist/ui/BlistPage').catch(() => {})
      void import('./games/retcon/ui/RetconPage').catch(() => {})
    }
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
          <Route path="/b-list" element={<BlistPage />} />
          <Route path="/retcon" element={<RetconPage />} />
          <Route path="/shift" element={<ShiftPage />} />
          <Route path="/agent" element={<AgentPage />} />
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
