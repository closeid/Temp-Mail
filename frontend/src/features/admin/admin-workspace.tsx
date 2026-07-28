import { useRef, useState } from 'react'
import { AtSign, KeyRound, LogOut, Mail, Settings2, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Turnstile, type TurnstileHandle } from '@/components/turnstile'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/layout/workspace-shell'
import { SecondaryWorkspace, type SecondaryWorkspaceItem } from '@/components/layout/secondary-workspace'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AppearanceSettings } from '@/features/settings/appearance'
import { api } from '@/lib/api'
import { appStore, canShowAdmin, useAppStore } from '@/lib/store'
import { hashPassword, stringifyError } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import {
  AccountTable, AdminInbox, AdminMailWebhook, AdminSendMail, AdminSentBox, CreateAddressPage,
  DatabasePage, MaintenancePage, RoleAddressConfigPage, SenderAccessPage, StatisticsPage,
  TelegramAdminPage, UserTable, WorkerConfigPage,
} from './admin-pages'
import { ObjectSettings } from './object-settings'
import { ApiDocsPage } from './api-docs'
import { OAuthSettingsPage } from './oauth-settings'
import { SendProviderSettingsPage } from './send-provider-settings'

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
  const { t } = useScopedI18n('ui.admin')
  const adminT = useScopedI18n('views.Admin').t
  const state = useAppStore((value) => value)
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const turnstile = useRef<TurnstileHandle>(null)
  const authenticate = async () => {
    try {
      await api.fetch('/api/open/admin_login', { method: 'POST', body: { password: await hashPassword(password), cf_token: token } })
      appStore.setState({ adminAuth: password, showAdminAuth: false })
      toast.success(t('signedIn'))
    } catch (error) { toast.error(stringifyError(error)); turnstile.current?.refresh() }
  }
  const open = state.userSettings.fetched && (!canShowAdmin(state) || state.showAdminAuth)
  return <Dialog open={open}><DialogContent showClose={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}><DialogHeader><DialogTitle>{t('administratorAccess')}</DialogTitle><DialogDescription>{t('administratorAccessDescription')}</DialogDescription></DialogHeader><Input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && authenticate()} />{state.openSettings.enableGlobalTurnstileCheck && <Turnstile ref={turnstile} value={token} onChange={setToken} />}<DialogFooter><Button onClick={authenticate}><KeyRound />{adminT('confirm')}</Button></DialogFooter></DialogContent></Dialog>
}

function AdminAccountPage() {
  const navigate = useNavigate()
  const { locale } = useI18n()
  const { t } = useScopedI18n('views.Admin')
  const sessionT = useScopedI18n('ui.admin').t
  const state = useAppStore((value) => value)
  const method = state.adminAuth ? t('loginViaPassword') : state.userSettings.is_admin ? t('loginViaUserAdmin') : t('loginViaDisabledCheck')
  const logout = () => { appStore.setState({ adminAuth: '', showAdminAuth: false, adminTab: 'account' }); navigate(getPathWithLocale('/', locale)) }
  return <div className="h-full overflow-auto"><div className="mx-auto max-w-2xl p-5"><div className="flex items-center justify-between border-b border-border py-4"><div><p className="font-medium">{t('loginMethod')}</p><p className="mt-1 text-sm text-muted-foreground">{method}</p></div><ShieldCheck className="size-5 text-primary" /></div>{state.adminAuth && <div className="flex items-center justify-between py-4"><div><p className="font-medium">{sessionT('administratorSession')}</p><p className="mt-1 text-sm text-muted-foreground">{sessionT('administratorSessionDescription')}</p></div><Button variant="secondary" onClick={logout}><LogOut />{sessionT('signOut')}</Button></div>}</div></div>
}

export function AdminWorkspace() {
  const { t } = useScopedI18n('views.Admin')
  const sessionT = useScopedI18n('ui.admin').t
  const state = useAppStore((value) => value)
  const primary = ['account', 'user', 'mails'].includes(state.adminTab) ? state.adminTab : 'maintenance'
  const initialMaintenance = ['workerconfig', 'ipBlacklistSettings', 'database', 'maintenance', 'statistics', 'appearance', 'apiDocs'].includes(state.adminTab) ? state.adminTab : 'workerconfig'
  const [secondary, setSecondary] = useState<Record<string, string>>({ account: 'account', user: 'user_management', mails: 'mails', maintenance: initialMaintenance })
  const nav: WorkspaceNavItem[] = [
    { key: 'account', label: t('account'), icon: AtSign },
    { key: 'user', label: t('user'), icon: Users },
    { key: 'mails', label: t('mails'), icon: Mail },
    { key: 'maintenance', label: t('configuration'), icon: Settings2 },
  ]
  const groups: Record<string, SecondaryWorkspaceItem[]> = {
    account: [
      { key: 'account', label: t('account'), content: <AccountTable /> },
      { key: 'account_create', label: t('account_create'), content: <CreateAddressPage /> },
      { key: 'account_settings', label: t('account_settings'), content: <ObjectSettings endpoint="/api/admin/account_settings" title={t('account_settings')} transformLoad={loadAccountSettings} transformSave={saveAccountSettings} /> },
      { key: 'senderAccess', label: t('senderAccess'), content: <SenderAccessPage /> },
    ],
    user: [
      { key: 'user_management', label: t('user_management'), content: <UserTable /> },
      { key: 'user_settings', label: t('user_settings'), content: <ObjectSettings endpoint="/api/admin/user_settings" title={t('user_settings')} /> },
      { key: 'roleAddressConfig', label: t('roleAddressConfig'), content: <RoleAddressConfigPage /> },
      { key: 'userOauth2Settings', label: t('userOauth2Settings'), content: <OAuthSettingsPage /> },
      { key: 'adminAccount', label: t('adminAccount'), content: <AdminAccountPage /> },
    ],
    mails: [
      { key: 'mails', label: t('mails'), content: <AdminInbox /> },
      { key: 'unknow', label: t('unknow'), content: <AdminInbox unknown /> },
      { key: 'sendBox', label: t('sendBox'), content: <AdminSentBox /> },
      { key: 'sendMail', label: t('sendMail'), content: <AdminSendMail /> },
      { key: 'sendConfiguration', label: sessionT('sendConfiguration'), content: <SendProviderSettingsPage /> },
      { key: 'aiExtractSettings', label: t('aiExtractSettings'), content: <ObjectSettings endpoint="/api/admin/ai_extract/settings" title={t('aiExtractSettings')} /> },
      { key: 'mailWebhook', label: t('mailWebhook'), content: <AdminMailWebhook /> },
      { key: 'webhook', label: t('webhookSettings'), content: <ObjectSettings endpoint="/api/admin/webhook/settings" title={t('webhookSettings')} description={sessionT('webhookAccessDescription')} /> },
      { key: 'telegram', label: t('telegram'), content: <TelegramAdminPage /> },
    ],
    maintenance: [
      { key: 'workerconfig', label: t('workerconfig'), content: <WorkerConfigPage /> },
      { key: 'ipBlacklistSettings', label: t('ipBlacklistSettings'), content: <ObjectSettings endpoint="/api/admin/ip_blacklist/settings" title={t('ipBlacklistSettings')} /> },
      { key: 'database', label: t('database'), content: <DatabasePage /> },
      { key: 'maintenance', label: t('maintenance'), content: <MaintenancePage /> },
      { key: 'statistics', label: t('statistics'), content: <StatisticsPage /> },
      { key: 'appearance', label: t('appearance'), content: <AppearanceSettings /> },
      { key: 'apiDocs', label: sessionT('apiDocumentation'), content: <ApiDocsPage /> },
    ],
  }
  const group = groups[primary]
  const content = <SecondaryWorkspace items={group} value={secondary[primary] || group[0].key} onChange={(value) => setSecondary((current) => ({ ...current, [primary]: value }))} ariaLabel={primary === 'maintenance' ? t('configuration') : t(primary)} />
  const method = state.adminAuth ? sessionT('administratorPassword') : state.userSettings.is_admin ? state.userSettings.user_email : sessionT('passwordCheckDisabled')
  return <><WorkspaceShell scope="admin" items={nav} active={primary} onSelect={(value) => appStore.setState({ adminTab: value })} topbar={<div className="flex h-full min-w-0 items-center gap-2 text-sm"><ShieldCheck className="size-4 shrink-0 text-primary" /><strong className="shrink-0">{t('loginMethod')}</strong><span className="truncate text-muted-foreground">{method}</span></div>}>{canShowAdmin(state) ? content : null}</WorkspaceShell><AdminAuthDialog /></>
}
