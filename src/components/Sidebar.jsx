import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  IconDashboard, IconPlus, IconShield, IconChart, IconList, IconLogout
} from './Icons'

/* ── Role-based nav config ── */
const NAV_USER = [
  { to: '/dashboard',       icon: IconDashboard,   label: 'Dashboard' },
  { to: '/tickets/create',  icon: IconPlus,        label: 'Create Ticket' },
]

const NAV_AGENT = [
  { to: '/agent-dashboard', icon: IconDashboard,   label: 'Dashboard' },
  { to: '/tickets/create',  icon: IconPlus,        label: 'Create Ticket' },
]

const NAV_ADMIN = [
  { to: '/admin-dashboard?tab=dashboard', icon: IconDashboard,   label: 'Dashboard' },
  { to: '/admin-dashboard?tab=analytics', icon: IconChart,       label: 'Analytics' },
  { to: '/admin-dashboard?tab=logs',      icon: IconShield,      label: 'Approvals & Logs', showBadge: true },
  { to: '/admin-dashboard?tab=tickets',   icon: IconList,        label: 'Ticket Control' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  /* ── WebSocket for admin notifications (unchanged) ── */
  useEffect(() => {
    if (user?.role === 'admin') {
      const ws = new WebSocket(`ws://localhost:8000/ws/admin/`)
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.type === 'role.request') {
          setUnreadCount((c) => c + 1)
        }
      }
      return () => ws.close()
    }
  }, [user])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const initials = user
    ? (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()
    : '?'

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'User'

  /* ── Helper: render a single nav link ── */
  function NavItem({ to, icon: Icon, label, showBadge }) {
    const isActive = location.pathname + location.search === to || 
                     (to === '/admin-dashboard?tab=dashboard' && location.pathname === '/admin-dashboard' && !location.search)
    return (
      <NavLink
        to={to}
        className={`sidebar-link${isActive ? ' active' : ''}`}
      >
        <span className="sidebar-link-icon"><Icon size={16} /></span>
        <span>{label}</span>
        {showBadge && unreadCount > 0 && (
          <span className="sidebar-badge">{unreadCount}</span>
        )}
      </NavLink>
    )
  }

  return (
    <aside className="sidebar slide-in">
      {/* ── Logo / Brand ── */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <IconShield size={18} />
        </div>
        <div>
          <div className="sidebar-logo-text">Service Desk</div>
          <div className="sidebar-logo-sub">IT Support Portal</div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">

        {/* ── USER nav ── */}
        {user?.role === 'user' && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Navigation</div>
            {NAV_USER.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        )}

        {/* ── AGENT nav ── */}
        {user?.role === 'agent' && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Workspace</div>
            {NAV_AGENT.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        )}

        {/* ── ADMIN nav ── */}
        {user?.role === 'admin' && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Management</div>
            {NAV_ADMIN.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        )}

      </nav>

      {/* ── User Profile + Logout ── */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name truncate">{displayName}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign out"
          >
            <IconLogout size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
