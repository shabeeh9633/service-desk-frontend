import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { GoogleLogin } from '@react-oauth/google'
import API from '../services/api'
import * as authService from '../services/authService'
import { IconUser, IconInfo, IconCheckCircle } from '../components/Icons'

const ROLES = [
  { value: 'user',  label: 'User — raise & track tickets' },
  { value: 'agent', label: 'Agent — handle support tickets' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()

  const [accountType, setAccountType] = useState(() => {
    return localStorage.getItem('reg_account_type') || null
  })

  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    role: 'user', password: '', password2: '',
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleRegister(googleCredentialToken) {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await API.post('auth/google-login/', {
        token: googleCredentialToken,
        account_type: accountType
      })
      login(res.data)
      toast.success(`Welcome, ${res.data.first_name || res.data.username}!`)
      navigate('/dashboard')
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Google registration failed. Please try again.'
      if (errMsg.toLowerCase().includes('waiting') || errMsg.toLowerCase().includes('approval')) {
        setError(errMsg)
        toast.warning(errMsg)
      } else {
        setError(errMsg)
        toast.error(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.password2) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const { password2, ...payload } = form
      const res = await authService.register(payload)
      const isPending = res.data.pending
      const message   = res.data.message
      if (isPending) {
        setSuccess(message || 'Account created! Waiting for admin approval.')
        setTimeout(() => navigate('/'), 2500)
      } else {
        setSuccess(message || 'Account created! Please sign in.')
        setTimeout(() => navigate('/'), 1800)
      }
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const msgs = typeof data === 'object' ? Object.values(data).flat() : [data]
        setError(msgs.join(' '))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box fade-in" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <IconUser size={26} />
          </div>
          <div className="auth-title">Create Account</div>
          <div className="auth-subtitle">Join the IT Service Desk</div>
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IconCheckCircle size={16} />{success}</div>}

        {/* Choose Account Type & Google Sign-In */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>
            Choose Account Type to Register
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              className={`btn ${accountType === 'user' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                flex: 1,
                padding: '12px 8px',
                fontSize: '0.85rem',
                justifyContent: 'center',
                borderColor: accountType === 'user' ? 'var(--accent-1)' : 'var(--border)',
                background: accountType === 'user' ? 'var(--accent-1)' : 'transparent',
                color: accountType === 'user' ? '#fff' : 'var(--text-primary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: 'var(--radius-sm)'
              }}
              onClick={() => {
                setAccountType('user');
                localStorage.setItem('reg_account_type', 'user');
              }}
            >
              Continue as User
            </button>
            <button
              type="button"
              className={`btn ${accountType === 'agent' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                flex: 1,
                padding: '12px 8px',
                fontSize: '0.85rem',
                justifyContent: 'center',
                borderColor: accountType === 'agent' ? 'var(--accent-1)' : 'var(--border)',
                background: accountType === 'agent' ? 'var(--accent-1)' : 'transparent',
                color: accountType === 'agent' ? '#fff' : 'var(--text-primary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: 'var(--radius-sm)'
              }}
              onClick={() => {
                setAccountType('agent');
                localStorage.setItem('reg_account_type', 'agent');
              }}
            >
              Continue as Agent
            </button>
          </div>

          {accountType && (
            <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse?.credential) {
                    handleGoogleRegister(credentialResponse.credential)
                  }
                }}
                onError={() => {
                  toast.error('Google Sign-In failed')
                }}
                text="continue_with"
                shape="rectangular"
                theme="outline"
                width="320px"
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="auth-divider" style={{ margin: '24px 0' }}>
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or register with password</span>
          <span className="auth-divider-line" />
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-first">First Name</label>
              <input id="reg-first" name="first_name" className="form-input"
                placeholder="John" value={form.first_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-last">Last Name</label>
              <input id="reg-last" name="last_name" className="form-input"
                placeholder="Doe" value={form.last_name} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username *</label>
            <input id="reg-username" name="username" className="form-input"
              placeholder="johndoe" value={form.username} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email *</label>
            <input id="reg-email" name="email" type="email" className="form-input"
              placeholder="john@company.com" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">
              Role
              {form.role !== 'user' && (
                <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <IconInfo size={12} /> Requires admin approval
                </span>
              )}
            </label>
            <select id="reg-role" name="role" className="form-select"
              value={form.role} onChange={handleChange}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-pw">Password *</label>
              <input id="reg-pw" name="password" type="password" className="form-input"
                placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-pw2">Confirm *</label>
              <input id="reg-pw2" name="password2" type="password" className="form-input"
                placeholder="••••••••" value={form.password2} onChange={handleChange} required />
            </div>
          </div>

          <button id="register-submit" type="submit"
            className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
