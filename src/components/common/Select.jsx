import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    className,
    id,
    options = [],
    placeholder = 'Select option...',
    required = false,
    children,
    ...props
  },
  ref
) {
  const selectId = id || props.name || Math.random().toString(36).substring(2, 8)

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-wwi-text flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        required={required}
        className={cn(
          'w-full bg-white border border-wwi-border rounded px-3 py-2 text-xs text-wwi-text transition-colors',
          'focus:outline-none focus:border-wwi-dark focus:ring-1 focus:ring-wwi-dark',
          'disabled:bg-wwi-surface disabled:text-neutral-400 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>
      {error && <span className="text-[11px] text-red-600 font-medium">{error}</span>}
      {!error && helperText && <span className="text-[11px] text-wwi-muted">{helperText}</span>}
    </div>
  )
})
