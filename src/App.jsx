import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage           from './pages/LoginPage'
import RegisterPage        from './pages/RegisterPage'
import DashboardPage       from './pages/DashboardPage'
import AdminDashboardPage  from './pages/AdminDashboardPage'
import AgentDashboardPage  from './pages/AgentDashboardPage'
import CreateTicketPage    from './pages/CreateTicketPage'
import TicketDetailPage    from './pages/TicketDetailPage'
import PendingUsers        from './pages/PendingUsers'

import { IconShield } from './components/Icons'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>

          {/* ── Public routes ── */}
          <Route path="/"         element={<LoginPage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── User dashboard (role: user) ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ── Admin dashboard (role: admin) ── */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ── Agent dashboard (role: agent) ── */}
          <Route
            path="/agent-dashboard"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ── Pending approvals page (admin only, standalone) ── */}
          <Route
            path="/pending-approvals"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div className="app-layout">
                  <div className="main-content" style={{ paddingTop: 32 }}>
                    <div className="page-header">
                      <h1 className="page-title">
                        <span className="page-title-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}><IconShield size={18} /></span>
                        Pending Approvals
                      </h1>
                    </div>
                    <PendingUsers />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* ── Tickets (any authenticated user) ── */}
          <Route
            path="/tickets/create"
            element={
              <ProtectedRoute>
                <CreateTicketPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute>
                <TicketDetailPage />
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all → login ── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}