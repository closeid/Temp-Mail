import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Group, Panel, Separator as ResizeHandle } from 'react-resizable-panels'
import { ChevronLeft, ChevronRight, RefreshCw, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { appStore, useAppStore } from '@/lib/store'
import { formatDate, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { sanitizeHtml } from '@/lib/sanitize'

type SentItem = { id: number | string; address?: string; created_at?: string; raw?: string; subject?: string; to_mail?: string; content?: string; is_html?: boolean; [key: string]: any }
const parseSent = (item: SentItem): SentItem => {
  try {
    const payload = JSON.parse(item.raw || '{}')
    if (payload.version === 'v2') return { ...item, to_mail: payload.to_name ? `${payload.to_name} <${payload.to_mail}>` : payload.to_mail, subject: payload.subject, is_html: payload.is_html, content: payload.content, raw: JSON.stringify(payload, null, 2) }
    return { ...item, to_mail: payload.personalizations?.map((entry: any) => entry.to?.map((target: any) => target.email).join(',')).join(';'), subject: payload.subject, is_html: payload.content?.[0]?.type !== 'text/plain', content: payload.content?.[0]?.value, raw: JSON.stringify(payload, null, 2) }
  } catch { return item }
}

export function SentBox({ queryKey, fetchMailData, deleteMail, canDelete = false, showEmailFrom = false }: { queryKey: unknown[]; fetchMailData: (limit: number, offset: number) => Promise<{ results: SentItem[]; count: number }>; deleteMail?: (id: number | string) => Promise<any>; canDelete?: boolean; showEmailFrom?: boolean }) {
  const { t } = useScopedI18n('components.SendBox')
  const commonT = useScopedI18n('ui.common').t
  const { split, useUTC } = useAppStore((state) => ({ split: state.mailboxSplitSize, useUTC: state.useUTCDate }))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [current, setCurrent] = useState<SentItem | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const query = useQuery({ queryKey: [...queryKey, page, pageSize], queryFn: async () => { const data = await fetchMailData(pageSize, (page - 1) * pageSize); return { count: data.count || 0, results: (data.results || []).map(parseSent) } } })
  const items = query.data?.results || []
  const maxPage = Math.max(1, Math.ceil((query.data?.count || 0) / pageSize))
  useEffect(() => { if (current && !items.some((item) => item.id === current.id)) setCurrent(null) }, [current, items])
  const open = (item: SentItem) => { setCurrent(item); if (innerWidth < 768) setMobileOpen(true) }
  const remove = async () => { if (!current || !deleteMail) return; try { await deleteMail(current.id); setCurrent(null); await query.refetch(); toast.success(t('success')) } catch (error) { toast.error(stringifyError(error)) } }
  const toolbar = <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5"><Button variant="outline" size="icon" title={commonT('previousPage')} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><span className="numeric grid h-9 min-w-9 place-items-center rounded-md border border-border px-2">{page}</span><Button variant="outline" size="icon" title={commonT('nextPage')} disabled={page >= maxPage} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button><Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}><SelectTrigger className="w-[128px]"><SelectValue /></SelectTrigger><SelectContent>{[20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{commonT('perPage', { count: value })}</SelectItem>)}</SelectContent></Select><Button variant="secondary" onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} />{t('refresh')}</Button></div>
  const list = <div role="list" className="h-full overflow-auto">{query.isLoading ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[68px] animate-pulse border-b border-border bg-transparent" />) : items.length ? items.map((item) => <button type="button" role="listitem" key={item.id} onClick={() => open(item)} className={`grid w-full gap-1 border-b border-border px-3 py-2.5 text-left hover:bg-muted/50 ${current?.id === item.id ? 'bg-accent' : ''}`}><span className="flex min-w-0 gap-2"><strong className="min-w-0 flex-1 truncate text-sm">{item.subject}</strong><time className="numeric shrink-0 text-[11px] text-muted-foreground">{formatDate(item.created_at, useUTC)}</time></span><span className="flex min-w-0 gap-2 text-xs text-muted-foreground">{showEmailFrom && <span className="truncate">FROM: {item.address}</span>}<span className="min-w-0 flex-1 truncate">TO: {item.to_mail}</span></span></button>) : <div className="grid h-full place-items-center text-muted-foreground"><div className="text-center"><Send className="mx-auto mb-3 size-12 stroke-1" /><p>{t('emptySent')}</p></div></div>}</div>
  const detail = current ? <div className="h-full overflow-auto"><div className="border-b border-border px-5 py-3"><h1 className="truncate text-base font-semibold">{current.subject}</h1></div><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3 text-xs text-muted-foreground"><span>{showEmailFrom && `FROM: ${current.address} `} TO: {current.to_mail}</span><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => setShowCode((value) => !value)}>{t('showCode')}</Button>{canDelete && <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (await confirmAction({ title: t('delete'), description: t('deleteMailTip'), destructive: true })) await remove() }}><Trash2 />{t('delete')}</Button>}</div></div><div className="p-5">{showCode ? <pre className="whitespace-pre-wrap break-words text-xs">{current.raw}</pre> : current.is_html ? <div className="mail-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(current.content) }} /> : <pre className="whitespace-pre-wrap break-words font-sans">{current.content}</pre>}</div></div> : <div className="grid h-full place-items-center text-muted-foreground"><div className="text-center"><Send className="mx-auto mb-3 size-12 stroke-1" /><p>{items.length ? t('pleaseSelectMail') : t('emptySent')}</p></div></div>
  return <div className="flex h-full min-h-0 flex-col">{toolbar}<div className="min-h-0 flex-1"><div className="hidden h-full md:block"><Group orientation="horizontal" className="h-full" defaultLayout={{ list: Math.round(split * 100), detail: Math.round((1 - split) * 100) }} onLayoutChanged={(layout) => appStore.setState({ mailboxSplitSize: (layout.list || 32) / 100 })}><Panel id="list" minSize="20%">{list}</Panel><ResizeHandle className="relative w-px bg-border"><span className="absolute inset-y-0 -left-1 w-2 hover:bg-primary/10" /></ResizeHandle><Panel id="detail" minSize="25%">{detail}</Panel></Group></div><div className="h-full md:hidden">{list}</div></div><Dialog open={mobileOpen} onOpenChange={setMobileOpen}><DialogContent className="h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-none p-0">{detail}</DialogContent></Dialog></div>
}
