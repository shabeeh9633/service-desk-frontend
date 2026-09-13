import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import CommentSection from '../components/CommentSection'
import { useAuth } from '../context/AuthContext'
import { getTicket, assignTicket, updateStatus, deleteTicket } from '../services/ticketService'
import { getAgents } from '../services/authService'
import api from '../services/api'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [ticket, setTicket] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wsMsg, setWsMsg] = useState(null)

  // Action states
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  // Rating state
  const [ratingScore, setRatingScore] = useState(5)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const wsRef = useRef(null)

  useEffect(() => {
    fetchTicket()
    if (user?.role === 'admin') fetchAgents()

    // WebSocket for real-time updates
    const ws = new WebSocket(`ws://localhost:8000/ws/tickets/${id}/`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setWsMsg(data)
      if (data.type === 'ticket.update' && String(data.ticket_id) === id) {
        setTicket((prev) => prev ? { ...prev, status: data.status } : prev)
      }
    }
    return () => ws.close()
  }, [id])

  async function fetchTicket() {
    setLoading(true)
    try {
      const res = await getTicket(id)
      setTicket(res.data)
      setSelectedStatus(res.data.status)
    } catch {
      setError('Ticket not found or access denied.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchAgents() {
    try {
      const res = await getAgents()
      setAgents(res.data)
    } catch {}
  }

  async function handleAssign() {
    if (!selectedAgent) return
    setActionLoading(true)
    try {
      const res = await assignTicket(id, selectedAgent)
      setTicket(res.data)
      setActionMsg('✅ Ticket assigned successfully')
    } catch {
      setActionMsg('❌ Failed to assign ticket')
    } finally {
      setActionLoading(false)
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  async function handleStatusUpdate() {
    setActionLoading(true)
    try {
      const res = await updateStatus(id, selectedStatus)
      setTicket(res.data)
      setActionMsg('✅ Status updated')
    } catch {
      setActionMsg('❌ Failed to update status')
    } finally {
      setActionLoading(false)
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return
    try {
      await deleteTicket(id)
      const dest = user?.role === 'admin' ? '/admin-dashboard' : user?.role === 'agent' ? '/agent-dashboard' : '/dashboard'
      navigate(dest)
    } catch {
      setActionMsg('❌ Failed to delete ticket')
    }
  }

  async function handleRatingSubmit(e) {
    e.preventDefault()
    setSubmittingRating(true)
    try {
      const res = await api.post(`tickets/${id}/rate/`, {
        rating_score: ratingScore,
        rating_feedback: ratingFeedback
      })
      setTicket((prev) => ({
        ...prev,
        rating_score: res.data.rating_score,
        rating_feedback: res.data.rating_feedback
      }))
      setActionMsg('✅ Rating submitted!')
    } catch {
      setActionMsg('❌ Failed to submit rating')
    } finally {
      setSubmittingRating(false)
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  // Determine back destination by role
  const backDest = user?.role === 'admin' ? '/admin-dashboard' : user?.role === 'agent' ? '/agent-dashboard' : '/dashboard'

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="spinner-wrap"><div className="spinner" /></div>
      </main>
    </div>
  )

  if (error) return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
      </main>
    </div>
  )

  // Timeline Progress calculation
  const timelineSteps = [
    { label: 'Created', done: true, sub: formatDate(ticket.created_at) },
    { label: 'Assigned', done: !!ticket.assigned_to, sub: ticket.assigned_to ? `@${ticket.assigned_to.username}` : 'Pending Assignment' },
    { label: 'In Progress', done: ['in_progress', 'resolved', 'closed'].includes(ticket.status), sub: ticket.status === 'in_progress' ? 'Active troubleshooting' : '' },
    { label: 'Resolved', done: ['resolved', 'closed'].includes(ticket.status), sub: ticket.resolved_at ? formatDate(ticket.resolved_at) : '' },
    { label: 'Closed', done: ticket.status === 'closed', sub: ticket.status === 'closed' ? 'Archived' : '' },
  ]

  const isOwner = ticket.created_by?.username === user?.username
  const isResolvedOrClosed = ['resolved', 'closed'].includes(ticket.status)

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Back */}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(backDest)}
          style={{ marginBottom: 20 }} id="back-btn">
          ← Back to Dashboard
        </button>

        {/* ── Ticket Timeline ── */}
        <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ticket SLA Progression
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', overflowX: 'auto', padding: '10px 0 20px' }}>
            {/* Background Line */}
            <div style={{
              position: 'absolute', top: 22, left: '5%', right: '5%', height: 3,
              background: 'var(--border)', zIndex: 1,
            }} />
            
            {/* Active Progress Line */}
            <div style={{
              position: 'absolute', top: 22, left: '5%', height: 3,
              width: `${(timelineSteps.filter(s => s.done).length - 1) * 22.5}%`,
              background: 'var(--accent-gradient)', zIndex: 2,
              transition: 'width 0.4s ease',
            }} />

            {timelineSteps.map((step, idx) => (
              <div key={idx} style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '18%', textAlign: 'center' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: step.done ? 'var(--accent-gradient)' : 'var(--bg-base)',
                  border: `2px solid ${step.done ? 'transparent' : 'var(--border)'}`,
                  color: step.done ? '#fff' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, marginBottom: 8,
                  boxShadow: step.done ? '0 4px 10px rgba(79,70,229,0.2)' : 'none',
                }}>
                  {step.done ? '✓' : idx + 1}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: step.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {step.label}
                </div>
                {step.sub && (
                  <div className="ticket-timeline-sub" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
                    {step.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="ticket-detail-grid">

          {/* Left — Ticket details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Main card */}
            <div className="card fade-in">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>
                    Ticket #{ticket.id}
                  </div>
                  <h1 style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.3 }}>{ticket.title}</h1>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <StatusBadge status={ticket.status} />
                  <StatusBadge priority={ticket.priority} />
                  {ticket.is_overdue && <span className="overdue-tag">⚠ Overdue</span>}
                </div>
              </div>

              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {ticket.description}
              </div>

              {/* Extra details (Category, Urgency, Branch, Team) */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
                fontSize: '0.8rem'
              }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Category</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{ticket.category || 'Other'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Urgency</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>{ticket.urgency || ticket.priority}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Location</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{ticket.branch || 'Corporate'} · {ticket.city || ''}</div>
                </div>
                {ticket.suggested_team && (
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Suggested Team</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-1)', marginTop: 2 }}>{ticket.suggested_team}</div>
                  </div>
                )}
              </div>

              {/* File attachment */}
              {ticket.file_url && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <a href={ticket.file_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    📎 View Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="card fade-in">
              <CommentSection ticketId={Number(id)} wsMessages={wsMsg} user={user} />
            </div>
          </div>

          {/* Right — Metadata & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Info card */}
            <div className="card slide-in">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ticket Info
              </h3>
              {[
                { label: 'Created by', value: ticket.created_by?.username },
                { label: 'Assigned to', value: ticket.assigned_to?.username || 'Unassigned' },
                { label: 'Created', value: formatDate(ticket.created_at) },
                { label: 'Last updated', value: formatDate(ticket.updated_at) },
                { label: 'SLA Deadline', value: formatDate(ticket.deadline) },
                { label: 'Resolved at', value: formatDate(ticket.resolved_at) },
                ...(ticket.sla_remaining ? [{ label: 'Time remaining', value: `⏱ ${ticket.sla_remaining}` }] : []),
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Rating Widget */}
            {isResolvedOrClosed && isOwner && (
              <div className="card slide-in" style={{
                background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
                border: '1px solid rgba(79,70,229,0.15)',
              }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: 'var(--accent-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⭐ Rate Support Service
                </h3>

                {ticket.rating_score ? (
                  <div>
                    <div style={{ display: 'flex', gap: 4, margin: '8px 0', fontSize: '1.2rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} style={{ color: star <= ticket.rating_score ? '#f59e0b' : '#e2e8f0' }}>★</span>
                      ))}
                    </div>
                    {ticket.rating_feedback && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: '#f1f5f9', padding: '8px 12px', borderRadius: 8, marginTop: 8 }}>
                        "{ticket.rating_feedback}"
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleRatingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>How would you rate the agent's resolution of this issue?</p>
                    <div style={{ display: 'flex', gap: 6, margin: '4px 0' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingScore(star)}
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(0)}
                          style={{
                            fontSize: '1.5rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: star <= (ratingHover || ratingScore) ? '#f59e0b' : '#e2e8f0',
                            padding: 0,
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Share your experience (optional)…"
                      value={ratingFeedback}
                      onChange={(e) => setRatingFeedback(e.target.value)}
                      className="form-textarea"
                      style={{ fontSize: '0.8rem', minHeight: '60px', padding: '6px 10px' }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm btn-full" disabled={submittingRating}>
                      {submittingRating ? 'Submitting…' : 'Submit Rating'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Actions message */}
            {actionMsg && (
              <div className={`alert ${actionMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
                {actionMsg}
              </div>
            )}

            {/* Admin: Assign */}
            {user?.role === 'admin' && (
              <div className="card slide-in">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assign Agent
                </h3>
                <select id="assign-agent-select" className="form-select" style={{ marginBottom: 10 }}
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}>
                  <option value="">— Select agent —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.username}</option>
                  ))}
                </select>
                <button id="assign-btn" className="btn btn-primary btn-full btn-sm"
                  onClick={handleAssign} disabled={actionLoading || !selectedAgent}>
                  {actionLoading ? 'Assigning…' : '👤 Assign'}
                </button>
              </div>
            )}

            {/* Agent / Admin: Update Status */}
            {(user?.role === 'agent' || user?.role === 'admin') && (
              <div className="card slide-in">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Update Status
                </h3>
                <select id="status-select" className="form-select" style={{ marginBottom: 10 }}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
                <button id="update-status-btn" className="btn btn-primary btn-full btn-sm"
                  onClick={handleStatusUpdate}
                  disabled={actionLoading || selectedStatus === ticket.status}>
                  {actionLoading ? 'Updating…' : '🔄 Update Status'}
                </button>
              </div>
            )}

            {/* Admin: Delete */}
            {user?.role === 'admin' && (
              <button id="delete-ticket-btn" className="btn btn-danger btn-full"
                onClick={handleDelete}>
                🗑️ Delete Ticket
              </button>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
