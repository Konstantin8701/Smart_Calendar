import React, { createContext, useCallback, useContext, useState, useEffect } from 'react'

type ConfirmOptions = { title?: string, body?: string, confirmText?: string, cancelText?: string }

type ConfirmApi = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmApi | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<null | { opts: ConfirmOptions, resolve: (v: boolean) => void }>(null)

  const confirm: ConfirmApi = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setState({ opts, resolve })
    })
  }, [])

  const onClose = (val: boolean) => {
    if (state) state.resolve(val)
    setState(null)
  }

  
  useEffect(() => {
    if (!state) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        
        if (state) state.resolve(false)
        setState(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state ? (
        <div className="modal-backdrop" onClick={() => onClose(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            {state.opts.title ? <div className="modal-title">{state.opts.title}</div> : null}
            <div className="modal-body">{state.opts.body}</div>
            <div className="modal-actions">
              <button className="btn" onClick={() => onClose(false)} autoFocus>{state.opts.cancelText || 'Cancel'}</button>
              <button className="btn btn-primary" onClick={() => onClose(true)}>{state.opts.confirmText || 'OK'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export default ConfirmProvider
