import { apiFetch, patchOccurrenceByRule, patchOccurrence, deleteOccurrence } from './api'
import { getRecurrenceRuleId } from './eventUtils'

export type Scope = 'this' | 'series'
export type PendingAction = { type: 'delete' | 'save', payload?: any }

export type LoadedEvent = {
  id: string
  event_id?: string
  start_ts?: string
  end_ts?: string
  recurrence_rule_id?: string
  recurrence?: any
}



export async function applyScopeAction(scope: Scope, action: PendingAction, opts: { calendarId: string, eventId: string, loadedEventRaw?: LoadedEvent | null, startTs?: string | null }) {
  const { calendarId, eventId, loadedEventRaw, startTs } = opts
  const ev = loadedEventRaw
  const ruleId = getRecurrenceRuleId(ev)

  
  
  
  const resolvedEventId = ev?.event_id || eventId || ev?.id || null

  if (action.type === 'delete') {
    if (scope === 'series') {
      await apiFetch(`/calendars/${calendarId}/events/${eventId}`, { method: 'DELETE' })
    } else {
      
      const start_ts = startTs ?? ev?.start_ts ?? null
      if (!start_ts) throw new Error('Невозможно удалить экземпляр: отсутствует start_ts')
      if (ruleId) {
        await patchOccurrenceByRule(ruleId, { original_start_ts: start_ts, cancelled: 1 })
      } else {
  const event_id = resolvedEventId
  if (!event_id) throw new Error('Невозможно удалить экземпляр: отсутствует идентификатор события и rule_id')
        
        try {
          await deleteOccurrence(calendarId, event_id, start_ts)
        } catch (e: any) {
          throw new Error('Сервер не поддерживает удаление отдельного экземпляра (нет rule_id и fallback не реализован)')
        }
      }
    }
  } else if (action.type === 'save') {
    const payload = action.payload ?? {}
      if (scope === 'series') {
      const payloadForSeries = { ...payload }
      await apiFetch(`/calendars/${calendarId}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(payloadForSeries) })
    } else {
      
      const start_ts = startTs ?? ev?.start_ts ?? null
      if (!start_ts) throw new Error('Невозможно изменить экземпляр: отсутствует start_ts')
      const payloadForThis: any = { ...payload }
      delete payloadForThis.recurrence
      if (ruleId) {
        const body = { original_start_ts: start_ts, ...payloadForThis }
        await patchOccurrenceByRule(ruleId, body)
      } else {
        const event_id = resolvedEventId
        if (!event_id) throw new Error('Невозможно изменить экземпляр: отсутствует идентификатор события и rule_id')
        try {
          await patchOccurrence(calendarId, event_id, start_ts, payloadForThis)
        } catch (e: any) {
          throw new Error('Сервер не поддерживает изменение отдельного экземпляра (нет rule_id и fallback не реализован)')
        }
      }
    }
  }
}
