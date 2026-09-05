                                                                                      import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restore session from localStorage on mount ──────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  // ── login: accepts the FLAT backend response ─────────────────────────────
  // Backend returns: { access, refresh, role, username, email, id, first_name, last_name }
  const login = useCallback((responseData) => {
    const { access, refresh, role, username, email, id, first_name, last_name } = responseData

    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)

    const userData = { id, username, email, role, first_name, last_name }
    localStorage.setItem('user', JSON.stringify(userData))

    setUser(userData)
  }, [])

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  // ── refresh token ────────────────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem('refresh')
    if (!refresh) { logout(); return null }
    try {
      const res = await api.post('auth/token/refresh/', { refresh })
      localStorage.setItem('access', res.data.access)
      return res.data.access
    } catch {
      logout()
      return null
    }
  }, [logout])

  // ── Convenience getters ──────────────────────────────────────────────────
  const role = user?.role ?? null
  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{ user, role, isAuthenticated, loading, login, logout, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
