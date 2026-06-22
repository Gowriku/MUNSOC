import { useEffect, useState } from 'react'
import { Star, HelpCircle, Megaphone, Lock, Globe } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'

const TYPES = [
  { key: 'review',    Icon: Star,       label: 'Review',    desc: 'Share your conference experience' },
  { key: 'query',     Icon: HelpCircle, label: 'Query',     desc: 'Ask a question' },
  { key: 'complaint', Icon: Megaphone,  label: 'Complaint', desc: 'Report an issue' },
]
const TYPE_COLOR = {
  review:    { color: 'var(--gold)',  border: 'rgba(201,162,39,0.3)',   bg: 'rgba(201,162,39,0.08)' },
  query:     { color: '#93C5FD',      border: 'rgba(147,197,253,0.3)',  bg: 'rgba(147,197,253,0.06)' },
  complaint: { color: '#F87171',      border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.06)' },
}

export default function Feedback() {
  const { toasts, show } = useToast()
  const [publicFeedback, setPublicFeedback] = useState([])
  const [content, setContent] = useState('')
  const [type, setType] = useState('review')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState('submit')

  useEffect(() => {
    api.get('/feedback/public').then(r => setPublicFeedback(r.data)).catch(() => {})
  }, [submitted])

  const handleSubmit = async () => {
    if (!content.trim()) return show('Write something before submitting', 'warning')
    setSubmitting(true)
    try {
      await api.post('/feedback/', { content: content.trim(), type, is_anonymous: isAnonymous, is_public: isPublic })
      setSubmitted(true); setContent('')
      show('Feedback submitted', 'success')
      setTimeout(() => setSubmitted(false), 3000)
    } catch { show('Failed to submit feedback', 'error') }
    finally { setSubmitting(false) }
  }

  return (
    <PageLayout title="Feedback" subtitle="Share your experience, raise a query, or report an issue.">
      <ToastContainer toasts={toasts} />

      <div style={s.tabs}>
        {[
          { key: 'submit', label: 'Submit Feedback' },
          { key: 'public', label: `Public Wall (${publicFeedback.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ ...s.tab, ...(activeTab === t.key ? s.activeTab : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'submit' && (
        <div style={s.grid}>
          <Card>
            <CardTitle>Your Feedback</CardTitle>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPES.map(({ key, Icon, label }) => {
                  const c = TYPE_COLOR[key]
                  const active = type === key
                  return (
                    <button key={key} onClick={() => setType(key)} style={{
                      ...s.typeBtn,
                      ...(active ? { background: c.bg, border: `1px solid ${c.border}`, color: c.color } : {}),
                    }}>
                      <Icon size={13} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Message</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
                placeholder={
                  type === 'review'    ? 'How was your experience? What stood out?' :
                  type === 'query'     ? 'What would you like to know?' :
                  'Describe the issue clearly so we can address it.'
                }
                style={s.textarea} />
            </div>

            <div style={s.optionsRow}>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} style={{ accentColor: 'var(--wine)' }} />
                <Lock size={11} color="var(--text-3)" />
                Submit anonymously
              </label>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ accentColor: 'var(--wine)' }} />
                <Globe size={11} color="var(--text-3)" />
                Show on public wall
              </label>
            </div>

            {isAnonymous && (
              <div style={{ background: 'rgba(201,162,39,0.06)', border: '1px solid rgba(201,162,39,0.15)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, color: 'var(--gold)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Lock size={11} /> Your identity will not be disclosed to anyone, including admins.
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting || !content.trim()} style={{ marginTop: 4 }}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </Card>

          <Card>
            <CardTitle>About Feedback</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {TYPES.map(({ key, Icon, label, desc }) => {
                const c = TYPE_COLOR[key]
                return (
                  <div key={key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, border: `1px solid ${c.border}`, flexShrink: 0 }}>
                      <Icon size={15} color={c.color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Anonymous submissions hide your identity from all parties. Complaints are never shown publicly, regardless of the public wall setting.
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'public' && (
        <div>
          {publicFeedback.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 52 }}>
              <div style={{ color: 'var(--text-3)', marginBottom: 20, fontSize: 13 }}>No public feedback yet. Be the first to contribute.</div>
              <Button onClick={() => setActiveTab('submit')} variant="secondary">Write Feedback</Button>
            </Card>
          ) : (
            <div style={s.feedbackGrid}>
              {publicFeedback.map(fb => {
                const c = TYPE_COLOR[fb.type] || TYPE_COLOR.review
                return (
                  <Card key={fb.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        {fb.type}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(fb.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, margin: '0 0 12px' }}>{fb.content}</p>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                      — {fb.is_anonymous ? 'Anonymous' : 'Delegate'}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}

const s = {
  tabs: { display: 'flex', gap: 6, marginBottom: 28 },
  tab: { padding: '9px 18px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-2)' },
  activeTab: { background: 'var(--wine)', color: 'var(--text)', border: '1px solid var(--wine)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 },
  label: { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  typeBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-2)', transition: 'all 0.15s' },
  textarea: { width: '100%', padding: '12px 14px', background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 },
  optionsRow: { display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 },
  feedbackGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
}
