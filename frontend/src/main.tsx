import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NuqsAdapter } from 'nuqs/adapters/react'
import './index.css'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </React.StrictMode>,
)
