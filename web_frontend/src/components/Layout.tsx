import React, { useEffect, useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { clearToken, getCurrentUserDisplayName } from '../app/auth'
import { getInitialTheme, applyTheme, saveTheme, toggleTheme, type Theme } from '../app/theme'

export default function Layout() {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const name = getCurrentUserDisplayName()
    setDisplayName(name)
    const t = getInitialTheme()
    setTheme(t)
    applyTheme(t)
  }, [])

  function logout() {
    
    clearToken()
    setDisplayName(null)
    window.location.href = '/login'
  }

  return (
    <div>
      <header className="topbar">
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div className="app-title">Calendar</div>
          <Link to="/calendars">Calendars</Link>
        </div>
        <span style={{flex:1}} />
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          {displayName ? (
            <div className="header-username" title={displayName} style={{marginRight:4, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:8}}>
              <div className="avatar">{displayName[0] ? displayName[0].toUpperCase() : '?'}</div>
              <div style={{overflow:'hidden', textOverflow:'ellipsis'}}>@{displayName}</div>
            </div>
          ) : null}
          {}
          <button
            className="btn btn-secondary"
            title={theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
            onClick={() => {
              const next = toggleTheme(theme)
              setTheme(next)
              applyTheme(next)
              saveTheme(next)
            }}
            style={{fontSize:16}}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <button className="btn btn-secondary" onClick={logout}>Logout</button>
        </div>
      </header>
      <main style={{padding:16}}>
        <Outlet />
      </main>
    </div>
  )
}
