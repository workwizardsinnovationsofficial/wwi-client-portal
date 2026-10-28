import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  footer,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        className={cn(
          'relative w-full bg-white rounded-lg border border-wwi-border shadow-xl overflow-hidden z-10 transition-all flex flex-col max-h-[90vh]',
          maxWidth
        )}
      >
        <div className="px-5 py-4 border-b border-wwi-border flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-wwi-text">{title}</h3>}
            {description && <p className="text-xs text-wwi-muted mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-wwi-muted hover:text-wwi-text p-1 rounded hover:bg-wwi-surface transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 text-xs text-wwi-text">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 bg-wwi-surface border-t border-wwi-border flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
