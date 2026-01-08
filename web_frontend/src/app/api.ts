import { getToken, onUnauthorized } from './auth'

const DEFAULT_BASE = 'http://127.0.0.1:8080'

function buildBaseAndUrl(path: string) {
  let base: string
  if (import.meta.env.DEV) {
    base = '/api'
  } else {
    base = (import.meta.env.VITE_API_BASE_URL as string) || DEFAULT_BASE
  }
  const finalUrl = base + (path.startsWith('/') ? path : '/' + path)
  return { base, finalUrl }
}


function parseJsonOrThrow(text: string, url: string, status: number) {
  try {
    return JSON.parse(text)
  } catch (e: any) {
    const snippet = text ? text.slice(0, 1000) : ''
    throw { status, error: { message: 'Invalid JSON', text: snippet }, url }
  }
}

export type FetchOptions = RequestInit & { timeoutMs?: number }

export async function apiFetch(path: string, opts: FetchOptions = {}) {
  
  const banned = ['.ts', '.tsx', '.js', '.css', '.html']
  if (path.includes('/src/') || banned.some(s => path.endsWith(s))) {
    throw new Error('apiFetch called with non-API path: ' + path)
  }

  const { finalUrl } = buildBaseAndUrl(path)

  const controller = new AbortController()
  const timeout = opts.timeoutMs ?? 10000
  const id = setTimeout(() => controller.abort(), timeout)

  const headers: Record<string,string> = {
    'Accept': 'application/json'
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts.body) {
    
    headers['Content-Type'] = 'application/json'
  }

  try {
    const res = await fetch(finalUrl, {
      ...opts,
      signal: controller.signal,
      headers: {
        ...(opts.headers || {}),
        ...headers
      }
    })
    clearTimeout(id)

    const contentType = (res.headers.get('content-type') || '')
    
    if (res.status === 204) {
      if (import.meta.env.DEV) console.log('[apiFetch]', opts.method || 'GET', finalUrl, '->', res.status)
      return { status: res.status, body: null }
    }

    const text = await res.text()

    
    if (!contentType.includes('application/json')) {
      const snippet = text ? text.slice(0, 500) : ''
      const err = { status: res.status, error: { message: 'Non-JSON response', contentType, text: snippet }, url: finalUrl }
      if (import.meta.env.DEV) console.log('[apiFetch]', opts.method || 'GET', finalUrl, '->', res.status)
      throw err
    }

    
    const body = text ? parseJsonOrThrow(text, finalUrl, res.status) : null

    if (res.status === 401) {
      onUnauthorized()
      throw { status: 401, error: body || { error: 'unauthorized' }, url: finalUrl }
    }

    if (!res.ok) {
      throw { status: res.status, error: body || { error: 'unknown' }, url: finalUrl }
    }

    if (import.meta.env.DEV) console.log('[apiFetch]', opts.method || 'GET', finalUrl, '->', res.status)
    return { status: res.status, body }
  } catch (e: any) {
    if (e && e.name === 'AbortError') {
      throw { status: 0, error: { error: 'timeout' }, url: finalUrl }
    }
    throw e
  }
}





export async function patchOccurrenceByRule(ruleId: string, bodyPayload: any) {
  return apiFetch(`/recurrence/${ruleId}/occurrence`, { method: 'PATCH', body: JSON.stringify(bodyPayload) })
}

export async function deleteOccurrenceByRule(ruleId: string, original_start_ts: string) {
  
  const body = { original_start_ts, cancelled: 1 }
  return apiFetch(`/recurrence/${ruleId}/occurrence`, { method: 'PATCH', body: JSON.stringify(body) })
}


export async function deleteOccurrence(calendarId: string, eventId: string, start_ts: string) {
  return apiFetch(`/calendars/${calendarId}/events/${eventId}/occurrences`, { method: 'DELETE', body: JSON.stringify({ start_ts }) })
}

export async function patchOccurrence(calendarId: string, eventId: string, start_ts: string, payload: any) {
  const body = { original_start_ts: start_ts, ...payload }
  return apiFetch(`/calendars/${calendarId}/events/${eventId}/occurrences`, { method: 'PATCH', body: JSON.stringify(body) })
}

export type OccurrenceView = {
  occurrence_id?: string
  id?: string
  event_id: string
  recurrence_rule_id?: string | null
  title: string
  description?: string | null
  start_ts: string
  end_ts?: string | null
  is_cancelled?: boolean
  override_id?: string | null
}

export async function getOccurrenceInstance(calendarId: string, eventId: string, startTs: string) {
  const encoded = encodeURIComponent(startTs)
  return apiFetch(`/calendars/${calendarId}/events/${eventId}/occurrences/${encoded}`)
}

export const api = { apiFetch, patchOccurrenceByRule, deleteOccurrenceByRule, deleteOccurrence, patchOccurrence, getOccurrenceInstance }

export default api

