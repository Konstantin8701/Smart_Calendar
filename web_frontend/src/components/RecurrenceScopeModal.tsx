import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (scope: 'this' | 'series') => void
  title?: string
}

export default function RecurrenceScopeModal({ open, onClose, onSelect, title }: Props) {
  if (!open) return null
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{title || 'Это повторяющееся событие'}</h3>
        <p>Что вы хотите изменить?</p>
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => { onSelect('this'); onClose() }}>Только это событие</button>
          <button onClick={() => { onSelect('series'); onClose() }}>Вся серия</button>
          <button onClick={onClose}>Отмена</button>
        </div>
      </div>
      <style>{`
        .modal-backdrop{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center}
        .modal{background:#fff;padding:16px;border-radius:6px;min-width:320px}
      `}</style>
    </div>
  )
}
