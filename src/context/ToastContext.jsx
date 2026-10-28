import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ title, message, type = 'info', duration = 4500 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7)
    setToasts((prev) => [...prev, { id, title, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showSuccess = useCallback((message, title = 'Success') => {
    addToast({ title, message, type: 'success' })
  }, [addToast])

  const showError = useCallback((message, title = 'Error') => {
    addToast({ title, message, type: 'error' })
  }, [addToast])

  const showWarning = useCallback((message, title = 'Warning') => {
    addToast({ title, message, type: 'warning' })
  }, [addToast])

  const showInfo = useCallback((message, title = 'Notice') => {
    addToast({ title, message, type: 'info' })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Toast container */}
      <div 
        aria-live="polite" 
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          let Icon = Info
          let iconColor = 'text-wwi-text'
          let borderColor = 'border-wwi-border'
          
          if (toast.type === 'success') {
            Icon = CheckCircle2
            iconColor = 'text-green-600'
            borderColor = 'border-green-200'
          } else if (toast.type === 'error') {
            Icon = AlertCircle
            iconColor = 'text-red-600'
            borderColor = 'border-red-200'
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle
            iconColor = 'text-amber-600'
            borderColor = 'border-amber-200'
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-white border ${borderColor} shadow-sm rounded-lg p-3.5 flex items-start gap-3 transition-all transform translate-y-0`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <div className="text-xs font-semibold text-wwi-text">{toast.title}</div>}
                <div className="text-xs text-wwi-muted mt-0.5 break-words">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-wwi-muted hover:text-wwi-text p-0.5 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
