import { useState, useEffect, useRef } from 'react'
import { getComments, addComment } from '../services/commentService'
import api from '../services/api'

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function CommentSection({ ticketId, wsMessages, user }) {
  const [comments, setComments] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiError, setAiError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchComments()
  }, [ticketId])

  // Handle real-time WS messages
  useEffect(() => {
    if (wsMessages?.type === 'comment.new' && wsMessages.ticket_id === ticketId) {
      fetchComments()
    }
  }, [wsMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function fetchComments() {
    try {
      const res = await getComments(ticketId)
      setComments(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setPosting(true)
    try {
      const res = await addComment(ticketId, message.trim())
      setComments((prev) => [...prev, res.data])
      setMessage('')
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  async function handleAiSuggest() {
    setAiSuggesting(true)
    setAiError('')
    try {
      const res = await api.get(`ai/suggest-reply/${ticketId}/`)
      if (res.data?.suggestion) {
        setMessage(res.data.suggestion)
      } else {
        setAiError('No suggestion returned.')
      }
    } catch (err) {
      setAiError('Failed to fetch AI suggested reply. Make sure the backend is active.')
    } finally {
      setAiSuggesting(false)
    }
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>

  const isAgentOrAdmin = user?.role === 'agent' || user?.role === 'admin'

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
        💬 Comments ({comments.length})
      </h3>

      {comments.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <div className="empty-icon">💬</div>
          <div className="empty-title">No comments yet</div>
          <div className="empty-sub">Be the first to add a note</div>
        </div>
      ) : (
        <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
          {comments.map((c) => {
            const initials = (c.user?.first_name?.[0] || c.user?.username?.[0] || '?').toUpperCase()
            return (
              <div className="comment-item" key={c.id}>
                <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.72rem', flexShrink: 0 }}>
                  {initials}
                </div>
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-author">{c.user?.username}</span>
                    <span className="badge" style={{ background: 'rgba(79,70,229,0.08)', color: 'var(--accent-1)', border: 'none', fontSize: '0.65rem' }}>
                      {c.user?.role}
                    </span>
                    <span className="comment-time">{formatTime(c.created_at)}</span>
                  </div>
                  <div className="comment-message" style={{ whiteSpace: 'pre-wrap' }}>{c.message}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* AI Suggest Section for Agent / Admin */}
      {isAgentOrAdmin && (
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            id="ai-suggest-reply-btn"
            className="btn btn-ghost btn-sm"
            onClick={handleAiSuggest}
            disabled={aiSuggesting}
            style={{
              fontSize: '0.78rem',
              color: 'var(--accent-1)',
              borderColor: 'rgba(79,70,229,0.3)',
              background: 'rgba(79,70,229,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {aiSuggesting ? (
              <>
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, borderTopColor: 'var(--accent-1)' }} />
                Analyzing context & generating template...
              </>
            ) : (
              <>✨ AI Suggested Reply</>
            )}
          </button>
          {aiError && (
            <div style={{ fontSize: '0.75rem', color: 'var(--priority-critical)', marginTop: 6 }}>
              ⚠️ {aiError}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="comment-input-row" style={{ marginTop: 20 }}>
        {isAgentOrAdmin ? (
          <textarea
            id="comment-input"
            className="form-textarea"
            placeholder="Write a comment or edit the AI template..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={posting}
            rows={3}
            style={{ minHeight: '80px', flex: 1 }}
          />
        ) : (
          <input
            id="comment-input"
            className="form-input"
            placeholder="Write a comment..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={posting}
          />
        )}
        <button type="submit" className="btn btn-primary" disabled={posting || !message.trim()} style={{ alignSelf: 'flex-end' }}>
          {posting ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

