import { AtSign, BotMessageSquare, Edit3, Inbox, Paperclip, Palette, Reply, Send, Settings, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/layout/workspace-shell'
import { AddressBar } from '@/features/address/address-bar'
import { AttachmentsPage } from '@/features/settings/attachments'
import { AppearanceSettings } from '@/features/settings/appearance'
import { AddressAccountSettings } from '@/features/settings/account-settings'
import { AutoReplySettings } from '@/features/settings/auto-reply'
import { SendMailPage } from '@/features/settings/send-mail'
import { WebhookSettings } from '@/features/settings/webhook-settings'
import { Mailbox } from './mailbox'
import { SentBox } from './sent-box'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export function MailWorkspace() {
  const { t } = useScopedI18n('views.Index')
  const location = useLocation()
  const { tab, settings, openSettings, simple } = useAppStore((state) => ({ tab: state.indexTab, settings: state.settings, openSettings: state.openSettings, simple: state.useSimpleIndex }))
  const mailId = new URLSearchParams(location.search).get('mail_id')
  const items: WorkspaceNavItem[] = [
    { key: 'mailbox', label: t('mailbox'), icon: Inbox },
    { key: 'sendbox', label: t('sendbox'), icon: Send, hidden: !openSettings.enableSendMail },
    { key: 'sendmail', label: t('sendmail'), icon: Edit3, hidden: !openSettings.enableSendMail },
    { key: 'accountSettings', label: t('accountSettings'), icon: Settings },
    { key: 'appearance', label: t('appearance'), icon: Palette },
    { key: 'auto_reply', label: t('auto_reply'), icon: Reply, hidden: !openSettings.enableAutoReply },
    { key: 'webhook', label: t('webhookSettings'), icon: Webhook, hidden: !openSettings.enableWebhook },
    { key: 's3_attachment', label: t('s3Attachment'), icon: Paperclip, hidden: !openSettings.isS3Enabled },
  ]
  const fetchInbox = (limit: number, offset: number) => mailId
    ? api.fetch<any>(`/api/mail/${encodeURIComponent(mailId)}`).then((mail) => ({ results: mail ? [mail] : [], count: mail ? 1 : 0 }))
    : api.fetch(`/api/mails?limit=${limit}&offset=${offset}`)
  const saveToS3 = async (id: string | number, filename: string, blob: Blob) => {
    try { const { url } = await api.fetch<{ url: string }>('/api/attachment/put_url', { method: 'POST', body: { key: `${id}/${filename}` } }); const form = new FormData(); form.append(filename, blob); await fetch(url, { method: 'PUT', body: form }); toast.success(t('saveToS3Success')) } catch (error) { toast.error(stringifyError(error)) }
  }
  let content: React.ReactNode = null
  if (tab === 'mailbox') content = <Mailbox queryKey={['inbox', mailId]} fetchMailData={fetchInbox} deleteMail={(id) => api.fetch(`/api/mails/${id}`, { method: 'DELETE' })} canDelete={openSettings.enableUserDeleteEmail} showEmailTo={false} showReply={openSettings.enableSendMail} showSaveS3={openSettings.isS3Enabled} saveToS3={saveToS3} showFilter />
  if (tab === 'sendbox') content = <SentBox queryKey={['sent-box']} fetchMailData={(limit, offset) => api.fetch(`/api/sendbox?limit=${limit}&offset=${offset}`)} deleteMail={(id) => api.fetch(`/api/sendbox/${id}`, { method: 'DELETE' })} canDelete={openSettings.enableUserDeleteEmail} />
  if (tab === 'sendmail') content = <SendMailPage />
  if (tab === 'accountSettings') content = <AddressAccountSettings />
  if (tab === 'appearance') content = <AppearanceSettings showSimpleIndex />
  if (tab === 'auto_reply') content = <AutoReplySettings />
  if (tab === 'webhook') content = <WebhookSettings fetchData={() => api.fetch('/api/webhook/settings')} saveSettings={(model) => api.fetch('/api/webhook/settings', { method: 'POST', body: model })} testSettings={(model) => api.fetch('/api/webhook/test', { method: 'POST', body: model })} />
  if (tab === 's3_attachment') content = <AttachmentsPage />
  if (simple && tab === 'mailbox') content = <div className="flex h-full min-h-0 flex-col"><div className="flex min-h-11 items-center justify-end border-b border-border px-3"><button type="button" className="text-sm text-primary" onClick={() => appStore.setState({ useSimpleIndex: false })}>{t('enterSimpleMode')}</button></div><div className="min-h-0 flex-1">{content}</div></div>
  return <WorkspaceShell items={items} active={tab} onSelect={(value) => appStore.setState({ indexTab: value })} topbar={<AddressBar />}>{content}</WorkspaceShell>
}
