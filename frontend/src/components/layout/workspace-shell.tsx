import type { ComponentType, ReactNode } from 'react'
import { Gauge, Home, Languages, Menu, Moon, Sun, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { appStore, canShowAdmin, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { LOCALE_REGISTRY } from '@/i18n/locale-registry'

export type WorkspaceNavItem = { key: string; label: string; icon: ComponentType<{ className?: string }>; hidden?: boolean }

export function WorkspaceShell({ items, active, onSelect, topbar, children }: { items: WorkspaceNavItem[]; active: string; onSelect: (key: string) => void; topbar?: ReactNode; children: ReactNode }) {
  const navigate = useNavigate()
  const { locale, changeLocale } = useI18n()
  const { t } = useScopedI18n('views.Header')
  const state = useAppStore((value) => value)
  const visible = items.filter((item) => !item.hidden)
  const go = (target: 'mail' | 'user' | 'admin') => {
    if (target === 'admin') return navigate(getPathWithLocale('/dashboard', locale))
    appStore.setState({ workspaceSection: target })
    navigate(getPathWithLocale('/', locale))
  }
  const globals: WorkspaceNavItem[] = [
    { key: '$mail', label: t('home'), icon: Home },
    { key: '$user', label: t('user'), icon: UserRound },
    { key: '$admin', label: 'Admin', icon: Gauge, hidden: !canShowAdmin(state) },
    { key: '$theme', label: state.isDark ? t('light') : t('dark'), icon: state.isDark ? Sun : Moon },
  ].filter((item) => !item.hidden)
  const handleGlobal = (key: string) => {
    if (key === '$mail') go('mail')
    if (key === '$user') go('user')
    if (key === '$admin') go('admin')
    if (key === '$theme') appStore.setState({ isDark: !state.isDark })
  }

  return <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background">
    {topbar && <header className="flex min-h-[52px] shrink-0 items-center border-b border-border bg-background px-3">{topbar}</header>}
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <nav className="grid gap-1 p-2" aria-label="Workspace">{visible.map((item) => <button type="button" key={item.key} aria-current={active === item.key ? 'page' : undefined} onClick={() => onSelect(item.key)} className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm font-medium text-sidebar-foreground hover:bg-accent hover:text-foreground', active === item.key && 'bg-accent text-primary')}><item.icon className="size-4" /><span className="truncate">{item.label}</span></button>)}</nav>
        <div className="mt-auto border-t border-border p-2"><DropdownMenu><DropdownMenuTrigger asChild><Button className="w-full justify-start" variant="ghost"><Menu />{t('menu')}</Button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="w-[204px]"><DropdownMenuItem onSelect={() => go('mail')}><Home />{t('home')}</DropdownMenuItem><DropdownMenuItem onSelect={() => go('user')}><UserRound />{t('user')}</DropdownMenuItem>{canShowAdmin(state) && <DropdownMenuItem onSelect={() => go('admin')}><Gauge />Admin</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onSelect={() => appStore.setState({ isDark: !state.isDark })}>{state.isDark ? <Sun /> : <Moon />}{state.isDark ? t('light') : t('dark')}</DropdownMenuItem><DropdownMenuSub><DropdownMenuSubTrigger><Languages />{LOCALE_REGISTRY.find((item) => item.locale === locale)?.label}</DropdownMenuSubTrigger><DropdownMenuSubContent>{LOCALE_REGISTRY.map((item) => <DropdownMenuItem key={item.locale} onSelect={() => changeLocale(item.locale)}>{item.label}</DropdownMenuItem>)}</DropdownMenuSubContent></DropdownMenuSub>{state.openSettings.statusUrl && <><DropdownMenuSeparator /><DropdownMenuItem asChild><a href={state.openSettings.statusUrl} target="_blank" rel="noreferrer">{t('status')}</a></DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div>
      </aside>
      <main className={cn('min-w-0 flex-1 overflow-hidden pb-[calc(58px+env(safe-area-inset-bottom))] md:pb-0', state.useSideMargin && 'md:py-2 md:pr-2')}>{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(58px+env(safe-area-inset-bottom))] items-start overflow-x-auto border-t border-border bg-background px-1 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Workspace">
      {[...visible, ...globals].map((item) => <Tooltip key={item.key}><TooltipTrigger asChild><button type="button" aria-current={active === item.key ? 'page' : undefined} onClick={() => item.key.startsWith('$') ? handleGlobal(item.key) : onSelect(item.key)} className="flex h-[57px] min-w-[74px] flex-1 flex-col items-center justify-center gap-1 px-2 text-[11px] font-medium text-muted-foreground"><item.icon className="size-[18px]" /><span className="max-w-[72px] truncate">{item.label}</span></button></TooltipTrigger><TooltipContent side="top">{item.label}</TooltipContent></Tooltip>)}
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="flex h-[57px] min-w-[74px] flex-1 flex-col items-center justify-center gap-1 px-2 text-[11px] font-medium text-muted-foreground"><Languages className="size-[18px]" /><span>{LOCALE_REGISTRY.find((item) => item.locale === locale)?.label}</span></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="end">{LOCALE_REGISTRY.map((item) => <DropdownMenuItem key={item.locale} onSelect={() => changeLocale(item.locale)}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
    </nav>
  </div>
}
