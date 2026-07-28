import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SecondaryWorkspaceItem = { key: string; label: string; content: ReactNode }

export function SecondaryWorkspace({ items, value, onChange, ariaLabel }: {
  items: SecondaryWorkspaceItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}) {
  const active = items.find((item) => item.key === value) || items[0]
  if (!active) return null
  return <div className="flex h-full min-h-0 flex-col md:flex-row">
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-sidebar p-2 md:w-[210px] md:flex-col md:border-b-0 md:border-r" aria-label={ariaLabel}>
      {items.map((item) => <button type="button" key={item.key} onClick={() => onChange(item.key)} className={cn('h-9 shrink-0 rounded-md px-3 text-left text-sm font-medium text-sidebar-foreground hover:bg-accent', item.key === active.key && 'bg-accent text-primary')}>{item.label}</button>)}
    </nav>
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{active.content}</div>
  </div>
}
