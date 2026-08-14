import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useUIStore } from './store/uiStore'

// Apply the theme class before first paint so the page never flashes
// the opposite theme while React mounts.
document.documentElement.classList.toggle('dark', useUIStore.getState().darkMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
