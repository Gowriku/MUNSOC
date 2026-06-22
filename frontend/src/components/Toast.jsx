import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export function useToast() {
  const [toasts, setToasts] = useState([])
  const show = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  return { toasts, show }
}

export function ToastContainer({ toasts }) {
  const config = {
    success: { border: 'rgba(74,222,128,0.3)',   color: '#4ADE80', Icon: CheckCircle },
    error:   { border: 'rgba(248,113,113,0.3)',  color: '#F87171', Icon: XCircle },
    warning: { border: 'rgba(201,162,39,0.3)',   color: '#D4AF37', Icon: AlertTriangle },
    info:    { border: 'rgba(147,197,253,0.3)',  color: '#93C5FD', Icon: Info },
  }
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => {
        const c = config[t.type] || config.info
        return (
          <div key={t.id} style={{
            background: 'var(--surface-el)',
            border: `1px solid ${c.border}`,
            borderLeft: `3px solid ${c.color}`,
            padding: '13px 18px', borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: 500, color: 'var(--text)',
            minWidth: 280, maxWidth: 380,
            animation: 'slideIn 0.22s ease',
          }}>
            <c.Icon size={15} color={c.color} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
