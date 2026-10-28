import React from 'react'
import { cn } from '../../lib/utils'

export function Badge({ children, variant = 'neutral', size = 'sm', className }) {
  const variants = {
    neutral: 'bg-wwi-surface text-wwi-text border-wwi-border',
    dark: 'bg-wwi-dark text-white border-transparent',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 leading-tight',
    sm: 'text-xs px-2 py-0.5 leading-normal',
    md: 'text-xs px-2.5 py-1 font-medium',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded select-none',
        variants[variant] || variants.neutral,
        sizes[size] || sizes.sm,
        className
      )}
    >
      {children}
    </span>
  )
}
