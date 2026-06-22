import { useEffect, useState } from 'react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'
import useAuthStore from '../store/authStore'

const TYPE_LABELS = { review: '⭐ Review', query: '❓ Query', complaint: '📣 Complaint' }
const TYPE_COLORS = {
  review:    { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
  query:     { bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9' },
  complaint: { bg: '#ffebee', color: '#b71c1c', border: '#ef9a9a' },
}

export default function Feedback() {
  const { user } = useAuthStore()
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
    if (!content.trim()) return show('Please write something before submitting', 'warning')
    setSubmitting(true)
    try {
      await api.post('/feedback/', { content: content.trim(), type, is_anonymous: isAnonymous, is_public: isPublic })
      setSubmitted(true)
      setContent('')
      show('Feedback submitted!', 'success')
      setTimeout(() => setSubmitted(false), 3000)
    } catch {
      show('Failed to submit feedback', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout title="Feedback" subtitle="Share your experience, ask a question, or report an issue.">
      <ToastContainer toasts={toasts} />

      <div style={s.tabs}>
        {['submit', 'public'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ ...s.tab, ...(activeTab === tab ? s.activeTab : {}) }}>
            {tab === 'submit' ? '✍️ Submit Feedback' : `🌐 Public Wall (${publicFeedback.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'submit' && (
        <div style={s.grid}>
          <Card>
            <CardTitle>Share Your Feedback</CardTitle>

            {/* Type selector */}
            <label style={s.label}>Type</label>
            <div style={s.typeRow}>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  style={{
                    ...s.typeBtn,
                    ...(type === key ? { background: TYPE_COLORS[key].bg, border: `2px solid ${TYPE_COLORS[key].border}`, color: TYPE_COLORS[key].color } : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <label style={{ ...s.label, marginTop: 16 }}>Your Message</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                type === 'review'    ? 'How was your experience at MUN? What did you enjoy most?' :
                type === 'query'     ? 'What would you like to know? We\'ll get back to you.' :
                'What went wrong? Please describe the issue clearly.'
              }
              rows={6}
              style={s.textarea}
            />

            {/* Visibility options */}
            <div style={s.optionsRow}>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
                Submit anonymously
              </label>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                Show on public wall
              </label>
            </div>

            {isAnonymous && (
              <p style={s.anonNote}>🔒 Your name and email will not be shown, even to the admin.</p>
            )}

            <Button onClick={handleSubmit} disabled={submitting || !content.trim()} style={{ marginTop: 16 }}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </Card>

          <Card>
            <CardTitle>About Feedback</CardTitle>
            <div style={s.infoList}>
              <div style={s.infoItem}>
                <span style={s.infoIcon}>⭐</span>
                <div>
                  <strong>Reviews</strong>
                  <p>Share your overall MUN experience</p>
                </div>
              </div>
              <div style={s.infoItem}>
                <span style={s.infoIcon}>❓</span>
                <div>
                  <strong>Queries</strong>
                  <p>Ask questions about the event, logistics, or schedules</p>
                </div>
              </div>
              <div style={s.infoItem}>
                <span style={s.infoIcon}>📣</span>
                <div>
                  <strong>Complaints</strong>
                  <p>Report issues — all complaints go directly to the admin</p>
                </div>
              </div>
            </div>
            <div style={s.privacyBox}>
              <strong style={{ fontSize: 13 }}>Privacy</strong>
              <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>
                Anonymous submissions hide your identity from everyone. Public submissions appear on the feedback wall.
                Complaints are never shown publicly regardless of your setting.
              </p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'public' && (
        <div>
          {publicFeedback.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ color: '#888' }}>No public feedback yet. Be the first to share!</p>
              <Button onClick={() => setActiveTab('submit')} style={{ marginTop: 16 }}>Write Feedback</Button>
            </Card>
          ) : (
            <div style={s.feedbackGrid}>
              {publicFeedback.map(fb => {
                const c = TYPE_COLORS[fb.type] || TYPE_COLORS.review
                return (
                  <Card key={fb.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ ...s.typePill, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        {TYPE_LABELS[fb.type]}
                      </span>
                      <span style={s.fbDate}>{new Date(fb.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={s.fbContent}>{fb.content}</p>
                    <div style={s.fbAuthor}>
                      {fb.is_anonymous ? '— Anonymous' : `— ${fb.user_id ? 'Delegate' : 'Anonymous'}`}
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
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { padding: '10px 20px', border: '1px solid #e0e0e0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: '#555' },
  activeTab: { background: '#1a1a2e', color: 'white', border: '1px solid #1a1a2e' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  label: { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#333' },
  typeRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  typeBtn: { padding: '8px 16px', border: '2px solid #e0e0e0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#555', transition: 'all 0.15s' },
  textarea: { width: '100%', padding: '12px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  optionsRow: { display: 'flex', gap: 20, marginTop: 12 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555', cursor: 'pointer' },
  anonNote: { background: '#f3e5f5', color: '#6a1b9a', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 },
  infoList: { display: 'flex', flexDirection: 'column', gap: 16 },
  infoItem: { display: 'flex', gap: 12 },
  infoIcon: { fontSize: 24, flexShrink: 0 },
  privacyBox: { background: '#f8f9fa', borderRadius: 8, padding: 12, marginTop: 16 },
  feedbackGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  typePill: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  fbDate: { fontSize: 12, color: '#aaa' },
  fbContent: { fontSize: 15, color: '#333', lineHeight: 1.6, margin: '0 0 10px' },
  fbAuthor: { fontSize: 13, color: '#888', fontStyle: 'italic' },
}
