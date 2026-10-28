import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  icon: Icon,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wwi-dark focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded'

  const variants = {
    primary: 'bg-wwi-dark text-white hover:bg-black active:bg-neutral-900 border border-transparent shadow-sm',
    secondary: 'bg-white text-wwi-text border border-wwi-border hover:bg-wwi-surface active:bg-wwi-selected shadow-sm',
    outline: 'bg-transparent border border-wwi-border text-wwi-text hover:bg-wwi-surface',
    ghost: 'bg-transparent text-wwi-text hover:bg-wwi-surface active:bg-wwi-selected',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
    dangerOutline: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  }

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
    md: 'text-xs px-3.5 py-2 h-9 gap-2',
    lg: 'text-sm px-4 py-2.5 h-10 gap-2.5',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5" />
      ) : null}
      {children}
    </button>
  )
}
