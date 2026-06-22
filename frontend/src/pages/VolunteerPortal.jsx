import { useEffect, useState, useRef } from 'react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'
import useAuthStore from '../store/authStore'

let Html5QrcodeScanner = null

const ALERT_TYPES = [
  { value: 'session_start', label: '🟢 Session Started',  desc: 'Committee session has begun' },
  { value: 'session_end',   label: '🔴 Session Ended',    desc: 'Committee session has ended' },
  { value: 'break_start',   label: '☕ Break Started',     desc: 'Delegates may take a break' },
  { value: 'break_end',     label: '⏰ Break Ended',       desc: 'Please return to the hall' },
  { value: 'custom',        label: '📢 Custom Message',   desc: 'Send a custom announcement' },
]

const TABS = [
  { key: 'scanner',   label: '📷 QR Scanner' },
  { key: 'alerts',    label: '📢 Send Alerts' },
  { key: 'checkins',  label: '✅ Attendance' },
  { key: 'emergency', label: '🆘 Emergency' },
]

export default function VolunteerPortal() {
  const { user } = useAuthStore()
  const { toasts, show } = useToast()
  const [activeTab, setActiveTab]           = useState('scanner')
  const [committees, setCommittees]         = useState([])
  const [checkins, setCheckins]             = useState([])
  const [messages, setMessages]             = useState([])
  const [scanResult, setScanResult]         = useState(null)
  const [scanning, setScanning]             = useState(false)
  const [scanMode, setScanMode]             = useState('event')
  const [manualToken, setManualToken]       = useState('')
  const [verifying, setVerifying]           = useState(false)

  // Alert form
  const [alertCommittee, setAlertCommittee] = useState('')
  const [alertType, setAlertType]           = useState('session_start')
  const [alertMessage, setAlertMessage]     = useState('')
  const [sendingAlert, setSendingAlert]     = useState(false)

  // Emergency reply
  const [replyText, setReplyText]           = useState({})

  const scannerRef         = useRef(null)
  const scannerInstanceRef = useRef(null)

  useEffect(() => {
    api.get('/portfolios/committees').then(r => setCommittees(r.data)).catch(() => {})
    fetchCheckins()
    fetchMessages()
  }, [])

  const fetchCheckins = () =>
    api.get('/checkin/list').then(r => setCheckins(r.data)).catch(() => {})

  const fetchMessages = () =>
    api.get('/messages/').then(r => setMessages(r.data)).catch(() => {})

  // ── QR Scanner ────────────────────────────────────────────────

  const startScanner = async () => {
    setScanResult(null)
    setScanning(true)
    if (!Html5QrcodeScanner) {
      const mod = await import('html5-qrcode')
      Html5QrcodeScanner = mod.Html5QrcodeScanner
    }
    setTimeout(() => {
      if (scannerRef.current) {
        const scanner = new Html5QrcodeScanner('qr-reader-vol', { fps: 10, qrbox: 250 }, false)
        scanner.render(
          (decodedText) => { scanner.clear(); setScanning(false); handleVerify(decodedText) },
          () => {}
        )
        scannerInstanceRef.current = scanner
      }
    }, 100)
  }

  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear().catch(() => {})
      scannerInstanceRef.current = null
    }
    setScanning(false)
  }

  const handleVerify = async (rawValue) => {
    let token = rawValue
    const match = rawValue.match(/\/checkin\/verify\/([a-f0-9-]+)/)
    if (match) token = match[1]
    setVerifying(true)
    try {
      const res = await api.get(`/checkin/verify/${token}?checkin_type=${scanMode}`)
      setScanResult({ ...res.data, token })
      if (res.data.success) {
        show(`✅ ${res.data.user_name} checked in!`, 'success')
        fetchCheckins()
      } else {
        show(res.data.message, 'warning')
      }
    } catch (e) {
      setScanResult({ success: false, message: e.response?.data?.detail || 'Verification failed', user_name: '—', user_email: '—' })
      show('QR verification failed', 'error')
    } finally {
      setVerifying(false)
    }
  }

  const handleManualVerify = () => {
    if (!manualToken.trim()) return show('Enter a token or paste the QR URL', 'warning')
    handleVerify(manualToken.trim())
    setManualToken('')
  }

  // ── Alerts ────────────────────────────────────────────────────

  const handleSendAlert = async () => {
    if (alertType === 'custom' && !alertMessage.trim())
      return show('Enter a message for custom alert', 'warning')
    setSendingAlert(true)
    const defaultMessages = {
      session_start: 'Committee session has now started. Please take your seats.',
      session_end:   'Committee session has ended. Thank you delegates.',
      break_start:   'Break time! You have 15 minutes. Please be back on time.',
      break_end:     'Break is over. Please return to your committee halls immediately.',
    }
    try {
      await api.post('/alerts/', {
        committee_id: alertCommittee || null,
        type: alertType,
        message: alertMessage.trim() || defaultMessages[alertType] || '',
      })
      show('Alert sent to delegates!', 'success')
      setAlertMessage('')
    } catch {
      show('Failed to send alert', 'error')
    } finally {
      setSendingAlert(false)
    }
  }

  // ── Emergency replies ─────────────────────────────────────────

  const handleReply = async (msgId) => {
    const text = replyText[msgId]
    try {
      await api.patch(`/messages/${msgId}/read`, null, { params: { reply: text?.trim() || undefined } })
      show('Resolved', 'success')
      setReplyText(prev => ({ ...prev, [msgId]: '' }))
      fetchMessages()
    } catch { show('Failed to resolve', 'error') }
  }

  const checkedIn  = checkins.filter(c => c.checked_in).length
  const notChecked = checkins.filter(c => !c.checked_in).length
  const unreadMsgs = messages.filter(m => !m.is_read).length

  return (
    <PageLayout title="🎯 Volunteer Portal" subtitle={`Logged in as ${user?.name} · Volunteer`}>
      <ToastContainer toasts={toasts} />

      {/* Stats strip */}
      <div style={s.strip}>
        {[
          { label: 'Checked In',      value: checkedIn,          color: '#4caf50' },
          { label: 'Not Checked In',  value: notChecked,         color: '#f44336' },
          { label: 'Urgent Messages', value: unreadMsgs,         color: '#ff9800' },
          { label: 'Committees',      value: committees.length,  color: '#2196f3' },
        ].map(({ label, value, color }) => (
          <div key={label} style={s.stripItem}>
            <span style={{ ...s.stripVal, color }}>{value}</span>
            <span style={s.stripLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => { setActiveTab(t.key); stopScanner() }}
            style={{ ...s.tab, ...(activeTab === t.key ? s.activeTab : {}) }}>
            {t.key === 'checkins'  ? `${t.label} (${checkedIn}/${checkins.length})` :
             t.key === 'emergency' ? `${t.label}${unreadMsgs > 0 ? ` (${unreadMsgs})` : ''}` :
             t.label}
          </button>
        ))}
      </div>

      {/* ── SCANNER TAB ──────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div style={s.grid2}>
          <Card>
            <CardTitle>Scan Delegate QR</CardTitle>
            <div style={s.modeRow}>
              <span style={s.modeLabel}>Check-in type:</span>
              {['event', 'transport'].map(mode => (
                <button key={mode} onClick={() => setScanMode(mode)}
                  style={{ ...s.modeBtn, ...(scanMode === mode ? s.modeBtnActive : {}) }}>
                  {mode === 'event' ? '🏛️ Event Entry' : '🚌 Bus / Transport'}
                </button>
              ))}
            </div>

            {!scanning ? (
              <div style={s.scanPrompt}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>📷</div>
                <p style={{ color: '#666', marginBottom: 20, textAlign: 'center' }}>
                  Click below to open camera and scan a delegate's QR code.
                </p>
                <Button onClick={startScanner} style={{ width: '100%' }}>Start Camera Scanner</Button>
              </div>
            ) : (
              <div>
                <div id="qr-reader-vol" ref={scannerRef} style={{ width: '100%' }} />
                <Button onClick={stopScanner} variant="secondary" style={{ width: '100%', marginTop: 12 }}>Stop Scanner</Button>
              </div>
            )}

            <div style={s.divider}>or enter token manually</div>
            <div style={s.manualRow}>
              <input value={manualToken} onChange={e => setManualToken(e.target.value)}
                placeholder="Paste QR URL or token UUID" style={s.input}
                onKeyDown={e => e.key === 'Enter' && handleManualVerify()} />
              <Button onClick={handleManualVerify} disabled={verifying}>{verifying ? '...' : 'Verify'}</Button>
            </div>
          </Card>

          <div>
            {scanResult ? (
              <Card style={{ border: `2px solid ${scanResult.success ? '#4caf50' : '#f44336'}`, background: scanResult.success ? '#f1f8f1' : '#fff5f5' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 56 }}>{scanResult.success ? '✅' : '❌'}</div>
                  <h2 style={{ margin: '8px 0 4px', color: scanResult.success ? '#2e7d32' : '#c62828' }}>
                    {scanResult.success ? 'Checked In!' : 'Check-in Failed'}
                  </h2>
                  <p style={{ color: '#666', margin: 0 }}>{scanResult.message}</p>
                </div>
                {scanResult.user_name && scanResult.user_name !== '—' && (
                  <div style={s.resultDetails}>
                    {[
                      ['Name', scanResult.user_name],
                      ['Email', scanResult.user_email],
                      ['Country', scanResult.assigned_country],
                      ['Committee', scanResult.committee],
                      ['Type', scanResult.checkin_type],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} style={s.resultRow}>
                        <span style={s.resultLabel}>{k}</span>
                        <span style={{ ...s.resultVal, fontWeight: k === 'Country' ? 700 : 400 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={() => setScanResult(null)} variant="secondary" style={{ width: '100%', marginTop: 12 }}>
                  Scan Next Delegate
                </Button>
              </Card>
            ) : (
              <Card style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', border: '2px dashed #e0e0e0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
                <p style={{ color: '#aaa' }}>Scan result will appear here</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ───────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div style={s.grid2}>
          <Card>
            <CardTitle>Send Committee Alert</CardTitle>
            <label style={s.label}>Target Committee</label>
            <select value={alertCommittee} onChange={e => setAlertCommittee(e.target.value)} style={s.select}>
              <option value="">📢 All Committees (Broadcast)</option>
              {committees.map(c => (
                <option key={c.id} value={c.id}>{c.abbreviation} — {c.name}</option>
              ))}
            </select>

            <label style={{ ...s.label, marginTop: 16 }}>Alert Type</label>
            <div style={s.alertTypeGrid}>
              {ALERT_TYPES.map(a => (
                <button key={a.value} onClick={() => setAlertType(a.value)}
                  style={{ ...s.alertTypeBtn, ...(alertType === a.value ? s.alertTypeBtnActive : {}) }}>
                  <span style={{ fontSize: 18 }}>{a.label.split(' ')[0]}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.label.split(' ').slice(1).join(' ')}</span>
                  <span style={{ fontSize: 11, color: alertType === a.value ? 'rgba(255,255,255,0.7)' : '#999' }}>{a.desc}</span>
                </button>
              ))}
            </div>

            {alertType === 'custom' && (
              <div style={{ marginTop: 16 }}>
                <label style={s.label}>Custom Message</label>
                <textarea value={alertMessage} onChange={e => setAlertMessage(e.target.value)}
                  placeholder="Type your announcement here..." rows={3} style={s.textarea} />
              </div>
            )}

            {alertType !== 'custom' && (
              <div style={s.previewBox}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>PREVIEW</span>
                <p style={{ margin: '4px 0 0', fontSize: 14 }}>
                  {alertType === 'session_start' && 'Committee session has now started. Please take your seats.'}
                  {alertType === 'session_end'   && 'Committee session has ended. Thank you delegates.'}
                  {alertType === 'break_start'   && 'Break time! You have 15 minutes. Please be back on time.'}
                  {alertType === 'break_end'     && 'Break is over. Please return to your committee halls immediately.'}
                </p>
              </div>
            )}

            <Button onClick={handleSendAlert} disabled={sendingAlert} style={{ width: '100%', marginTop: 16 }}>
              {sendingAlert ? 'Sending...' : `📢 Send Alert${alertCommittee ? '' : ' to All'}`}
            </Button>
          </Card>

          <Card>
            <CardTitle>Alert Guide</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ALERT_TYPES.map(a => (
                <div key={a.value} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 22 }}>{a.label.split(' ')[0]}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label.split(' ').slice(1).join(' ')}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── ATTENDANCE TAB ───────────────────────────────────── */}
      {activeTab === 'checkins' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <CardTitle>Attendance List</CardTitle>
            <Button onClick={fetchCheckins} variant="ghost" style={{ padding: '6px 14px', fontSize: 13 }}>↻ Refresh</Button>
          </div>
          <input placeholder="🔍 Search by name or email..." style={s.searchInput}
            onChange={e => {
              const q = e.target.value.toLowerCase()
              document.querySelectorAll('[data-delegate-row]').forEach(row => {
                row.style.display = row.dataset.name?.includes(q) || row.dataset.email?.includes(q) ? '' : 'none'
              })
            }} />
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Checked In At</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map(c => (
                  <tr key={c.user_id} data-delegate-row
                    data-name={c.name?.toLowerCase()} data-email={c.email?.toLowerCase()}
                    style={{ borderBottom: '1px solid #f0f0f0', background: c.checked_in ? '#f1f8f1' : 'white' }}>
                    <td style={s.td}><strong>{c.name}</strong></td>
                    <td style={{ ...s.td, color: '#888', fontSize: 13 }}>{c.email}</td>
                    <td style={s.td}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: c.checked_in ? '#e8f5e9' : '#ffebee', color: c.checked_in ? '#2e7d32' : '#c62828' }}>
                        {c.checked_in ? '✅ Present' : '⏳ Absent'}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#888', fontSize: 13 }}>
                      {c.checked_in_at ? new Date(c.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {checkins.length === 0 && <p style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>No delegates registered yet</p>}
          </div>
        </Card>
      )}

      {/* ── EMERGENCY MESSAGES TAB ───────────────────────────── */}
      {activeTab === 'emergency' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>🆘 Emergency Messages from Delegates</h3>
            <Button onClick={fetchMessages} variant="ghost" style={{ fontSize: 13 }}>↻ Refresh</Button>
          </div>

          {messages.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ color: '#aaa' }}>No emergency messages yet</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map(msg => (
                <Card key={msg.id} style={{
                  border: msg.is_read ? '1px solid #e0e0e0' : '2px solid #ef5350',
                  background: msg.is_read ? 'white' : '#fff5f5',
                }}>
                  <div style={s.msgHeader}>
                    <div>
                      <strong style={{ fontSize: 16 }}>{msg.sender_name}</strong>
                      <span style={s.msgEmail}>{msg.sender_email}</span>
                      {msg.sender_phone && <span style={s.msgPhone}>📞 {msg.sender_phone}</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{new Date(msg.created_at).toLocaleString()}</div>
                      {!msg.is_read && <span style={s.urgentBadge}>URGENT</span>}
                      {msg.is_read  && <span style={s.resolvedBadge}>Resolved</span>}
                    </div>
                  </div>

                  <div style={s.msgBody}>{msg.message}</div>

                  {msg.reply_text && (
                    <div style={s.replyDisplay}>
                      <strong style={{ fontSize: 12, color: '#888' }}>REPLY:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 14 }}>{msg.reply_text}</p>
                    </div>
                  )}

                  {!msg.is_read && (
                    <div style={s.replyRow}>
                      <input
                        value={replyText[msg.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Type reply (optional) and mark as resolved..."
                        style={{ ...s.input, flex: 1 }}
                      />
                      <Button onClick={() => handleReply(msg.id)} variant="success">✓ Resolve</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}

const s = {
  strip: { display: 'flex', gap: 0, background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, marginBottom: 24, overflow: 'hidden', flexWrap: 'wrap' },
  stripItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px', borderRight: '1px solid #f0f0f0', minWidth: 120 },
  stripVal: { fontSize: 30, fontWeight: 800 },
  stripLabel: { fontSize: 12, color: '#888', marginTop: 2, textAlign: 'center' },
  tabs: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '10px 18px', border: '1px solid #e0e0e0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#555' },
  activeTab: { background: '#6a1b9a', color: 'white', border: '1px solid #6a1b9a' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' },
  modeRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  modeLabel: { fontSize: 13, fontWeight: 600, color: '#555' },
  modeBtn: { padding: '7px 14px', border: '1.5px solid #e0e0e0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600, color: '#555' },
  modeBtnActive: { background: '#6a1b9a', color: 'white', border: '1.5px solid #6a1b9a' },
  scanPrompt: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' },
  divider: { textAlign: 'center', color: '#bbb', fontSize: 12, margin: '20px 0', borderTop: '1px solid #f0f0f0', paddingTop: 12 },
  manualRow: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  resultDetails: { background: 'white', borderRadius: 10, padding: 16, marginTop: 4 },
  resultRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 },
  resultLabel: { color: '#888', fontWeight: 500 },
  resultVal: { color: '#1a1a2e' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333' },
  select: { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'white', outline: 'none' },
  alertTypeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  alertTypeBtn: { display: 'flex', flexDirection: 'column', gap: 2, padding: '12px', border: '1.5px solid #e0e0e0', borderRadius: 10, background: 'white', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' },
  alertTypeBtnActive: { background: '#6a1b9a', color: 'white', border: '1.5px solid #6a1b9a' },
  textarea: { width: '100%', padding: '10px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  previewBox: { background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginTop: 16 },
  searchInput: { width: '100%', padding: '9px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#f5f7fa' },
  th: { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '12px 14px', color: '#333' },
  msgHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  msgEmail: { fontSize: 13, color: '#888', marginLeft: 8 },
  msgPhone: { fontSize: 13, color: '#6a1b9a', marginLeft: 8, fontWeight: 600 },
  urgentBadge: { display: 'inline-block', background: '#ffebee', color: '#c62828', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, marginTop: 4 },
  resolvedBadge: { display: 'inline-block', background: '#e8f5e9', color: '#2e7d32', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, marginTop: 4 },
  msgBody: { background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', fontSize: 15, color: '#222', margin: '0 0 12px' },
  replyDisplay: { background: '#f3e5f5', borderRadius: 8, padding: '10px 14px', marginBottom: 12 },
  replyRow: { display: 'flex', gap: 8, alignItems: 'center' },
}
