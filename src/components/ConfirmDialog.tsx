import React, { useEffect } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isConfirming?: boolean
}

export function ConfirmDialog({
  open,
  title = 'Megerősítés szükséges',
  description,
  confirmLabel = 'Megerősítés',
  cancelLabel = 'Mégse',
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isConfirming) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isConfirming, onCancel])

  if (!open) {
    return null
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !isConfirming) {
      onCancel()
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <header className="modal-dialog__header">
          <h3 id="confirm-dialog-title">{title}</h3>
        </header>
        <div className="modal-dialog__body" id="confirm-dialog-description">
          <p>{description}</p>
        </div>
        <footer className="modal-dialog__actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? 'Folyamatban...' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}

