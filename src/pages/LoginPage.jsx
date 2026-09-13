import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as authService from '../services/authService'
import { IconShield, IconLock, IconClock } from '../components/Icons'
import { useToast } from '../components/Toast'
import { GoogleLogin } from '@react-oauth/google'
import API from '../services/api'

// ── Google Client ID ──────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '146462886347-qourvvcnfbc1tsr76jr272tfjj73508m.apps.googleusercontent.com'


// ── Login Page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const { toast }  = useToast()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [info, setInfo]     = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
    setInfo('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const res = await authService.login(form)
      login(res.data)
      toast.success(`Welcome back, ${res.data.first_name || res.data.username}!`)
      const role = res.data.role
      if (role === 'admin')      navigate('/admin-dashboard')
      else if (role === 'agent') navigate('/agent-dashboard')
      else                       navigate('/dashboard')
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Login failed. Check your credentials.'
      if (errMsg.toLowerCase().includes('waiting') || errMsg.toLowerCase().includes('approval')) {
        setInfo(errMsg)
      } else {
        setError(errMsg)
        toast.error(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleCredential(googleCredentialToken) {
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const res = await API.post('auth/google-login/', { token: googleCredentialToken })
      login(res.data)
      toast.success(`Welcome, ${res.data.first_name || res.data.username}!`)
      const role = res.data.role
      if (role === 'admin')      navigate('/admin-dashboard')
      else if (role === 'agent') navigate('/agent-dashboard')
      else                       navigate('/dashboard')
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Google sign-in failed. Please try again.'
      if (errMsg.toLowerCase().includes('waiting') || errMsg.toLowerCase().includes('approval')) {
        setInfo(errMsg)
      } else {
        setError(errMsg)
        toast.error(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box fade-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <IconShield size={26} />
          </div>
          <div className="auth-title">Welcome Back</div>
          <div className="auth-subtitle">Sign in to IT Service Desk</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {info && (
          <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconClock size={16} style={{ flexShrink: 0 }} />
            {info}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              name="username"
              className="form-input"
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Signing in…
              </>
            ) : (
              <>
                <IconLock size={15} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* ── Divider ── */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div className="auth-divider">
              <span className="auth-divider-line" />
              <span className="auth-divider-text">or</span>
              <span className="auth-divider-line" />
            </div>

            {/* ── Google Sign-In ── */}
            <div className="google-login-wrap">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse?.credential) {
                    handleGoogleCredential(credentialResponse.credential)
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
          </>
        )}

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  )
}
