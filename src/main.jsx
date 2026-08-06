// تحميل Firebase SDK أولاً (يُثبّت window.firebase/db/auth قبل أي خدمة أخرى)
import './services/firebaseLoader.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './legacy/compat.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
