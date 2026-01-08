import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Router from './app/router'
import './styles.css'
import { CalendarProvider } from './app/calendarContext'
import { ToastProvider } from './app/toast'
import { ConfirmProvider } from './app/confirm'

const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <ConfirmProvider>
        <CalendarProvider>
          <Router />
        </CalendarProvider>
      </ConfirmProvider>
    </ToastProvider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')!).render(<App />)
