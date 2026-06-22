import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button } from '../components/Card'
import useAuthStore from '../store/authStore'
import api from '../api/client'

export default function MyQR() {
  const { user } = useAuthStore()
  const [qrData, setQrData] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const printRef = useRef()

  useEffect(() => {
    Promise.all([
      api.get('/users/me/qr').catch(e => { throw e }),
      api.get('/portfolios/assignment/me').catch(() => null),
    ]).then(([qr, assign]) => {
      setQrData(qr.data)
      setAssignment(assign?.data || null)
    }).catch(e => {
      setError(e.response?.data?.detail || 'QR not available')
    }).finally(() => setLoading(false))
  }, [])

  const handlePrint = () => window.print()

  const handleDownload = () => {
    const svg = printRef.current?.querySelector('svg')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MUN-Pass-${user?.name?.replace(/\s+/g, '-')}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <PageLayout title="My QR Pass"><div style={s.center}>Loading...</div></PageLayout>

  if (error) return (
    <PageLayout title="My QR Pass">
      <Card style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h3 style={{ margin: '0 0 8px' }}>QR Pass Locked</h3>
        <p style={{ color: '#666', marginBottom: 24 }}>{error}</p>
        {user?.payment_status !== 'confirmed' && (
          <Link to="/payment">
            <Button>Complete Payment →</Button>
          </Link>
        )}
      </Card>
    </PageLayout>
  )

  const verifyUrl = `${window.location.origin}/api/v1${qrData.verify_url}`

  return (
    <PageLayout title="My Delegate Pass" subtitle="Show this QR at the venue entrance for check-in.">

      <div style={s.layout}>
        {/* Pass Card */}
        <div ref={printRef}>
          <div style={s.passCard}>
            {/* Header */}
            <div style={s.passHeader}>
              <div style={s.passLogo}>🏛️</div>
              <div>
                <div style={s.passTitle}>DELEGATE PASS</div>
                <div style={s.passMUN}>Model United Nations 2025</div>
              </div>
            </div>

            {/* QR Code */}
            <div style={s.qrWrap}>
              <QRCodeSVG
                value={verifyUrl}
                size={200}
                bgColor="white"
                fgColor="#1a1a2e"
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Delegate Info */}
            <div style={s.passInfo}>
              <div style={s.passName}>{user?.name}</div>
              <div style={s.passEmail}>{user?.email}</div>
              {user?.college && <div style={s.passCollege}>{user?.college}</div>}
            </div>

            {/* Assignment */}
            {assignment && (
              <div style={s.passAssignment}>
                {assignment.portfolio?.flag_url && (
                  <img src={assignment.portfolio.flag_url} alt="" style={{ width: 32, marginRight: 10 }} />
                )}
                <div>
                  <div style={s.passCountry}>{assignment.portfolio?.country_name}</div>
                  <div style={s.passCommittee}>{assignment.portfolio?.committee?.name}</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={s.passFooter}>
              <span style={s.passId}>ID: {qrData.token?.slice(0, 8).toUpperCase()}</span>
              <span style={s.passDate}>Issued: {new Date(qrData.issued_at).toLocaleDateString()}</span>
              {user?.transportation_opted && (
                <span style={s.transportBadge}>🚌 Transport</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardTitle>Download & Print</CardTitle>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>
              Save your QR pass and bring it to the event — either on your phone or as a printout.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button onClick={handleDownload}>⬇ Download QR (SVG)</Button>
              <Button onClick={handlePrint} variant="secondary">🖨 Print Pass</Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Pass Details</CardTitle>
            <div style={s.detailRow}><span style={s.detailLabel}>Name</span><span>{user?.name}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Email</span><span>{user?.email}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>College</span><span>{user?.college || '—'}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Reg. Tier</span><span>{user?.reg_tier?.replace(/_/g, ' ') || '—'}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Transport</span><span>{user?.transportation_opted ? '✅ Yes' : '❌ No'}</span></div>
            {assignment && <>
              <div style={s.detailRow}><span style={s.detailLabel}>Country</span><span>{assignment.portfolio?.country_name}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>Committee</span><span>{assignment.portfolio?.committee?.abbreviation}</span></div>
            </>}
          </Card>

          <Card>
            <CardTitle>Instructions</CardTitle>
            <ol style={{ paddingLeft: 18, color: '#555', fontSize: 14, lineHeight: 2, margin: 0 }}>
              <li>Save or screenshot this QR code</li>
              <li>Arrive at the venue on time</li>
              <li>Show QR to the volunteer at entrance</li>
              <li>They'll scan it to mark your attendance</li>
              {user?.transportation_opted && <li>Show the same QR for bus check-in</li>}
            </ol>
          </Card>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #root > * { display: none !important; }
          .print-show { display: block !important; }
        }
      `}</style>
    </PageLayout>
  )
}

const s = {
  layout: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start' },
  center: { textAlign: 'center', padding: 48, color: '#666' },
  passCard: { background: 'white', border: '2px solid #1a1a2e', borderRadius: 16, padding: 0, width: 300, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  passHeader: { background: '#1a1a2e', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 },
  passLogo: { fontSize: 28 },
  passTitle: { fontWeight: 800, fontSize: 14, letterSpacing: 2 },
  passMUN: { fontSize: 11, opacity: 0.7, marginTop: 2 },
  qrWrap: { display: 'flex', justifyContent: 'center', padding: '24px 20px 16px', background: 'white' },
  passInfo: { textAlign: 'center', padding: '0 20px 16px' },
  passName: { fontWeight: 700, fontSize: 18, color: '#1a1a2e' },
  passEmail: { fontSize: 12, color: '#888', marginTop: 2 },
  passCollege: { fontSize: 12, color: '#aaa', marginTop: 2 },
  passAssignment: { display: 'flex', alignItems: 'center', margin: '0 16px 16px', background: '#f0f4ff', borderRadius: 10, padding: '12px 14px' },
  passCountry: { fontWeight: 700, fontSize: 15, color: '#1a1a2e' },
  passCommittee: { fontSize: 12, color: '#666', marginTop: 2 },
  passFooter: { background: '#f8f9fa', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', flexWrap: 'wrap', gap: 6 },
  passId: { fontSize: 11, fontFamily: 'monospace', color: '#888', fontWeight: 600 },
  passDate: { fontSize: 11, color: '#aaa' },
  transportBadge: { fontSize: 11, background: '#e3f2fd', color: '#0d47a1', padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14, color: '#333' },
  detailLabel: { color: '#888', fontWeight: 500 },
}
