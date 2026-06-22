import { useEffect, useState } from 'react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button, StatusBadge } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'

const TABS = ['overview', 'delegates', 'payments', 'feedback', 'messages', 'team', 'fee-tiers', 'roles']

const ROLE_COLORS = { delegate: '#1565c0', volunteer: '#6a1b9a', da_team: '#e65100', admin: '#b71c1c' }

export default function AdminDashboard() {
  const { toasts, show } = useToast()
  const [activeTab, setActiveTab]   = useState('overview')
  const [summary, setSummary]       = useState(null)
  const [users, setUsers]           = useState([])
  const [feedback, setFeedback]     = useState([])
  const [messages, setMessages]     = useState([])
  const [feeTiers, setFeeTiers]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [payFilter, setPayFilter]   = useState('all')
  const [confirmingId, setConfirmingId] = useState(null)
  const [updatingRole, setUpdatingRole] = useState(null)
  const [replyText, setReplyText]   = useState({})
  const [savingTier, setSavingTier] = useState({})
  const [tierEdits, setTierEdits]   = useState({})

  // Add staff form
  const [staffForm, setStaffForm]   = useState({ name: '', email: '', role: 'volunteer', phone: '' })
  const [addingStaff, setAddingStaff] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [sum, allUsers, fb, msgs, tiers] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/users/'),
        api.get('/feedback/all'),
        api.get('/messages/'),
        api.get('/admin/fee-tiers'),
      ])
      setSummary(sum.data)
      setUsers(allUsers.data)
      setFeedback(fb.data)
      setMessages(msgs.data)
      setFeeTiers(tiers.data)
      // Seed tier edits
      const edits = {}
      tiers.data.forEach(t => {
        edits[t.id] = {
          name: t.name,
          amount: t.amount,
          start_date: t.start_date ? toLocalInput(t.start_date) : '',
          deadline: toLocalInput(t.deadline),
          is_active: t.is_active,
        }
      })
      setTierEdits(edits)
    } catch (e) {
      show('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Fee tier helpers ───────────────────────────────────────────

  function toLocalInput(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    // datetime-local format: YYYY-MM-DDTHH:mm
    return d.toISOString().slice(0, 16)
  }

  const updateTierField = (tierId, field, value) => {
    setTierEdits(prev => ({ ...prev, [tierId]: { ...prev[tierId], [field]: value } }))
  }

  const handleSaveTier = async (tierId) => {
    setSavingTier(prev => ({ ...prev, [tierId]: true }))
    const edit = tierEdits[tierId]
    try {
      await api.patch(`/admin/fee-tiers/${tierId}`, {
        name: edit.name,
        amount: parseFloat(edit.amount),
        start_date: edit.start_date ? new Date(edit.start_date).toISOString() : null,
        deadline: new Date(edit.deadline).toISOString(),
        is_active: edit.is_active,
      })
      show(`Fee tier "${edit.name}" saved`, 'success')
      fetchAll()
    } catch {
      show('Failed to save tier', 'error')
    } finally {
      setSavingTier(prev => ({ ...prev, [tierId]: false }))
    }
  }

  // ── Payment actions ────────────────────────────────────────────

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

  // ── Role update ────────────────────────────────────────────────

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

  // ── Messages / emergency replies ──────────────────────────────

  const handleReply = async (msgId) => {
    const text = replyText[msgId]
    if (!text?.trim()) {
      // Just mark resolved with no reply
    }
    try {
      await api.patch(`/messages/${msgId}/read`, null, { params: { reply: text?.trim() || undefined } })
      show('Resolved', 'success')
      setReplyText(prev => ({ ...prev, [msgId]: '' }))
      fetchAll()
    } catch { show('Failed', 'error') }
  }

  // ── Add staff ──────────────────────────────────────────────────

  const handleAddStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) return show('Name and email required', 'warning')
    setAddingStaff(true)
    try {
      await api.post('/admin/staff/add', staffForm)
      show(`${staffForm.role} account created for ${staffForm.email}`, 'success')
      setStaffForm({ name: '', email: '', role: 'volunteer', phone: '' })
      fetchAll()
    } catch (e) {
      show(e.response?.data?.detail || 'Failed to create account', 'error')
    } finally {
      setAddingStaff(false)
    }
  }

  // ── Derived data ───────────────────────────────────────────────

  const delegates  = users.filter(u => u.role === 'delegate')
  const team       = users.filter(u => u.role !== 'delegate')
  const unreadMsgs = messages.filter(m => !m.is_read).length

  const filteredDelegates = delegates.filter(d => {
    const matchSearch = !search ||
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.college?.toLowerCase().includes(search.toLowerCase())
    const matchPay = payFilter === 'all' || d.payment_status === payFilter
    return matchSearch && matchPay
  })

  const TabBtn = ({ tab, label }) => (
    <button onClick={() => setActiveTab(tab)}
      style={{ ...s.tab, ...(activeTab === tab ? s.activeTab : {}) }}>
      {label}
    </button>
  )

  return (
    <PageLayout title="⚙️ Admin Portal" subtitle="Full control — delegates, payments, team, and event settings." maxWidth={1100}>
      <ToastContainer toasts={toasts} />

      <div style={s.tabs}>
        <TabBtn tab="overview"   label="📊 Overview" />
        <TabBtn tab="delegates"  label={`👥 Delegates (${delegates.length})`} />
        <TabBtn tab="payments"   label="💳 Payments" />
        <TabBtn tab="messages"   label={`🆘 Emergency${unreadMsgs > 0 ? ` (${unreadMsgs})` : ''}`} />
        <TabBtn tab="feedback"   label={`💬 Feedback (${feedback.length})`} />
        <TabBtn tab="team"       label={`🧑‍💼 Team (${team.length})`} />
        <TabBtn tab="fee-tiers"  label="⏰ Fee Tiers" />
        <TabBtn tab="roles"      label="🛡️ Roles" />
      </div>

      {loading && <Card style={{ textAlign: 'center', padding: 48 }}><p style={{ color: '#888' }}>Loading...</p></Card>}

      {/* ── OVERVIEW ────────────────────────────────────────────── */}
      {!loading && activeTab === 'overview' && summary && (
        <div>
          <div style={s.statGrid}>
            {[
              { label: 'Total Delegates',  value: summary.delegates.total,              icon: '👥', color: '#1a1a2e' },
              { label: 'Paid',             value: summary.delegates.paid,               icon: '✅', color: '#2e7d32' },
              { label: 'Awaiting Confirm', value: summary.delegates.payment_submitted,  icon: '⏳', color: '#e65100' },
              { label: 'Unpaid',           value: summary.delegates.unpaid,             icon: '❌', color: '#c62828' },
              { label: 'Assigned',         value: summary.assignments.assigned,         icon: '📋', color: '#6a1b9a' },
              { label: 'Unassigned',       value: summary.assignments.unassigned,       icon: '⚠️', color: '#f57f17' },
              { label: 'Checked In',       value: summary.attendance.checked_in,        icon: '🎫', color: '#0277bd' },
              { label: 'Not Checked In',   value: summary.attendance.not_checked_in,    icon: '🚫', color: '#888' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={s.statCard}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <div style={{ ...s.statVal, color }}>{value}</div>
                <div style={s.statLabel}>{label}</div>
              </div>
            ))}
          </div>

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
              {summary.messages.unread > 0 && (
                <div style={s.actionItem}>
                  <span style={{ ...s.actionDot, background: '#f44336' }} />
                  <span><strong>{summary.messages.unread}</strong> unread emergency message{summary.messages.unread !== 1 ? 's' : ''}</span>
                  <Button onClick={() => setActiveTab('messages')} variant="ghost" style={{ fontSize: 12, padding: '4px 10px', marginLeft: 'auto' }}>View →</Button>
                </div>
              )}
              {summary.delegates.payment_submitted === 0 && summary.messages.unread === 0 && (
                <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>✅ No pending actions</p>
              )}
            </Card>

            <Card>
              <CardTitle>Registration Progress</CardTitle>
              {[
                { label: 'Paid',        value: summary.delegates.paid,               total: summary.delegates.total, color: '#4caf50' },
                { label: 'Assigned',    value: summary.assignments.assigned,          total: summary.delegates.total, color: '#2196f3' },
                { label: 'Checked In',  value: summary.attendance.checked_in,         total: summary.delegates.total, color: '#9c27b0' },
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
                <Button onClick={() => window.open('/api/v1/admin/delegates/export', '_blank')} variant="secondary" style={{ width: '100%' }}>
                  ⬇ Export Delegates CSV
                </Button>
                <Button onClick={() => setActiveTab('fee-tiers')} variant="ghost" style={{ width: '100%' }}>
                  ⏰ Manage Fee Tier Timers
                </Button>
                <Button onClick={() => setActiveTab('team')} variant="ghost" style={{ width: '100%' }}>
                  ➕ Add Team Member
                </Button>
                <Button onClick={fetchAll} variant="ghost" style={{ width: '100%' }}>↻ Refresh</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── DELEGATES TAB ───────────────────────────────────────── */}
      {!loading && activeTab === 'delegates' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <CardTitle>All Delegates</CardTitle>
            <Button onClick={() => window.open('/api/v1/admin/delegates/export', '_blank')} variant="secondary" style={{ fontSize: 13, padding: '7px 14px' }}>⬇ Export CSV</Button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by name, email, college..."
            style={{ ...s.searchInput, marginBottom: 14 }} />
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Name', 'Email', 'College', 'Tier', 'Amount', 'Payment', 'Transport'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDelegates.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={s.td}><strong>{d.name}</strong></td>
                    <td style={{ ...s.td, fontSize: 12, color: '#888' }}>{d.email}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#888' }}>{d.college || '—'}</td>
                    <td style={s.td}><span style={s.tierChip}>{d.reg_tier?.replace(/_/g, ' ') || '—'}</span></td>
                    <td style={{ ...s.td, fontWeight: 600 }}>₹{d.amount_due}</td>
                    <td style={s.td}><StatusBadge status={d.payment_status} /></td>
                    <td style={s.td}>{d.transportation_opted ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDelegates.length === 0 && <p style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>No delegates found</p>}
          </div>
        </Card>
      )}

      {/* ── PAYMENTS TAB ────────────────────────────────────────── */}
      {!loading && activeTab === 'payments' && (
        <div>
          <div style={s.payFilterRow}>
            {['all', 'pending', 'submitted', 'confirmed', 'rejected'].map(f => (
              <button key={f} onClick={() => setPayFilter(f)}
                style={{ ...s.filterBtn, ...(payFilter === f ? s.filterBtnActive : {}) }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && <span style={s.filterCount}>{delegates.filter(d => d.payment_status === f).length}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {delegates
              .filter(d => payFilter === 'all' || d.payment_status === payFilter)
              .map(d => (
                <Card key={d.id} style={{
                  border: d.payment_status === 'submitted' ? '2px solid #ff9800' : d.payment_status === 'confirmed' ? '1px solid #c8e6c9' : '1px solid #e8e8e8',
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
                      {d.payment_utr && <div style={s.utrBox}>UTR: <strong style={{ fontFamily: 'monospace' }}>{d.payment_utr}</strong></div>}
                    </div>
                    <div style={s.payActions}>
                      {d.payment_status === 'submitted' && (
                        <>
                          <Button onClick={() => handlePaymentAction(d.id, 'confirmed')} disabled={confirmingId === d.id} variant="success" style={{ fontSize: 13, padding: '7px 14px' }}>
                            {confirmingId === d.id ? '...' : '✅ Confirm'}
                          </Button>
                          <Button onClick={() => handlePaymentAction(d.id, 'rejected')} disabled={confirmingId === d.id} variant="danger" style={{ fontSize: 13, padding: '7px 14px' }}>
                            ❌ Reject
                          </Button>
                        </>
                      )}
                      {d.payment_status === 'confirmed' && <span style={{ fontSize: 13, color: '#4caf50', fontWeight: 600 }}>✓ Confirmed</span>}
                      {(d.payment_status === 'pending' || d.payment_status === 'rejected') && <span style={{ fontSize: 13, color: '#aaa' }}>Awaiting payment</span>}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ── EMERGENCY MESSAGES TAB ──────────────────────────────── */}
      {!loading && activeTab === 'messages' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>🆘 Emergency Messages from Delegates</h3>
            <Button onClick={fetchAll} variant="ghost" style={{ fontSize: 13 }}>↻ Refresh</Button>
          </div>
          {messages.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 48 }}><p style={{ color: '#aaa' }}>No emergency messages</p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                      {!msg.is_read && <span style={s.urgentBadge}>UNREAD</span>}
                      {msg.is_read && <span style={s.resolvedBadge}>Resolved</span>}
                    </div>
                  </div>
                  <div style={s.msgBody}>{msg.message}</div>
                  {msg.reply_text && (
                    <div style={{ background: '#e8f0fe', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}>
                      <strong>Admin Reply:</strong> {msg.reply_text}
                    </div>
                  )}
                  {!msg.is_read && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={replyText[msg.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Type reply (optional)..."
                        style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                      />
                      <Button onClick={() => handleReply(msg.id)} variant="success" style={{ fontSize: 13 }}>✓ Resolve</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FEEDBACK TAB ────────────────────────────────────────── */}
      {!loading && activeTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feedback.map(fb => (
            <Card key={fb.id} style={{ border: fb.type === 'complaint' ? '1px solid #ffcdd2' : '1px solid #e8e8e8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: fb.type === 'review' ? '#fff8e1' : fb.type === 'query' ? '#e3f2fd' : '#ffebee',
                    color: fb.type === 'review' ? '#f57f17' : fb.type === 'query' ? '#0d47a1' : '#b71c1c' }}>
                    {fb.type?.toUpperCase()}
                  </span>
                  {fb.is_anonymous && <span style={s.anonBadge}>Anonymous</span>}
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
          {feedback.length === 0 && <Card style={{ textAlign: 'center', padding: 48 }}><p style={{ color: '#aaa' }}>No feedback yet</p></Card>}
        </div>
      )}

      {/* ── TEAM TAB ────────────────────────────────────────────── */}
      {!loading && activeTab === 'team' && (
        <div>
          {/* Add Staff Form */}
          <Card style={{ marginBottom: 20, border: '2px solid #e8f0fe' }}>
            <CardTitle>➕ Add New Team Member</CardTitle>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
              Create a volunteer or DA team account. They'll log in with their email via Google.
            </p>
            <div style={s.staffFormGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Full Name *</label>
                <input value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Full name" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Email *</label>
                <input value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com" type="email" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Phone</label>
                <input value={staffForm.phone} onChange={e => setStaffForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Role *</label>
                <select value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))} style={s.select}>
                  <option value="volunteer">Volunteer</option>
                  <option value="da_team">DA Team</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <Button onClick={handleAddStaff} disabled={addingStaff} style={{ marginTop: 8 }}>
              {addingStaff ? 'Creating...' : '➕ Create Account'}
            </Button>
          </Card>

          {/* Existing team members */}
          <Card>
            <CardTitle>Current Team ({team.length})</CardTitle>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['Name', 'Email', 'Phone', 'Role', 'Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {team.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={s.td}><strong>{u.name}</strong></td>
                      <td style={{ ...s.td, fontSize: 12, color: '#888' }}>{u.email}</td>
                      <td style={{ ...s.td, fontSize: 12, color: '#888' }}>{u.phone || '—'}</td>
                      <td style={s.td}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}44` }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: '#aaa' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {team.length === 0 && <p style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>No team members yet</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── FEE TIERS TAB ───────────────────────────────────────── */}
      {!loading && activeTab === 'fee-tiers' && (
        <div>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
            Set the start and end (deadline) times for each registration fee tier.
            The active tier is determined automatically: when the current time falls within a tier's window, delegates are assigned that tier's fee on profile completion.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {feeTiers.map(tier => {
              const edit = tierEdits[tier.id] || {}
              const isSaving = savingTier[tier.id]
              const now = new Date()
              const start = edit.start_date ? new Date(edit.start_date) : null
              const end = edit.deadline ? new Date(edit.deadline) : null
              const isLive = tier.is_active && start && end && now >= start && now <= end
              const isPast = end && now > end
              const isUpcoming = start && now < start

              return (
                <Card key={tier.id} style={{
                  border: isLive ? '2px solid #4caf50' : isPast ? '1px solid #ddd' : '1px solid #e3f2fd',
                  background: isLive ? '#f1f8f1' : isPast ? '#fafafa' : 'white',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, fontWeight: 800 }}>{tier.name}</span>
                        <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                          {tier.tier_key}
                        </span>
                        {isLive && <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>● ACTIVE NOW</span>}
                        {isPast && <span style={{ background: '#f5f5f5', color: '#aaa', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ENDED</span>}
                        {isUpcoming && <span style={{ background: '#fff8e1', color: '#e65100', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>UPCOMING</span>}
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={edit.is_active ?? tier.is_active}
                        onChange={e => updateTierField(tier.id, 'is_active', e.target.checked)} />
                      Enabled
                    </label>
                  </div>

                  <div style={s.tierFormGrid}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Display Name</label>
                      <input value={edit.name ?? tier.name}
                        onChange={e => updateTierField(tier.id, 'name', e.target.value)}
                        style={s.input} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Amount (₹)</label>
                      <input type="number" value={edit.amount ?? tier.amount}
                        onChange={e => updateTierField(tier.id, 'amount', e.target.value)}
                        style={s.input} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>📅 Start Date & Time</label>
                      <input type="datetime-local" value={edit.start_date || ''}
                        onChange={e => updateTierField(tier.id, 'start_date', e.target.value)}
                        style={s.input} />
                      <span style={s.fieldHint}>When this tier opens for registration</span>
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>📅 End Date & Time (Deadline)</label>
                      <input type="datetime-local" value={edit.deadline || ''}
                        onChange={e => updateTierField(tier.id, 'deadline', e.target.value)}
                        style={s.input} />
                      <span style={s.fieldHint}>Registration at this tier closes after this</span>
                    </div>
                  </div>

                  {edit.start_date && edit.deadline && (
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 12, color: '#555' }}>
                      Window: <strong>{new Date(edit.start_date).toLocaleString()}</strong> → <strong>{new Date(edit.deadline).toLocaleString()}</strong>
                      <span style={{ marginLeft: 12, color: '#888' }}>
                        ({Math.ceil((new Date(edit.deadline) - new Date(edit.start_date)) / (1000 * 60 * 60 * 24))} days)
                      </span>
                    </div>
                  )}

                  <Button onClick={() => handleSaveTier(tier.id)} disabled={isSaving} style={{ fontSize: 13 }}>
                    {isSaving ? 'Saving...' : '💾 Save Timer'}
                  </Button>
                </Card>
              )
            })}
            {feeTiers.length === 0 && (
              <Card style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ color: '#aaa' }}>No fee tiers configured. Add them in the database seed or backend admin.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES TAB ───────────────────────────────────────────── */}
      {!loading && activeTab === 'roles' && (
        <Card>
          <CardTitle>User Role Management</CardTitle>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
            Changing a delegate to volunteer/DA will remove their registration, preferences, and QR data.
          </p>
          <p style={{ color: '#c62828', fontSize: 13, marginBottom: 16 }}>
            ⚠️ This action is not easily reversible — the delegate would need to re-register.
          </p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Name', 'Email', 'Current Role', 'Change Role'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
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
                      <select defaultValue={u.role} disabled={updatingRole === u.id}
                        onChange={e => {
                          if (u.role === 'delegate' && e.target.value !== 'delegate') {
                            if (!window.confirm(`Change ${u.name} from delegate to ${e.target.value}? This will remove their registration data.`)) return
                          }
                          handleRoleUpdate(u.id, e.target.value)
                        }}
                        style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}>
                        {['delegate', 'volunteer', 'da_team', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
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

const s = {
  tabs: { display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
  tab: { padding: '9px 14px', border: '1px solid #e0e0e0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', color: '#555' },
  activeTab: { background: '#1a1a2e', color: 'white', border: '1px solid #1a1a2e' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: { background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: '18px 14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
  statVal: { fontSize: 34, fontWeight: 800, display: 'block' },
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
  tierChip: { background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  payFilterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: { padding: '8px 14px', border: '1px solid #e0e0e0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#555', display: 'flex', alignItems: 'center', gap: 6 },
  filterBtnActive: { background: '#1a1a2e', color: 'white', border: '1px solid #1a1a2e' },
  filterCount: { background: 'rgba(0,0,0,0.1)', borderRadius: 20, padding: '0px 6px', fontSize: 11 },
  payRow: { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  payActions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  utrBox: { background: '#f5f5f5', borderRadius: 6, padding: '4px 8px', fontSize: 12, marginTop: 4 },
  urgentBadge: { background: '#ffebee', color: '#c62828', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700 },
  resolvedBadge: { background: '#e8f5e9', color: '#2e7d32', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700 },
  msgBody: { background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 10 },
  fbContent: { fontSize: 15, color: '#333', lineHeight: 1.6, margin: '0 0 8px', background: '#f8f9fa', borderRadius: 8, padding: '10px 14px' },
  anonBadge: { background: '#f3e5f5', color: '#6a1b9a', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  staffFormGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 8 },
  tierFormGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 12 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: '#333' },
  input: { padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  select: { padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'white', outline: 'none' },
  fieldHint: { fontSize: 11, color: '#aaa', marginTop: 2 },
}
