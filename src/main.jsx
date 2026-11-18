import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CoinsProvider } from './store.jsx'

// PWA: service worker solo en producción
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* sin soporte o sin HTTPS */ })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CoinsProvider>
      <App />
    </CoinsProvider>
  </StrictMode>,
)
