import { useRef, useState, type ReactNode } from 'react'
import { Bot, Database, Gauge, KeyRound, LogOut, Mail, Palette, Send, Settings, ShieldCheck, Users, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Turnstile, type TurnstileHandle } from '@/components/turnstile'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/layout/workspace-shell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AppearanceSettings } from '@/features/settings/appearance'
import { api } from '@/lib/api'
import { appStore, canShowAdmin, useAppStore } from '@/lib/store'
import { cn, hashPassword, stringifyError } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import {
  AccountTable, AdminInbox, AdminMailWebhook, AdminSendMail, AdminSentBox, CreateAddressPage,
  DatabasePage, MaintenancePage, RoleAddressConfigPage, SenderAccessPage, StatisticsPage,
  TelegramAdminPage, UserTable, WorkerConfigPage,
} from './admin-pages'
import { ObjectSettings } from './object-settings'

type Secondary = { key: string; label: string; content: ReactNode }

const loadAccountSettings = (value: any) => ({
  blockList: value.blockList || [],
  sendBlockList: value.sendBlockList || [],
  verifiedAddressList: value.verifiedAddressList || [],
  fromBlockList: value.fromBlockList || [],
  noLimitSendAddressList: value.noLimitSendAddressList || [],
  emailRuleSettings: {
    blockReceiveUnknowAddressEmail: Boolean(value.emailRuleSettings?.blockReceiveUnknowAddressEmail),
    emailForwardingList: value.emailRuleSettings?.emailForwardingList || [],
  },
  subdomainMatchMode: typeof value.addressCreationSubdomainMatchStatus?.storedEnabled === 'boolean'
    ? (value.addressCreationSubdomainMatchStatus.storedEnabled ? 'enabled' : 'disabled')
    : 'inherit',
  sendMailLimitConfig: value.sendMailLimitConfig || {
    dailyEnabled: false, dailyLimit: 100, monthlyEnabled: false, monthlyLimit: 1000,
  },
})

const saveAccountSettings = (value: any) => ({
  blockList: value.blockList || [],
  sendBlockList: value.sendBlockList || [],
  verifiedAddressList: value.verifiedAddressList || [],
  fromBlockList: value.fromBlockList || [],
  noLimitSendAddressList: value.noLimitSendAddressList || [],
  emailRuleSettings: value.emailRuleSettings || {},
  addressCreationSettings: {
    enableSubdomainMatch: value.subdomainMatchMode === 'inherit' ? null : value.subdomainMatchMode === 'enabled',
  },
  sendMailLimitConfig: value.sendMailLimitConfig || {},
})

function AdminAuthDialog() {
  const state = useAppStore((value) => value)
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const turnstile = useRef<TurnstileHandle>(null)
  const authenticate = async () => {
    try {
      await api.fetch('/api/open/admin_login', { method: 'POST', body: { password: await hashPassword(password), cf_token: token } })
      appStore.setState({ adminAuth: password, showAdminAuth: false })
      toast.success('Signed in')
    } catch (error) { toast.error(stringifyError(error)); turnstile.current?.refresh() }
  }
  const open = state.userSettings.fetched && (!canShowAdmin(state) || state.showAdminAuth)
  return <Dialog open={open}><DialogContent showClose={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}><DialogHeader><DialogTitle>Administrator access</DialogTitle><DialogDescription>Enter the administrator password to continue.</DialogDescription></DialogHeader><Input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && authenticate()} />{state.openSettings.enableGlobalTurnstileCheck && <Turnstile ref={turnstile} value={token} onChange={setToken} />}<DialogFooter><Button onClick={authenticate}><KeyRound />Continue</Button></DialogFooter></DialogContent></Dialog>
}

function SecondaryWorkspace({ items, value, onChange }: { items: Secondary[]; value: string; onChange: (value: string) => void }) {
  const active = items.find((item) => item.key === value) || items[0]
  return <div className="flex h-full min-h-0 flex-col md:flex-row">
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-sidebar p-2 md:w-[210px] md:flex-col md:border-b-0 md:border-r" aria-label="Section navigation">{items.map((item) => <button type="button" key={item.key} onClick={() => onChange(item.key)} className={cn('h-9 shrink-0 rounded-md px-3 text-left text-sm font-medium text-sidebar-foreground hover:bg-accent', item.key === active.key && 'bg-accent text-primary')}>{item.label}</button>)}</nav>
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{active.content}</div>
  </div>
}

function AdminAccountPage() {
  const navigate = useNavigate()
  const { locale } = useI18n()
  const state = useAppStore((value) => value)
  const method = state.adminAuth ? 'Administrator password' : state.userSettings.is_admin ? 'User administrator role' : 'Password check disabled'
  const logout = () => { appStore.setState({ adminAuth: '', showAdminAuth: false, adminTab: 'account' }); navigate(getPathWithLocale('/', locale)) }
  return <div className="h-full overflow-auto"><div className="mx-auto max-w-2xl p-5"><div className="flex items-center justify-between border-b border-border py-4"><div><p className="font-medium">Login method</p><p className="mt-1 text-sm text-muted-foreground">{method}</p></div><ShieldCheck className="size-5 text-primary" /></div>{state.adminAuth && <div className="flex items-center justify-between py-4"><div><p className="font-medium">Administrator session</p><p className="mt-1 text-sm text-muted-foreground">Only the administrator credential will be cleared.</p></div><Button variant="secondary" onClick={logout}><LogOut />Sign out</Button></div>}</div></div>
}

export function AdminWorkspace() {
  const { t } = useScopedI18n('views.Admin')
  const state = useAppStore((value) => value)
  const primary = ['qucickSetup', 'account', 'user', 'mails', 'telegram', 'statistics', 'maintenance', 'appearance', 'adminAccount'].includes(state.adminTab) ? state.adminTab : 'account'
  const [secondary, setSecondary] = useState<Record<string, string>>({ qucickSetup: 'database', account: 'account', user: 'user_management', mails: 'mails', maintenance: 'database' })
  const nav: WorkspaceNavItem[] = [
    { key: 'qucickSetup', label: t('qucickSetup'), icon: Gauge },
    { key: 'account', label: t('account'), icon: Mail },
    { key: 'user', label: t('user'), icon: Users },
    { key: 'mails', label: t('mails'), icon: Send },
    { key: 'telegram', label: t('telegram'), icon: Bot },
    { key: 'statistics', label: t('statistics'), icon: Gauge },
    { key: 'maintenance', label: t('maintenance'), icon: Wrench },
    { key: 'appearance', label: t('appearance'), icon: Palette },
    { key: 'adminAccount', label: t('adminAccount'), icon: ShieldCheck },
  ]
  const groups: Record<string, Secondary[]> = {
    qucickSetup: [
      { key: 'database', label: t('database'), content: <DatabasePage /> },
      { key: 'account_settings', label: t('account_settings'), content: <ObjectSettings endpoint="/api/admin/account_settings" title={t('account_settings')} transformLoad={loadAccountSettings} transformSave={saveAccountSettings} /> },
      { key: 'user_settings', label: t('user_settings'), content: <ObjectSettings endpoint="/api/admin/user_settings" title={t('user_settings')} /> },
      { key: 'workerconfig', label: t('workerconfig'), content: <WorkerConfigPage /> },
    ],
    account: [
      { key: 'account', label: t('account'), content: <AccountTable /> },
      { key: 'account_create', label: t('account_create'), content: <CreateAddressPage /> },
      { key: 'account_settings', label: t('account_settings'), content: <ObjectSettings endpoint="/api/admin/account_settings" title={t('account_settings')} transformLoad={loadAccountSettings} transformSave={saveAccountSettings} /> },
      { key: 'senderAccess', label: t('senderAccess'), content: <SenderAccessPage /> },
      { key: 'ipBlacklistSettings', label: t('ipBlacklistSettings'), content: <ObjectSettings endpoint="/api/admin/ip_blacklist/settings" title={t('ipBlacklistSettings')} /> },
      { key: 'aiExtractSettings', label: t('aiExtractSettings'), content: <ObjectSettings endpoint="/api/admin/ai_extract/settings" title={t('aiExtractSettings')} /> },
      { key: 'webhook', label: t('webhookSettings'), content: <ObjectSettings endpoint="/api/admin/webhook/settings" title={t('webhookSettings')} /> },
    ],
    user: [
      { key: 'user_management', label: t('user_management'), content: <UserTable /> },
      { key: 'user_settings', label: t('user_settings'), content: <ObjectSettings endpoint="/api/admin/user_settings" title={t('user_settings')} /> },
      { key: 'userOauth2Settings', label: t('userOauth2Settings'), content: <ObjectSettings endpoint="/api/admin/user_oauth2_settings" title={t('userOauth2Settings')} /> },
      { key: 'roleAddressConfig', label: t('roleAddressConfig'), content: <RoleAddressConfigPage /> },
    ],
    mails: [
      { key: 'mails', label: t('mails'), content: <AdminInbox /> },
      { key: 'unknow', label: t('unknow'), content: <AdminInbox unknown /> },
      { key: 'sendBox', label: t('sendBox'), content: <AdminSentBox /> },
      { key: 'sendMail', label: t('sendMail'), content: <AdminSendMail /> },
      { key: 'mailWebhook', label: t('mailWebhook'), content: <AdminMailWebhook /> },
    ],
    maintenance: [
      { key: 'database', label: t('database'), content: <DatabasePage /> },
      { key: 'workerconfig', label: t('workerconfig'), content: <WorkerConfigPage /> },
      { key: 'maintenance', label: t('maintenance'), content: <MaintenancePage /> },
    ],
  }
  let content: ReactNode = null
  if (groups[primary]) content = <SecondaryWorkspace items={groups[primary]} value={secondary[primary] || groups[primary][0].key} onChange={(value) => setSecondary((current) => ({ ...current, [primary]: value }))} />
  if (primary === 'telegram') content = <TelegramAdminPage />
  if (primary === 'statistics') content = <StatisticsPage />
  if (primary === 'appearance') content = <AppearanceSettings />
  if (primary === 'adminAccount') content = <AdminAccountPage />
  const method = state.adminAuth ? 'Password' : state.userSettings.is_admin ? state.userSettings.user_email : 'Administrator'
  return <><WorkspaceShell items={nav} active={primary} onSelect={(value) => appStore.setState({ adminTab: value })} topbar={<div className="flex h-full min-w-0 items-center gap-2 text-sm"><ShieldCheck className="size-4 shrink-0 text-primary" /><strong className="shrink-0">{t('loginMethod')}</strong><span className="truncate text-muted-foreground">{method}</span></div>}>{canShowAdmin(state) ? content : null}</WorkspaceShell><AdminAuthDialog /></>
}
