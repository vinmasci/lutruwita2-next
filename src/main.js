import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Add global error handler for fetch aborts
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && 
      event.reason.name === 'AbortError' && 
      event.reason.message && 
      event.reason.message.includes('Fetch is aborted')) {
    
    // Prevent the error from appearing in the console
    event.preventDefault();
    
    // Log it at debug level instead
    console.debug('Fetch abort handled gracefully:', event.reason.message);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
