export default function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: 'var(--white-lighter)',
      border: `1px solid ${accent ? accent + '33' : 'var(--border)'}`,
      borderTop: accent ? `3px solid ${accent}` : undefined,
      borderRadius: 'var(--radius)',
      padding: 24,
      boxShadow: 'var(--shadow)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon }) {
  return (
    <h2 style={{
      margin: '0 0 18px', fontSize: 15, fontWeight: 700,
      color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 8,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      {children}
    </h2>
  )
}

const STATUS = {
  pending:   { bg: '#FEF3E2', color: '#B45309', border: '#F59E0B', label: '⏳ Pending' },
  submitted: { bg: '#EFF6FF', color: '#1D4ED8', border: '#3B82F6', label: '📤 Submitted' },
  confirmed: { bg: '#F0FDF4', color: '#166534', border: '#22C55E', label: '✅ Confirmed' },
  rejected:  { bg: '#FEF2F2', color: '#991B1B', border: '#EF4444', label: '❌ Rejected' },
  assigned:  { bg: '#FDF4FF', color: '#7E22CE', border: '#A855F7', label: '🎯 Assigned' },
}

export function StatusBadge({ status }) {
  const c = STATUS[status] || STATUS.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5, background: c.bg, color: c.color,
      border: `1px solid ${c.border}40`,
    }}>
      {c.label}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled = false, style = {}, type = 'button', icon, size = 'md' }) {
  const variants = {
    primary:   { background: 'var(--primary)',      color: 'white',               border: 'none' },
    gold:      { background: 'var(--gold)',          color: 'white',               border: 'none' },
    dark:      { background: 'var(--black)',         color: 'white',               border: 'none' },
    secondary: { background: 'var(--white-lighter)', color: 'var(--text-dark)',    border: '1.5px solid var(--border)' },
    success:   { background: '#166534',              color: 'white',               border: 'none' },
    danger:    { background: 'var(--primary)',       color: 'white',               border: 'none' },
    ghost:     { background: 'transparent',          color: 'var(--primary)',      border: '1.5px solid var(--primary)' },
    ghostGold: { background: 'transparent',          color: 'var(--gold)',         border: '1.5px solid var(--gold)' },
    outline:   { background: 'transparent',          color: 'var(--text-mid)',     border: '1.5px solid var(--border)' },
  }
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '9px 18px', fontSize: 14 },
    lg: { padding: '12px 24px', fontSize: 15 },
  }
  const v = variants[variant] || variants.primary
  const sz = sizes[size] || sizes.md
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        ...v, ...sz,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 8, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        fontFamily: 'inherit', lineHeight: 1.4, whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(0.9)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {icon && <span style={{ display: 'flex', fontSize: sz.fontSize }}>{icon}</span>}
      {children}
    </button>
  )
}

export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: 'var(--text-light)', fontSize: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
      {label && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
    </div>
  )
}

export function InfoBox({ children, type = 'info' }) {
  const colors = {
    info:    { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', icon: 'ℹ️' },
    success: { bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', icon: '✅' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: '⚠️' },
    danger:  { bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', icon: '❌' },
    gold:    { bg: '#FEFCE8', border: '#FEF08A', color: '#854D0E', icon: '⭐' },
  }
  const c = colors[type] || colors.info
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: 8, padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
      display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <span style={{ flexShrink: 0 }}>{c.icon}</span>
      <span>{children}</span>
    </div>
  )
}
