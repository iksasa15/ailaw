import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { PlatformProvider } from './platform/PlatformContext'

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Force clients onto the latest build (API/hosting fixes).
    window.location.reload()
  },
  onRegisteredSW(_url, registration) {
    registration?.update?.()
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider>
        <App />
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>,
)
