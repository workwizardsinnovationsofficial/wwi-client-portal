import React from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '../../lib/utils'

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are currently no records to display here.',
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'w-full p-8 sm:p-12 border border-dashed border-wwi-border rounded-lg bg-white flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-wwi-surface flex items-center justify-center text-wwi-muted mb-3 border border-wwi-border">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-wwi-text mb-1">{title}</h4>
      <p className="text-xs text-wwi-muted max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
