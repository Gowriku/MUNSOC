import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import useAuthStore from '../store/authStore'

const NAV_LINKS = [
  { to: '/dashboard',   label: '🏠 Home',        roles: ['delegate','volunteer','da_team','admin'] },
  { to: '/preferences', label: '📋 Preferences',  roles: ['delegate'] },
  { to: '/payment',     label: '💳 Payment',       roles: ['delegate'] },
  { to: '/my-qr',       label: '📱 My QR',         roles: ['delegate'] },
  { to: '/emergency',   label: '🆘 Emergency',     roles: ['delegate','volunteer','da_team','admin'] },
  { to: '/feedback',    label: '💬 Feedback',      roles: ['delegate','volunteer','da_team','admin'] },
  { to: '/volunteer',   label: '🎯 Volunteer',     roles: ['volunteer','admin'] },
  { to: '/da-team',     label: '📂 DA Team',       roles: ['da_team','admin'] },
  { to: '/admin',       label: '⚙️ Admin',          roles: ['admin'] },
]

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  const links = NAV_LINKS.filter(l => l.roles.includes(user.role))

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <Link to="/dashboard" style={s.brand} onClick={() => setMenuOpen(false)}>
          🏛️ MUNPortal
        </Link>

        {/* Desktop links */}
        <div style={s.links} className="nav-links">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              style={{ ...s.link, ...(pathname === l.to ? s.activeLink : {}) }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right: user info + hamburger */}
        <div style={s.right}>
          <div style={s.userInfo}>
            {user.profile_picture && (
              <img src={user.profile_picture} alt="" style={s.avatar} />
            )}
            <span style={s.name}>{user.name.split(' ')[0]}</span>
          </div>
          <button onClick={logout} style={s.logoutBtn} title="Sign Out">
            Sign Out
          </button>
          {/* Hamburger */}
          <button onClick={() => setMenuOpen(o => !o)} style={s.hamburger} aria-label="Menu">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={s.mobileMenu}>
          {links.map(l => (
            <Link key={l.to} to={l.to}
              onClick={() => setMenuOpen(false)}
              style={{ ...s.mobileLink, ...(pathname === l.to ? s.mobileLinkActive : {}) }}>
              {l.label}
            </Link>
          ))}
          <button onClick={logout} style={s.mobileLogout}>Sign Out</button>
        </div>
      )}
    </nav>
  )
}

const s = {
  nav: { background: '#1a1a2e', color: 'white', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  inner: { maxWidth: 1100, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, height: 56 },
  brand: { color: 'white', fontWeight: 700, fontSize: 17, textDecoration: 'none', whiteSpace: 'nowrap', marginRight: 4, flexShrink: 0 },
  links: { display: 'flex', gap: 2, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' },
  link: { color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '6px 9px', borderRadius: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.15s' },
  activeLink: { color: 'white', background: 'rgba(255,255,255,0.12)' },
  right: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 6 },
  avatar: { width: 28, height: 28, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)' },
  name: { fontSize: 13, color: 'rgba(255,255,255,0.8)', '@media(max-width:640px)': { display: 'none' } },
  logoutBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'block' },
  hamburger: { background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', padding: '4px 6px', display: 'block' },
  mobileMenu: { background: '#16213e', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', padding: '8px 0' },
  mobileLink: { color: 'rgba(255,255,255,0.75)', textDecoration: 'none', padding: '12px 20px', fontSize: 14, fontWeight: 500 },
  mobileLinkActive: { color: 'white', background: 'rgba(255,255,255,0.08)' },
  mobileLogout: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', padding: '12px 20px', fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4 },
}
