/**
 * Toast.jsx — lightweight, self-contained toast notification system.
 *
 * Usage:
 *   1. Wrap your app (or a subtree) with <ToastProvider>.
 *   2. Call const { toast } = useToast() in any component.
 *   3. toast.success('Saved!') / toast.error('Failed') / toast.warning(...) / toast.info(...)
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { IconCheckCircle, IconAlertCircle, IconAlert, IconInfo, IconX } from './Icons'

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null)

let _uid = 0
const uid = () => ++_uid

// ── Individual Toast Item ─────────────────────────────────────────────────────
function ToastItem({ id, type, message, onRemove }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  // Fade in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    timerRef.current = setTimeout(() => close(), 4200)
    return () => clearTimeout(timerRef.current)
  }, [])

  function close() {
    setVisible(false)
    setTimeout(() => onRemove(id), 300)
  }

  const cfg = {
    success: { icon: <IconCheckCircle size={17} />, color: 'var(--success)', bg: 'var(--success-light, #f0fdf4)', border: '#bbf7d0' },
    error:   { icon: <IconAlertCircle size={17} />, color: 'var(--danger)',  bg: '#fff5f5',                    border: '#fecaca' },
    warning: { icon: <IconAlert size={17} />,        color: 'var(--warning)', bg: '#fffbeb',                    border: '#fde68a' },
    info:    { icon: <IconInfo size={17} />,          color: 'var(--accent)',  bg: '#eff6ff',                    border: '#bfdbfe' },
  }[type] || { icon: <IconInfo size={17} />, color: 'var(--accent)', bg: '#eff6ff', border: '#bfdbfe' }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 10,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: '0 4px 20px rgba(15,23,42,0.10)',
        minWidth: 260,
        maxWidth: 380,
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(.4,0,.2,1), opacity 0.28s ease',
        marginBottom: 8,
      }}
    >
      <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ flex: 1, fontSize: '0.855rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
        {message}
      </span>
      <button
        onClick={close}
        aria-label="Dismiss notification"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', padding: 2, borderRadius: 4,
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}
      >
        <IconX size={14} />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type, message) => {
    setToasts(prev => [...prev, { id: uid(), type, message }])
  }, [])

  const toast = {
    success: (msg) => add('success', msg),
    error:   (msg) => add('error',   msg),
    warning: (msg) => add('warning', msg),
    info:    (msg) => add('info',    msg),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack — fixed bottom-right */}
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: 90,   // above the chatbot FAB
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem {...t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
