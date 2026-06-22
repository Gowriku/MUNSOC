import Navbar from './Navbar'

export default function PageLayout({ children, title, subtitle, maxWidth = 960 }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="page-inner" style={{ maxWidth, margin: '0 auto', padding: '40px 24px' }}>
        {title && (
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.4px' }}>{title}</h1>
            {subtitle && <p style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 14, fontWeight: 400 }}>{subtitle}</p>}
            <div style={{ height: 1, background: 'linear-gradient(90deg, var(--border-hi), transparent)', marginTop: 20 }} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
