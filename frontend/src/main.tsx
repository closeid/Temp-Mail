import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { I18nProvider } from '@/i18n/react'
import { App } from '@/app/app'
import '@/styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AppProviders><App /></AppProviders>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
