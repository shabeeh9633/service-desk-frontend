import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { createTicket } from '../services/ticketService'
import api from '../services/api'

const PRIORITIES = ['low', 'medium', 'high', 'critical']

export default function CreateTicketPage() {
  const navigate = useNavigate()
  
  // Locations metadata loaded from backend
  const [locations, setLocations] = useState({
    branches: ["Headquarters", "Seattle Branch", "London Hub", "Tokyo Office"],
    departments: ["General", "Network Core", "IAM Admin", "SecOPS", "DevOps"],
    cities: ["New York", "Seattle", "London", "Tokyo"]
  })

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    branch: 'Headquarters',
    office: 'Building A',
    city: 'New York',
    department: 'General',
  })
  
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // AI Scan states
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [duplicates, setDuplicates] = useState([])
  const [aiSuggestions, setAiSuggestions] = useState('')

  useEffect(() => {
    // Load existing branches/depts to pre-populate dropdown lists
    api.get('tickets/branches/')
      .then(res => {
        if (res.data) {
          setLocations({
            branches: res.data.branches || [],
            departments: res.data.departments || [],
            cities: res.data.cities || []
          })
        }
      })
      .catch(() => {})
  }, [])

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleAiScan() {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Please provide a title and description first to run AI Scan.')
      return
    }
    setScanning(true)
    setError('')
    setScanResult(null)
    setDuplicates([])
    setAiSuggestions('')
    try {
      // 1. Run Triage Scan
      const triageRes = await api.post('ai/triage/', {
        title: form.title,
        description: form.description
      })
      setScanResult(triageRes.data)
      
      // Auto-set priority to AI recommendation if user hasn't modified it away from medium
      if (triageRes.data.priority) {
        setForm(f => ({ ...f, priority: triageRes.data.priority }))
      }

      // 2. Run Duplicate Check
      const dupRes = await api.post('tickets/duplicate-check/', {
        title: form.title,
        description: form.description
      })
      if (dupRes.data && dupRes.data.duplicates) {
        setDuplicates(dupRes.data.duplicates)
      }

      // 3. Generate Troubleshooting Tips
      const chatRes = await api.post('ai/chat/', {
        message: `Title: ${form.title}\nDescription: ${form.description}\n\nProvide 3 quick, specific troubleshooting steps for this issue. Be very brief and formatted as bullet points.`
      })
      if (chatRes.data && chatRes.data.reply) {
        setAiSuggestions(chatRes.data.reply)
      }
    } catch (err) {
      setError('AI Triage scan failed. Fallbacks will apply during creation.')
    } finally {
      setScanning(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('priority', form.priority)
      fd.append('branch', form.branch)
      fd.append('office', form.office)
      fd.append('city', form.city)
      fd.append('department', form.department)
      if (form.deadline) fd.append('deadline', new Date(form.deadline).toISOString())
      if (file) fd.append('file', file)

      const res = await createTicket(fd)
      setSuccess(`Ticket #${res.data.id} created successfully!`)
      setTimeout(() => navigate(`/tickets/${res.data.id}`), 1200)
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : 'Failed to create ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">➕ New Support Ticket</h1>
          <p className="page-subtitle">Describe your issue and our AI system will automatically route it to the correct department.</p>
        </div>

        <div className="create-ticket-grid">
          
          {/* Left Form */}
          <div className="card">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form id="create-ticket-form" onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-title">Title *</label>
                  <input id="ticket-title" name="title" className="form-input"
                    placeholder="Brief summary of the issue…"
                    value={form.title} onChange={handleChange} required />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-desc">Description *</label>
                  <textarea id="ticket-desc" name="description" className="form-textarea"
                    placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behavior…"
                    value={form.description} onChange={handleChange} required rows={5} />
                </div>

                {/* AI Helper Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleAiScan}
                    disabled={scanning}
                    style={{
                      color: 'var(--accent-1)',
                      borderColor: 'rgba(79,70,229,0.3)',
                      background: 'rgba(79,70,229,0.03)',
                      fontWeight: 600,
                    }}
                  >
                    {scanning ? '⚙️ Running AI Smart Scan…' : '✨ Run AI Smart Scan'}
                  </button>
                </div>

                {/* Locations Group */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    🏢 Branch & Department Info
                  </h3>
                  <div className="grid-2" style={{ gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="ticket-branch">Branch</label>
                      <select id="ticket-branch" name="branch" className="form-select" value={form.branch} onChange={handleChange}>
                        {locations.branches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ticket-department">Department</label>
                      <select id="ticket-department" name="department" className="form-select" value={form.department} onChange={handleChange}>
                        {locations.departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ticket-city">City</label>
                      <select id="ticket-city" name="city" className="form-select" value={form.city} onChange={handleChange}>
                        {locations.cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ticket-office">Office Room / Building</label>
                      <input id="ticket-office" name="office" className="form-input" value={form.office} onChange={handleChange} placeholder="e.g. Building A, Room 402" />
                    </div>
                  </div>
                </div>

                {/* Priority & SLA */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    📅 Priority & Deadlines
                  </h3>
                  <div className="grid-2" style={{ gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="ticket-priority">Priority</label>
                      <select id="ticket-priority" name="priority" className="form-select" value={form.priority} onChange={handleChange}>
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p === 'low' ? '🟢' : p === 'medium' ? '🟡' : p === 'high' ? '🟠' : '🔴'} {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ticket-deadline">SLA Deadline (Optional)</label>
                      <input id="ticket-deadline" name="deadline" type="datetime-local" className="form-input" value={form.deadline} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <label className="form-label" htmlFor="ticket-file">Attachment</label>
                  <div style={{
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.01)',
                    cursor: 'pointer',
                  }} onClick={() => document.getElementById('ticket-file').click()}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📎</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {file ? file.name : 'Click to upload logs/screenshot'}
                    </div>
                    <input id="ticket-file" type="file" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')} disabled={loading}>Cancel</button>
                  <button id="submit-ticket-btn" type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting…' : '🚀 Submit Ticket'}</button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Panel: AI Results & Warnings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Duplicates Warning */}
            {duplicates.length > 0 && (
              <div className="card" style={{
                background: 'linear-gradient(to bottom right, #fffbeb, #fff8e6)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}>
                <h3 style={{ fontSize: '0.9rem', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚠️ Potential Duplicate Tickets
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#b45309', margin: '4px 0 12px' }}>
                  The AI detected other open tickets matching this issue.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {duplicates.map(dup => (
                    <div key={dup.ticket_id} style={{
                      background: '#fff', border: '1px solid rgba(245,158,11,0.15)',
                      padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{dup.ticket_id}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dup.reason}
                        </div>
                      </div>
                      <span style={{
                        marginLeft: 10, padding: '3px 8px', borderRadius: 99,
                        background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.7rem'
                      }}>
                        {dup.match_percentage}% match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Troubleshooting Advice */}
            {aiSuggestions && (
              <div className="card" style={{ border: '1px solid rgba(79,70,229,0.15)', background: '#f8fafc' }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💡 AI Suggested Troubleshooting Guide
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '4px 0 12px' }}>
                  Try these quick steps before raising this ticket. It could save you waiting!
                </p>
                <div style={{
                  fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid var(--border)',
                  padding: '12px 14px', borderRadius: 10
                }}>
                  {aiSuggestions}
                </div>
              </div>
            )}

            {/* AI Triage Card */}
            {scanResult && (
              <div className="card">
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  🤖 AI Auto-Triage Predictions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Category</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-1)' }}>{scanResult.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Recommended Team</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{scanResult.suggested_team}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Urgency Level</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{scanResult.urgency}</span>
                  </div>
                  {scanResult.ai_summary && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>AI Executive Summary</span>
                      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{scanResult.ai_summary}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Offline Fallback Alert */}
            {!scanResult && !scanning && (
              <div style={{ background: '#f8fafc', border: '1px dashed var(--border)', borderRadius: 12, padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                👋 Run AI Smart Scan to predict category, check for duplicate issues, and receive automated fixes.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
