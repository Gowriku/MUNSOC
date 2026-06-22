import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

import Landing          from './pages/Landing'
import Login            from './pages/Login'
import AuthCallback     from './pages/AuthCallback'
import StudentDashboard from './pages/StudentDashboard'
import Preferences      from './pages/Preferences'
import Payment          from './pages/Payment'
import MyQR             from './pages/MyQR'
import Feedback         from './pages/Feedback'
import Emergency        from './pages/Emergency'
import VolunteerPortal  from './pages/VolunteerPortal'
import DATeamPortal     from './pages/DATeamPortal'
import AdminDashboard   from './pages/AdminDashboard'
import AlertBanner      from './components/AlertBanner'

function ProtectedRoute({ children, roles }) {
  const { user, token, loading } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (loading) return <div className="loading">Loading...</div>
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}
function GoogleRedirect() {
  useEffect(() => {
    window.location.href = 'http://localhost:8000/api/v1/auth/login'
  }, [])
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>Redirecting to Google...</div>
}

export default function App() {
  const { token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  return (
    <BrowserRouter>
      <AlertBanner />
      <Routes>
        {/* Public */}
        <Route path="/"               element={<Landing />} />
        <Route path="/login" element={<GoogleRedirect />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />

        {/* Delegate */}
        <Route path="/dashboard"   element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
        <Route path="/payment"     element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/my-qr"       element={<ProtectedRoute><MyQR /></ProtectedRoute>} />
        <Route path="/emergency"   element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
        <Route path="/feedback"    element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

        {/* Volunteer */}
        <Route path="/volunteer" element={
          <ProtectedRoute roles={['volunteer', 'admin']}>
            <VolunteerPortal />
          </ProtectedRoute>
        } />

        {/* DA Team */}
        <Route path="/da-team" element={
          <ProtectedRoute roles={['da_team', 'admin']}>
            <DATeamPortal />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
