import { useState, type ReactNode } from 'react'
import { AtSign, Edit3, Inbox, Paperclip, Palette, Reply, Send, Settings, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'
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
import { useScopedI18n } from '@/i18n/react'
import { Mailbox } from './mailbox'
import { SentBox } from './sent-box'

export function MailWorkspace() {
  const { t } = useScopedI18n('views.Index')
  const userT = useScopedI18n('views.User').t
  const location = useLocation()
  const state = useAppStore((value) => value)
  const { settings, openSettings } = state
  const simple = state.useSimpleIndex
  const hasAddress = Boolean(settings.address)
  const hasUser = Boolean(state.userSettings.user_email)
  const mailId = new URLSearchParams(location.search).get('mail_id')
  const storedTab = state.indexTab
  const primary = !hasAddress
    ? 'addresses'
    : storedTab === 'sendbox' || storedTab === 'sendmail' || storedTab === 'mail'
      ? 'mail'
      : ['accountSettings', 'appearance', 'auto_reply', 'webhook', 's3_attachment', 'user_settings', 'settings'].includes(storedTab)
        ? 'settings'
        : storedTab === 'addresses' || storedTab === 'address_management'
          ? 'addresses'
          : 'mailbox'
  const [secondary, setSecondary] = useState<Record<string, string>>({
    mail: storedTab === 'sendmail' ? 'sendmail' : 'sendbox',
    settings: ['accountSettings', 'appearance', 'auto_reply', 'webhook', 's3_attachment', 'user_settings'].includes(storedTab) ? storedTab : 'accountSettings',
  })
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
  const inbox = <Mailbox queryKey={['inbox', mailId]} fetchMailData={fetchInbox} deleteMail={(id) => api.fetch(`/api/mails/${id}`, { method: 'DELETE' })} canDelete={openSettings.enableUserDeleteEmail} showEmailTo={false} showReply={openSettings.enableSendMail} showSaveS3={openSettings.isS3Enabled} saveToS3={saveToS3} showFilter />
  const mailItems: SecondaryWorkspaceItem[] = [
    { key: 'sendbox', label: t('sendbox'), content: <SentBox queryKey={['sent-box']} fetchMailData={(limit, offset) => api.fetch(`/api/sendbox?limit=${limit}&offset=${offset}`)} deleteMail={(id) => api.fetch(`/api/sendbox/${id}`, { method: 'DELETE' })} canDelete={openSettings.enableUserDeleteEmail} /> },
    { key: 'sendmail', label: t('sendmail'), content: <SendMailPage /> },
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
  if (primary === 'mailbox') content = simple ? <div className="flex h-full min-h-0 flex-col"><div className="flex min-h-11 items-center justify-end border-b border-border px-3"><button type="button" className="text-sm text-primary" onClick={() => appStore.setState({ useSimpleIndex: false })}>{t('enterSimpleMode')}</button></div><div className="min-h-0 flex-1">{inbox}</div></div> : inbox
  else if (primary === 'mail') content = <SecondaryWorkspace items={mailItems} value={secondary.mail} onChange={(value) => setSecondary((current) => ({ ...current, mail: value }))} ariaLabel={t('sendbox')} />
  else if (primary === 'addresses') content = hasUser ? <UserAddressManagement /> : <div className="h-full overflow-auto"><div className="mx-auto max-w-xl p-5"><AddressLogin /></div></div>
  else content = <SecondaryWorkspace items={settingsItems} value={secondary.settings} onChange={(value) => setSecondary((current) => ({ ...current, settings: value }))} ariaLabel={t('accountSettings')} />

  return <WorkspaceShell items={items} active={primary} onSelect={(value) => appStore.setState({ indexTab: value })} topbar={<AddressBar onManage={() => appStore.setState({ indexTab: 'addresses' })} />}>{content}</WorkspaceShell>
}
