import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Group, Panel, Separator as ResizeHandle } from 'react-resizable-panels'
import JSZip from 'jszip'
import { ChevronLeft, ChevronRight, Download, Inbox, RefreshCw, Search, SquareCheckBig, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { processItem } from '@/utils/email-parser'
import { buildForwardModel, buildReplyModel } from '@/utils/mail-actions'
import { appStore, useAppStore } from '@/lib/store'
import { downloadBlob, formatDate, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { AiExtract } from './ai-extract'
import { MailContent, type MailItem } from './mail-content'

type Props = {
  queryKey: unknown[]
  fetchMailData: (limit: number, offset: number) => Promise<{ results: any[]; count: number }>
  deleteMail?: (id: number | string) => Promise<any>
  canDelete?: boolean
  showEmailTo?: boolean
  showReply?: boolean
  showSaveS3?: boolean
  saveToS3?: (id: number | string, filename: string, blob: Blob) => Promise<any>
  showFilter?: boolean
  onCompose?: () => void
}

export function Mailbox({ queryKey, fetchMailData, deleteMail, canDelete, showEmailTo = true, showReply, showSaveS3, saveToS3, showFilter, onCompose }: Props) {
  const { t } = useScopedI18n('components.MailBox')
  const commonT = useScopedI18n('ui.common').t
  const state = useAppStore((value) => ({ autoRefresh: value.autoRefresh, interval: value.configAutoRefreshInterval, useUTC: value.useUTCDate, split: value.mailboxSplitSize, wideList: value.mailListView, preview: value.mailListPreviewLineClamp }))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filter, setFilter] = useState('')
  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null)
  const [multi, setMulti] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [mobileDetail, setMobileDetail] = useState(false)
  const query = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: async () => { const result = await fetchMailData(pageSize, (page - 1) * pageSize); return { count: result.count || 0, results: await Promise.all((result.results || []).map((item) => processItem({ ...item }))) as MailItem[] } },
    refetchInterval: state.autoRefresh ? state.interval * 1000 : false,
  })
  const data = useMemo(() => {
    const keyword = filter.trim().toLowerCase()
    return keyword ? (query.data?.results || []).filter((item) => [item.subject, item.text, item.message].some((value) => String(value || '').toLowerCase().includes(keyword))) : query.data?.results || []
  }, [filter, query.data?.results])
  const count = query.data?.count || 0
  const maxPage = Math.max(1, Math.ceil(count / pageSize))
  useEffect(() => { if (selectedMail && !data.some((item) => item.id === selectedMail.id)) setSelectedMail(null) }, [data, selectedMail])

  const choose = (mail: MailItem) => { if (multi) { setChecked((current) => { const next = new Set(current); const id = String(mail.id); next.has(id) ? next.delete(id) : next.add(id); return next }) } else { setSelectedMail(mail); if (innerWidth < 768) setMobileDetail(true) } }
  const removeOne = async () => { if (!selectedMail || !deleteMail) return; try { await deleteMail(selectedMail.id); setSelectedMail(null); await query.refetch(); toast.success(t('success')) } catch (error) { toast.error(stringifyError(error)) } }
  const removeSelected = async () => { if (!deleteMail || !checked.size) return toast.error(t('pleaseSelectMail')); if (!(await confirmAction({ title: t('delete'), description: t('deleteMailTip'), destructive: true }))) return; try { for (const item of data.filter((mail) => checked.has(String(mail.id)))) await deleteMail(item.id); setChecked(new Set()); await query.refetch(); toast.success(t('success')) } catch (error) { toast.error(stringifyError(error)) } }
  const downloadSelected = async () => { if (!checked.size) return toast.error(t('pleaseSelectMail')); const zip = new JSZip(); data.filter((mail) => checked.has(String(mail.id))).forEach((mail) => zip.file(`${mail.id}.eml`, mail.raw || '')); downloadBlob(await zip.generateAsync({ type: 'blob' }), `mails-${new Date().toISOString().replaceAll(':', '-')}.zip`) }
  const reply = () => { if (!selectedMail) return; appStore.setState((current) => ({ sendMailModel: { ...current.sendMailModel, ...buildReplyModel(selectedMail, t('reply')) } })); onCompose?.() }
  const forward = () => { if (!selectedMail) return; appStore.setState((current) => ({ sendMailModel: { ...current.sendMailModel, ...buildForwardModel(selectedMail, t('forwardMail')) } })); onCompose?.() }

  const toolbar = <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
    {multi ? <><Button variant="ghost" onClick={() => { setMulti(false); setChecked(new Set()) }}>{t('cancelMultiAction')}</Button><Button variant="ghost" onClick={() => setChecked(new Set(data.map((item) => String(item.id))))}>{t('selectAll')}</Button><Button variant="ghost" onClick={() => setChecked(new Set())}>{t('unselectAll')}</Button>{canDelete && <Button variant="ghost" className="text-destructive" onClick={removeSelected}><Trash2 />{t('delete')}</Button>}<Button variant="ghost" onClick={downloadSelected}><Download />{t('downloadMail')}</Button></> : <>
      <Button variant="ghost" onClick={() => setMulti(true)}><SquareCheckBig />{t('multiAction')}</Button>
      <Button variant="outline" size="icon" title={commonT('previousPage')} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><span className="numeric grid h-9 min-w-9 place-items-center rounded-md border border-border px-2">{page}</span><Button variant="outline" size="icon" title={commonT('nextPage')} disabled={page >= maxPage} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button>
      <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}><SelectTrigger className="w-[128px]"><SelectValue /></SelectTrigger><SelectContent>{[20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{commonT('perPage', { count: value })}</SelectItem>)}</SelectContent></Select>
      <label className="flex h-9 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground"><Switch checked={state.autoRefresh} onCheckedChange={(value) => appStore.setState({ autoRefresh: value })} />{t('autoRefresh')}</label>
      <Button variant="secondary" onClick={() => { setPage(1); query.refetch() }}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} />{t('refresh')}</Button>
      {showFilter && <div className="relative min-w-48 flex-1 sm:max-w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 min-h-9 pl-9" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t('keywordQueryTip')} /></div>}
    </>}
  </div>

  const list = <div role="list" className="h-full overflow-auto">{query.isLoading ? Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-[76px] animate-pulse border-b border-border bg-transparent" />) : data.length ? data.map((mail) => <button type="button" role="listitem" key={mail.id} className={`grid w-full gap-1 border-b border-border px-3 py-2.5 text-left hover:bg-muted/50 ${selectedMail?.id === mail.id ? 'bg-accent' : ''}`} onClick={() => choose(mail)}>
    <span className="flex min-w-0 items-center gap-2">{multi && <Checkbox checked={checked.has(String(mail.id))} tabIndex={-1} />}<strong className="min-w-0 flex-1 truncate text-sm font-semibold">{mail.subject || t('noSubject')}</strong><time className="numeric shrink-0 text-[11px] text-muted-foreground">{formatDate(mail.created_at, state.useUTC)}</time></span>
    <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><span className="min-w-0 flex-1 truncate">{showEmailTo ? 'FROM: ' : ''}{mail.source}</span>{showEmailTo && <span className="hidden max-w-36 truncate xl:block">TO: {mail.address}</span>}</span>
    {state.preview > 0 && mail.text && <span className="overflow-hidden text-xs text-muted-foreground/80" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: state.preview }}>{mail.text}</span>}<AiExtract metadata={mail.metadata} compact />
  </button>) : <div className="grid h-full min-h-72 place-items-center text-center text-muted-foreground"><div><Inbox className="mx-auto mb-3 size-10 stroke-1" /><p className="text-sm">{t('emptyInbox')}</p></div></div>}</div>

  const detail = selectedMail ? <div className="h-full overflow-auto"><div className="border-b border-border px-5 py-3"><h1 className="truncate text-base font-semibold">{selectedMail.subject}</h1></div><MailContent mail={selectedMail} showEmailTo={showEmailTo} canDelete={canDelete} showReply={showReply} showSaveS3={showSaveS3} onDelete={removeOne} onReply={reply} onForward={forward} onSaveToS3={saveToS3 ? (filename, blob) => saveToS3(selectedMail.id, filename, blob) : undefined} /></div> : <div className="grid h-full place-items-center text-center text-muted-foreground"><div><Inbox className="mx-auto mb-3 size-12 stroke-1" /><p>{count ? t('pleaseSelectMail') : t('emptyInbox')}</p></div></div>

  return <div className="flex h-full min-h-0 flex-col bg-background">{toolbar}<div className="min-h-0 flex-1"><div className="hidden h-full md:block">{state.wideList && !selectedMail ? list : <Group orientation="horizontal" className="h-full" defaultLayout={{ list: Math.round(state.split * 100), detail: Math.round((1 - state.split) * 100) }} onLayoutChanged={(layout) => appStore.setState({ mailboxSplitSize: (layout.list || 32) / 100 })}><Panel id="list" minSize="20%" defaultSize={`${Math.round(state.split * 100)}%`}>{list}</Panel><ResizeHandle className="group relative w-px bg-border outline-none"><span className="absolute inset-y-0 -left-1 w-2 group-hover:bg-primary/10" /></ResizeHandle><Panel id="detail" minSize="25%">{detail}</Panel></Group>}</div><div className="h-full md:hidden">{list}</div></div>
    <Dialog open={mobileDetail} onOpenChange={setMobileDetail}><DialogContent className="h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-none p-0" showClose>{detail}</DialogContent></Dialog>
  </div>
}
