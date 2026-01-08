import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../app/api'
import RecurrenceScopeModal from '../components/RecurrenceScopeModal'
import { isRecurring } from '../app/eventUtils'
import { applyScopeAction, type PendingAction } from '../app/recurrenceActions'
import { useCalendarRole, useCalendarContext, useEnsureCalendarRole } from '../app/calendarContext'
import { canWrite, canDelete } from '../app/rbac'
import RecurrenceEditor, { RecurrenceRule } from '../components/RecurrenceEditor'
import RU from '../i18n/ru'

export default function EventEditorPage() {
  const { id, eventId } = useParams()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [scopeChoice, setScopeChoice] = useState<null | 'this' | 'series'>(null)
  const [desc, setDesc] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null)
  const [loadedEventRaw, setLoadedEventRaw] = useState<any>(null)
  const [qsStart, setQsStart] = useState<string | null>(null)
  const [qsRule, setQsRule] = useState<string | null>(null)
  const [qsAllDay, setQsAllDay] = useState<string | null>(null)
  const [scopeModalOpen, setScopeModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ctx = useCalendarContext()
  const calRole = useCalendarRole(id)
  const ensure = useEnsureCalendarRole(id)
  
  const seriesId = (loadedEventRaw && (loadedEventRaw as any).event_id) ?? (eventId as string)

  function toLocalInputValue(isoZ: string | undefined | null) {
    if (!isoZ) return ''
    
    const d = new Date(isoZ)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const min = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  function fromLocalInputToIsoZ(value: string) {
    
    if (!value) return null
    const d = new Date(value)
    return d.toISOString()
  }

  function isoToLocalDate(isoZ: string | undefined | null) {
    if (!isoZ) return ''
    const d = new Date(isoZ)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  }

  function localDateToIsoZ(dateStr: string) {
    if (!dateStr) return null
    const parts = dateStr.split('-')
    if (parts.length !== 3) return null
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return d.toISOString()
  }

  useEffect(() => {
    if (eventId) {
      
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      setQsStart(params.get('start_ts'))
      setQsRule(params.get('rule_id'))
      setQsAllDay(params.get('all_day'))
      ;(async () => {
        try {
          
          const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
          const qsStart = params.get('start_ts')
          const qsRule = params.get('rule_id')
          const qsAllDay = params.get('all_day')

          
          let ev: any = null
          const qsStartLocal = qsStart || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('start_ts') : null)
          if (qsStartLocal) {
            try {
              const inst = await api.getOccurrenceInstance(id as string, eventId as string, qsStartLocal)
              if (inst && inst.status === 200 && inst.body) {
                ev = inst.body as any
              } else if (inst && inst.status === 404) {
                setError('Экземпляр не найден или удалён')
                return
              }
            } catch (e: any) {
              
              
              if (e && typeof e.status !== 'undefined' && e.status === 404) {
                setError('Экземпляр не найден или удалён')
                return
              }
              throw e
            }
          }

          
          if (!ev) {
            try {
              const perRes = await api.apiFetch(`/calendars/${id}/events/${eventId}`)
              if (perRes && perRes.status === 200 && perRes.body) ev = perRes.body
            } catch (err: any) {
              if (!err || (err.status !== 404 && typeof err.status !== 'undefined')) throw err
            }
          }
          if (!ev) {
            const res = await api.apiFetch(`/calendars/${id}/events?from=1970-01-01T00:00:00Z&to=2100-01-01T00:00:00Z`)
            const items = (res.body && (res.body as any).items) || []
            ev = items.find((x: any) => x.id === eventId)
          }

          if (ev) {
                setTitle(ev.title || '')
                
                if (qsStart) ev.start_ts = qsStart
                if (qsRule && !ev.recurrence_rule_id) ev.recurrence_rule_id = qsRule

                
                let isAllDay = false
                if (typeof ev.all_day !== 'undefined') {
                  isAllDay = !!ev.all_day
                } else if (qsAllDay === '1') {
                  isAllDay = true
                } else {
                  try {
                    if (ev.start_ts && ev.end_ts) {
                      const s = new Date(ev.start_ts)
                      const e = new Date(ev.end_ts)
                      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                        const delta = e.getTime() - s.getTime()
                        if (delta === 86400000) {
                          if (s.getHours() === 0 && s.getMinutes() === 0) {
                            isAllDay = true
                          }
                        }
                      }
                    }
                  } catch (ex) {}
                }

                setAllDay(!!isAllDay)

                if (isAllDay) {
                  setStart(isoToLocalDate(ev.start_ts))
                  setEnd('')
                } else {
                  setStart(toLocalInputValue(ev.start_ts))
                  setEnd(ev.end_ts ? toLocalInputValue(ev.end_ts) : '')
                }

                setDesc(ev.description || '')
                setRecurrence(ev.recurrence || null)
                setLoadedEventRaw(ev)
                
                try {
                  const editingOccurrence = !!qsStart
                  const showScopeUI = editingOccurrence || isRecurring(ev)
                  if (showScopeUI) {
                    setScopeChoice(prev => (prev === null ? (editingOccurrence ? 'this' : 'series') : prev))
                  }
                } catch (ex) {}
          }
        } catch (e: any) {
          const status = (e && typeof e.status !== 'undefined') ? e.status : 'ERR'
          const errBody = (e && typeof e.error !== 'undefined') ? e.error : (e?.message || String(e))
          setError(`${status}: ${typeof errBody === 'string' ? errBody : JSON.stringify(errBody)}`)
        }
      })()
    }
  }, [id, eventId])

  useEffect(() => {
    if (id && calRole === null && !ensure.loading) {
      ensure.ensure()
    }
  }, [id, calRole, ensure])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canWrite(calRole)) {
      setError('Недостаточно прав для сохранения')
      return
    }
    
    if (allDay) {
      if (!start) { setError('Укажите дату'); return }
    } else {
      if (!start) { setError('Укажите дату/время начала'); return }
      if (end) {
        const sTs = new Date(fromLocalInputToIsoZ(start) || '')
        const eTs = new Date(fromLocalInputToIsoZ(end) || '')
        if (!isNaN(sTs.getTime()) && !isNaN(eTs.getTime()) && eTs.getTime() < sTs.getTime()) { setError('End должен быть позже Start'); return }
      }
    }

    try {
      const payload: any = { title, description: desc }
      if (allDay) {
        payload.start_ts = localDateToIsoZ(start)
        if (start) {
          const parts = start.split('-')
          if (parts.length === 3) {
            const d0 = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
            const d1 = new Date(d0.getTime())
            d1.setDate(d1.getDate() + 1)
            payload.end_ts = d1.toISOString()
          } else {
            payload.end_ts = null
          }
        } else {
          payload.end_ts = null
        }
      } else {
        payload.start_ts = fromLocalInputToIsoZ(start)
        payload.end_ts = end ? fromLocalInputToIsoZ(end) : null
      }
      if (recurrence) {
        
        const clean: any = {}
        for (const k of Object.keys(recurrence) as Array<keyof typeof recurrence>) {
          const val = (recurrence as any)[k]
          if (val !== null && val !== undefined) clean[k] = val
        }
        if (Object.keys(clean).length > 0) payload.recurrence = clean
      }
  if (eventId) {
        
        
        const editingOccurrenceNow = !!qsStart
        const showScopeUINow = editingOccurrenceNow || isRecurring(loadedEventRaw)
        if (showScopeUINow) {
            
              if (scopeChoice) {
              const startTsNow = qsStart ?? loadedEventRaw?.start_ts ?? null
              await applyScopeAction(scopeChoice, { type: 'save', payload }, { calendarId: id as string, eventId: seriesId, loadedEventRaw, startTs: startTsNow })
              nav(`/calendars/${id}/month`)
              return
            }
          
          setPendingAction({ type: 'save', payload })
          setScopeModalOpen(true)
          return
        }
        await api.apiFetch(`/calendars/${id}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await api.apiFetch(`/calendars/${id}/events`, { method: 'POST', body: JSON.stringify(payload) })
      }
      nav(`/calendars/${id}/month`)
    } catch (e: any) {
      const status = (e && typeof e.status !== 'undefined') ? e.status : 'ERR'
      const errBody = (e && typeof e.error !== 'undefined') ? e.error : (e?.message || String(e))
      setError(`${status}: ${typeof errBody === 'string' ? errBody : JSON.stringify(errBody)}`)
    }
  }

  async function onDelete() {
    if (!canDelete(calRole)) { setError('Недостаточно прав для удаления'); return }
    try {
        const editingOccurrenceNow2 = !!qsStart
        const showScopeUINow2 = editingOccurrenceNow2 || isRecurring(loadedEventRaw)
        if (showScopeUINow2) {
          
          if (scopeChoice) {
            const startTsNow2 = qsStart ?? loadedEventRaw?.start_ts ?? null
            await applyScopeAction(scopeChoice, { type: 'delete' }, { calendarId: id as string, eventId: seriesId, loadedEventRaw, startTs: startTsNow2 })
            nav(`/calendars/${id}/month`)
            return
          }
          setPendingAction({ type: 'delete' })
          setScopeModalOpen(true)
          return
      }
      await api.apiFetch(`/calendars/${id}/events/${eventId}`, { method: 'DELETE' })
      nav(`/calendars/${id}/month`)
    } catch (e: any) {
      const status = (e && typeof e.status !== 'undefined') ? e.status : 'ERR'
      const errBody = (e && typeof e.error !== 'undefined') ? e.error : (e?.message || String(e))
      setError(`${status}: ${typeof errBody === 'string' ? errBody : JSON.stringify(errBody)}`)
    }
  }

  async function handleScopeSelect(scope: 'this' | 'series') {
    setScopeModalOpen(false)
    
    setScopeChoice(scope)
    
      if (!pendingAction) return
    try {
      const startTsNow = qsStart ?? loadedEventRaw?.start_ts ?? null
      await applyScopeAction(scope, pendingAction, { calendarId: id as string, eventId: seriesId, loadedEventRaw, startTs: startTsNow })
      nav(`/calendars/${id}/month`)
    } catch (e: any) {
      const status = (e && typeof e.status !== 'undefined') ? e.status : 'ERR'
      const errBody = (e && typeof e.error !== 'undefined') ? e.error : (e?.message || String(e))
      setError(`${status}: ${typeof errBody === 'string' ? errBody : JSON.stringify(errBody)}`)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div>
      <h2>
        {eventId ? RU.editEvent : RU.newEvent}
        {}
        {eventId && loadedEventRaw && (() => {
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
            const editingOccurrenceNow = !!params.get('start_ts')
            if (editingOccurrenceNow) {
              const qsStart = params.get('start_ts')
              if (qsStart) {
                const d = new Date(qsStart)
                if (!isNaN(d.getTime())) return (<span style={{marginLeft:8}}> — Редактирование экземпляра: {allDay ? isoToLocalDate(qsStart) : toLocalInputValue(qsStart)}</span>)
              }
            }
            return null
        })()}
      </h2>
      {error && <div className="error">{error}</div>}
      {ensure.loading ? (
        <div>{RU.loadingRole}</div>
      ) : ensure.error ? (
        <div>Error: {ensure.error} <button onClick={() => ctx.refreshCalendars()}>{RU.retry}</button></div>
      ) : calRole === null ? (
        <div>{RU.calendarNotFound}</div>
      ) : (
        <form onSubmit={onSave}>
        <div>
          <label>{RU.title}</label>
          <input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label>
            <input type="checkbox" checked={allDay} onChange={e => {
              const checked = e.target.checked
              setAllDay(checked)
              if (checked) {
                
                setEnd('')
                
                if (start && start.includes('T')) {
                  const d = new Date(start)
                  const pad = (n: number) => String(n).padStart(2,'0')
                  setStart(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`)
                }
              } else {
                
                if (start && !start.includes('T')) {
                  const parts = start.split('-')
                  if (parts.length === 3) {
                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                    const pad = (n: number) => String(n).padStart(2,'0')
                    setStart(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T00:00`)
                  }
                }
              }
            }} /> Целый день
          </label>
          {allDay && <div style={{fontSize:12, color:'#666', marginTop:4}}>Конец дня рассчитывается автоматически (+1 день)</div>}
        </div>
        <div>
          <label>{RU.start}</label>
          {allDay ? (
            <input type="date" value={start} onChange={e => setStart(e.target.value)} />
          ) : (
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
          )}
        </div>
        {!allDay && (
          <div>
            <label>{RU.end}</label>
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        )}
        <div>
          <label>{RU.description}</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
          <div style={{marginTop:8}}>
          <label>Recurrence</label>
          {(() => {
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
            const editingOccurrenceNow = !!params.get('start_ts')
            const showScopeUI = editingOccurrenceNow || isRecurring(loadedEventRaw)
            if (showScopeUI) {
              return (
                <div>
                  <div style={{marginBottom:6}}>
                    <label style={{marginRight:8}}>Редактировать:</label>
                    <label style={{marginRight:8}}>
                      <input type="radio" name="scope" checked={scopeChoice === 'this'} onChange={() => setScopeChoice('this')} /> только этот экземпляр
                    </label>
                    <label>
                      <input type="radio" name="scope" checked={scopeChoice === 'series'} onChange={() => setScopeChoice('series')} /> вся серия
                    </label>
                    <div style={{fontSize:12, color:'#666', marginTop:4}}>Если не выбрано, появится модалка при попытке сохранить/удалить.</div>
                  </div>
                  {scopeChoice === 'this' ? (
                    <div style={{padding:8, background:'#f8f8f8', borderRadius:4}}>
                      Правило повторения применяется только при выборе «Вся серия». Изменение этого экземпляра не изменит правило.
                    </div>
                  ) : (
                    <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
                  )}
                </div>
              )
            }
            return (<RecurrenceEditor value={recurrence} onChange={setRecurrence} />)
          })()}
        </div>
        <div style={{marginTop:8}}>
          <button type="submit" disabled={!canWrite(calRole)}>{RU.save}</button>
          {eventId && canDelete(calRole) && <button type="button" onClick={onDelete} style={{marginLeft:8}}>{RU.delete}</button>}
          {eventId && !canDelete(calRole) && <button type="button" disabled style={{marginLeft:8}}>{'Удалить (владелец)'}</button>}
        </div>
        </form>
      )}
  <RecurrenceScopeModal open={scopeModalOpen} onClose={() => setScopeModalOpen(false)} onSelect={handleScopeSelect} />
    </div>
  )
}
