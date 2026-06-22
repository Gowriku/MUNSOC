import Navbar from './Navbar'

export default function PageLayout({ children, title, subtitle, maxWidth = 900 }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Navbar />
      <div style={{ maxWidth, margin: '0 auto', padding: '32px 16px' }}>
        {title && (
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{title}</h1>
            {subtitle && <p style={{ color: '#666', marginTop: 4, fontSize: 15 }}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}