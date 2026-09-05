import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { IconUser, IconClock, IconAlert } from './Icons'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function TicketCard({ ticket }) {
  const navigate = useNavigate()

  return (
    <div
      className="ticket-card fade-in"
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/tickets/${ticket.id}`)}
      id={`ticket-card-${ticket.id}`}
    >
      {/* Header */}
      <div className="ticket-card-header">
        <div>
          <div className="ticket-card-id">#{ticket.id}</div>
          <div className="ticket-card-title">{ticket.title}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {ticket.is_overdue && (
            <span className="overdue-tag" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <IconAlert size={10} /> Overdue
            </span>
          )}
          {ticket.sla_remaining && !ticket.is_overdue && (
            <span className="sla-tag">
              <IconClock size={11} /> {ticket.sla_remaining}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="ticket-card-meta">
        <StatusBadge status={ticket.status} />
        <StatusBadge priority={ticket.priority} />
        {ticket.assigned_to && (
          <span className="badge" style={{
            background: 'var(--accent-1-light)',
            color: 'var(--accent-1)',
            border: '1px solid var(--accent-1-muted)'
          }}>
            <IconUser size={11} /> {ticket.assigned_to.username}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="ticket-card-footer">
        <div className="ticket-card-user">
          <IconUser size={12} />
          <span>{ticket.created_by?.username || 'Unknown'}</span>
        </div>
        <div className="ticket-card-date">{formatDate(ticket.created_at)}</div>
      </div>
    </div>
  )
}
