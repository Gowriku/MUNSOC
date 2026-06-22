import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer, Lock } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button } from '../components/Card'
import useAuthStore from '../store/authStore'
import api from '../api/client'

export default function MyQR() {
  const { user } = useAuthStore()
  const [qrData, setQrData]       = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const printRef = useRef()

  useEffect(() => {
    Promise.all([
      api.get('/users/me/qr'),
      api.get('/portfolios/assignment/me').catch(() => null),
    ]).then(([qr, assign]) => {
      setQrData(qr.data)
      setAssignment(assign?.data || null)
    }).catch(e => setError(e.response?.data?.detail || 'QR not available'))
    .finally(() => setLoading(false))
  }, [])

  const handleDownload = () => {
    const svg = printRef.current?.querySelector('svg')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `MUN-Pass-${user?.name?.replace(/\s+/g, '-')}.svg`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <PageLayout title="Delegate Pass"><div style={s.center}>Loading...</div></PageLayout>

  if (error) return (
    <PageLayout title="Delegate Pass">
      <Card style={{ textAlign: 'center', padding: 56, maxWidth: 420, margin: '0 auto' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(110,30,42,0.2)', border: '1px solid rgba(110,30,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Lock size={24} color="var(--wine-hover)" />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>Pass Locked</h3>
        <p style={{ color: 'var(--text-3)', marginBottom: 24, fontSize: 13, lineHeight: 1.7 }}>{error}</p>
        {user?.payment_status !== 'confirmed' && (
          <Link to="/payment"><Button>Complete Payment</Button></Link>
        )}
      </Card>
    </PageLayout>
  )

  const verifyUrl = `${window.location.origin}/api/v1${qrData.verify_url}`

  return (
    <PageLayout title="Delegate Pass" subtitle="Present this pass at the venue entrance for check-in.">
      <div style={s.layout}>

        {/* The Pass */}
        <div ref={printRef} style={{ flexShrink: 0 }}>
          <div style={s.pass}>
            {/* Header */}
            <div style={s.passHeader}>
              <div style={s.passGoldLine} />
              <div style={s.passHeaderContent}>
                <div style={s.passLogoBox} />
                <div>
                  <div style={s.passTitle}>DELEGATE PASS</div>
                  <div style={s.passMun}>Model United Nations 2025</div>
                </div>
              </div>
            </div>

            {/* QR */}
            <div style={s.qrWrap}>
              <div style={s.qrFrame}>
                <QRCodeSVG value={verifyUrl} size={188} bgColor="white" fgColor="#0D0D0D" level="H" includeMargin={false} />
              </div>
            </div>

            {/* Info */}
            <div style={s.passInfo}>
              <div style={s.passName}>{user?.name}</div>
              <div style={s.passEmail}>{user?.email}</div>
              {user?.college && <div style={s.passCollege}>{user.college}</div>}
            </div>

            {/* Country */}
            {assignment && (
              <div style={s.passCountryBlock}>
                {assignment.portfolio?.flag_url && <img src={assignment.portfolio.flag_url} alt="" style={{ width: 32 }} />}
                <div>
                  <div style={s.passCountry}>{assignment.portfolio?.country_name}</div>
                  <div style={s.passCommittee}>{assignment.portfolio?.committee?.name}</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={s.passFooter}>
              <span style={s.passId}>#{qrData.token?.slice(0, 8).toUpperCase()}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {user?.transportation_opted && <span style={s.transportBadge}>Transport</span>}
                <span style={s.issuedBadge}>{new Date(qrData.issued_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0 }}>
          <Card>
            <CardTitle>Save Your Pass</CardTitle>
            <p style={s.mutedText}>Bring this pass to the event on your phone or as a printed copy. Volunteers will scan the QR code at entry.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <Button onClick={handleDownload} icon={<Download size={13} />}>Download Pass (SVG)</Button>
              <Button onClick={() => window.print()} variant="secondary" icon={<Printer size={13} />}>Print Pass</Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Pass Details</CardTitle>
            {[
              ['Name',       user?.name],
              ['Email',      user?.email],
              ['Institution', user?.college || '—'],
              ['Reg. Tier',  user?.reg_tier?.replace(/_/g, ' ') || '—'],
              ['Transport',  user?.transportation_opted ? 'Opted in' : 'Not required'],
              ...(assignment ? [
                ['Country',   assignment.portfolio?.country_name],
                ['Committee', assignment.portfolio?.committee?.abbreviation],
              ] : []),
            ].map(([label, value]) => (
              <div key={label} style={s.detailRow}>
                <span style={s.detailLabel}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </Card>

          <Card>
            <CardTitle>Instructions</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Save or screenshot the QR pass.',
                'Arrive at the venue on time.',
                'Present your QR to the volunteer at the entrance.',
                'The volunteer will scan it to mark your attendance.',
                ...(user?.transportation_opted ? ['Use the same QR for bus check-in.'] : []),
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--wine-hover)', background: 'var(--wine-dim)', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}

const s = {
  layout: { display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' },
  center: { textAlign: 'center', padding: 56, color: 'var(--text-3)' },
  pass: { width: 300, borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.06)' },
  passHeader: { background: '#0A0A0A' },
  passGoldLine: { height: 2, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' },
  passHeaderContent: { padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 },
  passLogoBox: { width: 22, height: 22, borderRadius: 5, background: '#6E1E2A', flexShrink: 0 },
  passTitle: { fontWeight: 800, fontSize: 12, letterSpacing: '0.14em', color: 'white' },
  passMun: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  qrWrap: { background: '#F5F5F5', padding: '20px', display: 'flex', justifyContent: 'center' },
  qrFrame: { padding: 12, background: 'white', borderRadius: 10, border: '1.5px solid #E0E0E0', lineHeight: 0 },
  passInfo: { textAlign: 'center', padding: '14px 18px 10px', background: 'white' },
  passName: { fontWeight: 800, fontSize: 17, color: '#0A0A0A', letterSpacing: '-0.3px', marginBottom: 2 },
  passEmail: { fontSize: 11, color: '#666', marginBottom: 1 },
  passCollege: { fontSize: 11, color: '#999' },
  passCountryBlock: { display: 'flex', alignItems: 'center', gap: 10, margin: '0 14px 12px', background: '#F8F8F8', borderRadius: 8, padding: '10px 12px', border: '1px solid #E8E8E8' },
  passCountry: { fontWeight: 700, fontSize: 14, color: '#0A0A0A' },
  passCommittee: { fontSize: 11, color: '#666', marginTop: 1 },
  passFooter: { background: '#0A0A0A', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 6 },
  passId: { fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em' },
  transportBadge: { fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: 'rgba(201,162,39,0.15)', color: 'var(--gold)', padding: '3px 8px', borderRadius: 20 },
  issuedBadge: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' },
  mutedText: { color: 'var(--text-3)', fontSize: 13, lineHeight: 1.7, marginBottom: 16 },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' },
  detailLabel: { fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' },
}
