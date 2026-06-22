import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  return { toasts, show }
}

export function ToastContainer({ toasts }) {
  const colors = {
    success: { bg: '#e8f5e9', border: '#4caf50', color: '#1b5e20', icon: '✅' },
    error:   { bg: '#ffebee', border: '#f44336', color: '#b71c1c', icon: '❌' },
    info:    { bg: '#e3f2fd', border: '#2196f3', color: '#0d47a1', icon: 'ℹ️' },
    warning: { bg: '#fff8e1', border: '#ff9800', color: '#e65100', icon: '⚠️' },
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.info
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1px solid ${c.border}`, color: c.color,
            padding: '12px 16px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500,
            minWidth: 280, maxWidth: 380, animation: 'slideIn 0.2s ease',
          }}>
            <span>{c.icon}</span>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}