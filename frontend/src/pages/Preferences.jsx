import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button, StatusBadge } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'
import useAuthStore from '../store/authStore'

export default function Preferences() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { toasts, show } = useToast()

  const [committees, setCommittees] = useState([])
  const [myPrefs, setMyPrefs] = useState(null)
  const [myAssignment, setMyAssignment] = useState(null)
  const [selected, setSelected] = useState({ pref1: null, pref2: null, pref3: null })
  const [saving, setSaving] = useState(false)
  const [activeCommittee, setActiveCommittee] = useState(null)

  useEffect(() => {
    api.get('/portfolios/committees').then(r => {
      setCommittees(r.data)
      if (r.data.length > 0) setActiveCommittee(r.data[0].id)
    })
    api.get('/portfolios/preferences/me').then(r => {
      setMyPrefs(r.data)
      setSelected({ pref1: r.data.pref1_id, pref2: r.data.pref2_id, pref3: r.data.pref3_id })
    }).catch(() => {})
    api.get('/portfolios/assignment/me').then(r => setMyAssignment(r.data)).catch(() => {})
  }, [])

  const getPortfolioLabel = (prefKey) => {
    const id = selected[prefKey]
    if (!id) return null
    for (const c of committees) {
      const p = c.portfolios?.find(p => p.id === id)
      if (p) return `${p.country_name} (${c.abbreviation})`
    }
    return null
  }

  const handleSelect = (portfolio, committee) => {
    // Can't select if already assigned
    if (portfolio.is_assigned) return show('This portfolio is already assigned to someone', 'error')

    // Check if already in another pref slot
    const existingSlot = Object.entries(selected).find(([, v]) => v === portfolio.id)
    if (existingSlot) {
      // Deselect it
      setSelected(prev => ({ ...prev, [existingSlot[0]]: null }))
      return
    }

    // Find empty slot
    const emptySlot = ['pref1', 'pref2', 'pref3'].find(k => !selected[k])
    if (!emptySlot) return show('You already have 3 preferences. Remove one first.', 'warning')
    setSelected(prev => ({ ...prev, [emptySlot]: portfolio.id }))
  }

  const getPrefSlot = (portfolioId) => {
    return Object.entries(selected).find(([, v]) => v === portfolioId)?.[0] || null
  }

  const removeSlot = (slot) => setSelected(prev => ({ ...prev, [slot]: null }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/portfolios/preferences', {
        pref1_id: selected.pref1 || null,
        pref2_id: selected.pref2 || null,
        pref3_id: selected.pref3 || null,
      })
      show('Preferences saved!', 'success')
    } catch (e) {
      show(e.response?.data?.detail || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const activeCommitteeData = committees.find(c => c.id === activeCommittee)

  return (
    <PageLayout title="Portfolio Preferences" subtitle="Select up to 3 countries in order of preference. The DA team will assign based on availability.">
      <ToastContainer toasts={toasts} />

      {/* Already assigned */}
      {myAssignment && (
        <div style={s.assignedBanner}>
          🎉 You have been assigned <strong>{myAssignment.portfolio?.country_name}</strong> in <strong>{myAssignment.portfolio?.committee?.name}</strong>. Preferences are now locked.
        </div>
      )}

      <div style={s.layout}>
        {/* Left: Selection tray */}
        <div style={{ flex: '0 0 280px' }}>
          <Card>
            <CardTitle>Your Selections</CardTitle>
            {['pref1', 'pref2', 'pref3'].map((slot, i) => (
              <div key={slot} style={s.prefSlot}>
                <div style={s.prefNum}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  {selected[slot] ? (
                    <span style={s.prefValue}>{getPortfolioLabel(slot)}</span>
                  ) : (
                    <span style={s.prefEmpty}>Not selected</span>
                  )}
                </div>
                {selected[slot] && !myAssignment && (
                  <button onClick={() => removeSlot(slot)} style={s.removeBtn}>✕</button>
                )}
              </div>
            ))}
            <Button
              onClick={handleSave}
              disabled={saving || myAssignment || !selected.pref1}
              style={{ width: '100%', marginTop: 16 }}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
            {!selected.pref1 && <p style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>Select at least 1 preference</p>}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <CardTitle>How Preferences Work</CardTitle>
            <ol style={{ paddingLeft: 16, color: '#555', fontSize: 13, lineHeight: 1.8 }}>
              <li>Pick your 1st, 2nd and 3rd choice countries</li>
              <li>The DA team reviews all submissions</li>
              <li>They assign based on your preferences & availability</li>
              <li>You will see your assignment on the dashboard</li>
            </ol>
          </Card>
        </div>

        {/* Right: Committee browser */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardTitle>Browse Committees & Portfolios</CardTitle>

            {/* Committee tabs */}
            <div style={s.tabs}>
              {committees.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCommittee(c.id)}
                  style={{ ...s.tab, ...(activeCommittee === c.id ? s.activeTab : {}) }}
                >
                  {c.abbreviation}
                </button>
              ))}
            </div>

            {/* Committee info */}
            {activeCommitteeData && (
              <div style={s.committeeInfo}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{activeCommitteeData.name}</h3>
                {activeCommitteeData.description && (
                  <p style={{ color: '#666', fontSize: 13, margin: '0 0 8px' }}>{activeCommitteeData.description}</p>
                )}
                {activeCommitteeData.topics && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>Agenda:</span>
                    {activeCommitteeData.topics.split(',').map(t => (
                      <span key={t} style={s.topicChip}>{t.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Portfolio grid */}
            <div style={s.portfolioGrid}>
              {activeCommitteeData?.portfolios?.map(portfolio => {
                const slot = getPrefSlot(portfolio.id)
                const isAssigned = portfolio.is_assigned && !slot
                return (
                  <button
                    key={portfolio.id}
                    onClick={() => !myAssignment && handleSelect(portfolio, activeCommitteeData)}
                    disabled={isAssigned}
                    style={{
                      ...s.portfolioCard,
                      ...(slot ? s.portfolioSelected : {}),
                      ...(isAssigned ? s.portfolioAssigned : {}),
                      cursor: isAssigned || myAssignment ? 'default' : 'pointer',
                    }}
                  >
                    {portfolio.flag_url && (
                      <img src={portfolio.flag_url} alt="" style={s.flag} />
                    )}
                    <span style={s.countryName}>{portfolio.country_name}</span>
                    {slot && (
                      <span style={s.slotBadge}>
                        {slot === 'pref1' ? '1st' : slot === 'pref2' ? '2nd' : '3rd'}
                      </span>
                    )}
                    {isAssigned && <span style={s.takenBadge}>Taken</span>}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}

const s = {
  layout: { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' },
  assignedBanner: { background: '#e8f5e9', border: '1px solid #81c784', borderRadius: 10, padding: '14px 20px', marginBottom: 20, color: '#1b5e20', fontSize: 15 },
  prefSlot: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  prefNum: { width: 28, height: 28, borderRadius: '50%', background: '#1a1a2e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  prefValue: { fontSize: 14, fontWeight: 500, color: '#1a1a2e' },
  prefEmpty: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  removeBtn: { background: '#ffebee', border: 'none', color: '#c62828', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' },
  tab: { padding: '6px 14px', border: '1px solid #e0e0e0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555', fontFamily: 'inherit' },
  activeTab: { background: '#1a1a2e', color: 'white', border: '1px solid #1a1a2e' },
  committeeInfo: { background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 16 },
  topicChip: { background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 20, fontSize: 12 },
  portfolioGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  portfolioCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', border: '2px solid #e8e8e8', borderRadius: 10, background: 'white', fontFamily: 'inherit', transition: 'all 0.15s', position: 'relative' },
  portfolioSelected: { border: '2px solid #1a1a2e', background: '#f0f4ff' },
  portfolioAssigned: { opacity: 0.4, background: '#f5f5f5' },
  flag: { width: 36, height: 'auto', borderRadius: 2 },
  countryName: { fontSize: 13, fontWeight: 600, textAlign: 'center', color: '#1a1a2e' },
  slotBadge: { position: 'absolute', top: 4, right: 4, background: '#1a1a2e', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 20, fontWeight: 700 },
  takenBadge: { position: 'absolute', top: 4, right: 4, background: '#ffebee', color: '#c62828', fontSize: 10, padding: '1px 5px', borderRadius: 20, fontWeight: 700 },
}
