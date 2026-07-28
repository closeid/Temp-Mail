import type { ComponentType, ReactNode } from 'react'
import { Gauge, Home, Languages, Menu, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { appStore, canShowAdmin, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { LOCALE_REGISTRY } from '@/i18n/locale-registry'

export type WorkspaceNavItem = { key: string; label: string; icon: ComponentType<{ className?: string }>; hidden?: boolean }

export function WorkspaceShell({ items, mobileItems, active, onSelect, topbar, scope = 'mail', children }: {
  items: WorkspaceNavItem[]
  mobileItems?: WorkspaceNavItem[]
  active: string
  onSelect: (key: string) => void
  topbar?: ReactNode
  scope?: 'mail' | 'admin'
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { locale, changeLocale } = useI18n()
  const { t } = useScopedI18n('views.Header')
  const adminT = useScopedI18n('ui.admin').t
  const state = useAppStore((value) => value)
  const visible = items.filter((item) => !item.hidden)
  const mobileVisible = (mobileItems || visible).filter((item) => !item.hidden)
  const go = (target: 'mail' | 'admin') => {
    if (target === 'admin') return navigate(getPathWithLocale('/dashboard', locale))
    appStore.setState({ workspaceSection: 'mail' })
    navigate(getPathWithLocale('/', locale))
  }

  return <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background">
    {topbar && <header className="flex min-h-[52px] shrink-0 items-center overflow-hidden border-b border-border bg-background px-3">{topbar}</header>}
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <nav className="grid gap-1 p-2" aria-label={t('menu')}>{visible.map((item) => <button type="button" key={item.key} aria-current={active === item.key ? 'page' : undefined} onClick={() => onSelect(item.key)} className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm font-medium text-sidebar-foreground hover:bg-accent hover:text-foreground', active === item.key && 'bg-accent text-primary')}><item.icon className="size-4 shrink-0 stroke-[1.75]" /><span className="truncate">{item.label}</span></button>)}</nav>
        <div className="mt-auto border-t border-border p-2"><DropdownMenu><DropdownMenuTrigger asChild><Button className="w-full justify-start" variant="ghost"><Menu className="size-4 stroke-[1.75]" />{t('menu')}</Button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="w-[204px]">
          {scope === 'admin' && <DropdownMenuItem onSelect={() => go('mail')}><Home className="size-4 stroke-[1.75]" />{t('home')}</DropdownMenuItem>}
          {scope === 'mail' && canShowAdmin(state) && <DropdownMenuItem onSelect={() => go('admin')}><Gauge className="size-4 stroke-[1.75]" />{adminT('administration')}</DropdownMenuItem>}
          {(scope === 'admin' || canShowAdmin(state)) && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => appStore.setState({ isDark: !state.isDark })}>{state.isDark ? <Sun className="size-4 stroke-[1.75]" /> : <Moon className="size-4 stroke-[1.75]" />}{state.isDark ? t('light') : t('dark')}</DropdownMenuItem>
          <DropdownMenuSub><DropdownMenuSubTrigger><Languages className="size-4 stroke-[1.75]" />{LOCALE_REGISTRY.find((item) => item.locale === locale)?.label}</DropdownMenuSubTrigger><DropdownMenuSubContent>{LOCALE_REGISTRY.map((item) => <DropdownMenuItem key={item.locale} onSelect={() => changeLocale(item.locale)}>{item.label}</DropdownMenuItem>)}</DropdownMenuSubContent></DropdownMenuSub>
          {state.openSettings.statusUrl && <><DropdownMenuSeparator /><DropdownMenuItem asChild><a href={state.openSettings.statusUrl} target="_blank" rel="noreferrer">{t('status')}</a></DropdownMenuItem></>}
        </DropdownMenuContent></DropdownMenu></div>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden pb-[calc(58px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(58px+env(safe-area-inset-bottom))] items-start border-t border-border bg-background px-1 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label={t('menu')}>
      {mobileVisible.map((item) => <Tooltip key={item.key}><TooltipTrigger asChild><button type="button" aria-current={active === item.key ? 'page' : undefined} onClick={() => onSelect(item.key)} className="flex h-[57px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground"><item.icon className="size-[18px] shrink-0 stroke-[1.75]" /><span className="max-w-full truncate">{item.label}</span></button></TooltipTrigger><TooltipContent side="top">{item.label}</TooltipContent></Tooltip>)}
    </nav>
  </div>
}
