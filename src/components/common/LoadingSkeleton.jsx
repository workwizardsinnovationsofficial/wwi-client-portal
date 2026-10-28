import React from 'react'
import { cn } from '../../lib/utils'

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-neutral-200 rounded', className)} />
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-wwi-border rounded-lg p-5 flex flex-col gap-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-3/4 mt-2" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full border border-wwi-border rounded-lg bg-white overflow-hidden p-4 space-y-3">
      <div className="flex gap-4 border-b border-wwi-border pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-neutral-100 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
