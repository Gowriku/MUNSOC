import { useEffect, useState } from 'react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button, StatusBadge } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'

const TABS = ['overview', 'delegates', 'payments', 'feedback', 'messages', 'roles']

export default function AdminDashboard() {
  const { toasts, show } = useToast()
  const [activeTab, setActiveTab]   = useState('overview')
  const [summary, setSummary]       = useState(null)
  const [delegates, setDelegates]   = useState([])
  const [feedback, setFeedback]     = useState([])
  const [messages, setMessages]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [payFilter, setPayFilter]   = useState('all')
  const [confirmingId, setConfirmingId] = useState(null)
  const [updatingRole, setUpdatingRole] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [sum, deleg, fb, msgs] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/users/'),
        api.get('/feedback/all'),
        api.get('/messages/'),
      ])
      setSummary(sum.data)
      setDelegates(deleg.data)
      setFeedback(fb.data)
      setMessages(msgs.data)
    } catch (e) {
      show('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentAction = async (userId, status) => {
    setConfirmingId(userId)
    try {
      await api.patch(`/users/${userId}/payment`, null, { params: { status } })
      show(`Payment ${status}`, status === 'confirmed' ? 'success' : 'error')
      fetchAll()
    } catch {
      show('Action failed', 'error')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleRoleUpdate = async (userId, role) => {
    setUpdatingRole(userId)
    try {
      await api.patch(`/users/${userId}/role`, { role })
      show(`Role updated to ${role}`, 'success')
      fetchAll()
    } catch {
      show('Role update failed', 'error')
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleExport = () => {
    window.open('/api/v1/admin/delegates/export', '_blank')
  }

  const handleMarkRead = async (msgId) => {
    try {
      await api.patch(`/messages/${msgId}/read`)
      show('Marked as resolved', 'success')
      fetchAll()
    } catch { show('Failed', 'error') }
  }

  // Filtered delegates
  const filteredDelegates = delegates.filter(d => {
    const matchSearch = !search ||
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.college?.toLowerCase().includes(search.toLowerCase())
    const matchPay = payFilter === 'all' || d.payment_status === payFilter
    return matchSearch && matchPay
  })

  const ROLE_COLORS = { delegate: '#1565c0', volunteer: '#6a1b9a', da_team: '#e65100', admin: '#b71c1c' }

  return (
    <PageLayout title="⚙️ Admin Dashboard" subtitle="Complete overview of MUN registration, payments, and activity." maxWidth={1100}>
      <ToastContainer toasts={toasts} />

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ ...s.tab, ...(activeTab === t ? s.activeTab : {}) }}>
            {t === 'overview'   ? '📊 Overview' :
             t === 'delegates'  ? `👥 Delegates (${delegates.filter(d => d.role === 'delegate').length})` :
             t === 'payments'   ? `💳 Payments` :
             t === 'feedback'   ? `💬 Feedback (${feedback.length})` :
             t === 'messages'   ? `🆘 Messages (${messages.filter(m => !m.is_read).length} unread)` :
             '🛡️ Roles'}
          </button>
        ))}
      </div>

      {loading && <Card style={{ textAlign: 'center', padding: 48 }}><p style={{ color: '#888' }}>Loading...</p></Card>}

      {/* ── OVERVIEW ──────────────────────────────────────────── */}
      {!loading && activeTab === 'overview' && summary && (
        <div>
          {/* Big stat cards */}
          <div style={s.statGrid}>
            {[
              { label: 'Total Delegates', value: summary.delegates.total,             icon: '👥', color: '#1a1a2e' },
              { label: 'Paid',            value: summary.delegates.paid,              icon: '✅', color: '#2e7d32' },
              { label: 'Awaiting Confirm',value: summary.delegates.payment_submitted, icon: '⏳', color: '#e65100' },
              { label: 'Unpaid',          value: summary.delegates.unpaid,            icon: '❌', color: '#c62828' },
              { label: 'Assigned',        value: summary.assignments.assigned,        icon: '📋', color: '#6a1b9a' },
              { label: 'Unassigned',      value: summary.assignments.unassigned,      icon: '⚠️', color: '#f57f17' },
              { label: 'Checked In',      value: summary.attendance.checked_in,       icon: '🎫', color: '#0277bd' },
              { label: 'Not Checked In',  value: summary.attendance.not_checked_in,   icon: '🚫', color: '#888' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={s.statCard}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <div style={{ ...s.statVal, color }}>{value}</div>
                <div style={s.statLabel}>{label}</div>
              </div>
            ))}
          </div>

          {/* Quick action cards */}
          <div style={s.actionGrid}>
            <Card>
              <CardTitle>Pending Actions</CardTitle>
              {summary.delegates.payment_submitted > 0 && (
                <div style={s.actionItem}>
                  <span style={s.actionDot} />
                  <span><strong>{summary.delegates.payment_submitted}</strong> payment{summary.delegates.payment_submitted !== 1 ? 's' : ''} awaiting confirmation</span>
                  <Button onClick={() => { setActiveTab('payments'); setPayFilter('submitted') }} variant="ghost" style={{ fontSize: 12, padding: '4px 10px', marginLeft: 'auto' }}>Review →</Button>
                </div>
              )}
              {summary.assignments.unassigned > 0 && (
                <div style={s.actionItem}>
                  <span style={{ ...s.actionDot, background: '#ff9800' }} />
                  <span><strong>{summary.assignments.unassigned}</strong> delegate{summary.assignments.unassigned !== 1 ? 's' : ''} not yet assigned a portfolio</span>
                </div>
              )}
              {summary.messages.unread > 0 && (
                <div style={s.actionItem}>
                  <span style={{ ...s.actionDot, background: '#f44336' }} />
                  <span><strong>{summary.messages.unread}</strong> unread emergency message{summary.messages.unread !== 1 ? 's' : ''}</span>
                  <Button onClick={() => setActiveTab('messages')} variant="ghost" style={{ fontSize: 12, padding: '4px 10px', marginLeft: 'auto' }}>View →</Button>
                </div>
              )}
              {summary.delegates.payment_submitted === 0 && summary.assignments.unassigned === 0 && summary.messages.unread === 0 && (
                <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>✅ No pending actions</p>
              )}
            </Card>

            <Card>
              <CardTitle>Registration Progress</CardTitle>
              {[
                { label: 'Paid', value: summary.delegates.paid, total: summary.delegates.total, color: '#4caf50' },
                { label: 'Assigned', value: summary.assignments.assigned, total: summary.delegates.total, color: '#2196f3' },
                { label: 'Checked In', value: summary.attendance.checked_in, total: summary.delegates.total, color: '#9c27b0' },
              ].map(({ label, value, total, color }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#888' }}>{value} / {total} ({pct}%)</span>
                    </div>
                    <div style={s.progressTrack}>
                      <div style={{ ...s.progressFill, width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </Card>

            <Card>
              <CardTitle>Quick Actions</CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button onClick={handleExport} variant="secondary" style={{ width: '100%' }}>
                  ⬇ Export All Delegates (CSV)
                </Button>
                <Button onClick={fetchAll} variant="ghost" style={{ width: '100%' }}>
                  ↻ Refresh Dashboard
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── DELEGATES TAB ─────────────────────────────────────── */}
      {!loading && activeTab === 'delegates' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <CardTitle>All Delegates</CardTitle>
            <Button onClick={handleExport} variant="secondary" style={{ fontSize: 13, padding: '7px 14px' }}>⬇ Export CSV</Button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by name, email, college..."
            style={{ ...s.searchInput, marginBottom: 14 }} />

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Name', 'Email', 'College', 'Tier', 'Amount', 'Payment', 'Portfolio', 'Transport'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDelegates.filter(d => d.role === 'delegate').map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={s.td}><strong>{d.name}</strong></td>
                    <td style={{ ...s.td, fontSize: 12, color: '#888' }}>{d.email}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#888' }}>{d.college || '—'}</td>
                    <td style={s.td}><span style={s.tierChip}>{d.reg_tier?.replace(/_/g, ' ') || '—'}</span></td>
                    <td style={{ ...s.td, fontWeight: 600 }}>₹{d.amount_due}</td>
                    <td style={s.td}><StatusBadge status={d.payment_status} /></td>
                    <td style={{ ...s.td, fontSize: 12 }}>—</td>
                    <td style={s.td}>{d.transportation_opted ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDelegates.filter(d => d.role === 'delegate').length === 0 && (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>No delegates found</p>
            )}
          </div>
        </Card>
      )}

      {/* ── PAYMENTS TAB ──────────────────────────────────────── */}
      {!loading && activeTab === 'payments' && (
        <div>
          <div style={s.payFilterRow}>
            {['all', 'pending', 'submitted', 'confirmed', 'rejected'].map(f => (
              <button key={f} onClick={() => setPayFilter(f)}
                style={{ ...s.filterBtn, ...(payFilter === f ? s.filterBtnActive : {}) }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && (
                  <span style={s.filterCount}>
                    {delegates.filter(d => d.payment_status === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {delegates
              .filter(d => d.role === 'delegate' && (payFilter === 'all' || d.payment_status === payFilter))
              .filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase()))
              .map(d => (
                <Card key={d.id} style={{
                  border: d.payment_status === 'submitted' ? '2px solid #ff9800' :
                          d.payment_status === 'confirmed' ? '1px solid #c8e6c9' : '1px solid #e8e8e8',
                  background: d.payment_status === 'submitted' ? '#fff8e1' : 'white',
                }}>
                  <div style={s.payRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                      <div style={{ fontSize: 13, color: '#888' }}>{d.email}</div>
                      {d.college && <div style={{ fontSize: 12, color: '#aaa' }}>{d.college}</div>}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>₹{d.amount_due}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{d.reg_tier?.replace(/_/g, ' ')}</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <StatusBadge status={d.payment_status} />
                      {d.payment_utr && (
                        <div style={s.utrBox}>
                          UTR: <strong style={{ fontFamily: 'monospace' }}>{d.payment_utr}</strong>
                        </div>
                      )}
                      {d.payment_confirmed_at && (
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                          {new Date(d.payment_confirmed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div style={s.payActions}>
                      {d.payment_status === 'submitted' && (
                        <>
                          <Button
                            onClick={() => handlePaymentAction(d.id, 'confirmed')}
                            disabled={confirmingId === d.id}
                            variant="success"
                            style={{ fontSize: 13, padding: '7px 14px' }}
                          >
                            {confirmingId === d.id ? '...' : '✅ Confirm'}
                          </Button>
                          <Button
                            onClick={() => handlePaymentAction(d.id, 'rejected')}
                            disabled={confirmingId === d.id}
                            variant="danger"
                            style={{ fontSize: 13, padding: '7px 14px' }}
                          >
                            ❌ Reject
                          </Button>
                        </>
                      )}
                      {d.payment_status === 'confirmed' && (
                        <span style={{ fontSize: 13, color: '#4caf50', fontWeight: 600 }}>✓ Confirmed</span>
                      )}
                      {(d.payment_status === 'pending' || d.payment_status === 'rejected') && (
                        <span style={{ fontSize: 13, color: '#aaa' }}>Awaiting payment</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ── FEEDBACK TAB ──────────────────────────────────────── */}
      {!loading && activeTab === 'feedback' && (
        <div>
          <div style={s.fbTypeFilter}>
            {['all', 'review', 'query', 'complaint'].map(t => (
              <button key={t} onClick={() => {}}
                style={s.filterBtn}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                <span style={s.filterCount}>{t === 'all' ? feedback.length : feedback.filter(f => f.type === t).length}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedback.map(fb => (
              <Card key={fb.id} style={{ border: fb.type === 'complaint' ? '1px solid #ffcdd2' : '1px solid #e8e8e8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: fb.type === 'review' ? '#fff8e1' : fb.type === 'query' ? '#e3f2fd' : '#ffebee',
                      color: fb.type === 'review' ? '#f57f17' : fb.type === 'query' ? '#0d47a1' : '#b71c1c',
                    }}>
                      {fb.type.toUpperCase()}
                    </span>
                    {fb.is_anonymous && <span style={s.anonBadge}>Anonymous</span>}
                    {fb.is_public && <span style={s.publicBadge}>Public</span>}
                  </div>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(fb.created_at).toLocaleString()}</span>
                </div>
                <p style={s.fbContent}>{fb.content}</p>
                <div style={{ fontSize: 13, color: '#888' }}>
                  — {fb.is_anonymous ? 'Anonymous' : fb.user_name || 'Unknown'}
                  {fb.user_email && !fb.is_anonymous && <span style={{ marginLeft: 6 }}>({fb.user_email})</span>}
                </div>
              </Card>
            ))}
            {feedback.length === 0 && (
              <Card style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ color: '#aaa' }}>No feedback submitted yet</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── MESSAGES TAB ──────────────────────────────────────── */}
      {!loading && activeTab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map(msg => (
            <Card key={msg.id} style={{ border: msg.is_read ? '1px solid #e0e0e0' : '2px solid #ef5350', background: msg.is_read ? 'white' : '#fff5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong>{msg.sender_name}</strong>
                  <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>{msg.sender_email}</span>
                  {msg.sender_phone && <span style={{ fontSize: 13, color: '#1565c0', marginLeft: 8, fontWeight: 600 }}>📞 {msg.sender_phone}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(msg.created_at).toLocaleString()}</span>
                  {!msg.is_read && <span style={{ background: '#ffebee', color: '#c62828', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>UNREAD</span>}
                </div>
              </div>
              <div style={s.msgBody}>{msg.message}</div>
              {msg.reply_text && (
                <div style={{ background: '#e8f0fe', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                  <strong>Reply:</strong> {msg.reply_text}
                </div>
              )}
              {!msg.is_read && (
                <Button onClick={() => handleMarkRead(msg.id)} variant="ghost" style={{ marginTop: 10, fontSize: 12, padding: '5px 12px' }}>
                  ✓ Mark Resolved
                </Button>
              )}
            </Card>
          ))}
          {messages.length === 0 && (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: '#aaa' }}>No emergency messages</p>
            </Card>
          )}
        </div>
      )}

      {/* ── ROLES TAB ─────────────────────────────────────────── */}
      {!loading && activeTab === 'roles' && (
        <Card>
          <CardTitle>User Role Management</CardTitle>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            Change roles for team members. Be careful — admin has full access.
          </p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Name', 'Email', 'Current Role', 'Change Role'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {delegates.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={s.td}><strong>{u.name}</strong></td>
                    <td style={{ ...s.td, fontSize: 13, color: '#888' }}>{u.email}</td>
                    <td style={s.td}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}44` }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={s.td}>
                      <select
                        defaultValue={u.role}
                        disabled={updatingRole === u.id}
                        onChange={e => handleRoleUpdate(u.id, e.target.value)}
                        style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}
                      >
                        {['delegate', 'volunteer', 'da_team', 'admin'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  )
}

const ROLE_COLORS = { delegate: '#1565c0', volunteer: '#6a1b9a', da_team: '#e65100', admin: '#b71c1c' }

const s = {
  tabs: { display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
  tab: { padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#555' },
  activeTab: { background: '#1a1a2e', color: 'white', border: '1px solid #1a1a2e' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: { background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: '20px 16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
  statVal: { fontSize: 36, fontWeight: 800, display: 'block' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  actionItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 },
  actionDot: { width: 8, height: 8, borderRadius: '50%', background: '#4caf50', flexShrink: 0 },
  progressTrack: { height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },
  searchInput: { width: '100%', padding: '9px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#f5f7fa' },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td: { padding: '11px 12px', color: '#333', whiteSpace: 'nowrap' },
  tierChip: { background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' },
  payFilterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: { padding: '8px 14px', border: '1px solid #e0e0e0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#555', display: 'flex', alignItems: 'center', gap: 6 },
  filterBtnActive: { background: '#1a1a2e', color: 'white', border: '1px solid #1a1a2e' },
  filterCount: { background: 'rgba(0,0,0,0.1)', borderRadius: 20, padding: '0px 6px', fontSize: 11, fontWeight: 700 },
  payRow: { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  payActions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  utrBox: { background: '#f5f5f5', borderRadius: 6, padding: '4px 8px', fontSize: 12, marginTop: 4 },
  fbTypeFilter: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  fbContent: { fontSize: 15, color: '#333', lineHeight: 1.6, margin: '0 0 8px', background: '#f8f9fa', borderRadius: 8, padding: '10px 14px' },
  anonBadge: { background: '#f3e5f5', color: '#6a1b9a', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  publicBadge: { background: '#e8f5e9', color: '#2e7d32', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  msgBody: { background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 10 },
}
