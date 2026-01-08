import { b64urlDecode, getCurrentUserId } from '../auth'
import { it, expect, vi } from 'vitest'

it('b64urlDecode handles no padding', () => {
  
  const b64url = 'eyJzdWIiOiJ1c2VyMTIzIn0'
  const decoded = b64urlDecode(b64url)
  expect(decoded).toContain('user123')
})

it('getCurrentUserId extracts sub from token without padding', () => {
  
  const header = 'eyJhbGciOiJIUzI1NiJ9' 
  const payload = 'eyJzdWIiOiJ1c2VyMTIzIn0' 
  const fake = `${header}.${payload}.sig`
  
  if (!globalThis.localStorage) {
    const store: Record<string,string> = {}
    vi.stubGlobal('localStorage', {
      setItem(k: string, v: string) { store[k] = v },
      getItem(k: string) { return store[k] ?? null },
      removeItem(k: string) { delete store[k] }
    } as Storage)
  }
  localStorage.setItem('calendar_token', fake)
  const id = getCurrentUserId()
  expect(id).toBe('user123')
  localStorage.removeItem('calendar_token')
})
