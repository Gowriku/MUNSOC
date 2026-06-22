import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

export default function Card({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: 'white',
      border: '1px solid #e8e8e8',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon }) {
  return (
    <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 600, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon && <span style={{ opacity: 0.6, display: 'flex' }}>{icon}</span>}
      {children}
    </h2>
  )
}

const STATUS_CONFIG = {
  pending:   { bg: '#fff3e0', color: '#b45309', border: '#fde68a', Icon: Clock },
  submitted: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', Icon: Clock },
  confirmed: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', Icon: CheckCircle },
  rejected:  { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', Icon: XCircle },
  assigned:  { bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff', Icon: CheckCircle },
  open:      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', Icon: AlertCircle },
}

export function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const { Icon } = c
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      letterSpacing: 0.3, textTransform: 'uppercase',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <Icon size={11} />
      {status}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled = false, style = {}, type = 'button', icon }) {
  const variants = {
    primary:   { background: '#1a1a2e', color: 'white', border: 'none' },
    secondary: { background: 'white', color: '#1a1a2e', border: '1.5px solid #d1d5db' },
    success:   { background: '#166534', color: 'white', border: 'none' },
    danger:    { background: '#991b1b', color: 'white', border: 'none' },
    ghost:     { background: 'transparent', color: '#374151', border: '1.5px solid #e5e7eb' },
    warning:   { background: '#92400e', color: 'white', border: 'none' },
  }
  const v = variants[variant] || variants.primary
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 18px',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
        fontFamily: 'inherit',
        lineHeight: 1.4,
        ...style,
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  )
}

export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: '#9ca3af', fontSize: 12 }}>
      <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
      {label && <span>{label}</span>}
      {label && <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />}
    </div>
  )
}

export function InfoBox({ children, type = 'info' }) {
  const colors = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
    warning: { bg: '#fff7ed', border: '#fed7aa', color: '#92400e' },
    danger:  { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
  }
  const c = colors[type] || colors.info
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: 8, padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}
