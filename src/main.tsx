import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router'
import { STATIC_PREVIEW } from './config'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/share-tech-mono/400.css'
import '@fontsource/special-elite/400.css'
import './ui/tokens.css'
import './ui/base.css'
import './ui/effects.css'
import App from './App'

window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('marvelous:reloaded')) return
    sessionStorage.setItem('marvelous:reloaded', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    {STATIC_PREVIEW ? (
      <MemoryRouter>
        <App />
      </MemoryRouter>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)
