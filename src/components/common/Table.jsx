import React from 'react'
import { cn } from '../../lib/utils'

export function Table({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No records found',
  className,
}) {
  return (
    <div className={cn('w-full overflow-x-auto border border-wwi-border rounded-lg bg-white', className)}>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-wwi-border bg-wwi-surface text-wwi-muted font-medium">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={cn('px-4 py-3 font-semibold uppercase tracking-wider text-[11px]', col.className)}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-wwi-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-wwi-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const isClickable = typeof onRowClick === 'function'
              return (
                <tr
                  key={row[keyField] || rowIdx}
                  onClick={() => isClickable && onRowClick(row)}
                  className={cn(
                    'transition-colors hover:bg-neutral-50',
                    isClickable && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td key={col.key || colIdx} className={cn('px-4 py-3 text-wwi-text', col.cellClassName)}>
                      {typeof col.render === 'function' ? col.render(row) : row[col.accessor || col.key]}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
