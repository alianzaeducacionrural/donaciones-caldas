import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmarProvider } from './hooks/useConfirmar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfirmarProvider>
      <App />
    </ConfirmarProvider>
  </StrictMode>,
)
