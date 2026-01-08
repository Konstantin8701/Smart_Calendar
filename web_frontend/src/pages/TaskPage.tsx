import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../app/api'
import { Task } from '../app/types'
import { useCalendarContext, useCalendarRole, useEnsureCalendarRole } from '../app/calendarContext'
import { canWrite, canDelete } from '../app/rbac'
import RU from '../i18n/ru'

export default function TaskPage() {
  const { id } = useParams()
  const [items, setItems] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const ctx = useCalendarContext()
  const calRole = useCalendarRole(id)
  const ensure = useEnsureCalendarRole(id)

  async function load() {
    try {
      const res = await api.apiFetch(`/calendars/${id}/tasks`)
      setItems((res.body && (res.body as any).items) || [])
    } catch (e) { }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (calRole === null && !ensure.loading) {
      ensure.ensure()
    }
  }, [calRole, ensure])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (!canWrite(calRole)) return
      await api.apiFetch(`/calendars/${id}/tasks`, { method: 'POST', body: JSON.stringify({ title, due_ts: due ? due+'Z' : null }) })
      setTitle('')
      setDue('')
      load()
    } catch (e) {}
  }

  return (
    <div>
      <h2>{RU.tasks}</h2>
      {ensure.loading ? (
        <div>{RU.loadingRole}</div>
      ) : ensure.error ? (
        <div>Error: {ensure.error} <button onClick={() => ctx.refreshCalendars()}>{RU.retry}</button></div>
      ) : calRole === null ? (
        <div>{RU.calendarNotFound}</div>
      ) : canWrite(calRole) ? (
        <form onSubmit={create}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название" />
          <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} />
          <button type="submit">{RU.create}</button>
        </form>
      ) : (
        <div>Недостаточно прав для создания задач</div>
      )}
      <ul>
        {items.map(it => <li key={it.id}>{it.title} - status:{it.status} {canDelete(calRole) ? <button onClick={async ()=>{ await api.apiFetch(`/calendars/${id}/tasks/${it.id}`, { method: 'DELETE' }); load() }}>Delete</button> : null}</li>)}
      </ul>
    </div>
  )
}
