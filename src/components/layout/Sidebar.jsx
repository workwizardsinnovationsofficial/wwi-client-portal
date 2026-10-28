import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  FileText,
  CreditCard,
  CalendarDays,
  FileBox,
  MessageSquare,
  LifeBuoy,
  Send,
  Users,
  Activity,
  Settings,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

export function Sidebar({ mobile = false, onCloseMobile }) {
  const { isStaff, role, organization } = useAuth()

  const adminNav = [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
        { label: 'Client Organizations', to: '/admin/clients', icon: Building2 },
      ],
    },
    {
      group: 'Execution & Billing',
      items: [
        { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
        { label: 'Contracts', to: '/admin/contracts', icon: FileText },
        { label: 'Invoices & Billing', to: '/admin/invoices', icon: CreditCard },
        { label: 'Deliverables (R2)', to: '/admin/deliverables', icon: FileBox },
      ],
    },
    {
      group: 'Communication',
      items: [
        { label: 'Meetings & Calls', to: '/admin/meetings', icon: CalendarDays },
        { label: 'Project Messages', to: '/admin/messages', icon: MessageSquare },
        { label: 'Support Tickets', to: '/admin/support', icon: LifeBuoy },
      ],
    },
    {
      group: 'Administration',
      items: [
        { label: 'Team Members', to: '/admin/team', icon: Users },
        { label: 'Audit & Activity', to: '/admin/activity', icon: Activity },
        { label: 'System Settings', to: '/admin/settings', icon: Settings },
      ],
    },
  ]

  const clientNav = [
    {
      group: 'Workspace',
      items: [
        { label: 'Overview', to: '/portal', icon: LayoutDashboard },
        { label: 'My Projects', to: '/portal/projects', icon: FolderKanban },
        { label: 'Contracts', to: '/portal/contracts', icon: FileText },
      ],
    },
    {
      group: 'Financials & Files',
      items: [
        { label: 'Invoices', to: '/portal/invoices', icon: CreditCard },
        { label: 'Deliverables & Docs', to: '/portal/deliverables', icon: FileBox },
      ],
    },
    {
      group: 'Interactions',
      items: [
        { label: 'Meeting Requests', to: '/portal/meetings', icon: CalendarDays },
        { label: 'Project Chat', to: '/portal/messages', icon: MessageSquare },
        { label: 'Support & Calls', to: '/portal/support', icon: LifeBuoy },
      ],
    },
  ]

  const navGroups = isStaff ? adminNav : clientNav

  return (
    <aside
      className={cn(
        'w-64 bg-white border-r border-wwi-border flex flex-col h-full select-none',
        mobile ? 'w-full max-w-xs' : 'hidden lg:flex shrink-0'
      )}
    >
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-wwi-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-wwi-dark flex items-center justify-center text-white text-xs font-bold tracking-wider">
            W
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight text-wwi-text uppercase">
              WWI Clienter
            </div>
            <div className="text-[10px] text-wwi-muted leading-tight">
              Work Wizards Innovations
            </div>
          </div>
        </div>
        {mobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded text-wwi-muted hover:text-wwi-text"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {group.group}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin' || item.to === '/portal'}
                    onClick={mobile ? onCloseMobile : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors',
                        isActive
                          ? 'bg-wwi-selected text-wwi-text font-semibold'
                          : 'text-neutral-600 hover:bg-wwi-surface hover:text-wwi-text'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-neutral-500" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-wwi-border bg-wwi-surface/50 text-[11px] text-wwi-muted flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="truncate">
            {isStaff ? 'Enterprise Admin' : organization?.name || 'Client Portal'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-neutral-400">v1.0</span>
      </div>
    </aside>
  )
}
