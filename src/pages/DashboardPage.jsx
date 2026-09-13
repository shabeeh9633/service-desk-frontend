import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TicketCard from '../components/TicketCard'
import { useAuth } from '../context/AuthContext'
import { getTickets } from '../services/ticketService'
import api from '../services/api'
import {
  IconTicket, IconActivity, IconCheckCircle, IconAlert, IconClock,
  IconPlus, IconSearch, IconChat, IconX, IconSend, IconInbox
} from '../components/Icons'

const FILTERS = ['all', 'open', 'in_progress', 'resolved', 'closed', 'overdue']

/* ─── AI Chatbot Widget ─── */
function ChatbotWidget() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m your IT Support Assistant. How can I help you today?' }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const msg = input.trim()
    if (!msg) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }))
      const res = await api.post('/ai/chat/', { message: msg, history })
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I\'m having trouble connecting. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="chatbot-toggle"
        className="chatbot-toggle-btn"
        onClick={() => setOpen(o => !o)}
        title="IT Support Assistant"
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? <IconX size={20} /> : <IconChat size={20} />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="chatbot-panel">
          {/* Header */}
          <div style={{
            background: 'var(--accent-gradient)',
            padding: '14px 18px', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconChat size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>AI Support Assistant</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Powered by intelligent triage</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                <div style={{
                  padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'var(--accent-gradient)' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.85rem', lineHeight: 1.5,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <div style={{ padding: '9px 14px', borderRadius: '16px 16px 16px 4px', background: '#f1f5f9', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 4 }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1s 0.2s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1s 0.4s infinite' }}>●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              id="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="Describe your IT issue…"
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                border: '1px solid var(--border)', fontSize: '0.84rem',
                background: 'var(--bg-base)', color: 'var(--text-primary)', outline: 'none',
              }}
            />
            <button
              id="chatbot-send"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: '9px 14px', borderRadius: 10,
                background: 'var(--accent-gradient)',
                color: '#fff', border: 'none', fontWeight: 600,
                fontSize: '0.84rem', cursor: 'pointer',
                opacity: (!input.trim() || loading) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <IconSend size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── KPI Stat Card ─── */
function StatCard({ icon: Icon, label, value, variant = 'accent', sub, onClick }) {
  const isClickable = typeof onClick === 'function'
  return (
    <div
      className={`kpi-card ${variant} ${isClickable ? 'interactive' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={isClickable ? { cursor: 'pointer' } : {}}
    >
      <div className="kpi-card-header">
        <div className="kpi-card-icon"><Icon size={18} /></div>
      </div>
      <div>
        <div className="kpi-card-value">{value}</div>
        <div className="kpi-card-label">{label}</div>
        {sub && <div className="kpi-card-sub">{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [tickets, setTickets] = useState([])
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    getTickets()
      .then(res => setTickets(res.data.tickets ?? []))
      .catch(() => setError('Failed to load tickets.'))
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total:       tickets.length,
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
    overdue:     tickets.filter(t => t.is_overdue).length,
  }

  const kpiCards = [
    { icon: IconTicket,      label: 'Total Tickets',  value: stats.total,       variant: 'accent',  sub: 'All time', onClick: () => setFilter('all') },
    { icon: IconActivity,    label: 'Open',           value: stats.open,        variant: 'info',    sub: 'Needs action', onClick: () => setFilter('open') },
    { icon: IconClock,       label: 'In Progress',    value: stats.in_progress, variant: 'warning', sub: 'Active work', onClick: () => setFilter('in_progress') },
    { icon: IconCheckCircle, label: 'Resolved',       value: stats.resolved,    variant: 'success', sub: 'Completed', onClick: () => setFilter('resolved') },
    { icon: IconAlert,       label: 'Overdue',        value: stats.overdue,     variant: stats.overdue > 0 ? 'danger' : 'slate', sub: 'Past SLA', onClick: () => setFilter('overdue') },
  ]

  const filtered = tickets.filter(t => {
    let matchFilter = false
    if (filter === 'all') {
      matchFilter = true
    } else if (filter === 'overdue') {
      matchFilter = t.is_overdue
    } else {
      matchFilter = t.status === filter
    }
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">
                <span className="page-title-icon"><IconInbox size={18} /></span>
                My Tickets
              </h1>
              <p className="page-subtitle">
                Hello, <strong>{user?.first_name || user?.username}</strong>. Track and manage your IT support requests.
              </p>
            </div>
            <div className="page-actions">
              <button id="new-ticket-btn" className="btn btn-primary btn-sm" onClick={() => navigate('/tickets/create')}>
                <IconPlus size={15} /> New Ticket
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="kpi-grid">
          {kpiCards.map(c => <StatCard key={c.label} {...c} />)}
        </div>

        {/* ── SLA Warning Banner ── */}
        {stats.overdue > 0 && (
          <div className="alert-banner alert-banner-warning" style={{ marginBottom: 20 }}>
            <div className="alert-banner-content">
              <div className="alert-banner-icon" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
                <IconAlert size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--warning)' }}>
                  {stats.overdue} ticket{stats.overdue > 1 ? 's are' : ' is'} past SLA deadline
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Please follow up immediately to avoid escalation.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Search + Filter ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <span className="search-icon"><IconSearch size={15} /></span>
            <input
              className="form-input"
              placeholder="Search tickets…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                id={`filter-${f}`}
                className={`filter-chip${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'overdue' ? 'SLA Breached' : f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Ticket List ── */}
        {loading ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-secondary)', padding: '16px 0' }}>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Loading tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><IconInbox size={26} /></div>
              <div className="empty-title">No tickets found</div>
              <div className="empty-sub">
                {filter === 'all' && !search
                  ? "You haven't raised any tickets yet."
                  : `No tickets match "${search || filter.replace('_', ' ')}".`}
              </div>
              {filter === 'all' && !search && (
                <button id="create-first-ticket" className="btn btn-primary btn-sm" onClick={() => navigate('/tickets/create')} style={{ marginTop: 12 }}>
                  <IconPlus size={14} /> Create your first ticket
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        )}

      </main>

      {/* ── Floating AI Chatbot ── */}
      <ChatbotWidget />
    </div>
  )
}