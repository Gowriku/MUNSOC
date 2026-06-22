import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
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

  // Profile completion fields
  const [phone, setPhone]     = useState(user?.phone || '')
  const [college, setCollege] = useState(user?.college || '')
  const [transport, setTransport] = useState(user?.transportation_opted || false)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (user) {
      setPhone(user.phone || '')
      setCollege(user.college || '')
      setTransport(user.transportation_opted || false)
    }
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
      show('Profile updated!', 'success')
    } catch {
      show('Failed to save profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  if (!user || pageLoading) return (
    <PageLayout title="Dashboard">
      <SkeletonDashboard />
    </PageLayout>
  )

  const ALERT_ICONS = { session_start: '🟢', session_end: '🔴', break_start: '☕', break_end: '⏰', custom: '📢' }

  return (
    <PageLayout title={`Welcome, ${user.name.split(' ')[0]} 👋`} subtitle="Your MUN registration dashboard">
      <ToastContainer toasts={toasts} />

      {/* Profile incomplete warning */}
      {!profileComplete && (
        <div style={s.warningBanner}>
          ⚠️ Complete your profile below to lock in your registration fee tier.
        </div>
      )}

      <div style={s.grid}>

        {/* Registration Status */}
        <Card>
          <CardTitle>Registration Status</CardTitle>
          <div style={s.statusRow}>
            <StatusBadge status={user.payment_status} />
            {user.reg_tier && (
              <span style={s.tierPill}>{user.reg_tier.replace(/_/g, ' ')}</span>
            )}
          </div>
          {user.amount_due > 0 && (
            <div style={s.amountRow}>
              <span style={s.amountLabel}>Amount Due</span>
              <span style={s.amountVal}>₹{user.amount_due}</span>
            </div>
          )}
          <div style={s.actionRow}>
            {(user.payment_status === 'pending' || user.payment_status === 'rejected') && (
              <Link to="/payment"><Button>Pay Now →</Button></Link>
            )}
            {user.payment_status === 'submitted' && (
              <p style={{ color: '#888', fontSize: 14, margin: 0 }}>⏳ Awaiting admin confirmation</p>
            )}
            {user.payment_status === 'confirmed' && (
              <Link to="/my-qr"><Button variant="success">View QR Pass →</Button></Link>
            )}
          </div>
        </Card>

        {/* Portfolio Assignment */}
        <Card>
          <CardTitle>Your Portfolio</CardTitle>
          {assignment ? (
            <div style={s.assignmentBox}>
              <div style={s.assignmentFlag}>
                {assignment.portfolio?.flag_url && (
                  <img src={assignment.portfolio.flag_url} alt="" style={{ width: 48 }} />
                )}
              </div>
              <div style={s.assignmentInfo}>
                <div style={s.assignedCountry}>{assignment.portfolio?.country_name}</div>
                <div style={s.assignedCommittee}>{assignment.portfolio?.committee?.name}</div>
                <div style={s.assignedCommitteeAbbr}>{assignment.portfolio?.committee?.abbreviation}</div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: '#888', fontSize: 14, margin: '0 0 16px' }}>
                Not assigned yet. Submit your preferences so the DA team can assign you a portfolio.
              </p>
              <Link to="/preferences"><Button variant="ghost">Choose Preferences →</Button></Link>
            </div>
          )}
        </Card>

        {/* Profile Completion */}
        <Card>
          <CardTitle>Your Profile</CardTitle>
          <div style={s.formGroup}>
            <label style={s.label}>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" style={s.input} />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>College / Institution</label>
            <input value={college} onChange={e => setCollege(e.target.value)} placeholder="Your college name" style={s.input} />
          </div>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} />
            I need transportation to the venue
          </label>
          <Button onClick={handleSaveProfile} disabled={savingProfile} style={{ marginTop: 14, width: '100%' }}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </Card>

        {/* Preferences summary */}
        <Card>
          <CardTitle>Portfolio Preferences</CardTitle>
          {preferences ? (
            <div>
              {[
                { slot: 'pref1', label: '1st Choice', portfolio: preferences.pref1 },
                { slot: 'pref2', label: '2nd Choice', portfolio: preferences.pref2 },
                { slot: 'pref3', label: '3rd Choice', portfolio: preferences.pref3 },
              ].map(({ slot, label, portfolio }) => (
                <div key={slot} style={s.prefRow}>
                  <span style={s.prefLabel}>{label}</span>
                  <span style={s.prefVal}>
                    {portfolio ? `${portfolio.country_name} (${portfolio.committee?.abbreviation})` : <em style={{ color: '#ccc' }}>—</em>}
                  </span>
                </div>
              ))}
              {!assignment && (
                <Link to="/preferences"><Button variant="ghost" style={{ width: '100%', marginTop: 12 }}>Edit Preferences</Button></Link>
              )}
            </div>
          ) : (
            <div>
              <p style={{ color: '#888', fontSize: 14, margin: '0 0 16px' }}>You haven't submitted preferences yet.</p>
              <Link to="/preferences"><Button>Choose Preferences →</Button></Link>
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <Card>
          <CardTitle>Quick Actions</CardTitle>
          <div style={s.quickLinks}>
            {[
              { to: '/preferences', icon: '📋', label: 'Portfolio Preferences' },
              { to: '/payment',     icon: '💳', label: 'Registration Payment' },
              { to: '/my-qr',       icon: '📱', label: 'My Delegate QR Pass' },
              { to: '/emergency',   icon: '🆘', label: 'Emergency Contact' },
              { to: '/feedback',    icon: '💬', label: 'Reviews & Feedback' },
            ].map(({ to, icon, label }) => (
              <Link key={to} to={to} style={s.quickLink}>
                <span>{icon}</span>
                <span>{label}</span>
                <span style={{ marginLeft: 'auto', color: '#ccc' }}>›</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardTitle>Recent Committee Alerts</CardTitle>
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(a => (
                <div key={a.id} style={s.alertRow}>
                  <span style={{ fontSize: 18 }}>{ALERT_ICONS[a.type] || '📢'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={s.alertType}>{a.type.replace(/_/g, ' ')}</div>
                    <div style={s.alertMsg}>{a.message}</div>
                  </div>
                  <div style={s.alertTime}>{new Date(a.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#bbb', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
              No alerts yet. Alerts will appear here when volunteers send them.
            </p>
          )}
        </Card>

      </div>
    </PageLayout>
  )
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  warningBanner: { background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#e65100', fontSize: 14 },
  statusRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  tierPill: { background: '#e8f0fe', color: '#3f51b5', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid #c5cae9' },
  amountRow: { display: 'flex', justifyContent: 'space-between', background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 14 },
  amountLabel: { color: '#666', fontSize: 14 },
  amountVal: { fontWeight: 700, fontSize: 18, color: '#1a1a2e' },
  actionRow: { marginTop: 4 },
  assignmentBox: { display: 'flex', gap: 14, alignItems: 'center', background: '#f0f4ff', borderRadius: 10, padding: 16 },
  assignmentFlag: { flexShrink: 0 },
  assignmentInfo: {},
  assignedCountry: { fontWeight: 700, fontSize: 18, color: '#1a1a2e' },
  assignedCommittee: { fontSize: 13, color: '#555', marginTop: 2 },
  assignedCommitteeAbbr: { display: 'inline-block', background: '#1a1a2e', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4, marginTop: 4, fontWeight: 700 },
  formGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: '#444' },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 7, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#444', cursor: 'pointer' },
  prefRow: { display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' },
  prefLabel: { fontSize: 12, fontWeight: 600, color: '#888', minWidth: 80 },
  prefVal: { fontSize: 14, color: '#333' },
  quickLinks: { display: 'flex', flexDirection: 'column', gap: 6 },
  quickLink: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#f8f9fa', borderRadius: 8, textDecoration: 'none', color: '#1a1a2e', fontSize: 14, fontWeight: 500, border: '1px solid #f0f0f0' },
  alertRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: '#f8f9fa', borderRadius: 8 },
  alertType: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  alertMsg: { fontSize: 13, color: '#333', marginTop: 2 },
  alertTime: { fontSize: 11, color: '#bbb', flexShrink: 0, marginTop: 2 },
}