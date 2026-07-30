import { AtSign, LogOut, Mail, Settings2, ShieldCheck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/layout/workspace-shell'
import { SecondaryWorkspace, type SecondaryWorkspaceItem } from '@/components/layout/secondary-workspace'
import { Button } from '@/components/ui/button'
import { AppearanceSettings } from '@/features/settings/appearance'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { ADMIN_PAGE_ROUTES, ADMIN_SECTION_DEFAULTS, getAdminSection, type AdminPageKey, type AdminSectionKey } from '@/app/routes'
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

function AdminAccountPage() {
  const navigate = useNavigate()
  const { locale } = useI18n()
  const { t } = useScopedI18n('views.Admin')
  const sessionT = useScopedI18n('ui.admin').t
  const state = useAppStore((value) => value)
  const method = state.adminAuth ? t('loginViaPassword') : state.userSettings.is_admin ? t('loginViaUserAdmin') : t('loginViaDisabledCheck')
  const logout = () => { appStore.setState({ adminAuth: '', showAdminAuth: false }); navigate(getPathWithLocale('/', locale)) }
  return <div className="h-full overflow-auto"><div className="mx-auto max-w-2xl p-5"><div className="flex items-center justify-between border-b border-border py-4"><div><p className="font-medium">{t('loginMethod')}</p><p className="mt-1 text-sm text-muted-foreground">{method}</p></div><ShieldCheck className="size-5 text-primary" /></div>{state.adminAuth && <div className="flex items-center justify-between py-4"><div><p className="font-medium">{sessionT('administratorSession')}</p><p className="mt-1 text-sm text-muted-foreground">{sessionT('administratorSessionDescription')}</p></div><Button variant="secondary" onClick={logout}><LogOut />{sessionT('signOut')}</Button></div>}</div></div>
}

export function AdminWorkspace({ page }: { page: AdminPageKey }) {
  const { t } = useScopedI18n('views.Admin')
  const { locale } = useI18n()
  const sessionT = useScopedI18n('ui.admin').t
  const state = useAppStore((value) => value)
  const navigate = useNavigate()
  const primary = getAdminSection(page)
  const go = (target: AdminPageKey) => navigate(getPathWithLocale(ADMIN_PAGE_ROUTES[target], locale))
  const nav: WorkspaceNavItem[] = [
    { key: 'account', label: t('account'), icon: AtSign },
    { key: 'user', label: t('user'), icon: Users },
    { key: 'mails', label: t('mails'), icon: Mail },
    { key: 'maintenance', label: t('configuration'), icon: Settings2 },
  ]
  const groups: Record<string, SecondaryWorkspaceItem[]> = {
    account: [
      { key: 'account', label: sessionT('allAddresses'), content: <AccountTable /> },
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
  const content = <SecondaryWorkspace items={group} value={page} onChange={(value) => go(value as AdminPageKey)} ariaLabel={primary === 'maintenance' ? t('configuration') : t(primary)} />
  const method = state.adminAuth ? sessionT('administratorPassword') : state.userSettings.is_admin ? state.userSettings.user_email : sessionT('passwordCheckDisabled')
  return <WorkspaceShell scope="admin" items={nav} active={primary} onSelect={(value) => go(ADMIN_SECTION_DEFAULTS[value as AdminSectionKey])} topbar={<div className="flex h-full min-w-0 items-center gap-2 text-sm"><ShieldCheck className="size-4 shrink-0 text-primary" /><strong className="shrink-0">{t('loginMethod')}</strong><span className="truncate text-muted-foreground">{method}</span></div>}>{content}</WorkspaceShell>
}
