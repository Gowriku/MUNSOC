import { useState } from 'react'
import { AlertTriangle, Phone, Send } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'

export default function Emergency() {
  const { toasts, show } = useToast()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return show('Describe your situation before sending', 'warning')
    setSending(true)
    try {
      await api.post('/messages/', { message: message.trim() })
      setSent(true); setMessage('')
      show('Message sent — a volunteer will respond shortly.', 'success')
    } catch { show('Failed to send. Call directly if urgent.', 'error') }
    finally { setSending(false) }
  }

  return (
    <PageLayout title="Emergency Contact" subtitle="Reach the organizing team immediately during the event.">
      <ToastContainer toasts={toasts} />
      <div style={s.grid}>

        {/* Message card */}
        <div>
          <Card style={{ border: '1px solid rgba(248,113,113,0.25)', borderTop: '2px solid #F87171' }}>
            <CardTitle icon={<AlertTriangle size={14} />}>Send Emergency Message</CardTitle>
            {sent ? (
              <div style={s.sentBox}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Send size={22} color="#4ADE80" />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text)' }}>Message Sent</h3>
                <p style={{ color: 'var(--text-3)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
                  A volunteer has been notified. Stay at your current location.
                </p>
                <Button onClick={() => setSent(false)} variant="ghost">Send Another Message</Button>
              </div>
            ) : (
              <>
                <p style={s.mutedText}>Describe your situation clearly. A volunteer will see this immediately and respond to your registered phone number.</p>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. I'm feeling unwell near the main hall entrance and need assistance."
                  rows={5} style={s.textarea} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{message.length} characters</span>
                  <Button onClick={handleSend} disabled={sending || !message.trim()} variant="danger" icon={<Send size={13} />}>
                    {sending ? 'Sending...' : 'Send Emergency Message'}
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <CardTitle>Reminders</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Stay calm and remain at your current location.',
                'A volunteer monitors messages in real time during the event.',
                'For medical emergencies, also dial 112.',
                'Your name and contact number are included automatically.',
              ].map((item, i) => (
                <div key={i} style={s.reminderItem}>
                  <div style={s.reminderDot} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Contacts */}
        <div>
          <Card>
            <CardTitle icon={<Phone size={14} />}>Direct Contacts</CardTitle>
            {[
              { label: 'Event Helpdesk',          number: '+91 XXXXX XXXXX' },
              { label: 'Medical Support',          number: '+91 XXXXX XXXXX' },
              { label: 'Transport Coordinator',    number: '+91 XXXXX XXXXX' },
              { label: 'Secretary General',        number: '+91 XXXXX XXXXX' },
            ].map(({ label, number }) => (
              <a key={label} href={`tel:${number.replace(/\s/g, '')}`} style={s.contactCard}>
                <div>
                  <div style={s.contactLabel}>{label}</div>
                  <div style={s.contactNumber}>{number}</div>
                </div>
                <span style={s.callChip}>Call</span>
              </a>
            ))}
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.5 }}>
              Replace placeholders with actual contact numbers before the event.
            </p>
          </Card>

          <Card style={{ marginTop: 16, borderTop: '2px solid rgba(248,113,113,0.4)', borderColor: 'rgba(248,113,113,0.15)' }}>
            <CardTitle>National Emergency Services</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Police',     number: '100' },
                { label: 'Ambulance',  number: '108' },
                { label: 'Fire',       number: '101' },
                { label: 'Emergency',  number: '112' },
              ].map(({ label, number }) => (
                <a key={label} href={`tel:${number}`} style={s.emergencyRow}>
                  <span style={s.emergencyLabel}>{label}</span>
                  <span style={s.emergencyNumber}>{number}</span>
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 },
  mutedText: { color: 'var(--text-3)', fontSize: 13, lineHeight: 1.7, marginBottom: 16 },
  textarea: { width: '100%', padding: '12px 14px', background: 'var(--surface-el)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 },
  sentBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 4px' },
  reminderItem: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  reminderDot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--wine)', marginTop: 5, flexShrink: 0 },
  contactCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8, textDecoration: 'none', color: 'inherit', background: 'var(--surface-el)', transition: 'border-color 0.15s' },
  contactLabel: { fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 2 },
  contactNumber: { fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' },
  callChip: { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: 'var(--success-dim)', color: '#4ADE80', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(74,222,128,0.2)' },
  emergencyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'var(--surface-el)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', border: '1px solid var(--border)' },
  emergencyLabel: { fontWeight: 600, fontSize: 13, color: 'var(--text-2)' },
  emergencyNumber: { fontSize: 20, fontWeight: 900, color: '#F87171', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' },
}
