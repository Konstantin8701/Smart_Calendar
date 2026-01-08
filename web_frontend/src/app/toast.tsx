import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type ToastLevel = 'success' | 'error' | 'info'
type ToastItem = { id: string, level: ToastLevel, message: string }

type ToastApi = {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((level: ToastLevel, message: string) => {
    const g: any = globalThis || {}
    const id = (g.crypto && typeof g.crypto.randomUUID === 'function') ? g.crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2))
    setToasts(s => [...s, { id, level, message }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(s => s.filter(t => t.id !== id))
  }, [])

  const api = useMemo(() => ({
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <Toast key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ item, onClose }: { item: ToastItem, onClose: () => void }) {
  useEffect(() => {
    const ms = 3000 + Math.min(1500, item.message.length * 20)
    const id = setTimeout(onClose, ms)
    return () => clearTimeout(id)
  }, [item, onClose])

  return (
    <div className={`toast toast-${item.level}`} role="status">
      <div className="toast-message">{item.message}</div>
      <button className="toast-close" onClick={onClose} aria-label="Close">×</button>
    </div>
  )
}

export default ToastProvider
