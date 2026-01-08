import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from './api'
import { CalendarItem } from './types'
import { getToken, clearToken } from './auth'

type State = {
  calendars: CalendarItem[]
  selectedCalendarId: string | null
  roleByCalendarId: Record<string, number>
  loading: boolean
  error: string | null
  lastRefreshedAt: number | null
  refreshCalendars: () => Promise<void>
  selectCalendar: (id: string) => void
  getRole: (id: string) => number | null
}

const CalendarContext = createContext<State | null>(null)

export const CalendarProvider = ({ children }: { children: React.ReactNode }) => {
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const [roleByCalendarId, setRoleByCalendarId] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)

  const refreshCalendars = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
  const res = await api.apiFetch('/calendars')
      const json = res && res.body
      
      let arr: any[] = []
      if (Array.isArray(json)) arr = json
      else if (json && Array.isArray(json.items)) arr = json.items
      else if (json && Array.isArray(json.calendars)) arr = json.calendars
      else arr = []
      if (res.status === 200 && arr.length === 0) {
        
        if (import.meta.env.DEV) console.warn('Unexpected calendars shape', json)
      }
      const items = arr
      setCalendars(items)
      const map: Record<string, number> = {}
      for (const it of items) {
        if (it && it.id) map[it.id] = it.role ?? 0
      }
      setRoleByCalendarId(map)
      setLastRefreshedAt(Date.now())
    } catch (e: any) {
      
      try {
        setError(e && e.error ? JSON.stringify(e.error) : String(e))
      } catch (_) {
        setError('Failed to refresh calendars')
      }
      
      if (e && e.status === 401) {
        
        try { const { onUnauthorized } = await import('./auth'); onUnauthorized() } catch(_) { clearToken() }
        setError('Session expired')
      }
      if (e && (e.status === 403 || e.status === 500)) {
        
        setError(e && e.error ? JSON.stringify(e.error) : `Server error ${e.status}`)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const selectCalendar = (id: string) => {
    setSelectedCalendarId(id)
  }

  const getRole = (id: string) => {
    if (!id) return null
    if (roleByCalendarId.hasOwnProperty(id)) return roleByCalendarId[id]
    return null
  }

  
  useEffect(() => {
    if (getToken()) {
      
      refreshCalendars()
    }
  }, [])

  
  const ensureRoleFor = useCallback(async (id: string): Promise<void> => {
    if (!id) return
    if (roleByCalendarId.hasOwnProperty(id)) return
    if (!loading) {
      await refreshCalendars()
    }
  }, [roleByCalendarId, loading, refreshCalendars])

  return (
    <CalendarContext.Provider value={{ calendars, selectedCalendarId, roleByCalendarId, loading, error, lastRefreshedAt, refreshCalendars, selectCalendar, getRole }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendarContext() {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendarContext must be used within CalendarProvider')
  return ctx
}

export function useCalendarRole(id: string | undefined | null) {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendarRole must be used within CalendarProvider')
  if (!id) return null
  const role = ctx.getRole(id)
  return role
}

export function useEnsureCalendarRole(id: string | undefined | null) {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useEnsureCalendarRole must be used within CalendarProvider')
  const ensure = async () => {
    if (!id) return
    if (ctx.getRole(id) === null) {
      await ctx.refreshCalendars()
    }
  }
  return { ensure, loading: ctx.loading, error: ctx.error }
}

export default CalendarContext
