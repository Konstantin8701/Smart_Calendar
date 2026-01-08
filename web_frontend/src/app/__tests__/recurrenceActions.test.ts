import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyScopeAction, type PendingAction } from '../recurrenceActions'
import * as api from '../api'

vi.mock('../api', async () => {
  return {
    apiFetch: vi.fn(),
    patchOccurrenceByRule: vi.fn(),
    patchOccurrence: vi.fn(),
    deleteOccurrence: vi.fn(),
  }
})

const mockedApi = api as unknown as {
  apiFetch: ReturnType<typeof vi.fn>
  patchOccurrenceByRule: ReturnType<typeof vi.fn>
  patchOccurrence: ReturnType<typeof vi.fn>
  deleteOccurrence: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  mockedApi.apiFetch.mockReset()
  mockedApi.patchOccurrenceByRule.mockReset()
  mockedApi.patchOccurrence.mockReset()
  mockedApi.deleteOccurrence.mockReset()
})

describe('applyScopeAction', () => {
  it('series delete calls apiFetch DELETE series endpoint', async () => {
    const action: PendingAction = { type: 'delete' }
    await applyScopeAction('series', action, { calendarId: 'cal1', eventId: 'ev1', loadedEventRaw: { id: 'ev1' } })
    expect(mockedApi.apiFetch).toHaveBeenCalledWith('/calendars/cal1/events/ev1', { method: 'DELETE' })
  })

  it('this save with ruleId calls patchOccurrenceByRule without recurrence', async () => {
    const action: PendingAction = { type: 'save', payload: { title: 'X', recurrence: { freq: 'DAILY' }, foo: 'bar' } }
    const ev = { id: 'ev1', start_ts: '2020-01-01T00:00:00Z', recurrence_rule_id: 'r1' }
    await applyScopeAction('this', action, { calendarId: 'cal1', eventId: 'ev1', loadedEventRaw: ev })
    expect(mockedApi.patchOccurrenceByRule).toHaveBeenCalled()
    const call = mockedApi.patchOccurrenceByRule.mock.calls[0]
    expect(call[0]).toBe('r1')
    const body = call[1]
    expect(body.original_start_ts).toBe(ev.start_ts)
    expect(body.title).toBe('X')
    expect(body.foo).toBe('bar')
    expect(body.recurrence).toBeUndefined()
  })

  it('this delete without ruleId calls deleteOccurrence fallback', async () => {
    const action: PendingAction = { type: 'delete' }
    const ev = { id: 'ev1', event_id: 'series1', start_ts: '2020-01-01T00:00:00Z' }
    await applyScopeAction('this', action, { calendarId: 'cal1', eventId: 'ev1', loadedEventRaw: ev })
    expect(mockedApi.deleteOccurrence).toHaveBeenCalledWith('cal1', 'series1', ev.start_ts)
  })

  it('series save calls apiFetch PATCH series endpoint with JSON body', async () => {
    const action: PendingAction = { type: 'save', payload: { title: 'Hello', foo: 123 } }
    await applyScopeAction('series', action, {
      calendarId: 'cal1',
      eventId: 'ev1',
      loadedEventRaw: { id: 'ev1' },
    })

    expect(mockedApi.apiFetch).toHaveBeenCalledWith('/calendars/cal1/events/ev1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Hello', foo: 123 }),
    })
  })
})
