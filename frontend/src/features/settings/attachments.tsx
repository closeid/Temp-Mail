import { useQuery } from '@tanstack/react-query'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export function AttachmentsPage() {
  const { t } = useScopedI18n('views.index.Attachment')
  const query = useQuery({ queryKey: ['attachments'], queryFn: () => api.fetch<{ results: Array<{ key: string }> }>('/api/attachment/list') })
  const download = async (key: string) => { try { const result = await api.fetch<{ url: string }>('/api/attachment/get_url', { method: 'POST', body: { key } }); const anchor = document.createElement('a'); anchor.href = result.url; anchor.download = key.replace('/', '_'); anchor.target = '_blank'; anchor.click() } catch (error) { toast.error(stringifyError(error)) } }
  const remove = async (key: string) => { if (!(await confirmAction({ title: t('delete'), description: t('deleteConfirm'), destructive: true }))) return; try { await api.fetch('/api/attachment/delete', { method: 'POST', body: { key } }); await query.refetch(); toast.success(t('deleteSuccess')) } catch (error) { toast.error(stringifyError(error)) } }
  return <div className="h-full overflow-auto"><Table><TableHeader><TableRow><TableHead>Key</TableHead><TableHead className="w-48">{t('action')}</TableHead></TableRow></TableHeader><TableBody>{(query.data?.results || []).map((item) => <TableRow key={item.key}><TableCell className="numeric break-all text-xs">{item.key}</TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => download(item.key)}><Download />{t('download')}</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(item.key)}><Trash2 />{t('delete')}</Button></div></TableCell></TableRow>)}</TableBody></Table></div>
}
