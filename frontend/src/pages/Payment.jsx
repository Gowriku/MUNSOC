import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button, StatusBadge, InfoBox } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import CountdownTimer from '../components/CountdownTimer'
import useAuthStore from '../store/authStore'
import api from '../api/client'

// Generate UPI QR as a data URL using the canvas API — no extra library needed
function useUPIQR(upiLink) {
  const [qrDataUrl, setQrDataUrl] = useState(null)

  useEffect(() => {
    if (!upiLink) return
    // Dynamically import qrcode only when needed
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(upiLink, {
        width: 240,
        margin: 2,
        color: { dark: '#0D0D0D', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      }).then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation failed:', err))
    })
  }, [upiLink])

  return qrDataUrl
}

export default function Payment() {
  const { user, fetchMe } = useAuthStore()
  const { toasts, show } = useToast()
  const navigate = useNavigate()
  const [tiers, setTiers] = useState([])
  const [upiData, setUpiData] = useState(null)
  const [utr, setUtr] = useState(user?.payment_utr || '')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1) // 1=amount, 2=pay, 3=utr

  const upiQR = useUPIQR(upiData?.upi_link)

  useEffect(() => {
    api.get('/payments/fee-tiers').then(r => setTiers(r.data)).catch(() => {})
    if (user?.payment_status !== 'confirmed') {
      api.get('/payments/upi-link').then(r => setUpiData(r.data)).catch(() => {})
    }
    // Restore step from payment status
    if (user?.payment_status === 'submitted') setStep(3)
    if (user?.payment_utr) setUtr(user.payment_utr)
  }, [user?.payment_status])

  const handleSubmitUTR = async () => {
    if (!utr.trim()) return show('Please enter your UTR / Transaction ID', 'warning')
    if (utr.trim().length < 6) return show('UTR seems too short — please check it', 'warning')
    setSubmitting(true)
    try {
      await api.post('/users/me/payment', { utr: utr.trim() })
      await fetchMe()
      show('UTR submitted! Awaiting admin confirmation.', 'success')
      setStep(3)
    } catch (e) {
      show(e.response?.data?.detail || 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const copyUPI = () => {
    navigator.clipboard.writeText(upiData?.upi_id || '')
    show('UPI ID copied!', 'success')
  }

  const openUPIApp = () => {
    if (upiData?.upi_link) window.location.href = upiData.upi_link
  }

  const status = user?.payment_status

  // If already confirmed, show success and redirect button
  if (status === 'confirmed') {
    return (
      <PageLayout title="Payment" subtitle="Registration payment">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Card accent="var(--gold)" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, color: 'var(--black)' }}>Payment Confirmed!</h2>
            <p style={{ color: 'var(--text-mid)', marginBottom: 28 }}>
              Your registration is complete. Your delegate QR pass is ready.
            </p>
            <Button onClick={() => navigate('/my-qr')} variant="gold" size="lg" style={{ width: '100%' }}>
              View My QR Pass →
            </Button>
          </Card>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Registration Payment" subtitle="Complete payment to receive your delegate QR pass.">
      <ToastContainer toasts={toasts} />

      {/* Status banner for submitted */}
      {status === 'submitted' && (
        <InfoBox type="warning" style={{ marginBottom: 20 }}>
          <strong>UTR submitted.</strong> The admin will confirm your payment shortly. Your QR pass will unlock automatically once confirmed.
          {user?.payment_utr && <span style={{ display: 'block', marginTop: 4, fontFamily: 'monospace' }}>Transaction ID: {user.payment_utr}</span>}
        </InfoBox>
      )}
      {status === 'rejected' && (
        <InfoBox type="danger" style={{ marginBottom: 20 }}>
          <strong>Payment rejected.</strong> Your UTR was not valid. Please pay again and submit the correct transaction ID.
        </InfoBox>
      )}

      <div style={s.layout}>

        {/* LEFT: Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Step indicator */}
          <div style={s.steps}>
            {['Amount', 'Pay', 'Confirm'].map((label, i) => {
              const num = i + 1
              const active = step === num
              const done = step > num
              return (
                <div key={label} style={s.stepItem}>
                  <div style={{
                    ...s.stepCircle,
                    background: done ? 'var(--gold)' : active ? 'var(--primary)' : 'var(--border)',
                    color: done || active ? 'white' : 'var(--text-light)',
                  }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : done ? 'var(--gold)' : 'var(--text-light)' }}>
                    {label}
                  </span>
                  {i < 2 && <div style={s.stepLine} />}
                </div>
              )
            })}
          </div>

          {/* Step 1: Your amount */}
          <Card accent={step === 1 ? 'var(--primary)' : undefined}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <CardTitle icon="🏷️">Step 1 — Your Amount</CardTitle>
              {step > 1 && <Button onClick={() => setStep(1)} variant="outline" size="sm">Edit</Button>}
            </div>

            {user?.reg_tier ? (
              <div>
                <div style={s.amountDisplay}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {user.reg_tier.replace(/_/g, ' ')} tier
                    </div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                      ₹{user.amount_due}
                    </div>
                  </div>
                  {step === 1 && (
                    <Button onClick={() => setStep(2)} variant="primary" size="lg">
                      Proceed to Pay →
                    </Button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>
                  This amount is locked based on when you registered.
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-light)', fontSize: 14, marginBottom: 12 }}>
                  Complete your profile first to lock in your registration tier.
                </p>
                <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm">← Go to Profile</Button>
              </div>
            )}
          </Card>

          {/* Step 2: Pay via UPI */}
          {step >= 2 && (
            <Card accent={step === 2 ? 'var(--gold)' : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <CardTitle icon="💳">Step 2 — Pay via UPI</CardTitle>
                {step > 2 && <Button onClick={() => setStep(2)} variant="outline" size="sm">Back</Button>}
              </div>

              {upiData ? (
                <div>
                  <div style={s.upiCard}>
                    {/* Amount */}
                    <div style={s.upiAmount}>₹{upiData.amount}</div>

                    {/* UPI ID row */}
                    <div style={s.upiIdRow}>
                      <span style={s.upiIdLabel}>Pay to:</span>
                      <span style={s.upiIdValue}>{upiData.upi_id}</span>
                      <button onClick={copyUPI} style={s.copyBtn} title="Copy UPI ID">📋</button>
                    </div>

                    {/* QR Code — generated from UPI deep link */}
                    <div style={s.qrSection}>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Scan with any UPI app
                      </div>
                      {upiQR ? (
                        <div style={s.qrFrame}>
                          <img
                            src={upiQR}
                            alt="UPI QR Code"
                            style={{ width: 200, height: 200, display: 'block' }}
                          />
                        </div>
                      ) : (
                        <div style={s.qrLoading}>
                          <div style={s.spinner} />
                          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8 }}>Generating QR...</p>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>
                        GPay · PhonePe · Paytm · any UPI app
                      </div>
                    </div>

                    {/* Open UPI App button */}
                    <Button onClick={openUPIApp} variant="gold" style={{ width: '100%', marginTop: 4 }}>
                      📱 Open UPI App
                    </Button>
                  </div>

                  {step === 2 && (
                    <Button onClick={() => setStep(3)} variant="primary" style={{ width: '100%', marginTop: 12 }}>
                      I've Paid — Enter Transaction ID →
                    </Button>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-light)', fontSize: 14 }}>Loading payment details...</p>
              )}
            </Card>
          )}

          {/* Step 3: Submit UTR */}
          {step >= 3 && (
            <Card accent={step === 3 ? 'var(--primary)' : undefined}>
              <CardTitle icon="🧾">Step 3 — Submit Transaction ID</CardTitle>

              {status === 'submitted' ? (
                <div style={s.submittedBox}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                  <h3 style={{ margin: '0 0 6px', color: 'var(--black)' }}>Awaiting Confirmation</h3>
                  <p style={{ color: 'var(--text-mid)', fontSize: 14, margin: '0 0 4px' }}>
                    Transaction ID: <strong style={{ fontFamily: 'monospace' }}>{user?.payment_utr}</strong>
                  </p>
                  <p style={{ color: '#111111', fontSize: 13, margin: '8px 0 0' }}>
                    The admin will confirm within a few hours. Your QR pass unlocks automatically.
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                    After paying, find the Transaction/UTR ID in your UPI app under payment history and enter it below.
                  </p>
                  <label style={s.label}>Transaction ID / UTR Number</label>
                  <input
                    type="text"
                    value={utr}
                    onChange={e => setUtr(e.target.value)}
                    placeholder="e.g. 424212345678"
                    style={s.input}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitUTR()}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '6px 0 16px' }}>
                    Usually 12 digits. Found in UPI app → Payment History → Transaction Details.
                  </p>
                  <Button
                    onClick={handleSubmitUTR}
                    disabled={submitting || !utr.trim()}
                    variant="primary"
                    style={{ width: '100%' }}
                    size="lg"
                  >
                    {submitting ? 'Submitting...' : '✓ Submit for Confirmation'}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT: Fee tier info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <CardTitle icon="🏷️">Registration Tiers</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tiers.map(tier => {
                const isMyTier = user?.reg_tier === tier.tier_key
                const expired = new Date(tier.deadline) < new Date()
                return (
                  <div key={tier.id} style={{
                    ...s.tierRow,
                    ...(isMyTier ? s.tierRowActive : {}),
                    opacity: expired && !isMyTier ? 0.5 : 1,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{tier.name}</span>
                        {isMyTier && (
                          <span style={{ background: 'var(--primary)', color: 'white', fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700 }}>
                            YOUR TIER
                          </span>
                        )}
                        {expired && !isMyTier && (
                          <span style={{ background: '#f0f0f0', color: 'var(--text-light)', fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700 }}>
                            CLOSED
                          </span>
                        )}
                      </div>
                      {!expired && <CountdownTimer deadline={tier.deadline} />}
                      {expired && <span style={{ fontSize: 11, color: 'var(--text-light)' }}>Registration closed</span>}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 18, color: isMyTier ? 'var(--primary)' : 'var(--text-dark)' }}>
                      ₹{tier.amount}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardTitle icon="📋">How to Pay</CardTitle>
            <ol style={{ paddingLeft: 18, color: 'var(--text-mid)', fontSize: 14, lineHeight: 2.2, margin: 0 }}>
              <li>Note your amount above</li>
              <li>Scan the QR or tap "Open UPI App"</li>
              <li>Pay exactly <strong>₹{upiData?.amount || user?.amount_due}</strong></li>
              <li>Save your Transaction ID / UTR</li>
              <li>Enter it in Step 3 above</li>
              <li>Admin confirms → QR pass unlocked</li>
            </ol>
          </Card>

          <Card style={{ background: 'var(--off-white)', border: '1px dashed var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0, lineHeight: 1.6 }}>
              <strong>Having trouble?</strong> Contact us via the Emergency section or reach out to any organizer directly.
            </p>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}

const s = {
  layout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' },
  steps: { display: 'flex', alignItems: 'center', background: 'var(--white-lighter)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 20px', gap: 0 },
  stepItem: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0, transition: 'all 0.2s' },
  stepLine: { flex: 1, height: 2, background: 'var(--border)', margin: '0 6px' },
  amountDisplay: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: 'var(--off-white)', borderRadius: 10, padding: '16px 20px' },
  upiCard: { background: 'var(--off-white)', borderRadius: 12, padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  upiAmount: { fontSize: 36, fontWeight: 900, color: 'var(--primary)' },
  upiIdRow: {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'linear-gradient(135deg, #C9A227, #D4AF37)',
  border: '1px solid rgba(201,162,39,0.4)',
  borderRadius: 8,
  padding: '10px 12px',
  width: '100%',
  },
  upiIdLabel: {
  fontSize: 12,
  color: '#3A2A00',
  fontWeight: 700,
  flexShrink: 0,
},
  upiIdValue: {
  fontSize: 14,
  fontWeight: 800,
  color: '#111111',
  flex: 1,
  fontFamily: 'monospace',
  letterSpacing: '0.03em',
},
  copyBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  qrSection: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  qrFrame: { background: 'white', padding: 12, borderRadius: 12, border: '2px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
  qrLoading: { width: 224, height: 224, background: 'white', border: '2px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  submittedBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', textAlign: 'center' },
  tierRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 8, background: 'var(--off-white)', border: '1px solid transparent', gap: 12 },
  tierRowActive: { background: '#FEF0EF', border: '1.5px solid var(--primary)30' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: 0.3 },
    input: {
    background: '#FFFFFF',
    color: '#111111',      // <-- makes typed text black
    fontWeight: 600,
},

}
