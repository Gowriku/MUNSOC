import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, ChevronDown, LogOut, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { roleHomePath } from '../App'
import logo1 from '../assets/logo1.png'

const NAV_BY_ROLE = {
  delegate: [
    { to: '/dashboard',   label: 'Dashboard' },
    { to: '/preferences', label: 'Preferences' },
    { to: '/payment',     label: 'Payment' },
    { to: '/my-qr',       label: 'Delegate Pass' },
    { to: '/emergency',   label: 'Emergency' },
    { to: '/feedback',    label: 'Feedback' },
  ],
  volunteer: [{ to: '/volunteer', label: 'Volunteer Portal' }],
  da_team:   [{ to: '/da-team',   label: 'DA Team Portal' }],
  admin:     [{ to: '/admin',     label: 'Admin Portal' }],
}

const ROLE_LABEL = {
  delegate:  'Delegate',
  volunteer: 'Volunteer',
  da_team:   'DA Team',
  admin:     'Administrator',
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  const links = NAV_BY_ROLE[user.role] || []
  const homeLink = roleHomePath(user.role)

  return (
    <nav style={s.nav}>
      {/* Gold top accent */}
      <div style={s.goldAccent} />

      <div style={s.inner}>
        {/* Brand */}
        <Link to={homeLink} onClick={() => setMenuOpen(false)} style={s.brand}>
            <img
            src={logo1}
            alt="MUN Logo"
            style={{
                width: 28,
                height: 28,
                objectFit: 'contain'
            }}
            />
          <span>MUNPortal</span>
        </Link>

        {/* Desktop links */}
        <div className="desktop-nav-links" style={s.links}>
          {links.map(l => {
            const isActive = pathname === l.to || (l.to !== '/' && pathname.startsWith(l.to))
            return (
              <Link key={l.to} to={l.to} style={{ ...s.link, ...(isActive ? s.activeLink : {}) }}>
                {l.label}
                {isActive && <span style={s.activeDot} />}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div style={s.right}>
          {/* Role badge */}
          <span style={s.roleBadge}>{ROLE_LABEL[user.role]}</span>

          {/* Divider */}
          <div style={s.divider} />

          {/* User */}
          <div className="desktop-actions" style={s.userSection}>
            {user.profile_picture
              ? <img src={user.profile_picture} alt="" style={s.avatar} />
              : <div style={s.avatarFallback}><User size={14} /></div>
            }
            <span style={s.userName}>{user.name.split(' ')[0]}</span>
          </div>

          <button onClick={logout} className="desktop-actions" style={s.logoutBtn} title="Sign out">
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(o => !o)} className="hamburger-only" style={s.hamburger}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={s.drawer}>
          <div style={s.drawerUser}>
            {user.profile_picture
              ? <img src={user.profile_picture} alt="" style={{ ...s.avatar, width: 36, height: 36 }} />
              : <div style={{ ...s.avatarFallback, width: 36, height: 36 }}><User size={16} /></div>
            }
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ROLE_LABEL[user.role]}</div>
            </div>
          </div>
          <div style={s.drawerDivider} />
          {links.map(l => {
            const isActive = pathname === l.to || pathname.startsWith(l.to)
            return (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                style={{ ...s.drawerLink, ...(isActive ? s.drawerLinkActive : {}) }}>
                {l.label}
              </Link>
            )
          })}
          <div style={s.drawerDivider} />
          <button onClick={logout} style={s.drawerLogout}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  )
}

const s = {
  nav: { background: '#0A0A0A', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 },
  goldAccent: { height: 2, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' },
  inner: { maxWidth: 1140, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0, height: 58 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', marginRight: 36, flexShrink: 0, textDecoration: 'none' },
  brandIcon: { width: 22, height: 22, background: 'var(--wine)', borderRadius: 5, display: 'inline-block' },
  links: { display: 'flex', gap: 2, flex: 1, overflow: 'hidden' },
  link: { position: 'relative', color: 'var(--text-3)', textDecoration: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'color 0.15s' },
  activeLink: { color: 'var(--text)', background: 'rgba(110,30,42,0.2)' },
  activeDot: { position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)' },
  right: { display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, marginLeft: 'auto' },
  roleBadge: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.2)', padding: '4px 10px', borderRadius: 20 },
  divider: { width: 1, height: 20, background: 'var(--border-hi)' },
  userSection: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--border-hi)', objectFit: 'cover' },
  avatarFallback: { width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-el)', border: '1.5px solid var(--border-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' },
  userName: { fontSize: 13, color: 'var(--text-2)', fontWeight: 500 },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'border-color 0.15s, color 0.15s' },
  hamburger: { background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  drawer: { background: '#0E0E0E', borderTop: '1px solid var(--border)', padding: '0 0 8px' },
  drawerUser: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' },
  drawerDivider: { height: 1, background: 'var(--border)', margin: '4px 0' },
  drawerLink: { display: 'block', color: 'var(--text-2)', textDecoration: 'none', padding: '13px 20px', fontSize: 14, fontWeight: 500 },
  drawerLinkActive: { color: 'var(--text)', background: 'rgba(110,30,42,0.2)', borderLeft: '2px solid var(--wine)' },
  drawerLogout: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-3)', padding: '13px 20px', fontSize: 14, cursor: 'pointer', width: '100%', fontFamily: 'inherit' },
}
