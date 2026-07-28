import { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { Download, Expand, Forward, Paperclip, Reply, Trash2 } from 'lucide-react'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getDownloadEmlUrl } from '@/utils/email-parser'
import { formatDate } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useScopedI18n } from '@/i18n/react'
import { AiExtract } from './ai-extract'

export type MailItem = {
  id: number | string
  source?: string
  originalSource?: string
  address?: string
  subject?: string
  text?: string
  message?: string
  raw?: string
  created_at?: string
  metadata?: string
  attachments?: Array<{ id: string; filename: string; size: string; url: string; blob: Blob }>
  [key: string]: any
}

type Props = {
  mail: MailItem
  showEmailTo?: boolean
  canDelete?: boolean
  showReply?: boolean
  showSaveS3?: boolean
  onDelete?: () => void
  onReply?: () => void
  onForward?: () => void
  onSaveToS3?: (filename: string, blob: Blob) => Promise<any>
}

function MailBody({ mail, textMode }: { mail: MailItem; textMode: boolean }) {
  const useIframe = useAppStore((state) => state.useIframeShowMail)
  const safeHtml = useMemo(() => DOMPurify.sanitize(mail.message || '', { ADD_ATTR: ['target'] }), [mail.message])
  if (textMode) return <pre className="m-0 whitespace-pre-wrap break-words font-sans leading-7">{mail.text || mail.message}</pre>
  if (useIframe) return <iframe title={mail.subject || 'Mail'} sandbox="" srcDoc={safeHtml} className="min-h-[520px] w-full border-0 bg-white" />
  return <div className="mail-html" dangerouslySetInnerHTML={{ __html: safeHtml }} />
}

export function MailContent({ mail, showEmailTo = true, canDelete, showReply, showSaveS3, onDelete, onReply, onForward, onSaveToS3 }: Props) {
  const { t } = useScopedI18n('components.MailContentRenderer')
  const { preferShowTextMail, useUTCDate } = useAppStore((state) => ({ preferShowTextMail: state.preferShowTextMail, useUTCDate: state.useUTCDate }))
  const [textMode, setTextMode] = useState(preferShowTextMail)
  const [attachmentsOpen, setAttachmentsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const eml = useMemo(() => getDownloadEmlUrl(mail.raw || ''), [mail.raw])
  const sender = mail.source || mail.originalSource || '-'
  const recipient = mail.address || '-'
  return <div className="flex min-h-0 flex-col">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3">
      <div className="min-w-0 text-xs text-muted-foreground"><strong className="mr-2 block truncate text-sm text-foreground sm:inline">{sender}</strong>{showEmailTo && <span className="mr-2">{t('recipient')}: {recipient}</span>}<time className="numeric mr-2">{formatDate(mail.created_at, useUTCDate)}</time><span className="numeric">#{mail.id}</span></div>
      <div className="flex flex-wrap gap-1">
        {canDelete && <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (await confirmAction({ title: t('delete'), description: t('deleteMailTip'), destructive: true })) onDelete?.() }}><Trash2 />{t('delete')}</Button>}
        {!!mail.attachments?.length && <Button variant="ghost" size="sm" onClick={() => setAttachmentsOpen(true)}><Paperclip />{t('attachments')}</Button>}
        <Button variant="ghost" size="sm" asChild><a href={eml} download={`${mail.id}.eml`}><Download />{t('downloadMail')}</a></Button>
        {showReply && <Button variant="ghost" size="sm" onClick={onReply}><Reply />{t('reply')}</Button>}
        {showReply && <Button variant="ghost" size="sm" onClick={onForward}><Forward />{t('forward')}</Button>}
        <Button variant="ghost" size="sm" onClick={() => setTextMode((value) => !value)}>{textMode ? t('showHtmlMail') : t('showTextMail')}</Button>
        <Button variant="ghost" size="icon" title={t('fullscreen')} onClick={() => setFullscreen(true)}><Expand /></Button>
      </div>
    </div>
    <div className="grid gap-3 px-5 py-3"><AiExtract metadata={mail.metadata} /><div className="min-h-0 overflow-auto pt-1"><MailBody mail={mail} textMode={textMode} /></div></div>
    <Dialog open={attachmentsOpen} onOpenChange={setAttachmentsOpen}><DialogContent><DialogHeader><DialogTitle>{t('attachments')}</DialogTitle></DialogHeader><div className="divide-y divide-border">{mail.attachments?.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.filename}</p><p className="numeric text-xs text-muted-foreground">{item.size}</p></div>{showSaveS3 && <Button variant="secondary" size="sm" onClick={() => onSaveToS3?.(item.filename, item.blob)}>{t('saveToS3')}</Button>}<Button variant="ghost" size="icon" asChild><a href={item.url} download={item.filename}><Download /></a></Button></div>)}</div></DialogContent></Dialog>
    <Dialog open={fullscreen} onOpenChange={setFullscreen}>
      <DialogContent className="h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-24px)] sm:w-[calc(100vw-24px)]">
        <DialogHeader className="space-y-3 border-b border-border px-4 py-3 pr-12 sm:px-6 sm:py-4 sm:pr-14">
          <div className="flex min-w-0 items-center gap-2">
            <DialogTitle className="min-w-0 flex-1 truncate text-base leading-6">{mail.subject || t('noSubject')}</DialogTitle>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" title={t('downloadMail')} asChild><a href={eml} download={`${mail.id}.eml`}><Download /></a></Button>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setTextMode((value) => !value)}>{textMode ? t('showHtmlMail') : t('showTextMail')}</Button>
            </div>
          </div>
          <div className="grid min-w-0 gap-1.5 text-xs sm:max-w-4xl">
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-2"><span className="text-muted-foreground">{t('sender')}</span><strong className="min-w-0 break-all font-medium text-foreground">{sender}</strong></div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-2"><span className="text-muted-foreground">{t('recipient')}</span><span className="min-w-0 break-all text-foreground">{recipient}</span></div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-20 text-muted-foreground"><time className="numeric">{t('receivedAt')}: {formatDate(mail.created_at, useUTCDate)}</time><span className="numeric">#{mail.id}</span></div>
          </div>
        </DialogHeader>
        <div className="min-h-0 overflow-auto bg-background">
          <div className="mx-auto grid w-full max-w-[1200px] gap-4 px-4 py-5 sm:px-8 sm:py-8"><AiExtract metadata={mail.metadata} /><MailBody mail={mail} textMode={textMode} /></div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
}
