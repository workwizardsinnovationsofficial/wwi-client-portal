import React from 'react'
import { cn } from '../../lib/utils'

export function Card({ children, className, title, subtitle, action, footer, noPadding = false }) {
  return (
    <div className={cn('bg-white border border-wwi-border rounded-lg overflow-hidden', className)}>
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-wwi-border flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-wwi-text tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-wwi-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(noPadding ? 'p-0' : 'p-5')}>{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-wwi-surface border-t border-wwi-border text-xs text-wwi-muted flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  )
}
