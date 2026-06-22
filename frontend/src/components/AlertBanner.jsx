import { useEffect, useState } from 'react'
import useAuthStore from '../store/authStore'

const ALERT_COLORS = {
  session_start: { bg: '#e8f5e9', border: '#4caf50', icon: '🟢' },
  session_end:   { bg: '#fff3e0', border: '#ff9800', icon: '🔴' },
  break_start:   { bg: '#e3f2fd', border: '#2196f3', icon: '☕' },
  break_end:     { bg: '#fce4ec', border: '#e91e63', icon: '⏰' },
  custom:        { bg: '#f3e5f5', border: '#9c27b0', icon: '📢' },
}

export default function AlertBanner() {
  const { user, token } = useAuthStore()
  const [alerts, setAlerts] = useState([])
  const [ws, setWs] = useState(null)

  useEffect(() => {
    if (!user || !token) return

    const committeeId = user.assignment?.portfolio?.committee_id || ''
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${protocol}://${window.location.host}/api/v1/alerts/ws/${user.id}?token=${token}&committee_id=${committeeId}`

    const socket = new WebSocket(wsUrl)
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'alert') {
          const id = Date.now()
          setAlerts((prev) => [...prev, { ...data, id }])
          // Auto-dismiss after 8 seconds
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== id))
          }, 8000)
        }
      } catch {}
    }
    // Keep-alive ping
    const ping = setInterval(() => socket.send('ping'), 30000)
    setWs(socket)

    return () => {
      clearInterval(ping)
      socket.close()
    }
  }, [user?.id, token])

  if (alerts.length === 0) return null

  return (
    <div style={styles.container}>
      {alerts.map((alert) => {
        const color = ALERT_COLORS[alert.alert_type] || ALERT_COLORS.custom
        return (
          <div key={alert.id} style={{ ...styles.banner, background: color.bg, borderLeft: `4px solid ${color.border}` }}>
            <span style={styles.icon}>{color.icon}</span>
            <div>
              <strong style={styles.type}>{alert.alert_type.replace(/_/g, ' ').toUpperCase()}</strong>
              <p style={styles.msg}>{alert.message}</p>
            </div>
            <button
              onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              style={styles.close}
            >×</button>
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 360,
  },
  banner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease',
  },
  icon: { fontSize: 20 },
  type: { fontSize: 11, letterSpacing: 1, color: '#555' },
  msg: { margin: '2px 0 0', fontSize: 14, color: '#222' },
  close: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#888',
  },
}