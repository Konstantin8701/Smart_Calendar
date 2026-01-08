import React from 'react'
import RU from '../i18n/ru'

export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export type RecurrenceRule = {
  freq: Freq;
  interval: number;
  count?: number | null;
  until_ts?: string | null;
  byweekday?: number[] | null;
}

type Props = {
  value?: RecurrenceRule | null;
  onChange?: (r: RecurrenceRule | null) => void;
}


const FREQS: Freq[] = ['DAILY','WEEKLY']

function norm(v: any): RecurrenceRule | null {
  if (!v) return null
  const cRaw = (v.count == null || v.count === '') ? null : Number(v.count)
  const c = (cRaw == null || Number.isNaN(cRaw)) ? null : Math.max(1, cRaw)
  return {
    freq: (v.freq || 'DAILY') as Freq,
    interval: typeof v.interval === 'number' ? v.interval : Number(v.interval) || 1,
    count: c,
    until_ts: v.until_ts || null,
    byweekday: Array.isArray(v.byweekday) ? v.byweekday.map(Number) : null,
  }
}

function isoZToLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n:number)=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIsoZ(local: string) {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function RecurrenceEditor({ value, onChange }: Props) {
  const v = norm(value)

  
  const selectedFreq = v ? v.freq : 'NONE'

  const setNone = () => onChange?.(null)

  const update = (patch: Partial<RecurrenceRule>) => {
    
    let base: RecurrenceRule = v || { freq: 'DAILY', interval: 1 }
    const next = Object.assign({}, base, patch) as RecurrenceRule

    
    next.freq = next.freq as Freq
    next.interval = Math.max(1, Number(next.interval) || 1)

    
    
    const rawCount: any = (next as any).count
    if (rawCount == null || rawCount === '') {
      next.count = null
    } else {
      const cnt = Number(rawCount)
      if (Number.isNaN(cnt)) next.count = null
      else next.count = Math.max(1, cnt)
    }
    if (next.count != null) next.until_ts = null
    if (next.until_ts) next.count = null

    
    if (next.freq !== 'WEEKLY') next.byweekday = null

    onChange?.(next)
  }

  const onFreqChange = (val: string) => {
    if (val === 'NONE') { setNone(); return }
    const freq = val as Freq
    if (!v) {
      
      onChange?.({ freq, interval: 1 })
      return
    }
    
    const patch: Partial<RecurrenceRule> = { freq }
    if (v.byweekday && v.freq === 'WEEKLY' && freq !== 'WEEKLY') {
      patch.byweekday = null
    }
    update(patch)
  }

  const toggleWeekday = (d: number) => {
    const current = v?.byweekday || []
    const set = new Set(current)
    if (set.has(d)) set.delete(d); else set.add(d)
    update({ byweekday: Array.from(set).sort((a,b)=>a-b) })
  }

  return (
    <div className="recurrence-editor">
      <label>
        {RU.frequency}:
        <select value={selectedFreq} onChange={e => onFreqChange(e.target.value)}>
          <option value="NONE">None</option>
          {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>

      {}
      {v && (
        <>
          <label>
            {RU.interval}:
            <input type="number" min={1} value={v?.interval ?? 1} onChange={e => update({ interval: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <label>
            {RU.countOptional}:
            <input type="number" min={1} value={v?.count ?? ''} onChange={e => update({ count: e.target.value ? Math.max(1, Number(e.target.value)) : null, until_ts: null })} />
          </label>
          <label>
            {RU.untilOptional}:
            <input type="datetime-local" value={isoZToLocalInput(v?.until_ts)} onChange={e => update({ until_ts: e.target.value ? localInputToIsoZ(e.target.value) : null, count: null })} />
          </label>

          {}
          {v.freq === 'WEEKLY' && (
            <div>
              <div>{RU.byWeekday}:</div>
              <div style={{display:'flex',gap:8}}>
                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((lab,i)=> (
                  <button key={lab} type="button" onClick={() => toggleWeekday(i)} style={{padding:'4px 8px', background: (v?.byweekday||[]).includes(i) ? '#2b7' : '#eee'}}>{lab}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{marginTop:8}}>
            <button type="button" onClick={() => onChange?.(null)}>{RU.removeRecurrence}</button>
          </div>
        </>
      )}
    </div>
  )
}
