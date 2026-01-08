import React, { useState } from 'react'
import api from '../app/api'
import { useNavigate, Link } from 'react-router-dom'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      if (res.status === 201) {
        nav('/login')
      }
    } catch (e: any) {
      setError(`${e.status || 'err'}: ${JSON.stringify(e.error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="card">
          <h3>Register</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form className="auth-form" onSubmit={onSubmit}>
            <div>
              <label>Email</label>
              <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Подождите...' : 'Register'}</button>
          </form>
          <div className="auth-footer">
            <Link to="/login">Уже есть аккаунт? Войти</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
