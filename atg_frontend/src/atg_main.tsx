import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './atg_index.css'
import './i18n/i18n'
import App from './AtgApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
