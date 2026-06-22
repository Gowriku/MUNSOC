import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import CountdownTimer from '../components/CountdownTimer'

export default function Landing() {
  const [tiers, setTiers] = useState([])
  const [committees, setCommittees] = useState([])

  useEffect(() => {
    api.get('/payments/fee-tiers').then(r => setTiers(r.data)).catch(() => {})
    api.get('/portfolios/committees').then(r => setCommittees(r.data)).catch(() => {})
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#1a1a2e' }}>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>Model United Nations 2025</div>
          <h1 style={s.heroTitle}>Welcome to<br />MUNPortal</h1>
          <p style={s.heroSub}>
            Register, choose your committee, pay and receive your delegate pass — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="http://localhost:8000/api/v1/auth/login" style={s.heroCta}>Register / Sign In →</a>
            <a href="#committees" style={s.heroCtaGhost}>View Committees</a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={s.statsBar}>
        {[
          { label: 'Committees', value: committees.length || '—' },
          { label: 'Countries', value: committees.reduce((a, c) => a + (c.portfolios?.length || 0), 0) || '—' },
          { label: 'Days of MUN', value: '2' },
          { label: 'College', value: 'Your College' },
        ].map(({ label, value }) => (
          <div key={label} style={s.stat}>
            <span style={s.statVal}>{value}</span>
            <span style={s.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Fee tiers */}
      {tiers.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Registration Fees</h2>
          <p style={s.sectionSub}>Early registration gets you a discounted rate. Fees increase after each deadline.</p>
          <div style={s.tiersGrid}>
            {tiers.map((tier, i) => (
              <div key={tier.id} style={{ ...s.tierCard, ...(i === 0 ? s.tierCardHighlight : {}) }}>
                {i === 0 && <div style={s.bestValueBadge}>Best Value</div>}
                <h3 style={s.tierName}>{tier.name}</h3>
                <div style={s.tierAmount}>₹{tier.amount}</div>
                <div style={s.tierDeadline}>
                  Deadline: {new Date(tier.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ marginTop: 12 }}>
                  <CountdownTimer deadline={tier.deadline} />
                </div>
                <a href="http://localhost:8000/api/v1/auth/login" style={{ ...s.heroCta, display: 'block', marginTop: 16, textAlign: 'center', padding: '10px 16px', fontSize: 14 }}>
                  Register Now
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Committees */}
      {committees.length > 0 && (
        <section id="committees" style={{ ...s.section, background: '#f5f7fa' }}>
          <h2 style={s.sectionTitle}>Committees</h2>
          <p style={s.sectionSub}>Choose from our diverse range of committees. Submit up to 3 portfolio preferences after registering.</p>
          <div style={s.committeesGrid}>
            {committees.map(c => (
              <div key={c.id} style={s.committeeCard}>
                <div style={s.committeeAbbr}>{c.abbreviation}</div>
                <h3 style={s.committeeName}>{c.name}</h3>
                {c.topics && (
                  <div style={s.topics}>
                    {c.topics.split(',').map(t => (
                      <span key={t} style={s.topicChip}>{t.trim()}</span>
                    ))}
                  </div>
                )}
                <div style={s.committeePortfolios}>
                  {c.portfolios?.length || 0} portfolios available
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>How It Works</h2>
        <div style={s.timeline}>
          {[
            { step: '01', title: 'Sign In', desc: 'Log in with your Google account — no password needed.' },
            { step: '02', title: 'Complete Profile', desc: 'Add your phone, college, and opt in for transport if needed.' },
            { step: '03', title: 'Choose Preferences', desc: 'Submit your top 3 country/committee preferences.' },
            { step: '04', title: 'Pay Registration Fee', desc: 'Pay via UPI to our account and submit your transaction ID.' },
            { step: '05', title: 'Get Your QR Code', desc: 'After payment is confirmed, download your delegate QR pass.' },
            { step: '06', title: 'Attend the Event', desc: 'Show your QR at check-in. Receive live committee alerts on the portal.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={s.timelineItem}>
              <div style={s.timelineStep}>{step}</div>
              <div>
                <h4 style={s.timelineTitle}>{title}</h4>
                <p style={s.timelineDesc}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Map section */}
      <section style={{ ...s.section, background: '#f5f7fa' }}>
        <h2 style={s.sectionTitle}>Getting Here</h2>
        <p style={s.sectionSub}>Find us at the venue. Click the map to open in Google Maps.</p>
        <div style={s.mapWrap}>
          {/* Replace the src with your college's actual coordinates */}
          <iframe
            title="Venue Location"
            src="https://www.openstreetmap.org/export/embed.html?bbox=76.9,8.4,77.1,8.6&layer=mapnik&marker=8.5241,76.9366"
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
            allowFullScreen
          />
        </div>
        <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 8 }}>
          📍 Replace coordinates in Landing.jsx with your college location
        </p>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>🏛️ MUNPortal</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Built for delegates, by the organizing team.
          </span>
          <a href="http://localhost:8000/api/v1/auth/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Sign In →</a>
        </div>
      </footer>
    </div>
  )
}

const s = {
  hero: { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: '80px 16px', textAlign: 'center', color: 'white' },
  heroInner: { maxWidth: 660, margin: '0 auto' },
  heroBadge: { display: 'inline-block', padding: '4px 14px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 20, textTransform: 'uppercase' },
  heroTitle: { fontSize: 52, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.15 },
  heroSub: { fontSize: 18, opacity: 0.75, marginBottom: 32, lineHeight: 1.6 },
  heroCta: { display: 'inline-block', padding: '14px 28px', background: 'white', color: '#1a1a2e', borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: 'none' },
  heroCtaGhost: { display: 'inline-block', padding: '14px 28px', background: 'transparent', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' },
  statsBar: { display: 'flex', justifyContent: 'center', gap: 0, background: '#0f3460', color: 'white', flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 40px', borderRight: '1px solid rgba(255,255,255,0.1)' },
  statVal: { fontSize: 32, fontWeight: 800 },
  statLabel: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  section: { padding: '64px 16px' },
  sectionTitle: { textAlign: 'center', fontSize: 30, fontWeight: 700, margin: '0 0 8px' },
  sectionSub: { textAlign: 'center', color: '#666', marginBottom: 36, fontSize: 15 },
  tiersGrid: { display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', maxWidth: 860, margin: '0 auto' },
  tierCard: { background: 'white', border: '2px solid #e8e8e8', borderRadius: 16, padding: '28px 32px', textAlign: 'center', minWidth: 220, position: 'relative', flex: '1 1 200px', maxWidth: 260 },
  tierCardHighlight: { border: '2px solid #1a1a2e', boxShadow: '0 8px 24px rgba(26,26,46,0.15)' },
  bestValueBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', color: 'white', fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 700, letterSpacing: 0.5 },
  tierName: { fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: '#555' },
  tierAmount: { fontSize: 40, fontWeight: 800, color: '#1a1a2e', margin: '8px 0' },
  tierDeadline: { fontSize: 13, color: '#888' },
  committeesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' },
  committeeCard: { background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
  committeeAbbr: { display: 'inline-block', background: '#1a1a2e', color: 'white', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, marginBottom: 10 },
  committeeName: { margin: '0 0 10px', fontSize: 16, fontWeight: 600 },
  topics: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  topicChip: { background: '#f0f4ff', color: '#3f51b5', padding: '3px 8px', borderRadius: 20, fontSize: 12 },
  committeePortfolios: { color: '#888', fontSize: 13 },
  timeline: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' },
  timelineItem: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  timelineStep: { width: 40, height: 40, borderRadius: '50%', background: '#1a1a2e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 },
  timelineTitle: { margin: '6px 0 4px', fontWeight: 600 },
  timelineDesc: { fontSize: 14, color: '#666', margin: 0 },
  mapWrap: { height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e0e0', maxWidth: 900, margin: '0 auto', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
  footer: { background: '#1a1a2e', color: 'white', padding: '24px 16px' },
  footerInner: { maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
}