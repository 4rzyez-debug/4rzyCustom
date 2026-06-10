import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ModProvider } from './context/ModContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModProvider>
      <App />
    </ModProvider>
  </StrictMode>,
)
