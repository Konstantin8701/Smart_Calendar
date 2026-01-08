import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../app/api'
import { useCalendarRole, useCalendarContext, useEnsureCalendarRole } from '../app/calendarContext'
import { canWrite } from '../app/rbac'

function monthRange(year: number, month: number) {
  
  const from = new Date(Date.UTC(year, month, 1, 0, 0, 0))
  const to = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0))
  return [from.toISOString(), to.toISOString()]
}

const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
]


const pad = (n:number)=>String(n).padStart(2,'0')
const localDayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`

export default function MonthPage() {
  const { id } = useParams()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  
  const [rawEvents, setRawEvents] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  const ctx = useCalendarContext()
  const calRole = useCalendarRole(id)
  const ensure = useEnsureCalendarRole(id)
  
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  type NormEvent = { id: string, title: string, start: Date, seriesId?: string, occStartTs?: string, occId?: string, ruleId?: string | null }
  function parseBackendTs(ts: any): Date | null {
    if (!ts) return null
    if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts
    if (typeof ts !== 'string') return null

    let s = ts.trim()
    
    s = s.replace(/,\s*$/, '')
    
    let d = new Date(s)
    if (!isNaN(d.getTime())) return d

    
    s = s.replace(' ', 'T')
    
    if (s.endsWith('+00')) s = s.slice(0, -3) + 'Z'
    
    s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
    
    

    d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d
  }

  function normalizeEvent(raw: any): NormEvent | null {
    if (!raw) return null
  const id = raw.id ?? raw.event_id ?? raw.uid ?? ''
  const seriesId = raw.event_id ?? raw.seriesId ?? raw.series_id ?? raw.id ?? ''
  const ruleId = raw.recurrence_rule_id ?? raw.recurrence?.id ?? raw.recurrence?.rule_id ?? raw.rule_id ?? null
    const title = raw.title ?? raw.summary ?? raw.name ?? '(no title)'
    const dateKeys = ['start_ts','start','start_time','startAt','begin_ts','begin','starts_at','startTime','start_datetime','dtstart','startTs','start_at','start_ts_utc']
    let startRaw: any = null
    for (const k of dateKeys) {
      if (k in raw && raw[k]) { startRaw = raw[k]; break }
    }
    if (!startRaw) return null
    const d = parseBackendTs(startRaw)
    if (!d) return null
    
    const occStartTs = (typeof startRaw === 'string') ? startRaw : (d.toISOString())
    const occId = raw.occurrence_id ?? raw.occurrenceId ?? raw.occ_id ?? null
    return { id: String(id), title: String(title), start: d, seriesId: String(seriesId), occStartTs: occStartTs, occId: occId, ruleId }
  }

  async function load() {
    const [from, to] = monthRange(year, month)
    try {
      const res = await api.apiFetch(`/calendars/${id}/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      
      if (!res || typeof res.status === 'undefined') {
        setError('Invalid response from events endpoint')
        return
      }
      if (res.status !== 200) {
        setError(`status ${res.status}: ${JSON.stringify(res.body)}`)
        return
      }
      const body = res.body as any
      const items = Array.isArray(body) ? body
        : Array.isArray(body?.items) ? body.items
        : Array.isArray(body?.occurrences) ? body.occurrences
        : Array.isArray(body?.events) ? body.events
        : Array.isArray(body?.data) ? body.data
        : []
  setRawEvents(items)
    } catch (e: any) {
      
      if (e && typeof e.status !== 'undefined') {
        const status = e.status
        const errBody = (typeof e.error !== 'undefined') ? e.error : (e?.message || String(e))
        setError(`status ${status}: ${typeof errBody === 'string' ? errBody : JSON.stringify(errBody)}`)
        
        if (import.meta.env.DEV && e.error && (e.error.message === 'Invalid JSON' || e.error.message === 'Non-JSON response')) {
          
          
        }
      } else {
        const err = (e && e.message) ? e.message : String(e)
        setError(err)
      }
    }
  }

  useEffect(() => { load() }, [id, year, month])

  
  useEffect(() => {
    if (id) {
      if (calRole === null && !ensure.loading) {
        ensure.ensure()
      }
    }
  }, [id, calRole, ensure])

  function prev() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function next() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }
  function today() { const d = new Date(); setYear(d.getFullYear()); setMonth(d.getMonth()) }

  
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month+1, 0).getDate()
  
  
  const normalizedEvents = useMemo(() => {
    const list: NormEvent[] = []
    for (const r of rawEvents) {
      const n = normalizeEvent(r)
      if (n) list.push(n)
    }
    return list
  }, [rawEvents])

  const byDay = useMemo(() => {
    const map: Record<string, NormEvent[]> = {}
    for (const ev of normalizedEvents) {
      const key = localDayKey(ev.start)
      ;(map[key] ||= []).push(ev)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a,b) => a.start.getTime() - b.start.getTime())
    }
    return map
  }, [normalizedEvents])

  const cells: Array<{day:number, items:NormEvent[]}> = []
  for (let d=1; d<=daysInMonth; d++) {
    const dayDate = new Date(year, month, d)
    const dateKey = localDayKey(dayDate)
    const items = byDay[dateKey] ?? []
    cells.push({ day: d, items })
  }

  const todayDate = new Date()
  const todayKey = localDayKey(todayDate)

  return (
    <div>
  <h2>{MONTH_NAMES[month]} {year}</h2>
      <div>
        <button onClick={prev}>Prev</button>
        <button onClick={today}>Today</button>
        <button onClick={next}>Next</button>
        {ensure.loading ? (
          <span>Загрузка прав…</span>
        ) : ensure.error ? (
          <span>Error: {ensure.error} <button onClick={() => ctx.refreshCalendars()}>Повторить</button></span>
        ) : calRole === null ? (
          <span>Календарь не найден или нет доступа</span>
        ) : canWrite(calRole) ? (
          <Link to={`/calendars/${id}/events/new`}><button>Новое событие</button></Link>
        ) : (
          <button disabled title="Недостаточно прав">Новое событие</button>
        )}
      </div>
      {error && <div className="error">Не удалось загрузить события: {error}</div>}

      {}

      <div className="month-grid">
        {}
        <div className="weekday-header">Пн</div>
        <div className="weekday-header">Вт</div>
        <div className="weekday-header">Ср</div>
        <div className="weekday-header">Чт</div>
        <div className="weekday-header">Пт</div>
        <div className="weekday-header">Сб</div>
        <div className="weekday-header">Вс</div>

        {}
        {(() => {
          const start = (first.getDay() + 6) % 7 
          const cellsArr = [] as JSX.Element[]
          for (let i = 0; i < start; i++) {
            cellsArr.push(<div key={`empty-${i}`} className="month-cell empty-cell" />)
          }
          for (let d = 1; d <= daysInMonth; d++) {
            const c = cells[d-1]
            const dayDate = new Date(year, month, c.day)
            const dayKey = localDayKey(dayDate)
            const items = c.items
            const MAX_VISIBLE = 3
            const expanded = !!expandedDays[dayKey]
            const visible = expanded ? items : items.slice(0, MAX_VISIBLE)
            const hiddenCount = Math.max(0, items.length - visible.length)
            const isToday = dayKey === todayKey

            cellsArr.push(
              <div key={`day-${d}`} className={`month-cell ${isToday ? 'today' : ''}`}>
                <div className="day-num">{c.day}</div>
                <div className="events">
                  {visible.map(ev => {
                    
                    const d = ev.start
                    const hh = String(d.getHours()).padStart(2, '0')
                    const mm = String(d.getMinutes()).padStart(2, '0')
                    const timeLabel = `${hh}:${mm}`
                    return (
                      <div key={ev.id} className="eventChip" onClick={() => {
                        const seriesId = ev.seriesId || ev.id
                        const occStart = ev.occStartTs || ev.start.toISOString()
                        const q = new URLSearchParams()
                        q.set('start_ts', occStart)
                        if (ev.ruleId) q.set('rule_id', ev.ruleId)
                        nav(`/calendars/${id}/events/${seriesId}/edit?` + q.toString())
                      }}>
                        <span className="time">{timeLabel}</span>
                        <span className="title">{ev.title || '(no title)'}</span>
                      </div>
                    )
                  })}
                  {hiddenCount > 0 && (
                    <button className="more" onClick={() => setExpandedDays(s => ({ ...s, [dayKey]: !s[dayKey] }))}>
                      {expanded ? 'свернуть' : `+${hiddenCount} ещё`}
                    </button>
                  )}
                </div>
              </div>
            )
          }
          
          const remainder = (7 - (cellsArr.length % 7)) % 7
          for (let i=0;i<remainder;i++) cellsArr.push(<div key={`trail-${i}`} className="month-cell empty-cell" />)
          return cellsArr
        })()}
      </div>
    </div>
  )
}
