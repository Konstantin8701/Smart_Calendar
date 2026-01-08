const THEME_KEY = 'calendar_theme'

export type Theme = 'light' | 'dark'

export function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function getInitialTheme(): Theme {
  try {
    
    const g: any = globalThis || {}
    const stored = (g.localStorage && typeof g.localStorage.getItem === 'function') ? g.localStorage.getItem(THEME_KEY) : null
    if (stored === 'light' || stored === 'dark') return stored

    
    const mm = (g.matchMedia && typeof g.matchMedia === 'function') ? g.matchMedia : (typeof window !== 'undefined' && (window as any).matchMedia) ? (window as any).matchMedia : null
    const m = mm ? mm('(prefers-color-scheme: dark)') : null
    return (m && m.matches) ? 'dark' : 'light'
  } catch (e) {
    return 'light'
  }
}

export function applyTheme(theme: Theme) {
  if (!isBrowser()) return
  try {
    document.documentElement.dataset.theme = theme
  } catch (e) {}
}

export function saveTheme(theme: Theme) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme) } catch (e) {}
}

export function toggleTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark'
}

export default { THEME_KEY, getInitialTheme, applyTheme, saveTheme, toggleTheme }
