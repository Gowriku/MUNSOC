import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button, StatusBadge } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import CountdownTimer from '../components/CountdownTimer'
import useAuthStore from '../store/authStore'
import api from '../api/client'

export default function Payment() {
  const { user, fetchMe } = useAuthStore()
  const { toasts, show } = useToast()
  const [tiers, setTiers] = useState([])
  const [upiData, setUpiData] = useState(null)
  const [utr, setUtr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/payments/fee-tiers').then(r => setTiers(r.data))
    if (user?.payment_status !== 'confirmed') {
      api.get('/payments/upi-link').then(r => setUpiData(r.data)).catch(() => {})
    }
  }, [user?.payment_status])

  const handleSubmitUTR = async () => {
    if (!utr.trim()) return show('Please enter your UTR/Transaction ID', 'warning')
    setSubmitting(true)
    try {
      await api.post('/users/me/payment', { utr: utr.trim() })
      await fetchMe()
      show('UTR submitted! Awaiting admin confirmation.', 'success')
    } catch (e) {
      show(e.response?.data?.detail || 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openUPI = () => {
    if (upiData?.upi_link) window.location.href = upiData.upi_link
  }

  const paymentStatus = user?.payment_status

  return (
    <PageLayout title="Registration Payment" subtitle="Complete your payment to receive your delegate QR pass.">
      <ToastContainer toasts={toasts} />

      {/* Status banner */}
      {paymentStatus === 'confirmed' && (
        <div style={s.successBanner}>
          ✅ Payment confirmed! <Link to="/my-qr" style={{ color: '#1b5e20', fontWeight: 700 }}>View your QR pass →</Link>
        </div>
      )}
      {paymentStatus === 'submitted' && (
        <div style={s.pendingBanner}>
          ⏳ Payment submitted. The admin will confirm it shortly. You'll be notified.
        </div>
      )}
      {paymentStatus === 'rejected' && (
        <div style={s.errorBanner}>
          ❌ Your payment was rejected. Please re-submit with the correct UTR or contact the organizing team.
        </div>
      )}

      <div style={s.grid}>
        {/* Fee tier info */}
        <Card>
          <CardTitle>Your Registration Tier</CardTitle>
          {user?.reg_tier ? (
            <div>
              <div style={s.tierDisplay}>
                <span style={s.tierName}>{user.reg_tier.replace(/_/g, ' ').toUpperCase()}</span>
                <span style={s.tierAmount}>₹{user.amount_due}</span>
              </div>
              <p style={{ color: '#666', fontSize: 14, margin: '8px 0 0' }}>
                This is your locked registration amount based on when you registered.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#888', fontSize: 14 }}>
                Complete your profile to lock in your registration tier.
              </p>
              <Link to="/dashboard" style={s.linkBtn}>Complete Profile →</Link>
            </div>
          )}

          <div style={s.divider} />
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#666' }}>All Fee Tiers</h4>
          {tiers.map((tier, i) => (
            <div key={tier.id} style={{
              ...s.tierRow,
              ...(user?.reg_tier === tier.tier_key ? s.tierRowActive : {}),
            }}>
              <div>
                <span style={s.tierRowName}>{tier.name}</span>
                <div style={{ marginTop: 4 }}>
                  <CountdownTimer deadline={tier.deadline} />
                </div>
              </div>
              <span style={s.tierRowAmount}>₹{tier.amount}</span>
            </div>
          ))}
        </Card>

        {/* UPI Payment */}
        {paymentStatus !== 'confirmed' && upiData && (
          <Card>
            <CardTitle>Pay via UPI</CardTitle>
            <div style={s.upiBox}>
              <div style={s.upiAmount}>₹{upiData.amount}</div>
              <div style={s.upiId}>UPI ID: <strong>{upiData.upi_id}</strong></div>
              <button onClick={openUPI} style={s.upiBtn}>
                Open UPI App
              </button>
              <div style={s.orDivider}><span>or scan</span></div>
              {/* QR placeholder - in production, generate an actual UPI QR here */}
              <div style={s.qrPlaceholder}>
                <div style={{ fontSize: 36 }}>📱</div>
                <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0' }}>UPI QR Code</p>
                <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0' }}>
                  Open any UPI app → Scan & Pay → ₹{upiData.amount}
                </p>
              </div>
            </div>

            {upiData.instructions && (
              <ol style={s.instructions}>
                {upiData.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            )}
          </Card>
        )}

        {/* UTR Submission */}
        {(paymentStatus === 'pending' || paymentStatus === 'rejected') && (
          <Card>
            <CardTitle>Submit Transaction ID</CardTitle>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>
              After paying, enter your UTR / Transaction ID below. The admin will verify and confirm your payment.
            </p>
            <label style={s.label}>UTR / Transaction ID</label>
            <input
              type="text"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              placeholder="e.g. 424212345678"
              style={s.input}
            />
            <p style={{ fontSize: 12, color: '#999', margin: '6px 0 16px' }}>
              Find this in your UPI app under payment history → Transaction details
            </p>
            <Button
              onClick={handleSubmitUTR}
              disabled={submitting || !utr.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit for Confirmation'}
            </Button>
          </Card>
        )}

        {paymentStatus === 'submitted' && (
          <Card>
            <CardTitle>Awaiting Confirmation</CardTitle>
            <div style={s.waitingBox}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <p style={{ color: '#555', textAlign: 'center', margin: 0 }}>
                Your UTR <strong>{user?.payment_utr}</strong> has been submitted. The admin will confirm within a few hours.
              </p>
              <p style={{ color: '#888', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                Once confirmed, your QR pass will be unlocked automatically.
              </p>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  successBanner: { background: '#e8f5e9', border: '1px solid #81c784', borderRadius: 10, padding: '14px 20px', marginBottom: 20, color: '#1b5e20', fontSize: 15 },
  pendingBanner: { background: '#fff8e1', border: '1px solid #ffcc02', borderRadius: 10, padding: '14px 20px', marginBottom: 20, color: '#e65100', fontSize: 15 },
  errorBanner: { background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 10, padding: '14px 20px', marginBottom: 20, color: '#b71c1c', fontSize: 15 },
  tierDisplay: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f4ff', borderRadius: 10, padding: '16px 20px' },
  tierName: { fontWeight: 700, color: '#1a1a2e', fontSize: 15 },
  tierAmount: { fontSize: 28, fontWeight: 800, color: '#1a1a2e' },
  divider: { borderTop: '1px solid #f0f0f0', margin: '16px 0' },
  tierRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, marginBottom: 4, background: '#fafafa' },
  tierRowActive: { background: '#e8f0fe', border: '1px solid #c5cae9' },
  tierRowName: { fontWeight: 600, fontSize: 14 },
  tierRowAmount: { fontWeight: 700, color: '#1a1a2e' },
  linkBtn: { display: 'inline-block', marginTop: 12, color: '#1a1a2e', fontWeight: 600, fontSize: 14 },
  upiBox: { background: '#f8f9fa', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16 },
  upiAmount: { fontSize: 40, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 },
  upiId: { fontSize: 14, color: '#555', marginBottom: 16 },
  upiBtn: { background: '#1a1a2e', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'inherit' },
  orDivider: { display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: '#999', fontSize: 13 },
  qrPlaceholder: { background: 'white', border: '2px dashed #e0e0e0', borderRadius: 10, padding: '24px 16px', textAlign: 'center' },
  instructions: { paddingLeft: 18, color: '#555', fontSize: 14, lineHeight: 2 },
  label: { display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#333' },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  waitingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' },
}