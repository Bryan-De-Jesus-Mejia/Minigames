import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import './index.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider initialLanguage="en">
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
