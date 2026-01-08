import { getInitialTheme, toggleTheme, applyTheme, saveTheme } from '../theme'
import { it, expect, vi } from 'vitest'

it('toggleTheme flips theme', () => {
  expect(toggleTheme('light')).toBe('dark')
  expect(toggleTheme('dark')).toBe('light')
})

it('getInitialTheme falls back to matchMedia when no storage', () => {
  const store: Record<string,string> = {}
  vi.stubGlobal('localStorage', {
    getItem(k: string) { return store[k] ?? null },
    setItem(k: string, v: string) { store[k] = v },
    removeItem(k: string) { delete store[k] }
  } as Storage)
  
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: true }))
  const t = getInitialTheme()
  expect(t).toBe('dark')
})

it('saveTheme writes to localStorage', () => {
  const store: Record<string,string> = {}
  vi.stubGlobal('localStorage', {
    getItem(k: string) { return store[k] ?? null },
    setItem(k: string, v: string) { store[k] = v },
    removeItem(k: string) { delete store[k] }
  } as Storage)
  saveTheme('dark')
  expect(localStorage.getItem('calendar_theme')).toBe('dark')
})
