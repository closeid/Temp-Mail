import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function splitSettingLabel(value: ReactNode) {
  if (typeof value !== 'string') return { label: value, description: undefined }
  const match = value.match(/^(.*?)\s*(?:\((.+)\)|\uFF08(.+)\uFF09)\s*$/)
  if (!match?.[1]) return { label: value, description: undefined }
  return { label: match[1].trim(), description: (match[2] || match[3])?.trim() }
}

export function SettingsLayout({ title, description, action, children, className }: { title?: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return <div className="h-full overflow-auto"><div className={cn('mx-auto w-full max-w-[820px] px-4 py-5 sm:px-6', className)}>{(title || action) && <div className="mb-5 flex items-start justify-between gap-4"><div>{title && <h1 className="text-lg font-semibold">{title}</h1>}{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div>}<div className="grid gap-5">{children}</div></div></div>
}
export function SettingRow({ label, description, control, children }: { label: ReactNode; description?: ReactNode; control?: ReactNode; children?: ReactNode }) {
  const content = splitSettingLabel(label)
  return <div className="grid gap-3 border-b border-border pb-5 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)] sm:items-center"><div><h2 className="text-sm font-medium">{content.label}</h2>{(description || content.description) && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description || content.description}</p>}</div><div className="min-w-0 sm:justify-self-stretch">{control || children}</div></div>
}
