import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useUIStore } from './store/uiStore'

// Set the theme before first paint so the page never flashes
// the opposite theme while React mounts.
document.documentElement.dataset.theme = useUIStore.getState().darkMode ? 'dark' : 'light'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
