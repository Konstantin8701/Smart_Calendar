import React, { useState } from 'react'
import api from '../app/api'
import { saveToken } from '../app/auth'
import RU from '../i18n/ru'
import { useNavigate, Link } from 'react-router-dom'

export default function LoginPage() {
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
      const res = await api.apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      if (res.body && (res.body as any).token) {
        saveToken((res.body as any).token)
        nav('/calendars')
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
          <h3>{RU.login}</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form className="auth-form" onSubmit={onSubmit}>
            <div>
              <label>Email</label>
              <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label>Пароль</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Подождите...' : RU.login}</button>
          </form>
          <div className="auth-footer">
            <Link to="/register">Нет аккаунта? {RU.register}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
