import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // <--- Cette ligne active Tailwind dans toute l'app
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)