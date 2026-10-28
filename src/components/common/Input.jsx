import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    className,
    id,
    type = 'text',
    required = false,
    ...props
  },
  ref
) {
  const inputId = id || props.name || Math.random().toString(36).substring(2, 8)

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-wwi-text flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        className={cn(
          'w-full bg-white border border-wwi-border rounded px-3 py-2 text-xs text-wwi-text placeholder:text-neutral-400 transition-colors',
          'focus:outline-none focus:border-wwi-dark focus:ring-1 focus:ring-wwi-dark',
          'disabled:bg-wwi-surface disabled:text-neutral-400 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-[11px] text-red-600 font-medium">{error}</span>}
      {!error && helperText && <span className="text-[11px] text-wwi-muted">{helperText}</span>}
    </div>
  )
})
