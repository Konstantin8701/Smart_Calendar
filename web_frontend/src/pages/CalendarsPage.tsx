import React, { useEffect, useState } from 'react'
import api from '../app/api'
import { CalendarItem } from '../app/types'
import { Link, useNavigate } from 'react-router-dom'
import { useCalendarContext } from '../app/calendarContext'
import { roleLabel } from '../app/rbac'
import RU from '../i18n/ru'

export default function CalendarsPage() {
  
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  const ctx = useCalendarContext()

  useEffect(() => {
    
    if (!ctx.loading) {
      ctx.refreshCalendars().catch(() => {})
    }
  }, [])

  async function createCal(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await api.apiFetch('/calendars', { method: 'POST', body: JSON.stringify({ title }) })
      if (res.status === 201 && res.body && (res.body as any).id) {
        const id = (res.body as any).id
        ctx.selectCalendar(id)
        
        await ctx.refreshCalendars()
        nav(`/calendars/${id}/month`)
      }
    } catch (e: any) {
      setError(`${e.status}: ${JSON.stringify(e.error)}`)
    }
  }

  return (
    <div>
      <h2>{RU.calendars}</h2>
      {error && <div className="error">{error}</div>}
      {}
      <form onSubmit={createCal}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={RU.createCalendarPlaceholder} />
        <button type="submit">{RU.createCalendar}</button>
      </form>
      <ul>
        {ctx.calendars.map(it => (
          <li key={it.id}>
            <Link to={`/calendars/${it.id}/month`} onClick={() => ctx.selectCalendar(it.id)}>{it.title}</Link>
            {' '}
            <Link to={`/calendars/${it.id}/members`} onClick={() => ctx.selectCalendar(it.id)}>{RU.members}</Link>
            <span className="badge">{roleLabel(ctx.getRole(it.id))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
