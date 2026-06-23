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

/**
 * Returns the correct home path for a given role.
 * This is the single source of truth — change here and everything follows.
 */
export function roleHomePath(role) {
  switch (role) {
    case 'admin':     return '/admin'
    case 'volunteer': return '/volunteer'
    case 'da_team':   return '/da-team'
    default:          return '/dashboard'   // delegate
  }
}

function ProtectedRoute({ children, roles }) {
  const { user, token, loading } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (loading) return <div className="loading">Loading...</div>
  // If roles specified, enforce them; redirect to role's own home
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }
  return children
}

function DelegateOnlyRoute({ children }) {
  // Delegates get full portal; everyone else goes to their own home
  return (
    <ProtectedRoute roles={['delegate']}>
      {children}
    </ProtectedRoute>
  )
}

function GoogleRedirect() {
  useEffect(() => {
    window.location.href =
  `${import.meta.env.VITE_API_URL}/api/v1/auth/login`
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
        <Route path="/"              element={<Landing />} />
        <Route path="/login"         element={<GoogleRedirect />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* ── Delegate-only routes ── */}
        <Route path="/dashboard"   element={<DelegateOnlyRoute><StudentDashboard /></DelegateOnlyRoute>} />
        <Route path="/preferences" element={<DelegateOnlyRoute><Preferences /></DelegateOnlyRoute>} />
        <Route path="/payment"     element={<DelegateOnlyRoute><Payment /></DelegateOnlyRoute>} />
        <Route path="/my-qr"       element={<DelegateOnlyRoute><MyQR /></DelegateOnlyRoute>} />
        <Route path="/feedback"    element={<DelegateOnlyRoute><Feedback /></DelegateOnlyRoute>} />
        {/* Emergency is delegate-only for sending; volunteers/admin see it in their portals */}
        <Route path="/emergency"   element={<DelegateOnlyRoute><Emergency /></DelegateOnlyRoute>} />

        {/* ── Volunteer portal ── */}
        <Route path="/volunteer" element={
          <ProtectedRoute roles={['volunteer']}>
            <VolunteerPortal />
          </ProtectedRoute>
        } />

        {/* ── DA Team portal ── */}
        <Route path="/da-team" element={
          <ProtectedRoute roles={['da_team']}>
            <DATeamPortal />
          </ProtectedRoute>
        } />

        {/* ── Admin portal ── */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Catch-all: redirect to role home */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

function RoleRedirect() {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/" replace />
  if (!user) return null
  return <Navigate to={roleHomePath(user.role)} replace />
}
