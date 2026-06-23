import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

// In production: VITE_API_URL = https://munsoc.onrender.com
// In local dev:  VITE_API_URL is not set, so falls back to localhost:8000
const API_BASE = import.meta.env.VITE_API_URL 

export default function Login() {
  const { token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) navigate('/dashboard')
  }, [token])

  const handleGoogleLogin = () => {
    // Always redirect to the backend auth endpoint using the correct base URL
    window.location.href = `${API_BASE}/api/v1/auth/login`
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🏛️</div>
        <h1 style={s.title}>MEC MUNSOC</h1>
        <p style={s.subtitle}>MUNPortal — Delegate Registration</p>

        <button onClick={handleGoogleLogin} style={s.googleBtn}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            style={{ width: 20, height: 20, marginRight: 10 }}
          />
          Sign in with Google
        </button>

        <p style={s.note}>Use your Google account to sign in or register.</p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 50%, #2A0A0A 100%)',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: 'white', borderRadius: 16, padding: '48px 40px',
    textAlign: 'center', maxWidth: 400, width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  logo: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 800, margin: '0 0 6px', color: '#0D0D0D', letterSpacing: -0.5 },
  subtitle: { color: '#888', marginBottom: 32, fontSize: 14 },
  googleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: '14px 24px', border: '2px solid #e0e0e0',
    borderRadius: 8, background: 'white', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', color: '#333', fontFamily: 'inherit', transition: 'border-color 0.15s',
  },
  note: { color: '#999', fontSize: 13, marginTop: 20 },
}