import { useEffect, useState } from 'react'
import { 
  Users, CreditCard, MessageSquare, Shield, Clock, Key, AlertTriangle,
  LayoutDashboard, Download, RefreshCw, Plus, Save, Phone, Mail, CheckCircle, 
  XCircle, Clock3, AlertCircle, FileText, Check, ChevronRight, Activity,
  Search // <-- Added this to fix the 'Search not defined' crash
} from 'lucide-react'
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

  const TabBtn = ({ tab, label, icon: Icon, badge }) => (
    <button onClick={() => setActiveTab(tab)} style={{ ...s.tab, ...(activeTab === tab ? s.activeTab : {}) }}>
      <Icon size={14} />
      <span>{label}</span>
      {badge > 0 && <span style={s.tabBadge}>{badge}</span>}
    </button>
  )

  return (
    <PageLayout title="Secretariat Portal" subtitle="Full control — delegates, payments, team, and event settings." maxWidth={1150}>
      <ToastContainer toasts={toasts} />

      <div style={s.tabs}>
        <TabBtn tab="overview"   icon={LayoutDashboard} label="Overview" />
        <TabBtn tab="delegates"  icon={Users}           label="Delegates" badge={delegates.length} />
        <TabBtn tab="payments"   icon={CreditCard}      label="Payments" />
        <TabBtn tab="messages"   icon={AlertTriangle}   label="Emergency" badge={unreadMsgs} />
        <TabBtn tab="feedback"   icon={MessageSquare}   label="Feedback" badge={feedback.length} />
        <TabBtn tab="team"       icon={Shield}          label="Team" badge={team.length} />
        <TabBtn tab="fee-tiers"  icon={Clock}           label="Fee Tiers" />
        <TabBtn tab="roles"      icon={Key}             label="Roles" />
      </div>

      {loading && (
        <Card style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={24} className="spin" color="var(--text-3)" />
        </Card>
      )}

      {/* ── OVERVIEW ────────────────────────────────────────────── */}
      {!loading && activeTab === 'overview' && summary && (
        <div style={s.fadeEnter}>
          <div style={s.statGrid}>
            {[
              { label: 'Total Delegates',  value: summary.delegates.total,              icon: Users,        color: 'var(--text)' },
              { label: 'Paid',             value: summary.delegates.paid,               icon: CheckCircle,  color: '#4caf50' },
              { label: 'Awaiting Confirm', value: summary.delegates.payment_submitted,  icon: Clock3,       color: '#f59e0b' },
              { label: 'Unpaid',           value: summary.delegates.unpaid,             icon: XCircle,      color: '#ef4444' },
              { label: 'Assigned',         value: summary.assignments.assigned,         icon: FileText,     color: 'var(--gold)' },
              { label: 'Unassigned',       value: summary.assignments.unassigned,       icon: AlertCircle,  color: '#8b5cf6' },
              { label: 'Checked In',       value: summary.attendance.checked_in,        icon: Activity,     color: '#06b6d4' },
              { label: 'Not Checked In',   value: summary.attendance.not_checked_in,    icon: Users,        color: 'var(--text-3)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={s.statCard}>
                <div style={{ ...s.statIconWrap, color }}>
                  <Icon size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={s.statVal}>{value}</span>
                  <span style={s.statLabel}>{label}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={s.actionGrid}>
            <Card gold>
              <CardTitle icon={<AlertTriangle size={14} />}>Pending Actions</CardTitle>
              {summary.delegates.payment_submitted > 0 && (
                <div style={s.actionItem}>
                  <div style={s.actionDot} />
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong style={{ color: 'var(--text)' }}>{summary.delegates.payment_submitted}</strong> payment{summary.delegates.payment_submitted !== 1 ? 's' : ''} awaiting confirmation
                  </div>
                  <Button onClick={() => { setActiveTab('payments'); setPayFilter('submitted') }} variant="secondary" style={s.actionBtn}>Review <ChevronRight size={12} /></Button>
                </div>
              )}
              {summary.messages.unread > 0 && (
                <div style={s.actionItem}>
                  <div style={{ ...s.actionDot, background: '#ef4444' }} />
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong style={{ color: 'var(--text)' }}>{summary.messages.unread}</strong> unread emergency message{summary.messages.unread !== 1 ? 's' : ''}
                  </div>
                  <Button onClick={() => setActiveTab('messages')} variant="secondary" style={s.actionBtn}>View <ChevronRight size={12} /></Button>
                </div>
              )}
              {summary.delegates.payment_submitted === 0 && summary.messages.unread === 0 && (
                <div style={s.emptyState}>
                  <CheckCircle size={20} color="var(--gold)" style={{ opacity: 0.5, marginBottom: 8 }} />
                  <p style={s.mutedText}>All clear. No pending actions.</p>
                </div>
              )}
            </Card>

            <Card>
              <CardTitle icon={<Activity size={14} />}>Registration Progress</CardTitle>
              {[
                { label: 'Payments Completed', value: summary.delegates.paid,         total: summary.delegates.total, color: 'var(--gold)' },
                { label: 'Portfolios Assigned',value: summary.assignments.assigned,   total: summary.delegates.total, color: 'var(--wine)' },
                { label: 'Event Check-ins',    value: summary.attendance.checked_in,  total: summary.delegates.total, color: '#06b6d4' },
              ].map(({ label, value, total, color }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0
                return (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                      <span style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{value} / {total} ({pct}%)</span>
                    </div>
                    <div style={s.progressTrack}>
                      <div style={{ ...s.progressFill, width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </Card>

            <Card>
              <CardTitle icon={<Shield size={14} />}>Quick Actions</CardTitle>
              <div style={s.quickLinks}>
                <Button onClick={() => window.open('/api/v1/admin/delegates/export', '_blank')} variant="secondary" icon={<Download size={13} />} style={{ width: '100%', justifyContent: 'flex-start' }}>
                  Export Delegates CSV
                </Button>
                <Button onClick={() => setActiveTab('fee-tiers')} variant="ghost" icon={<Clock size={13} />} style={{ width: '100%', justifyContent: 'flex-start' }}>
                  Manage Fee Tier Timers
                </Button>
                <Button onClick={() => setActiveTab('team')} variant="ghost" icon={<Plus size={13} />} style={{ width: '100%', justifyContent: 'flex-start' }}>
                  Add Team Member
                </Button>
                <Button onClick={fetchAll} variant="ghost" icon={<RefreshCw size={13} />} style={{ width: '100%', justifyContent: 'flex-start' }}>
                  Refresh Dashboard
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── DELEGATES TAB ───────────────────────────────────────── */}
      {!loading && activeTab === 'delegates' && (
        <Card style={s.fadeEnter}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <CardTitle icon={<Users size={14} />}>Master Delegate Database</CardTitle>
            <Button onClick={() => window.open('/api/v1/admin/delegates/export', '_blank')} variant="secondary" icon={<Download size={13} />}>Export CSV</Button>
          </div>
          <div style={s.searchWrap}>
            <Search size={16} color="var(--text-3)" style={s.searchIcon} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, college..."
              style={s.searchInput} />
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Name', 'Email', 'Institution', 'Tier', 'Amount', 'Payment', 'Transport'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDelegates.map(d => (
                  <tr key={d.id} style={s.tr}>
                    <td style={s.td}><strong style={{ color: 'var(--text)' }}>{d.name}</strong></td>
                    <td style={{ ...s.td, color: 'var(--text-3)' }}>{d.email}</td>
                    <td style={{ ...s.td, color: 'var(--text-3)' }}>{d.college || '—'}</td>
                    <td style={s.td}><span style={s.tierPill}>{d.reg_tier?.replace(/_/g, ' ') || '—'}</span></td>
                    <td style={{ ...s.td, fontWeight: 700, color: 'var(--text)' }}>₹{d.amount_due}</td>
                    <td style={s.td}><StatusBadge status={d.payment_status} /></td>
                    <td style={s.td}>{d.transportation_opted ? <Check size={16} color="#4caf50" /> : <XCircle size={16} color="var(--text-3)" opacity={0.3} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDelegates.length === 0 && <div style={s.emptyState}><p style={s.mutedText}>No delegates match your criteria.</p></div>}
          </div>
        </Card>
      )}

      {/* ── PAYMENTS TAB ────────────────────────────────────────── */}
      {!loading && activeTab === 'payments' && (
        <div style={s.fadeEnter}>
          <div style={s.payFilterRow}>
            {['all', 'pending', 'submitted', 'confirmed', 'rejected'].map(f => (
              <button key={f} onClick={() => setPayFilter(f)} style={{ ...s.filterBtn, ...(payFilter === f ? s.filterBtnActive : {}) }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && <span style={s.filterCount}>{delegates.filter(d => d.payment_status === f).length}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {delegates
              .filter(d => payFilter === 'all' || d.payment_status === payFilter)
              .map(d => (
                <Card key={d.id} style={{
                  ...(d.payment_status === 'submitted' ? { border: '1px solid var(--gold)', background: 'rgba(201,162,39,0.03)' } : {}),
                }}>
                  <div style={s.payRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 2 }}>{d.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{d.email} {d.college && `• ${d.college}`}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right', paddingRight: 20 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>₹{d.amount_due}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.reg_tier?.replace(/_/g, ' ')}</div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: 140 }}>
                      <StatusBadge status={d.payment_status} />
                      {d.payment_utr && <div style={s.utrBox}>UTR: <span>{d.payment_utr}</span></div>}
                    </div>

                    <div style={s.payActions}>
                      {d.payment_status === 'submitted' && (
                        <>
                          <Button onClick={() => handlePaymentAction(d.id, 'confirmed')} disabled={confirmingId === d.id} style={{ background: '#4caf50', color: 'white', border: 'none' }}>
                            {confirmingId === d.id ? '...' : 'Verify'}
                          </Button>
                          <Button onClick={() => handlePaymentAction(d.id, 'rejected')} disabled={confirmingId === d.id} style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                            Reject
                          </Button>
                        </>
                      )}
                      {d.payment_status === 'confirmed' && <span style={{ fontSize: 13, color: '#4caf50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> Confirmed</span>}
                      {(d.payment_status === 'pending' || d.payment_status === 'rejected') && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Awaiting Action</span>}
                    </div>
                  </div>
                </Card>
              ))}
              {delegates.filter(d => payFilter === 'all' || d.payment_status === payFilter).length === 0 && (
                <div style={s.emptyState}><p style={s.mutedText}>No payments found for this status.</p></div>
              )}
          </div>
        </div>
      )}

      {/* ── EMERGENCY MESSAGES TAB ──────────────────────────────── */}
      {!loading && activeTab === 'messages' && (
        <div style={s.fadeEnter}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} color="#ef4444" /> Live Emergency Broadcasts</h3>
            <Button onClick={fetchAll} variant="ghost" icon={<RefreshCw size={13} />}>Refresh</Button>
          </div>
          {messages.length === 0 ? (
            <Card style={s.emptyState}><CheckCircle size={24} color="var(--gold)" style={{ opacity: 0.5, marginBottom: 8 }} /><p style={s.mutedText}>Inbox zero. No active emergencies.</p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map(msg => (
                <Card key={msg.id} style={{ border: msg.is_read ? '1px solid var(--border)' : '1px solid #ef4444', background: msg.is_read ? 'var(--surface)' : 'rgba(239,68,68,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong style={{ color: 'var(--text)', fontSize: 15 }}>{msg.sender_name}</strong>
                      <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 8 }}>{msg.sender_email}</span>
                      {msg.sender_phone && <span style={{ fontSize: 13, color: 'var(--gold)', marginLeft: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {msg.sender_phone}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{new Date(msg.created_at).toLocaleString()}</span>
                      {!msg.is_read && <span style={s.urgentBadge}>ACTION REQUIRED</span>}
                      {msg.is_read && <span style={s.resolvedBadge}>RESOLVED</span>}
                    </div>
                  </div>
                  <div style={s.msgBody}>{msg.message}</div>
                  {msg.reply_text && (
                    <div style={s.replyBox}>
                      <strong style={{ color: 'var(--wine)' }}>Secretariat Reply:</strong> {msg.reply_text}
                    </div>
                  )}
                  {!msg.is_read && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <input
                        value={replyText[msg.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Type official response (optional)..."
                        style={s.replyInput}
                      />
                      <Button onClick={() => handleReply(msg.id)} style={{ background: '#4caf50', color: 'white', border: 'none' }} icon={<Check size={14} />}>Mark Resolved</Button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...s.fadeEnter }}>
          {feedback.map(fb => (
            <Card key={fb.id} style={{ border: fb.type === 'complaint' ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: fb.type === 'review' ? 'rgba(201,162,39,0.1)' : fb.type === 'query' ? 'rgba(6,182,212,0.1)' : 'rgba(239,68,68,0.1)',
                    color: fb.type === 'review' ? 'var(--gold)' : fb.type === 'query' ? '#06b6d4' : '#ef4444',
                    border: `1px solid ${fb.type === 'review' ? 'rgba(201,162,39,0.2)' : fb.type === 'query' ? 'rgba(6,182,212,0.2)' : 'rgba(239,68,68,0.2)'}`
                  }}>
                    {fb.type}
                  </span>
                  {fb.is_anonymous && <span style={s.anonBadge}>ANONYMOUS</span>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{new Date(fb.created_at).toLocaleString()}</span>
              </div>
              <p style={s.fbContent}>{fb.content}</p>
              <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 1, background: 'var(--border)' }} />
                {fb.is_anonymous ? 'Anonymous Delegate' : fb.user_name || 'Unknown'}
                {fb.user_email && !fb.is_anonymous && <span style={{ opacity: 0.7 }}>({fb.user_email})</span>}
              </div>
            </Card>
          ))}
          {feedback.length === 0 && <Card style={s.emptyState}><p style={s.mutedText}>No feedback submitted yet.</p></Card>}
        </div>
      )}

      {/* ── TEAM TAB ────────────────────────────────────────────── */}
      {!loading && activeTab === 'team' && (
        <div style={s.fadeEnter}>
          <Card gold style={{ marginBottom: 20 }}>
            <CardTitle icon={<Plus size={14} />}>Provision Secretariat Account</CardTitle>
            <p style={{ ...s.mutedText, marginBottom: 16 }}>
              Create an elevated account. The user must log in with this exact email via Google OAuth.
            </p>
            <div style={s.staffFormGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Full Name</label>
                <input value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} placeholder="Official Name" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Email Address</label>
                <input value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} placeholder="email@domain.com" type="email" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Phone</label>
                <input value={staffForm.phone} onChange={e => setStaffForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Clearance Level</label>
                <select value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))} style={s.select}>
                  <option value="volunteer">Volunteer</option>
                  <option value="da_team">DA Team</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <Button onClick={handleAddStaff} disabled={addingStaff} style={{ marginTop: 12 }}>
              {addingStaff ? 'Provisioning...' : 'Provision Account'}
            </Button>
          </Card>

          <Card>
            <CardTitle icon={<Shield size={14} />}>Active Roster ({team.length})</CardTitle>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['Name', 'Email', 'Phone', 'Clearance', 'Date Added'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {team.map(u => (
                    <tr key={u.id} style={s.tr}>
                      <td style={s.td}><strong style={{ color: 'var(--text)' }}>{u.name}</strong></td>
                      <td style={{ ...s.td, color: 'var(--text-3)' }}>{u.email}</td>
                      <td style={{ ...s.td, color: 'var(--text-3)' }}>{u.phone || '—'}</td>
                      <td style={s.td}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                          background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}44` }}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ ...s.td, color: 'var(--text-3)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {team.length === 0 && <div style={s.emptyState}><p style={s.mutedText}>No team members provisioned.</p></div>}
            </div>
          </Card>
        </div>
      )}

      {/* ── FEE TIERS TAB ───────────────────────────────────────── */}
      {!loading && activeTab === 'fee-tiers' && (
        <div style={s.fadeEnter}>
          <div style={s.adminBanner}>
            <Clock size={14} style={{ flexShrink: 0 }} />
            Define the active registration phases. The system automatically assigns fees based on the delegate's profile completion timestamp falling within these active windows.
          </div>
          
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
                  ...(isLive ? { border: '1px solid var(--gold)', background: 'rgba(201,162,39,0.03)' } : isPast ? { opacity: 0.7 } : {})
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{tier.name}</span>
                        <span style={s.tierPill}>{tier.tier_key}</span>
                        {isLive && <span style={{ background: 'rgba(76,175,80,0.1)', color: '#4caf50', border: '1px solid rgba(76,175,80,0.2)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>LIVE NOW</span>}
                        {isPast && <span style={{ background: 'var(--surface-el)', color: 'var(--text-3)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>CONCLUDED</span>}
                        {isUpcoming && <span style={{ background: 'rgba(201,162,39,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,162,39,0.2)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>UPCOMING</span>}
                      </div>
                    </div>
                    <label style={s.checkLabel}>
                      <input type="checkbox" checked={edit.is_active ?? tier.is_active} onChange={e => updateTierField(tier.id, 'is_active', e.target.checked)} style={{ accentColor: 'var(--wine)' }} />
                      Phase Enabled
                    </label>
                  </div>

                  <div style={s.tierFormGrid}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Display Name</label>
                      <input value={edit.name ?? tier.name} onChange={e => updateTierField(tier.id, 'name', e.target.value)} style={s.input} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Amount (₹)</label>
                      <input type="number" value={edit.amount ?? tier.amount} onChange={e => updateTierField(tier.id, 'amount', e.target.value)} style={s.input} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Start Window</label>
                      <input type="datetime-local" value={edit.start_date || ''} onChange={e => updateTierField(tier.id, 'start_date', e.target.value)} style={s.input} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Deadline</label>
                      <input type="datetime-local" value={edit.deadline || ''} onChange={e => updateTierField(tier.id, 'deadline', e.target.value)} style={s.input} />
                    </div>
                  </div>

                  {edit.start_date && edit.deadline && (
                    <div style={s.timeBox}>
                      <Clock size={13} color="var(--text-3)" />
                      Active Period: <strong>{new Date(edit.start_date).toLocaleString()}</strong> to <strong>{new Date(edit.deadline).toLocaleString()}</strong>
                    </div>
                  )}

                  <Button onClick={() => handleSaveTier(tier.id)} disabled={isSaving} variant={isLive ? 'gold' : 'secondary'} icon={<Save size={13} />}>
                    {isSaving ? 'Saving parameters...' : 'Update Phase Parameters'}
                  </Button>
                </Card>
              )
            })}
            {feeTiers.length === 0 && (
              <Card style={s.emptyState}><p style={s.mutedText}>No fee tiers configured in the database.</p></Card>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES TAB ───────────────────────────────────────────── */}
      {!loading && activeTab === 'roles' && (
        <Card style={s.fadeEnter}>
          <CardTitle icon={<Key size={14} />}>Global Access Control</CardTitle>
          <div style={{ ...s.adminBanner, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', marginBottom: 20 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            Warning: Demoting a delegate to staff will permanently wipe their portfolio assignments, payments, and QR code data. This action cannot be reversed.
          </div>
          
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['User Identity', 'Email', 'Current Clearance', 'Modify Access'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={s.tr}>
                    <td style={s.td}><strong style={{ color: 'var(--text)' }}>{u.name}</strong></td>
                    <td style={{ ...s.td, color: 'var(--text-3)' }}>{u.email}</td>
                    <td style={s.td}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}44` }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={s.td}>
                      <select defaultValue={u.role} disabled={updatingRole === u.id}
                        onChange={e => {
                          if (u.role === 'delegate' && e.target.value !== 'delegate') {
                            if (!window.confirm(`CRITICAL WARNING: Demote ${u.name} from Delegate to ${e.target.value.toUpperCase()}? All registration data will be wiped.`)) return
                          }
                          handleRoleUpdate(u.id, e.target.value)
                        }}
                        style={s.select}>
                        {['delegate', 'volunteer', 'da_team', 'admin'].map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
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
  fadeEnter: { animation: 'fadeIn 0.3s ease-out' },
  tabs: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 4 },
  tab: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-el)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-3)', border: '1px solid var(--border)', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  activeTab: { background: 'var(--wine)', color: 'white', border: '1px solid var(--wine)' },
  tabBadge: { background: 'var(--gold)', color: '#000', padding: '0 6px', borderRadius: 10, fontSize: 11, fontWeight: 800 },
  
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '20px', display: 'flex', alignItems: 'center', gap: 16 },
  statIconWrap: { width: 48, height: 48, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statVal: { fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.1 },
  statLabel: { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 },
  
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 },
  actionItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 10 },
  actionDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 },
  actionBtn: { padding: '6px 12px', fontSize: 12 },
  
  progressTrack: { height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  
  adminBanner: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(122,92,0,0.1)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--gold)', fontSize: 13, fontWeight: 500, lineHeight: 1.5 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center' },
  mutedText: { color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6 },
  
  searchWrap: { position: 'relative', marginBottom: 16 },
  searchIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '10px 14px 10px 40px', background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  
  tableWrap: { overflowX: 'auto', margin: '0 -20px -20px -20px', padding: '0 20px 20px 20px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead: { borderBottom: '2px solid var(--border)' },
  th: { padding: '14px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },
  td: { padding: '14px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' },
  tierPill: { background: 'var(--wine-dim)', color: '#F9A8B8', border: '1px solid rgba(110,30,42,0.3)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' },
  
  payFilterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--surface-el)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' },
  filterBtnActive: { background: 'var(--wine)', color: 'white', border: '1px solid var(--wine)' },
  filterCount: { background: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: '2px 6px', fontSize: 10 },
  payRow: { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' },
  payActions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', minWidth: 160 },
  utrBox: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 11, marginTop: 6, color: 'var(--text-3)', fontFamily: 'monospace' },
  
  urgentBadge: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 800, letterSpacing: '0.05em' },
  resolvedBadge: { background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)', color: '#4caf50', fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 800, letterSpacing: '0.05em' },
  msgBody: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px', fontSize: 14, color: 'var(--text)', marginBottom: 12, lineHeight: 1.6 },
  replyBox: { background: 'rgba(110,30,42,0.05)', borderLeft: '3px solid var(--wine)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: '10px 14px', fontSize: 13, marginBottom: 12, color: 'var(--text-2)' },
  replyInput: { flex: 1, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text)', outline: 'none' },
  
  fbContent: { fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px' },
  anonBadge: { background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8b5cf6', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 800, letterSpacing: '0.05em' },
  
  staffFormGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 },
  tierFormGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { width: '100%', padding: '10px 14px', background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  select: { width: '100%', padding: '10px 14px', background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontWeight: 500, cursor: 'pointer' },
  
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600 },
  timeBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12, marginBottom: 16, color: 'var(--text-2)' },
  
  quickLinks: { display: 'flex', flexDirection: 'column', gap: 8 },
}