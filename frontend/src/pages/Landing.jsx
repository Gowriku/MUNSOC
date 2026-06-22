import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, MapPin, Calendar, Users, Globe, ChevronRight } from 'lucide-react'
import api from '../api/client'
import CountdownTimer from '../components/CountdownTimer'
import logo1 from '../assets/logo1.png'
import logo2 from '../assets/logo2.png'

export default function Landing() {
  const [tiers, setTiers] = useState([])
  const [committees, setCommittees] = useState([])

  useEffect(() => {
    api.get('/payments/fee-tiers').then(r => setTiers(r.data)).catch(() => {})
    api.get('/portfolios/committees').then(r => setCommittees(r.data)).catch(() => {})
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Gold top strip */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

      {/* Nav */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 16 }}>
            <img
            src={logo1}
            alt="MUN Logo"
            style={{
                width: 28,
                height: 28,
                objectFit: 'contain'
            }}
            />
            MUNPortal
          </div>
          <a href="http://localhost:8000/api/v1/auth/login" style={s.headerCta}>
            Register <ArrowRight size={14} />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroGlow} />
        <img
        src={logo2}
        alt=""
        style={s.heroBackgroundLogo}
        />
        <div style={s.heroInner}>
          <div style={s.heroBadge}>Model United Nations 2026</div>
          <h1 style={s.heroTitle}>Diplomacy.<br />Leadership.<br />Change.</h1>
          <p style={s.heroSub}>
            The premier Model UN conference experience. Register, select your committee, and receive your delegate credentials — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="http://localhost:8000/api/v1/auth/login" style={s.heroCta}>
              Register Now <ArrowRight size={16} />
            </a>
            <a href="#committees" style={s.heroGhost}>View Committees</a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={s.statsBar}>
        {[
          { label: 'Committees',   value: committees.length || '—', icon: Globe },
          { label: 'Countries',    value: committees.reduce((a, c) => a + (c.portfolios?.length || 0), 0) || '—', icon: MapPin },
          { label: 'Days of MUN',  value: '2', icon: Calendar },
          { label: 'Delegates',    value: '150+', icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={s.stat}>
            <Icon size={18} color="var(--gold)" style={{ marginBottom: 10 }} />
            <span style={s.statVal}>{value}</span>
            <span style={s.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Fee tiers */}
      {tiers.length > 0 && (
        <section style={s.section}>
          <div style={s.sectionInner}>
            <p style={s.eyebrow}>Registration</p>
            <h2 style={s.sectionTitle}>Fee Structure</h2>
            <p style={s.sectionSub}>Early registration is rewarded. Fees escalate after each deadline.</p>
            <div style={s.tiersGrid}>
              {tiers.map((tier, i) => (
                <div key={tier.id} style={{ ...s.tierCard, ...(i === 0 ? s.tierCardFeatured : {}) }}>
                  {i === 0 && <div style={s.featuredBadge}>Best Value</div>}
                  <div style={s.tierLabel}>{tier.name}</div>
                  <div style={s.tierAmount}>
                    <span style={s.tierCurrency}>₹</span>{tier.amount}
                  </div>
                  <div style={s.tierDeadline}>
                    Deadline: {new Date(tier.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ marginTop: 14, marginBottom: 18 }}>
                    <CountdownTimer deadline={tier.deadline} />
                  </div>
                  <a href="http://localhost:8000/api/v1/auth/login" style={{ ...s.heroCta, display: 'flex', justifyContent: 'center', fontSize: 13, padding: '10px 18px' }}>
                    Register <ArrowRight size={13} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Committees */}
      {committees.length > 0 && (
        <section id="committees" style={{ ...s.section, background: 'var(--surface)' }}>
          <div style={s.sectionInner}>
            <p style={s.eyebrow}>Committees</p>
            <h2 style={s.sectionTitle}>Choose Your Arena</h2>
            <p style={s.sectionSub}>Submit up to three portfolio preferences after registering.</p>
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
                  <div style={s.committeeFooter}>
                    <span style={s.portfolioCount}>{c.portfolios?.length || 0} portfolios</span>
                    <ChevronRight size={14} color="var(--text-3)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <p style={s.eyebrow}>Process</p>
          <h2 style={s.sectionTitle}>Six Steps to the Floor</h2>
          <div style={s.stepsGrid}>
            {[
              { n: '01', title: 'Sign In',          desc: 'Authenticate with your Google account. No password required.' },
              { n: '02', title: 'Complete Profile',  desc: 'Add your contact, institution, and transport preference to lock in your fee tier.' },
              { n: '03', title: 'Submit Preferences',desc: 'Rank up to three country portfolios across any committee.' },
              { n: '04', title: 'Pay Registration',  desc: 'Transfer via UPI and submit your transaction ID for verification.' },
              { n: '05', title: 'Receive Pass',      desc: 'Upon payment confirmation, your QR delegate pass is instantly generated.' },
              { n: '06', title: 'Attend',            desc: 'Scan in at the venue. Receive live committee alerts throughout the event.' },
            ].map(({ n, title, desc }) => (
              <div key={n} style={s.step}>
                <div style={s.stepNum}>{n}</div>
                <div>
                  <div style={s.stepTitle}>{title}</div>
                  <div style={s.stepDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map */}
      <section style={{ ...s.section, background: 'var(--surface)' }}>
        <div style={s.sectionInner}>
          <p style={s.eyebrow}>Venue</p>
          <h2 style={s.sectionTitle}>Getting Here</h2>
          <div style={s.mapWrap}>
            <iframe
              title="Venue Location"
              src="https://www.openstreetmap.org/export/embed.html?bbox=76.32,9.99,76.34,10.02&layer=mapnik&marker=10.0167,76.3310"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.goldAccentLine} />
        <div style={s.footerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 15 }}>
            <img
            src={logo1}
            alt="MUN Logo"
            style={{
                width: 28,
                height: 28,
                objectFit: 'contain'
            }}
            />
            MUNPortal
          </div>
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Built for delegates, by the organizing team.</span>
          <a href="http://localhost:8000/api/v1/auth/login" style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 600 }}>
            Sign In
          </a>
        </div>
      </footer>
    </div>
  )
}

const s = {
  header: { background: '#0A0A0A', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerCta: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'var(--wine)', color: 'var(--text)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  hero: { background: 'var(--surface)', padding: '100px 24px 110px', textAlign: 'center', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)' },
  heroGlow: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(110,30,42,0.18) 0%, transparent 70%)', pointerEvents: 'none' },
  heroInner: {
  maxWidth: 640,
  margin: '0 auto',
  position: 'relative',
  zIndex: 2,
    },
  heroBadge: { display: 'inline-block', padding: '5px 16px', background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.25)', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 28 },
  heroBackgroundLogo: {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  height: 500,
  objectFit: 'contain',
  opacity: 0.06,
  filter: 'grayscale(100%) brightness(180%)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 0,
  },
  heroTitle: { fontSize: 58, fontWeight: 900, margin: '0 0 22px', lineHeight: 1.08, letterSpacing: '-1.5px', color: 'var(--text)' },
  heroSub: { fontSize: 16, color: 'var(--text-2)', marginBottom: 36, lineHeight: 1.7, maxWidth: 460, margin: '0 auto 36px' },
  heroCta: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px', background: 'var(--wine)', color: 'var(--text)', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' },
  heroGhost: { display: 'inline-flex', alignItems: 'center', padding: '13px 26px', background: 'transparent', color: 'var(--text-2)', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid var(--border-hi)' },
  statsBar: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 48px', borderRight: '1px solid var(--border)', minWidth: 140 },
  statVal: { fontSize: 34, fontWeight: 800, letterSpacing: '-1px', color: 'var(--text)' },
  statLabel: { fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4, fontWeight: 600 },
  section: { padding: '80px 24px' },
  sectionInner: { maxWidth: 1060, margin: '0 auto' },
  eyebrow: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 },
  sectionTitle: { fontSize: 32, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.5px', color: 'var(--text)' },
  sectionSub: { color: 'var(--text-3)', marginBottom: 44, fontSize: 15, maxWidth: 520 },
  tiersGrid: { display: 'flex', gap: 20, flexWrap: 'wrap' },
  tierCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px 28px', flex: '1 1 200px', maxWidth: 280, position: 'relative', overflow: 'hidden' },
  tierCardFeatured: { border: '1px solid rgba(201,162,39,0.3)', borderTop: '2px solid var(--gold)', background: 'rgba(201,162,39,0.04)' },
  featuredBadge: { position: 'absolute', top: 14, right: 14, background: 'var(--gold)', color: '#0D0D0D', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.07em', textTransform: 'uppercase' },
  tierLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 },
  tierAmount: { fontSize: 42, fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 },
  tierCurrency: { fontSize: 24, fontWeight: 700, verticalAlign: 'top', lineHeight: 1.3, color: 'var(--text-2)' },
  tierDeadline: { fontSize: 12, color: 'var(--text-3)', marginTop: 8 },
  committeesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  committeeCard: { background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', transition: 'border-color 0.2s' },
  committeeAbbr: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: 'var(--wine-dim)', border: '1px solid rgba(110,30,42,0.3)', color: 'var(--wine-hover)', borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 },
  committeeName: { margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.1px' },
  topics: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  topicChip: { background: 'rgba(201,162,39,0.08)', color: 'var(--gold)', padding: '3px 8px', borderRadius: 20, fontSize: 11, border: '1px solid rgba(201,162,39,0.15)' },
  committeeFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12 },
  portfolioCount: { fontSize: 12, color: 'var(--text-3)', fontWeight: 500 },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 },
  step: { display: 'flex', gap: 18, alignItems: 'flex-start' },
  stepNum: { width: 42, height: 42, borderRadius: 10, background: 'var(--wine-dim)', border: '1px solid rgba(110,30,42,0.3)', color: 'var(--wine-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, letterSpacing: '0.05em', flexShrink: 0 },
  stepTitle: { fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--text)' },
  stepDesc: { fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 },
  mapWrap: { height: 380, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' },
  footer: { background: '#0A0A0A', padding: '0 24px 28px', borderTop: '1px solid var(--border)' },
  goldAccentLine: { height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.4), transparent)', marginBottom: 28 },
  footerInner: { maxWidth: 1060, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
}
