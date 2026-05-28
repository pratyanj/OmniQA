import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { router } from './router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#0f172a',
          color: '#f1f5f9',
          border: '1px solid #1e2d45',
          borderRadius: '8px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
      }}
    />
  </React.StrictMode>,
)
