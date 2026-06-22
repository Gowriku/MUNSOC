import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('MUNPortal error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#f5f7fa', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '48px 40px',
            textAlign: 'center', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Something went wrong</h2>
            <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard' }}
              style={{
                background: '#1a1a2e', color: 'white', border: 'none',
                padding: '12px 24px', borderRadius: 8, fontSize: 15,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}