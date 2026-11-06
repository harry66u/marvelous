import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import HomePage from './pages/Home/HomePage'

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
  return (
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
  )
}
