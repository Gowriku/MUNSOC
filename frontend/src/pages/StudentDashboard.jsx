import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { CreditCard, QrCode, Layers, AlertTriangle, MessageSquare, Clock, CheckCircle, User, Bus, Bell } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, StatusBadge, Button } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import { SkeletonDashboard } from '../components/Skeleton'
import useAuthStore from '../store/authStore'
import api from '../api/client'

export default function StudentDashboard() {
  const { user, fetchMe } = useAuthStore()
  const { toasts, show } = useToast()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [pageLoading, setPageLoading] = useState(true)

  const [phone, setPhone]       = useState(user?.phone || '')
  const [college, setCollege]   = useState(user?.college || '')
  const [transport, setTransport] = useState(user?.transportation_opted || false)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (user) { setPhone(user.phone || ''); setCollege(user.college || ''); setTransport(user.transportation_opted || false) }
    Promise.all([
      api.get('/portfolios/assignment/me').catch(() => null),
      api.get('/portfolios/preferences/me').catch(() => null),
      api.get('/alerts/').catch(() => null),
    ]).then(([assign, prefs, alertsRes]) => {
      if (assign) setAssignment(assign.data)
      if (prefs) setPreferences(prefs.data)
      if (alertsRes) setAlerts(alertsRes.data.slice(0, 5))
      setPageLoading(false)
    })
  }, [user?.id])

  const profileComplete = user?.phone && user?.college

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      await api.patch('/users/me', { phone, college, transportation_opted: transport })
      await fetchMe()
      show('Profile updated', 'success')
    } catch { show('Failed to save profile', 'error') }
    finally { setSavingProfile(false) }
  }

  if (!user || pageLoading) return <PageLayout title="Dashboard"><SkeletonDashboard /></PageLayout>

  const ALERT_LABEL = { session_start: 'Session Started', session_end: 'Session Ended', break_start: 'Break', break_end: 'Break Ended', custom: 'Announcement' }

  return (
    <PageLayout title={`Welcome back, ${user.name.split(' ')[0]}`} subtitle="Your delegate registration dashboard">
      <ToastContainer toasts={toasts} />

      {!profileComplete && (
        <div style={s.warnBanner}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          Complete your profile to lock in your registration fee tier before the deadline.
        </div>
      )}

 <div style={s.grid}>

        {/* 1. Profile (Moved to First) */}
        <Card>
          <CardTitle icon={<User size={14} />}>Your Profile</CardTitle>
          <div style={s.formGroup}>
            <label style={s.label}>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" style={s.input} />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Institution</label>
            <input value={college} onChange={e => setCollege(e.target.value)} placeholder="College or university" style={s.input} />
          </div>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} style={{ accentColor: 'var(--wine)' }} />
            <Bus size={13} color="var(--text-3)" />
            Require transportation to venue
          </label>
          <Button onClick={handleSaveProfile} disabled={savingProfile} style={{ marginTop: 18, width: '100%' }}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </Card>

        {/* 2. Preferences (Moved to Second) */}
        <Card>
          <CardTitle icon={<Layers size={14} />}>Portfolio Preferences</CardTitle>
          {preferences ? (
            <div>
              {[
                { slot: 'pref1', label: 'First Choice',  portfolio: preferences.pref1 },
                { slot: 'pref2', label: 'Second Choice', portfolio: preferences.pref2 },
                { slot: 'pref3', label: 'Third Choice',  portfolio: preferences.pref3 },
              ].map(({ slot, label, portfolio }) => (
                <div key={slot} style={s.prefRow}>
                  <span style={s.prefLabel}>{label}</span>
                  <span style={s.prefVal}>
                    {portfolio
                      ? `${portfolio.country_name} — ${portfolio.committee?.abbreviation}`
                      : <em style={{ color: 'var(--text-3)' }}>Not set</em>}
                  </span>
                </div>
              ))}
              {!assignment && (
                <Link to="/preferences"><Button variant="ghost" style={{ width: '100%', marginTop: 14 }}>Edit Preferences</Button></Link>
              )}
            </div>
          ) : (
            <div>
              <p style={s.mutedText}>No preferences submitted yet.</p>
              <Link to="/preferences"><Button>Choose Preferences</Button></Link>
            </div>
          )}
        </Card>

        {/* 3. Portfolio Assignment */}
        <Card>
          <CardTitle icon={<Layers size={14} />}>Your Portfolio</CardTitle>
          {assignment ? (
            <div style={s.assignmentBox}>
              {assignment.portfolio?.flag_url && <img src={assignment.portfolio.flag_url} alt="" style={{ width: 44, flexShrink: 0 }} />}
              <div>
                <div style={s.assignedCountry}>{assignment.portfolio?.country_name}</div>
                <div style={s.assignedCommitteeName}>{assignment.portfolio?.committee?.name}</div>
                <span style={s.committeeChip}>{assignment.portfolio?.committee?.abbreviation}</span>
              </div>
            </div>
          ) : (
            <div>
              <p style={s.mutedText}>Portfolio not yet assigned. Submit your preferences to help the DA team allocate you a position.</p>
              <Link to="/preferences"><Button variant="secondary">Submit Preferences</Button></Link>
            </div>
          )}
        </Card>

        {/* 4. Registration Status (Payment - Moved to Fourth) */}
        <Card gold>
          <CardTitle icon={<CreditCard size={14} />}>Registration Status</CardTitle>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <StatusBadge status={user.payment_status} />
            {user.reg_tier && <span style={s.tierPill}>{user.reg_tier.replace(/_/g, ' ')}</span>}
          </div>
          {user.amount_due > 0 && (
            <div style={s.amountBox}>
              <span style={s.amountLabel}>Amount Due</span>
              <span style={s.amountVal}>₹{user.amount_due}</span>
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            {(user.payment_status === 'pending' || user.payment_status === 'rejected') && (
              <Link to="/payment"><Button>Pay Now</Button></Link>
            )}
            {user.payment_status === 'submitted' && (
              <span style={s.subtleNote}>Payment under review — confirmation pending.</span>
            )}
            {user.payment_status === 'confirmed' && (
              <Link to="/my-qr"><Button variant="gold" icon={<QrCode size={13} />}>View Delegate Pass</Button></Link>
            )}
          </div>
        </Card>

        {/* Quick Links & Alerts remain at the bottom */}
        <Card>
          <CardTitle>Quick Actions</CardTitle>
          <div style={s.quickLinks}>
            {[
              { to: '/preferences', icon: Layers,        label: 'Portfolio Preferences' },
              { to: '/payment',     icon: CreditCard,    label: 'Registration Payment' },
              { to: '/my-qr',       icon: QrCode,        label: 'Delegate Pass' },
              { to: '/emergency',   icon: AlertTriangle, label: 'Emergency Contact' },
              { to: '/feedback',    icon: MessageSquare, label: 'Feedback' },
            ].map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} style={s.quickLink}>
                <Icon size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
                <span>{label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 16 }}>›</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Bell size={14} />}>Committee Alerts</CardTitle>
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(a => (
                <div key={a.id} style={s.alertRow}>
                  <div style={s.alertDot} />
                  <div style={{ flex: 1 }}>
                    <div style={s.alertType}>{ALERT_LABEL[a.type] || a.type}</div>
                    <div style={s.alertMsg}>{a.message}</div>
                  </div>
                  <div style={s.alertTime}>{new Date(a.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ ...s.mutedText, textAlign: 'center', padding: '16px 0' }}>No alerts. Live committee alerts will appear here during the event.</p>
          )}
        </Card>

      </div>
    </PageLayout>
  )
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 },
  warnBanner: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(122,92,0,0.15)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 24, color: 'var(--gold)', fontSize: 13, fontWeight: 500 },
  tierPill: { background: 'rgba(201,162,39,0.1)', color: 'var(--gold)', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid rgba(201,162,39,0.2)' },
  amountBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-el)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 4, border: '1px solid var(--border)' },
  amountLabel: { color: 'var(--text-3)', fontSize: 13 },
  amountVal: { fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' },
  mutedText: { color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 },
  subtleNote: { fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' },
  assignmentBox: { display: 'flex', gap: 16, alignItems: 'center', background: 'var(--surface-el)', borderRadius: 'var(--radius-sm)', padding: 16, border: '1px solid var(--border)' },
  assignedCountry: { fontWeight: 700, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 3 },
  assignedCommitteeName: { fontSize: 13, color: 'var(--text-2)', marginBottom: 6 },
  committeeChip: { display: 'inline-block', background: 'var(--wine-dim)', color: '#F9A8B8', border: '1px solid rgba(110,30,42,0.3)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 7, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { width: '100%', padding: '10px 14px', background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 },
  prefRow: { display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' },
  prefLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: 90 },
  prefVal: { fontSize: 13, color: 'var(--text)' },
  quickLinks: { display: 'flex', flexDirection: 'column', gap: 6 },
  quickLink: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-el)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 500, border: '1px solid var(--border)', transition: 'border-color 0.15s' },
  alertRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: 'var(--surface-el)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
  alertDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: 4 },
  alertType: { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 },
  alertMsg: { fontSize: 13, color: 'var(--text-2)' },
  alertTime: { fontSize: 11, color: 'var(--text-3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
}
