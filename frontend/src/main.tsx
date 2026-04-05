import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Устанавливаем тему до рендера, чтобы избежать мигания
try {
  const saved = localStorage.getItem('andigo-theme')
  const theme = (saved === 'light' || saved === 'dark') ? saved : 'dark'
  document.documentElement.classList.add(theme)
} catch {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
