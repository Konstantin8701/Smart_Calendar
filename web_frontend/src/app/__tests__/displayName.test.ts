import { getCurrentUserDisplayName } from '../auth'
import { it, expect, vi } from 'vitest'

it('returns nickname when present in token', () => {
  const header = 'eyJhbGciOiJIUzI1NiJ9'
  const payload = 'eyJuaWNrbmFtZSI6IlNhdmVsaXkifQ' 
  const fake = `${header}.${payload}.sig`
  const store: Record<string,string> = {}
  vi.stubGlobal('localStorage', {
    setItem(k: string, v: string) { store[k] = v },
    getItem(k: string) { return store[k] ?? null },
    removeItem(k: string) { delete store[k] }
  } as Storage)
  localStorage.setItem('calendar_token', fake)
  const name = getCurrentUserDisplayName()
  expect(name).toBe('Saveliy')
})

it('falls back to email when nickname missing', () => {
  const header = 'eyJhbGciOiJIUzI1NiJ9'
  const payload = 'eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ' 
  const fake = `${header}.${payload}.sig`
  const store: Record<string,string> = {}
  vi.stubGlobal('localStorage', {
    setItem(k: string, v: string) { store[k] = v },
    getItem(k: string) { return store[k] ?? null },
    removeItem(k: string) { delete store[k] }
  } as Storage)
  localStorage.setItem('calendar_token', fake)
  const name = getCurrentUserDisplayName()
  expect(name).toBe('test@example.com')
})

it('returns null when no token', () => {
  const store: Record<string,string> = {}
  vi.stubGlobal('localStorage', {
    setItem(k: string, v: string) { store[k] = v },
    getItem(k: string) { return store[k] ?? null },
    removeItem(k: string) { delete store[k] }
  } as Storage)
  localStorage.removeItem('calendar_token')
  const name = getCurrentUserDisplayName()
  expect(name).toBeNull()
})
