import React, { useEffect, useState } from 'react'
import api from '../app/api'
import { Member } from '../app/types'
import { useParams } from 'react-router-dom'
import { parseRole } from '../app/auth'
import { useCalendarRole, useCalendarContext, useEnsureCalendarRole } from '../app/calendarContext'
import { canManageMembers, roleLabel, canRemove } from '../app/rbac'
import { getCurrentUserId } from '../app/auth'
import RU from '../i18n/ru'
import { useToast } from '../app/toast'
import { useConfirm } from '../app/confirm'

export default function MembersPage() {
  const { id } = useParams()
  const [members, setMembers] = useState<Member[]>([])
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const ctx = useCalendarContext()
  const calRole = useCalendarRole(id)
  const ensure = useEnsureCalendarRole(id)
  const myUserId = getCurrentUserId()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    if (calRole === null && !ensure.loading) {
      ensure.ensure()
    }
  }, [calRole, ensure])

  async function load() {
    try {
      const res = await api.apiFetch(`/calendars/${id}/members`)
      setMembers(res.body || [])
    } catch (e: any) {
      setError(`${e.status}: ${JSON.stringify(e.error)}`)
    }
  }

  useEffect(() => { load() }, [id])

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.apiFetch(`/calendars/${id}/share`, { method: 'POST', body: JSON.stringify({ email, role }) })
      setEmail('')
      setRole(0)
      load()
    } catch (e: any) {
      setError(`${e.status}: ${JSON.stringify(e.error)}`)
    }
  }

  return (
    <div className="card">
      <h2 style={{marginTop:0}}>{RU.members}</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {ensure.loading ? (
        <div>{RU.loadingRole}</div>
      ) : ensure.error ? (
        <div>Error: {ensure.error} <button onClick={() => ctx.refreshCalendars()}>{RU.retry}</button></div>
      ) : calRole === null ? (
        <div>{RU.calendarNotFound}</div>
      ) : canManageMembers(calRole) ? (
        <form onSubmit={addMember} style={{display:'flex', gap:8, alignItems:'center', marginBottom:12}}>
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
          <select className="select" value={role} onChange={e => setRole(Number(e.target.value))}>
            <option value={0}>Читатель</option>
            <option value={1}>Модератор</option>
          </select>
          <button className="btn btn-primary" type="submit">{RU.updateMember}</button>
        </form>
      ) : (
        <div>Нет прав для управления участниками (reader)</div>
      )}
      <div>
        {members.length === 0 ? <div>{RU.noMembers || 'Пусто'}</div> : (
          <table className="members-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th className="actions">Actions</th></tr>
            </thead>
            <tbody>
              {members.map(m => {
                const isSelf = myUserId !== null && myUserId === m.user_id
                const allowed = canRemove(calRole, m.role, isSelf)
                return (
                  <tr key={m.user_id}>
                    <td>{m.email}</td>
                    <td><span className={`role-badge role-${m.role}`}>{roleLabel(m.role)}</span></td>
                    <td className="actions">
                      {allowed ? (
                        <button className="btn btn-danger" disabled={!!deleting[m.user_id]} onClick={async () => {
                          const ok = await confirm({ title: 'Подтвердите', body: `Удалить ${m.email} из календаря?`, confirmText: 'Удалить', cancelText: 'Отмена' })
                          if (!ok) return
                          try {
                            setDeleting(d => ({ ...d, [m.user_id]: true }))
                            const res = await api.apiFetch(`/calendars/${id}/members/${encodeURIComponent(m.user_id)}`, { method: 'DELETE' })
                            
                            if (res && res.status === 204) {
                              
                              setMembers(cur => cur.filter(x => x.user_id !== m.user_id))
                              
                              await load()
                              toast.success('Удалено')
                            }
                          } catch (e: any) {
                            const s = e && e.status
                            const err = e && e.error
                            if (s === 403) {
                              toast.error(RU.insufficientRights)
                            } else if (s === 400) {
                              const code = err && (err.error || err.code || err.message)
                              if (typeof code === 'string' && code.includes('forbidden_self_remove')) toast.error('Нельзя удалить самого себя')
                              else if (typeof code === 'string' && code.includes('cannot_remove_owner')) toast.error('Нельзя удалить владельца')
                              else toast.error('Bad request')
                            } else if (s === 404) {
                              toast.info('Пользователь уже не состоит в календаре')
                              await load()
                            } else {
                              toast.error('Ошибка сети/сервера')
                            }
                          } finally {
                            setDeleting(d => ({ ...d, [m.user_id]: false }))
                          }
                        }}>{deleting[m.user_id] ? '...' : 'Remove'}</button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
