/**
 * THIS FILE IS LIKELY REDUNDANT
 * Please use the JavaScript version (main.js) if it exists.
 * This TypeScript file may be part of an incomplete migration.
 */

import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
