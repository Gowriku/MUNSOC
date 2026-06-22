export function SkeletonCard({ rows = 3 }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24 }}>
      <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 20 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div className="skeleton" style={{ height: 14, width: `${70 + (i % 3) * 10}%`, marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 12, width: `${50 + (i % 2) * 15}%` }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24 }}>
      <div className="skeleton" style={{ height: 20, width: '30%', marginBottom: 20 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
          <div className="skeleton" style={{ height: 14, flex: 2 }} />
          <div className="skeleton" style={{ height: 14, flex: 3 }} />
          <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 32, width: 90, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
      {[1, 2, 3, 4].map(i => <SkeletonCard key={i} rows={3} />)}
    </div>
  )
}

// Default export so both import styles work:
// import { SkeletonDashboard } from './Skeleton'   ← named
// import Skeleton from './Skeleton'                ← default
export default { SkeletonCard, SkeletonTable, SkeletonDashboard }