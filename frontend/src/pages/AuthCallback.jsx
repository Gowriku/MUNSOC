import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const { setToken, fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      setToken(token)
      fetchMe()
        .then(() => navigate('/dashboard'))
        .catch(() => setError('Failed to load your profile. Please try again.'))
    } else {
      setError('No token received. Google sign-in may have failed.')
    }
  }, [])

  if (error) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <h2 style={{ margin: '0 0 8px' }}>Sign-in failed</h2>
        <p style={{ color: '#666', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>{error}</p>
        <a href={`${API_BASE}/api/v1/auth/login`} style={s.btn}>Try Again</a>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.spinner} />
        <p style={{ color: '#666', marginTop: 16, fontSize: 14 }}>Signing you in...</p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f5f0e8', fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: 'white', borderRadius: 16, padding: '48px 40px',
    textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', minWidth: 280,
  },
  spinner: {
    width: 40, height: 40, border: '4px solid #e0e0e0',
    borderTop: '4px solid #C0392B', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', margin: '0 auto',
  },
  btn: {
    display: 'inline-block', padding: '10px 24px', background: '#C0392B',
    color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600,
  },
}