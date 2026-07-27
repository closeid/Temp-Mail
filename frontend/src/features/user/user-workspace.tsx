import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AtSign, Link2, Mail, Settings, UserRound } from 'lucide-react'
import { AddressLogin } from '@/features/auth/address-login'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/layout/workspace-shell'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mailbox } from '@/features/mail/mailbox'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { useScopedI18n } from '@/i18n/react'
import { UserAddressManagement } from './address-management'
import { UserSettingsPage } from './user-settings'

export function UserWorkspace() {
  const { t } = useScopedI18n('views.User')
  const userMailT = useScopedI18n('views.user.UserMailBox').t
  const { tab, user, canDelete } = useAppStore((state) => ({ tab: state.userTab, user: state.userSettings, canDelete: state.openSettings.enableUserDeleteEmail }))
  const [filter, setFilter] = useState('')
  const addressesQuery = useQuery({
    queryKey: ['user-bound-addresses'],
    queryFn: () => api.fetch<{ results?: Array<{ name?: string; address?: string }> } | Array<{ name?: string; address?: string }>>('/user_api/bind_address'),
  })
  const addressRows = Array.isArray(addressesQuery.data) ? addressesQuery.data : addressesQuery.data?.results || []
  const addresses = addressRows.map((row) => row.address || row.name || '').filter(Boolean)
  const items: WorkspaceNavItem[] = [
    { key: 'address_management', label: t('address_management'), icon: AtSign },
    { key: 'user_mail_box_tab', label: t('user_mail_box_tab'), icon: Mail },
    { key: 'user_settings', label: t('user_settings'), icon: Settings },
    { key: 'bind_address', label: t('bind_address'), icon: Link2 },
  ]
  const topbar = <div className="flex h-full min-w-0 items-center gap-2 text-sm"><UserRound className="size-4 text-primary" /><strong>{useScopedI18n('views.user.UserBar').t('currentUser')}</strong><span className="truncate text-muted-foreground">{user.user_email}</span></div>
  let content: ReactNode = null
  if (tab === 'address_management') content = <UserAddressManagement />
  if (tab === 'user_settings') content = <UserSettingsPage />
  if (tab === 'bind_address') content = <div className="h-full overflow-auto"><div className="mx-auto max-w-xl p-5"><AddressLogin /></div></div>
  if (tab === 'user_mail_box_tab') content = <div className="flex h-full min-h-0 flex-col"><div className="flex min-h-12 items-center border-b border-border px-3"><Select value={filter || '__all'} onValueChange={(value) => setFilter(value === '__all' ? '' : value)}><SelectTrigger className="w-full max-w-md"><SelectValue placeholder={userMailT('addressQueryTip')} /></SelectTrigger><SelectContent><SelectItem value="__all">All addresses</SelectItem>{addresses.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="min-h-0 flex-1"><Mailbox queryKey={['user-mails', filter]} fetchMailData={(limit, offset) => api.fetch(`/user_api/mails?limit=${limit}&offset=${offset}${filter ? `&address=${encodeURIComponent(filter)}` : ''}`)} deleteMail={(id) => api.fetch(`/user_api/mails/${id}`, { method: 'DELETE' })} canDelete={canDelete} showFilter /></div></div>
  return <WorkspaceShell items={items} active={tab} onSelect={(value) => appStore.setState({ userTab: value })} topbar={topbar}>{content}</WorkspaceShell>
}
