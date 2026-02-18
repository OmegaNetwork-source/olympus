import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './omega-dex.jsx'
import './mobile.css'

class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('App error:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'sans-serif', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
          <h1>Something went wrong</h1>
          <pre style={{ background: '#333', padding: 16, overflow: 'auto' }}>{this.state.error?.toString?.()}</pre>
          <p>Check the browser console (F12) for details. Try refreshing or clearing localStorage.</p>
          <button onClick={() => { localStorage.removeItem('omega-theme'); window.location.reload(); }} style={{ padding: '10px 20px', cursor: 'pointer' }}>Reset & Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
