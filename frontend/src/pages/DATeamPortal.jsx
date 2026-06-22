import { useEffect, useState } from 'react'
import { Search, CheckCircle, AlertTriangle, Users, Layers, ListChecks } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import Card, { CardTitle, Button, MetricCard } from '../components/Card'
import { useToast, ToastContainer } from '../components/Toast'
import api from '../api/client'
import useAuthStore from '../store/authStore'

export default function DATeamPortal() {
  const { user } = useAuthStore()
  const { toasts, show } = useToast()
  const [delegates, setDelegates]   = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [committees, setCommittees] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [activeCommitteeFilter, setActiveCF] = useState('all')
  const [assigning, setAssigning]   = useState({})
  const [selected, setSelected]     = useState({})

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [deleg, avail, comm] = await Promise.all([
        api.get('/portfolios/preferences/all'),
        api.get('/portfolios/available'),
        api.get('/portfolios/committees'),
      ])
      setDelegates(deleg.data); setPortfolios(avail.data); setCommittees(comm.data)
    } catch { show('Failed to load data', 'error') }
    finally { setLoading(false) }
  }

  const handleAssign = async (userId) => {
    const portfolioId = selected[userId]
    if (!portfolioId) return show('Select a portfolio first', 'warning')
    setAssigning(prev => ({ ...prev, [userId]: true }))
    try {
      await api.post('/portfolios/assign', { user_id: userId, portfolio_id: portfolioId })
      show('Portfolio assigned', 'success')
      await fetchAll()
      setSelected(prev => { const n = { ...prev }; delete n[userId]; return n })
    } catch (e) { show(e.response?.data?.detail || 'Assignment failed', 'error') }
    finally { setAssigning(prev => ({ ...prev, [userId]: false })) }
  }

  const getPortfolioName = (pid) => {
    for (const c of committees) {
      const p = c.portfolios?.find(p => p.id === pid)
      if (p) return `${p.country_name} — ${c.abbreviation}`
    }
    return null
  }
  const getCommitteeForPortfolio = (pid) => {
    for (const c of committees) if (c.portfolios?.find(p => p.id === pid)) return c.id
    return null
  }
  const portfoliosForCommittee = (cid) => portfolios.filter(p => p.committee_id === cid)

  const total      = delegates.length
  const assigned   = delegates.filter(d => d.assigned_portfolio_id).length
  const unassigned = total - assigned
  const withPrefs  = delegates.filter(d => d.pref1_id).length

  const filtered = delegates.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.college?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' ? true : filterStatus === 'assigned' ? !!d.assigned_portfolio_id : !d.assigned_portfolio_id
    const matchComm = activeCommitteeFilter === 'all' ? true : d.assigned_portfolio_id ? getCommitteeForPortfolio(d.assigned_portfolio_id) === activeCommitteeFilter : false
    return matchSearch && matchStatus && matchComm
  })

  return (
    <PageLayout title="Delegate Affairs" subtitle={`Logged in as ${user?.name} · DA Team`} maxWidth={1100}>
      <ToastContainer toasts={toasts} />

      {/* Metrics */}
      <div style={s.metrics}>
        <MetricCard label="Total Delegates"    value={total}       icon={Users}     color="var(--text)" />
        <MetricCard label="Assigned"           value={assigned}    icon={CheckCircle} color="#4ADE80" />
        <MetricCard label="Unassigned"         value={unassigned}  icon={AlertTriangle} color="#F87171" />
        <MetricCard label="With Preferences"   value={withPrefs}   icon={ListChecks} color="var(--gold)" />
        <MetricCard label="Portfolios Remaining" value={portfolios.length} icon={Layers} color="#93C5FD" />
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 18 }}>
        <div style={s.filtersRow}>
          <div style={s.searchWrap}>
            <Search size={14} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or institution..."
              style={s.searchInput} />
          </div>
          <div style={s.filterBtns}>
            {['all', 'assigned', 'unassigned'].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                style={{ ...s.filterBtn, ...(filterStatus === f ? s.filterBtnActive : {}) }}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={s.filterBtns}>
            <button onClick={() => setActiveCF('all')} style={{ ...s.filterBtn, ...(activeCommitteeFilter === 'all' ? s.filterBtnActive : {}) }}>
              All Committees
            </button>
            {committees.map(c => (
              <button key={c.id} onClick={() => setActiveCF(c.id)}
                style={{ ...s.filterBtn, ...(activeCommitteeFilter === c.id ? s.filterBtnActive : {}) }}>
                {c.abbreviation}
              </button>
            ))}
          </div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
          Showing {filtered.length} of {total} delegates
        </p>
      </Card>

      {/* Delegate list */}
      {loading ? (
        <Card style={{ textAlign: 'center', padding: 52 }}><p style={{ color: 'var(--text-3)' }}>Loading delegates...</p></Card>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 52 }}>
          <Search size={28} color="var(--text-3)" style={{ marginBottom: 12 }} />
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No delegates match your filters.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(d => (
            <Card key={d.user_id} style={{
              border: d.assigned_portfolio_id ? '1px solid rgba(74,222,128,0.15)' : '1px solid var(--border)',
            }}>
              <div style={s.delegateRow}>
                {/* Info */}
                <div style={s.delegateInfo}>
                  <div style={s.delegateName}>{d.name}</div>
                  <div style={s.delegateEmail}>{d.email}</div>
                  {d.college && <div style={s.delegateCollege}>{d.college}</div>}
                </div>

                {/* Preferences */}
                <div style={s.prefsBlock}>
                  <div style={s.prefBlockTitle}>Preferences</div>
                  {d.pref1_id || d.pref2_id || d.pref3_id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[d.pref1_id, d.pref2_id, d.pref3_id].filter(Boolean).map((pid, i) => (
                        <div key={i} style={s.prefItem}>
                          <span style={s.prefRank}>{i + 1}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{getPortfolioName(pid) || pid?.slice(0, 8)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>No preferences submitted</span>
                  )}
                </div>

                {/* Assignment */}
                <div style={s.assignBlock}>
                  {d.assigned_portfolio_id ? (
                    <div style={s.assignedBox}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4ADE80' }}>Assigned</span>
                      <span style={s.assignedCountry}>{getPortfolioName(d.assigned_portfolio_id)}</span>
                      <button onClick={() => { setSelected(prev => ({ ...prev, [d.user_id]: '' })); show('Select a new portfolio to reassign', 'info') }} style={s.reassignBtn}>
                        Reassign
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <select value={selected[d.user_id] || ''} onChange={e => setSelected(prev => ({ ...prev, [d.user_id]: e.target.value }))} style={s.select}>
                        <option value="">Select portfolio</option>
                        {committees.map(c => (
                          <optgroup key={c.id} label={`${c.abbreviation} — ${c.name}`}>
                            {portfoliosForCommittee(c.id).map(p => (
                              <option key={p.id} value={p.id}>{p.country_name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <Button onClick={() => handleAssign(d.user_id)} disabled={!selected[d.user_id] || assigning[d.user_id]}
                        style={{ fontSize: 12, padding: '8px 14px' }}>
                        {assigning[d.user_id] ? 'Assigning...' : 'Assign'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {!loading && unassigned > 0 && (
        <Card style={{ marginTop: 18, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(139,32,32,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#F87171', fontSize: 14, marginBottom: 4 }}>
                {unassigned} delegate{unassigned !== 1 ? 's' : ''} still unassigned
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{portfolios.length} portfolios available.</div>
            </div>
            <Button onClick={() => setFilterStatus('unassigned')} variant="ghost" style={{ fontSize: 12 }}>Show Unassigned</Button>
          </div>
        </Card>
      )}
      {!loading && unassigned === 0 && total > 0 && (
        <Card style={{ marginTop: 18, border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(45,106,79,0.08)', textAlign: 'center', padding: '18px' }}>
          <div style={{ fontWeight: 700, color: '#4ADE80', fontSize: 14 }}>All delegates have been assigned portfolios.</div>
        </Card>
      )}
    </PageLayout>
  )
}

const s = {
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  filtersRow: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: '1 1 240px' },
  searchInput: { width: '100%', padding: '9px 12px 9px 34px', background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  filterBtns: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  filterBtn: { padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 20, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', color: 'var(--text-3)', letterSpacing: '0.03em' },
  filterBtnActive: { background: 'var(--wine)', color: 'var(--text)', border: '1px solid var(--wine)' },
  delegateRow: { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' },
  delegateInfo: { flex: '1 1 160px', minWidth: 0 },
  delegateName: { fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.2px', marginBottom: 3 },
  delegateEmail: { fontSize: 12, color: 'var(--text-3)' },
  delegateCollege: { fontSize: 11, color: 'var(--text-3)', marginTop: 3 },
  prefsBlock: { flex: '1 1 200px' },
  prefBlockTitle: { fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 },
  prefItem: { display: 'flex', alignItems: 'center', gap: 7 },
  prefRank: { width: 16, height: 16, borderRadius: '50%', background: 'var(--wine-dim)', color: '#F9A8B8', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(110,30,42,0.3)' },
  assignBlock: { flex: '0 0 210px' },
  assignedBox: { display: 'flex', flexDirection: 'column', gap: 5, background: 'rgba(45,106,79,0.1)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid rgba(74,222,128,0.15)' },
  assignedCountry: { fontWeight: 700, fontSize: 13, color: '#4ADE80' },
  reassignBtn: { background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left', fontFamily: 'inherit' },
  select: { width: '100%', padding: '8px 10px', background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' },
}
