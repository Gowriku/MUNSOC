import { useEffect, useState } from 'react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'

export default function DATeamPortal() {
  const { toasts, show } = useToast()
  const [delegates, setDelegates]         = useState([])
  const [portfolios, setPortfolios]       = useState([])
  const [committees, setCommittees]       = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]  = useState('all')   // all | assigned | unassigned
  const [assigning, setAssigning]         = useState({})      // { user_id: true }
  const [selected, setSelected]           = useState({})      // { user_id: portfolio_id }
  const [activeCommitteeFilter, setActiveCommitteeFilter] = useState('all')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [deleg, avail, comm] = await Promise.all([
        api.get('/portfolios/preferences/all'),
        api.get('/portfolios/available'),
        api.get('/portfolios/committees'),
      ])
      setDelegates(deleg.data)
      setPortfolios(avail.data)
      setCommittees(comm.data)
    } catch {
      show('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (userId) => {
    const portfolioId = selected[userId]
    if (!portfolioId) return show('Select a portfolio first', 'warning')
    setAssigning(prev => ({ ...prev, [userId]: true }))
    try {
      await api.post('/portfolios/assign', { user_id: userId, portfolio_id: portfolioId })
      show('Portfolio assigned!', 'success')
      await fetchAll()
      setSelected(prev => { const n = { ...prev }; delete n[userId]; return n })
    } catch (e) {
      show(e.response?.data?.detail || 'Assignment failed', 'error')
    } finally {
      setAssigning(prev => ({ ...prev, [userId]: false }))
    }
  }

  const getPortfolioName = (portfolioId) => {
    for (const c of committees) {
      const p = c.portfolios?.find(p => p.id === portfolioId)
      if (p) return `${p.country_name} (${c.abbreviation})`
    }
    return null
  }

  const getCommitteeForPortfolio = (portfolioId) => {
    for (const c of committees) {
      if (c.portfolios?.find(p => p.id === portfolioId)) return c.id
    }
    return null
  }

  const filteredPortfoliosForCommittee = (committeeId) =>
    portfolios.filter(p => p.committee_id === committeeId)

  // Stats
  const totalDelegates  = delegates.length
  const assigned        = delegates.filter(d => d.assigned_portfolio_id).length
  const unassigned      = totalDelegates - assigned
  const withPrefs       = delegates.filter(d => d.pref1_id).length

  // Filtering
  const filtered = delegates.filter(d => {
    const matchSearch = !search ||
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.college?.toLowerCase().includes(search.toLowerCase())

    const matchStatus =
      filterStatus === 'all'        ? true :
      filterStatus === 'assigned'   ? !!d.assigned_portfolio_id :
      filterStatus === 'unassigned' ? !d.assigned_portfolio_id : true

    const matchCommittee =
      activeCommitteeFilter === 'all' ? true :
      d.assigned_portfolio_id
        ? getCommitteeForPortfolio(d.assigned_portfolio_id) === activeCommitteeFilter
        : false

    return matchSearch && matchStatus && matchCommittee
  })

  return (
    <PageLayout title="📂 Delegate Affairs Portal" subtitle="Assign country portfolios to delegates based on their preferences.">
      <ToastContainer toasts={toasts} />

      {/* Stats strip */}
      <div style={s.strip}>
        {[
          { label: 'Total Delegates', value: totalDelegates,  color: '#1a1a2e' },
          { label: 'Assigned',        value: assigned,         color: '#4caf50' },
          { label: 'Unassigned',      value: unassigned,       color: '#f44336' },
          { label: 'With Preferences',value: withPrefs,        color: '#2196f3' },
          { label: 'Portfolios Left', value: portfolios.length, color: '#9c27b0' },
        ].map(({ label, value, color }) => (
          <div key={label} style={s.stripItem}>
            <span style={{ ...s.stripVal, color }}>{value}</span>
            <span style={s.stripLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 20 }}>
        <div style={s.filtersRow}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by name, email or college..."
            style={s.searchInput}
          />
          <div style={s.filterBtns}>
            {['all', 'assigned', 'unassigned'].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                style={{ ...s.filterBtn, ...(filterStatus === f ? s.filterBtnActive : {}) }}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={s.filterBtns}>
            <button onClick={() => setActiveCommitteeFilter('all')}
              style={{ ...s.filterBtn, ...(activeCommitteeFilter === 'all' ? s.filterBtnActive : {}) }}>
              All Committees
            </button>
            {committees.map(c => (
              <button key={c.id} onClick={() => setActiveCommitteeFilter(c.id)}
                style={{ ...s.filterBtn, ...(activeCommitteeFilter === c.id ? s.filterBtnActive : {}) }}>
                {c.abbreviation}
              </button>
            ))}
          </div>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#888' }}>
          Showing {filtered.length} of {totalDelegates} delegates
        </p>
      </Card>

      {/* Delegate Table */}
      {loading ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#888' }}>Loading delegates...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ color: '#aaa' }}>No delegates match your filters</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(d => (
            <Card key={d.user_id} style={{
              border: d.assigned_portfolio_id ? '1px solid #c8e6c9' : '1px solid #ffcdd2',
              background: d.assigned_portfolio_id ? '#fafffe' : 'white',
            }}>
              <div style={s.delegateRow}>
                {/* Delegate info */}
                <div style={s.delegateInfo}>
                  <div style={s.delegateName}>{d.name}</div>
                  <div style={s.delegateEmail}>{d.email}</div>
                  {d.college && <div style={s.delegateCollege}>🏫 {d.college}</div>}
                </div>

                {/* Preferences */}
                <div style={s.prefsBlock}>
                  <div style={s.prefBlockTitle}>Preferences</div>
                  {d.pref1_id || d.pref2_id || d.pref3_id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {[d.pref1_id, d.pref2_id, d.pref3_id].map((pid, i) => pid && (
                        <div key={i} style={s.prefItem}>
                          <span style={s.prefRank}>{i + 1}</span>
                          <span style={{ fontSize: 13 }}>{getPortfolioName(pid) || pid?.slice(0, 8)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>No preferences</span>
                  )}
                </div>

                {/* Assignment */}
                <div style={s.assignBlock}>
                  {d.assigned_portfolio_id ? (
                    <div style={s.assignedBox}>
                      <span style={{ fontSize: 11, color: '#2e7d32', fontWeight: 700, letterSpacing: 0.5 }}>ASSIGNED</span>
                      <span style={s.assignedCountry}>{getPortfolioName(d.assigned_portfolio_id)}</span>
                      <button
                        onClick={() => {
                          setSelected(prev => ({ ...prev, [d.user_id]: '' }))
                          show('Select a new portfolio to reassign', 'info')
                        }}
                        style={s.reassignBtn}
                      >
                        Reassign
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <select
                        value={selected[d.user_id] || ''}
                        onChange={e => setSelected(prev => ({ ...prev, [d.user_id]: e.target.value }))}
                        style={s.assignSelect}
                      >
                        <option value="">— Select portfolio —</option>
                        {committees.map(c => (
                          <optgroup key={c.id} label={`${c.abbreviation} — ${c.name}`}>
                            {filteredPortfoliosForCommittee(c.id).map(p => (
                              <option key={p.id} value={p.id}>{p.country_name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <Button
                        onClick={() => handleAssign(d.user_id)}
                        disabled={!selected[d.user_id] || assigning[d.user_id]}
                        style={{ padding: '7px 14px', fontSize: 13 }}
                      >
                        {assigning[d.user_id] ? 'Assigning...' : 'Assign →'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unassigned summary at bottom */}
      {unassigned > 0 && (
        <Card style={{ marginTop: 20, background: '#fff8e1', border: '1px solid #ffe082' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#e65100' }}>⚠️ {unassigned} delegate{unassigned !== 1 ? 's' : ''} still unassigned</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
                {portfolios.length} portfolios are still available.
              </p>
            </div>
            <Button onClick={() => setFilterStatus('unassigned')} variant="secondary" style={{ fontSize: 13 }}>
              Show Unassigned
            </Button>
          </div>
        </Card>
      )}

      {unassigned === 0 && totalDelegates > 0 && (
        <Card style={{ marginTop: 20, background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <strong style={{ color: '#2e7d32', fontSize: 16 }}>✅ All delegates have been assigned portfolios!</strong>
          </div>
        </Card>
      )}
    </PageLayout>
  )
}

const s = {
  strip: { display: 'flex', background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, marginBottom: 24, overflow: 'hidden', flexWrap: 'wrap' },
  stripItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px', borderRight: '1px solid #f0f0f0', minWidth: 100 },
  stripVal: { fontSize: 28, fontWeight: 800 },
  stripLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  filtersRow: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  searchInput: { flex: '1 1 240px', padding: '9px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  filterBtns: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  filterBtn: { padding: '7px 12px', border: '1px solid #e0e0e0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', color: '#555' },
  filterBtnActive: { background: '#1a1a2e', color: 'white', border: '1px solid #1a1a2e' },
  delegateRow: { display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  delegateInfo: { flex: '1 1 160px', minWidth: 0 },
  delegateName: { fontWeight: 700, fontSize: 16, color: '#1a1a2e' },
  delegateEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  delegateCollege: { fontSize: 12, color: '#aaa', marginTop: 4 },
  prefsBlock: { flex: '1 1 200px' },
  prefBlockTitle: { fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  prefItem: { display: 'flex', alignItems: 'center', gap: 6 },
  prefRank: { width: 18, height: 18, borderRadius: '50%', background: '#1a1a2e', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  assignBlock: { flex: '0 0 220px' },
  assignedBox: { display: 'flex', flexDirection: 'column', gap: 4, background: '#f1f8f1', borderRadius: 8, padding: '10px 12px' },
  assignedCountry: { fontWeight: 700, fontSize: 14, color: '#2e7d32' },
  reassignBtn: { background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left', fontFamily: 'inherit' },
  assignSelect: { width: '100%', padding: '8px 10px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none' },
}
