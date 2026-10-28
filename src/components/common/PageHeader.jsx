import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  badge,
  className,
}) {
  return (
    <div className={cn('mb-6 pb-4 border-b border-wwi-border', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-wwi-muted mb-2">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={crumb.label || idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                {crumb.to && !isLast ? (
                  <Link to={crumb.to} className="hover:text-wwi-text transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn(isLast ? 'text-wwi-text font-medium' : '')}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-wwi-text">{title}</h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && <p className="text-xs text-wwi-muted mt-1">{description}</p>}
        </div>

        {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      </div>
    </div>
  )
}
