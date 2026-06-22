import { useEffect, useState } from 'react'

export default function CountdownTimer({ deadline, label = '' }) {
  const [timeLeft, setTimeLeft] = useState({})
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline) - new Date()
      if (diff <= 0) { setExpired(true); return }
      setTimeLeft({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (expired) return (
    <div style={s.expired}>⛔ {label} deadline has passed</div>
  )

  return (
    <div style={s.wrap}>
      {label && <span style={s.label}>{label} closes in</span>}
      <div style={s.units}>
        {[['days', 'd'], ['hours', 'h'], ['minutes', 'm'], ['seconds', 's']].map(([key, suffix]) => (
          <div key={key} style={s.unit}>
            <span style={s.num}>{String(timeLeft[key] ?? 0).padStart(2, '0')}</span>
            <span style={s.suffix}>{suffix}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  wrap: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  label: { fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  units: { display: 'flex', gap: 4 },
  unit: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1a1a2e', color: 'white', borderRadius: 6, padding: '6px 8px', minWidth: 36 },
  num: { fontSize: 18, fontWeight: 800, lineHeight: 1 },
  suffix: { fontSize: 9, opacity: 0.6, marginTop: 2 },
  expired: { color: '#c62828', fontSize: 13, fontWeight: 600 },
}
