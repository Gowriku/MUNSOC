import { useState } from 'react'
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
    if (!message.trim()) return show('Please describe your emergency', 'warning')
    setSending(true)
    try {
      await api.post('/messages/', { message: message.trim() })
      setSent(true)
      setMessage('')
      show('Emergency message sent to volunteers!', 'success')
    } catch {
      show('Failed to send. Try calling directly.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <PageLayout title="🆘 Emergency Contact" subtitle="Use this to reach the organizing team during the event.">
      <ToastContainer toasts={toasts} />

      <div style={s.grid}>
        <div>
          <Card style={{ border: '2px solid #ef5350' }}>
            <CardTitle>Send Emergency Message</CardTitle>
            {sent ? (
              <div style={s.sentBox}>
                <div style={{ fontSize: 48 }}>✅</div>
                <h3 style={{ margin: '12px 0 6px' }}>Message Sent</h3>
                <p style={{ color: '#666', textAlign: 'center', margin: '0 0 16px' }}>
                  A volunteer will reach you shortly. Stay where you are.
                </p>
                <Button onClick={() => setSent(false)} variant="secondary">Send Another</Button>
              </div>
            ) : (
              <>
                <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>
                  Describe your situation. A volunteer will see this immediately and reach out to you.
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. I'm feeling unwell and need assistance. I'm near the main hall entrance."
                  rows={5}
                  style={s.textarea}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{message.length} characters</span>
                  <Button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    variant="danger"
                  >
                    {sending ? 'Sending...' : '🆘 Send Emergency Message'}
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <CardTitle>Important Reminders</CardTitle>
            <ul style={{ paddingLeft: 18, color: '#555', fontSize: 14, lineHeight: 2, margin: 0 }}>
              <li>Stay calm and remain at your current location</li>
              <li>A volunteer will check this immediately during the event</li>
              <li>For medical emergencies, also call 112</li>
              <li>Your message includes your name and contact info</li>
            </ul>
          </Card>
        </div>

        <div>
          <Card>
            <CardTitle>Quick Contacts</CardTitle>
            {[
              { label: 'Event Helpdesk', number: '+91 XXXXX XXXXX', icon: '📞' },
              { label: 'Medical Support', number: '+91 XXXXX XXXXX', icon: '🏥' },
              { label: 'Transport Coordinator', number: '+91 XXXXX XXXXX', icon: '🚌' },
              { label: 'Secretary General', number: '+91 XXXXX XXXXX', icon: '🎓' },
            ].map(({ label, number, icon }) => (
              <a key={label} href={`tel:${number.replace(/\s/g, '')}`} style={s.contactCard}>
                <span style={s.contactIcon}>{icon}</span>
                <div>
                  <div style={s.contactLabel}>{label}</div>
                  <div style={s.contactNumber}>{number}</div>
                </div>
                <span style={s.callChip}>Call</span>
              </a>
            ))}
            <p style={{ fontSize: 12, color: '#bbb', marginTop: 12 }}>
              * Replace these with actual volunteer numbers before the event
            </p>
          </Card>

          <Card style={{ marginTop: 16, background: '#fff3e0', border: '1px solid #ffb74d' }}>
            <CardTitle>🚨 National Emergency</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Police', number: '100' },
                { label: 'Ambulance', number: '108' },
                { label: 'Fire', number: '101' },
                { label: 'Emergency', number: '112' },
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  textarea: { width: '100%', padding: '12px 14px', border: '1.5px solid #ffcdd2', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  sentBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0' },
  contactCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', border: '1px solid #eee', borderRadius: 10, marginBottom: 8, textDecoration: 'none', color: 'inherit', background: '#fafafa' },
  contactIcon: { fontSize: 24, flexShrink: 0 },
  contactLabel: { fontWeight: 600, fontSize: 14 },
  contactNumber: { fontSize: 13, color: '#888' },
  callChip: { marginLeft: 'auto', background: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  emergencyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', borderRadius: 8, textDecoration: 'none', color: '#1a1a2e' },
  emergencyLabel: { fontWeight: 600, fontSize: 14 },
  emergencyNumber: { fontSize: 22, fontWeight: 800, color: '#c62828' },
}
