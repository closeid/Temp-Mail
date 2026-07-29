import type { ReactNode } from 'react'
import { AtSign, Inbox, Send, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useLocation, useNavigate } from 'react-router-dom'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/layout/workspace-shell'
import { SecondaryWorkspace, type SecondaryWorkspaceItem } from '@/components/layout/secondary-workspace'
import { AddressBar } from '@/features/address/address-bar'
import { AddressLogin } from '@/features/auth/address-login'
import { AttachmentsPage } from '@/features/settings/attachments'
import { AppearanceSettings } from '@/features/settings/appearance'
import { AddressAccountSettings } from '@/features/settings/account-settings'
import { AutoReplySettings } from '@/features/settings/auto-reply'
import { SendMailPage } from '@/features/settings/send-mail'
import { WebhookSettings } from '@/features/settings/webhook-settings'
import { UserAddressManagement } from '@/features/user/address-management'
import { UserSettingsPage } from '@/features/user/user-settings'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { stringifyError } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { MAIL_ROUTES, type MailRouteKey } from '@/app/routes'
import { Mailbox } from './mailbox'
import { SentBox } from './sent-box'

export function MailWorkspace({ page }: { page: MailRouteKey }) {
  const { t } = useScopedI18n('views.Index')
  const userT = useScopedI18n('views.User').t
  const { locale } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const state = useAppStore((value) => value)
  const { settings, openSettings } = state
  const simple = state.useSimpleIndex
  const hasAddress = Boolean(settings.address)
  const hasUser = Boolean(state.userSettings.user_email)
  const mailId = new URLSearchParams(location.search).get('mail_id')
  const go = (target: MailRouteKey) => navigate(getPathWithLocale(MAIL_ROUTES[target], locale))
  const primary = page === 'mailbox' ? 'mailbox'
    : page === 'sendbox' || page === 'sendmail' ? 'mail'
      : page === 'addresses' ? 'addresses' : 'settings'

  const items: WorkspaceNavItem[] = [
    { key: 'mailbox', label: t('mailbox'), icon: Inbox, hidden: !hasAddress },
    { key: 'mail', label: t('sendbox'), icon: Send, hidden: !hasAddress || !openSettings.enableSendMail },
    { key: 'addresses', label: userT('address_management'), icon: AtSign },
    { key: 'settings', label: t('accountSettings'), icon: Settings },
  ]
  const fetchInbox = (limit: number, offset: number) => mailId
    ? api.fetch<any>(`/api/mail/${encodeURIComponent(mailId)}`).then((mail) => ({ results: mail ? [mail] : [], count: mail ? 1 : 0 }))
    : api.fetch(`/api/mails?limit=${limit}&offset=${offset}`)
  const saveToS3 = async (id: string | number, filename: string, blob: Blob) => {
    try { const { url } = await api.fetch<{ url: string }>('/api/attachment/put_url', { method: 'POST', body: { key: `${id}/${filename}` } }); const form = new FormData(); form.append(filename, blob); await fetch(url, { method: 'PUT', body: form }); toast.success(t('saveToS3Success')) } catch (error) { toast.error(stringifyError(error)) }
  }
  const inbox = <Mailbox queryKey={['inbox', settings.address, mailId]} fetchMailData={fetchInbox} deleteMail={(id) => api.fetch(`/api/mails/${id}`, { method: 'DELETE' })} canDelete={openSettings.enableUserDeleteEmail} showEmailTo={false} showReply={openSettings.enableSendMail} showSaveS3={openSettings.isS3Enabled} saveToS3={saveToS3} showFilter onCompose={() => go('sendmail')} />
  const mailItems: SecondaryWorkspaceItem[] = [
    { key: 'sendbox', label: t('sendbox'), content: <SentBox queryKey={['sent-box', settings.address]} fetchMailData={(limit, offset) => api.fetch(`/api/sendbox?limit=${limit}&offset=${offset}`)} deleteMail={(id) => api.fetch(`/api/sendbox/${id}`, { method: 'DELETE' })} canDelete={openSettings.enableUserDeleteEmail} /> },
    { key: 'sendmail', label: t('sendmail'), content: <SendMailPage onSent={() => go('sendbox')} /> },
  ]
  const settingsItems: SecondaryWorkspaceItem[] = [
    ...(hasAddress ? [{ key: 'accountSettings', label: t('accountSettings'), content: <AddressAccountSettings /> } satisfies SecondaryWorkspaceItem] : []),
    { key: 'appearance', label: t('appearance'), content: <AppearanceSettings showSimpleIndex /> },
    ...(hasAddress && openSettings.enableAutoReply ? [{ key: 'auto_reply', label: t('auto_reply'), content: <AutoReplySettings /> } satisfies SecondaryWorkspaceItem] : []),
    ...(hasAddress && openSettings.enableWebhook ? [{ key: 'webhook', label: t('webhookSettings'), content: <WebhookSettings fetchData={() => api.fetch('/api/webhook/settings')} saveSettings={(model) => api.fetch('/api/webhook/settings', { method: 'POST', body: model })} testSettings={(model) => api.fetch('/api/webhook/test', { method: 'POST', body: model })} /> } satisfies SecondaryWorkspaceItem] : []),
    ...(hasAddress && openSettings.isS3Enabled ? [{ key: 's3_attachment', label: t('s3Attachment'), content: <AttachmentsPage /> } satisfies SecondaryWorkspaceItem] : []),
    ...(hasUser ? [{ key: 'user_settings', label: userT('user_settings'), content: <UserSettingsPage /> } satisfies SecondaryWorkspaceItem] : []),
  ]
  let content: ReactNode
  if (page === 'mailbox') content = simple ? <div className="flex h-full min-h-0 flex-col"><div className="flex min-h-11 items-center justify-end border-b border-border px-3"><button type="button" className="text-sm text-primary" onClick={() => appStore.setState({ useSimpleIndex: false })}>{t('enterSimpleMode')}</button></div><div className="min-h-0 flex-1">{inbox}</div></div> : inbox
  else if (primary === 'mail') content = <SecondaryWorkspace items={mailItems} value={page} onChange={(value) => go(value as MailRouteKey)} ariaLabel={t('sendbox')} />
  else if (page === 'addresses') content = hasUser ? <UserAddressManagement /> : <div className="h-full overflow-auto"><div className="mx-auto max-w-xl p-5"><AddressLogin /></div></div>
  else content = <SecondaryWorkspace items={settingsItems} value={page} onChange={(value) => go(value as MailRouteKey)} ariaLabel={t('accountSettings')} />

  const selectPrimary = (value: string) => {
    if (value === 'mailbox') go('mailbox')
    else if (value === 'mail') go('sendbox')
    else if (value === 'addresses') go('addresses')
    else go(settingsItems[0]?.key as MailRouteKey || 'appearance')
  }
  return <WorkspaceShell items={items} active={primary} onSelect={selectPrimary} topbar={<AddressBar onManage={() => go('addresses')} />}>{content}</WorkspaceShell>
}
