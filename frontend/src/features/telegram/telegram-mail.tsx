import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { MailContent, type MailItem } from '@/features/mail/mail-content'
import { api } from '@/lib/api'
import { processItem } from '@/utils/email-parser'

export function TelegramMailPage() {
  const location = useLocation()
  const mailId = new URLSearchParams(location.search).get('mail_id') || ''
  const initData = (window as any).Telegram?.WebApp?.initData || ''
  const query = useQuery({ queryKey: ['telegram-mail', mailId, initData], queryFn: async () => processItem(await api.fetch('/api/telegram/get_mail', { method: 'POST', body: { initData, mailId } })), enabled: Boolean(mailId) })
  return <main className="min-h-[100dvh] bg-background">{query.data ? <div className="mx-auto max-w-5xl"><div className="border-b border-border px-5 py-4"><h1 className="truncate text-base font-semibold">{(query.data as MailItem).subject}</h1></div><MailContent mail={query.data as MailItem} /></div> : <div className="grid min-h-[100dvh] place-items-center text-muted-foreground"><div className="text-center"><Mail className="mx-auto mb-3 size-12 stroke-1" /><p>{query.isError ? 'Unable to load mail' : mailId ? 'Loading...' : 'Mail not found'}</p></div></div>}</main>
}
