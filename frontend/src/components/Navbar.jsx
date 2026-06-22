import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import useAuthStore from '../store/authStore'
import { roleHomePath } from '../App'

/**
 * Each role gets its own distinct nav links — portals are fully separated.
 * Delegates: dashboard, preferences, payment, qr, emergency, feedback
 * Volunteers: volunteer portal only (emergency/messages are inside)
 * DA Team: da-team portal only
 * Admin: admin portal only
 */
const NAV_BY_ROLE = {
  delegate: [
    { to: '/dashboard',   label: '🏠 Dashboard' },
    { to: '/preferences', label: '📋 Preferences' },
    { to: '/payment',     label: '💳 Payment' },
    { to: '/my-qr',       label: '📱 My QR' },
    { to: '/emergency',   label: '🆘 Emergency' },
    { to: '/feedback',    label: '💬 Feedback' },
  ],
  volunteer: [
    { to: '/volunteer', label: '🎯 Volunteer Portal' },
  ],
  da_team: [
    { to: '/da-team', label: '📂 DA Team Portal' },
  ],
  admin: [
    { to: '/admin', label: '⚙️ Admin Portal' },
  ],
}

const ROLE_BADGE = {
  delegate: { bg: '#e3f2fd', color: '#1565c0', label: 'Delegate' },
  volunteer: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Volunteer' },
  da_team: { bg: '#fff3e0', color: '#e65100', label: 'DA Team' },
  admin: { bg: '#ffebee', color: '#b71c1c', label: 'Admin' },
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  const links = NAV_BY_ROLE[user.role] || []
  const badge = ROLE_BADGE[user.role] || {}
  const homeLink = roleHomePath(user.role)

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <Link to={homeLink} style={s.brand} onClick={() => setMenuOpen(false)}>
          🏛️ MUNPortal
        </Link>

        {/* Desktop links */}
        <div style={s.links}>
          {links.map(l => (
            <Link key={l.to} to={l.to}
              style={{ ...s.link, ...(pathname.startsWith(l.to) ? s.activeLink : {}) }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right: role badge + user + logout */}
        <div style={s.right}>
          <span style={{
            ...s.roleBadge,
            background: `${badge.color}22`,
            color: badge.color,
            border: `1px solid ${badge.color}44`
            }}>
            {badge.label}
          </span>
          <div style={s.userInfo}>
            {user.profile_picture && <img src={user.profile_picture} alt="" style={s.avatar} />}
            <span style={s.name}>{user.name.split(' ')[0]}</span>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Sign Out</button>
          <button onClick={() => setMenuOpen(o => !o)} style={s.hamburger}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

    <div
    style={{
        height: 2,
        background:
        'linear-gradient(90deg,#8B1E1E,#D4AF37,#8B1E1E)'
    }}
    />

      {menuOpen && (
        <div style={s.mobileMenu}>
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              style={{ ...s.mobileLink, ...(pathname.startsWith(l.to) ? s.mobileLinkActive : {}) }}>
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
  nav: {
  background: '#0B0B0B',
  color: 'white',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
},
  inner: { maxWidth: 1100, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, height: 56 },
  brand: {
  color: 'white',
  fontWeight: 800,
  fontSize: 16,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  letterSpacing: 0.5,
},
  links: { display: 'flex', gap: 2, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' },
  link: {
  color: 'rgba(255,255,255,0.6)',
  textDecoration: 'none',
  padding: '6px 10px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
},
  activeLink: {
  color: 'white',
  background: '#8B1E1E',
},
  right: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  roleBadge: {
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  letterSpacing: 0.5,
},
  userInfo: {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  padding: '3px 10px 3px 4px',
},
  avatar: {
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1.5px solid #D4AF37',
},
  name: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  logoutBtn: {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(192,57,43,0.15)',
  border: '1px solid rgba(192,57,43,0.4)',
  color: '#FF8A80',
  padding: '5px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
},
  hamburger: { background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', padding: '4px 6px' },
  mobileMenu: { background: '#111111', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', padding: '8px 0' },
  mobileLink: { color: 'rgba(255,255,255,0.75)', textDecoration: 'none', padding: '12px 20px', fontSize: 14, fontWeight: 500 },
  mobileLinkActive: {
  color: 'white',
  background: '#8B1E1E'
},
  mobileLogout: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', padding: '12px 20px', fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4 },
}
