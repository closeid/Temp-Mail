import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useScopedI18n } from '@/i18n/react'
import { api } from '@/lib/api'
import { copyText, formatDate, stringifyError } from '@/lib/utils'

type AdminAccessToken = {
  id: number
  name: string
  expires_at: string | null
  created_at: string
  last_used_at: string | null
}

type CreatedAccessToken = AdminAccessToken & { token: string }

export function AdminAccessTokensPage() {
  const { t } = useScopedI18n('ui.admin')
  const commonT = useScopedI18n('ui.common').t
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [created, setCreated] = useState<CreatedAccessToken | null>(null)
  const query = useQuery({ queryKey: ['admin-access-tokens'], queryFn: () => api.fetch<{ results: AdminAccessToken[] }>('/api/admin/access_tokens') })
  const create = useMutation({
    mutationFn: () => api.fetch<CreatedAccessToken>('/api/admin/access_tokens', { method: 'POST', body: { name, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null } }),
    onSuccess: (value) => {
      setCreateOpen(false)
      setCreated(value)
      setName('')
      setExpiresAt('')
      void queryClient.invalidateQueries({ queryKey: ['admin-access-tokens'] })
    },
    onError: (error) => toast.error(stringifyError(error)),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.fetch(`/api/admin/access_tokens/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success(t('accessTokenDeleted')); void queryClient.invalidateQueries({ queryKey: ['admin-access-tokens'] }) },
    onError: (error) => toast.error(stringifyError(error)),
  })
  const copy = async () => { if (created?.token) { await copyText(created.token); toast.success(commonT('copied')) } }
  const now = Date.now()

  return <section className="h-full overflow-auto">
    <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"><div><h1 className="text-base font-semibold">{t('accessTokens')}</h1><p className="mt-1 text-xs text-muted-foreground">{t('accessTokensDescription')}</p></div><Button onClick={() => setCreateOpen(true)}><Plus />{t('createAccessToken')}</Button></header>
    <div className="p-5">
      <div className="overflow-hidden rounded-md border border-border"><Table><TableHeader><TableRow><TableHead>{t('tokenName')}</TableHead><TableHead>{t('createdAt')}</TableHead><TableHead>{t('expiresAt')}</TableHead><TableHead>{t('lastUsedAt')}</TableHead><TableHead>{t('status')}</TableHead><TableHead className="w-20 text-right">{commonT('actions')}</TableHead></TableRow></TableHeader><TableBody>
        {query.data?.results?.map((token) => { const expired = Boolean(token.expires_at && new Date(token.expires_at).getTime() <= now); return <TableRow key={token.id}><TableCell className="font-medium">{token.name}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(token.created_at)}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{token.expires_at ? formatDate(token.expires_at) : t('neverExpires')}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{token.last_used_at ? formatDate(token.last_used_at) : t('neverUsed')}</TableCell><TableCell><Badge variant={expired ? 'secondary' : 'default'}>{expired ? t('expired') : t('active')}</Badge></TableCell><TableCell className="text-right"><Button size="icon" variant="ghost" title={t('deleteAccessToken')} disabled={remove.isPending} onClick={async () => { if (await confirmAction({ title: t('deleteAccessToken'), description: t('deleteAccessTokenConfirmation', { name: token.name }), destructive: true })) remove.mutate(token.id) }}><Trash2 /></Button></TableCell></TableRow> })}
        {!query.isLoading && !query.data?.results?.length && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{commonT('noData')}</TableCell></TableRow>}
      </TableBody></Table></div>
      <p className="mt-3 text-xs text-muted-foreground">{t('accessTokenHeaderHelp')}</p>
    </div>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>{t('createAccessToken')}</DialogTitle><DialogDescription>{t('createAccessTokenDescription')}</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); create.mutate() }}><Field label={t('tokenName')} htmlFor="access-token-name"><Input id="access-token-name" autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder={t('tokenNamePlaceholder')} /></Field><Field label={t('expiresAt')} htmlFor="access-token-expiry" description={t('expiresAtDescription')}><Input id="access-token-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field><DialogFooter><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>{commonT('cancel')}</Button><Button type="submit" disabled={!name.trim() || create.isPending}><Plus />{t('createAccessToken')}</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={Boolean(created)} onOpenChange={(open) => { if (!open) setCreated(null) }}><DialogContent><DialogHeader><DialogTitle>{t('accessTokenCreated')}</DialogTitle><DialogDescription>{t('accessTokenCreatedDescription')}</DialogDescription></DialogHeader><div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/40 p-2"><code className="min-w-0 flex-1 break-all text-xs">{created?.token}</code><Button size="icon" variant="secondary" title={commonT('copy')} onClick={copy}><Copy /></Button></div><DialogFooter><Button onClick={() => setCreated(null)}>{commonT('confirm')}</Button></DialogFooter></DialogContent></Dialog>
  </section>
}
