export type CalendarEvent = {
  id: string 
  event_id?: string
  start_ts?: string
  end_ts?: string | null
  recurrence_rule_id?: string | null
  recurrence?: any
  [k: string]: any
}

export function isRecurring(ev: CalendarEvent | null | undefined): boolean {
  if (!ev) return false
  if (ev.recurrence_rule_id != null) return true
  if (ev.recurrence && (ev.recurrence.id || ev.recurrence.rule_id || ev.recurrence_rule_id)) return true
  
  if ((ev as any).rrule) return true
  return false
}


export function getRecurrenceRuleId(ev: CalendarEvent | null | undefined): string | null {
  if (!ev) return null
  if (ev.recurrence_rule_id) return ev.recurrence_rule_id
  if (ev.recurrence && ev.recurrence.id) return ev.recurrence.id
  if (ev.recurrence && ev.recurrence.rule_id) return ev.recurrence.rule_id
  return null
}
