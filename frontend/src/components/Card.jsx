import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

export default function Card({ children, style = {}, className = '', gold = false }) {
  return (
    <div className={className} style={{
      background: 'var(--surface)',
      border: gold ? '1px solid rgba(201,162,39,0.25)' : '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 28,
      boxShadow: 'var(--shadow-sm)',
      position: 'relative',
      ...(gold ? { borderTop: '2px solid var(--gold)' } : {}),
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
      <h2 style={{
        margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-2)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {icon && <span style={{ color: 'var(--gold)', display: 'flex', opacity: 0.85 }}>{icon}</span>}
        {children}
      </h2>
      {action && <div>{action}</div>}
    </div>
  )
}

const STATUS_CONFIG = {
  pending:   { bg: 'rgba(122,92,0,0.15)',      color: '#D4AF37', border: 'rgba(201,162,39,0.25)', Icon: Clock },
  submitted: { bg: 'rgba(26,68,128,0.2)',       color: '#6FA3EF', border: 'rgba(111,163,239,0.25)', Icon: Clock },
  confirmed: { bg: 'rgba(45,106,79,0.2)',        color: '#4ADE80', border: 'rgba(74,222,128,0.25)', Icon: CheckCircle },
  rejected:  { bg: 'rgba(139,32,32,0.2)',        color: '#F87171', border: 'rgba(248,113,113,0.25)', Icon: XCircle },
  assigned:  { bg: 'rgba(110,30,42,0.2)',        color: '#F9A8B8', border: 'rgba(249,168,184,0.25)', Icon: CheckCircle },
  open:      { bg: 'rgba(26,68,128,0.15)',       color: '#93C5FD', border: 'rgba(147,197,253,0.25)', Icon: AlertCircle },
}

export function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const { Icon } = c
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <Icon size={10} />
      {status}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled = false, style = {}, type = 'button', icon }) {
  const variants = {
    primary:   { background: 'var(--wine)',        color: 'var(--text)', border: '1px solid rgba(110,30,42,0.6)' },
    secondary: { background: 'var(--surface-el)',  color: 'var(--text)', border: '1px solid var(--border-hi)' },
    gold:      { background: 'var(--gold)',         color: '#0D0D0D',     border: '1px solid var(--gold)' },
    success:   { background: 'rgba(45,106,79,0.3)', color: '#4ADE80',    border: '1px solid rgba(74,222,128,0.25)' },
    danger:    { background: 'rgba(139,32,32,0.3)', color: '#F87171',    border: '1px solid rgba(248,113,113,0.25)' },
    ghost:     { background: 'transparent',         color: 'var(--text-2)', border: '1px solid var(--border-hi)' },
    warning:   { background: 'rgba(122,92,0,0.3)',  color: '#D4AF37',    border: '1px solid rgba(201,162,39,0.25)' },
  }
  const v = variants[variant] || variants.primary
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '9px 20px', borderRadius: 'var(--radius-sm)',
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
        fontFamily: 'inherit', lineHeight: 1.4, whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          if (variant === 'primary') e.currentTarget.style.background = 'var(--wine-hover)'
          if (variant === 'gold')    e.currentTarget.style.background = 'var(--gold-hover)'
          if (variant === 'secondary' || variant === 'ghost') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = v.background
        e.currentTarget.style.borderColor = v.border.replace('1px solid ', '')
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  )
}

export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span>{label}</span>}
      {label && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
    </div>
  )
}

export function InfoBox({ children, type = 'info' }) {
  const colors = {
    info:    { bg: 'var(--info-dim)',    border: 'rgba(111,163,239,0.2)',    color: '#93C5FD' },
    success: { bg: 'var(--success-dim)', border: 'rgba(74,222,128,0.2)',     color: '#4ADE80' },
    warning: { bg: 'var(--warn-dim)',    border: 'rgba(201,162,39,0.2)',     color: '#D4AF37' },
    danger:  { bg: 'var(--danger-dim)',  border: 'rgba(248,113,113,0.2)',    color: '#F87171' },
  }
  const c = colors[type] || colors.info
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}

export function MetricCard({ label, value, sub, color, icon: Icon, gold = false }) {
  return (
    <div style={{
      background: 'var(--surface)', border: gold ? '1px solid rgba(201,162,39,0.2)' : '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '22px 20px',
      ...(gold ? { borderTop: '2px solid var(--gold)' } : {}),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        {Icon && <Icon size={18} color={color || 'var(--text-3)'} />}
        {sub && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{sub}</span>}
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: color || 'var(--text)', lineHeight: 1, letterSpacing: '-1px', marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
    </div>
  )
}
