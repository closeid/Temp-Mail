import { useState } from 'react'
import { ArrowRightLeft, Link2Off, MoveRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { confirmAction } from '@/components/action-dialogs'
import { AddressLogin } from '@/features/auth/address-login'
import { useBoundAddresses } from '@/features/address/use-bound-addresses'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { MAIL_ROUTES } from '@/app/routes'

export function UserAddressManagement() {
  const { t, locale } = useScopedI18n('views.user.AddressManagement')
  const navigate = useNavigate()
  const query = useBoundAddresses()
  const currentAddress = useAppStore((state) => state.settings.address)
  const [transfer, setTransfer] = useState<any>(null)
  const [target, setTarget] = useState('')
  const currentIsBound = Boolean(currentAddress && query.data?.results?.some((row) => (row.address || row.name) === currentAddress))
  const bindCurrent = async () => {
    try {
      await api.bindUserAddress()
      appStore.setState({ mailboxAccessMode: 'standard' })
      await query.refetch()
      toast.success(t('bindCurrentSuccess'))
    } catch (error) { toast.error(stringifyError(error)) }
  }
  const change = async (id: number) => { try { const result = await api.fetch<{ jwt: string }>(`/api/user/bind_address_jwt/${id}`); if (!result.jwt) throw new Error('jwt not found'); appStore.setState({ jwt: result.jwt, mailboxAccessMode: 'standard' }); await api.getSettings(); navigate(getPathWithLocale(MAIL_ROUTES.mailbox, locale)) } catch (error) { toast.error(stringifyError(error)) } }
  const unbind = async (id: number) => { if (!(await confirmAction({ title: t('unbindAddress'), description: t('unbindAddressTip'), destructive: true }))) return; try { await api.fetch('/api/user/unbind_address', { method: 'POST', body: { address_id: id } }); await query.refetch(); toast.success(`${t('unbindAddress')} ${t('success')}`) } catch (error) { toast.error(stringifyError(error)) } }
  const transferAddress = async () => { if (!target || !transfer?.id) return; try { await api.fetch('/api/user/transfer_address', { method: 'POST', body: { address_id: transfer.id, target_user_email: target } }); await query.refetch(); setTransfer(null); setTarget(''); toast.success(`${t('transferAddress')} ${t('success')}`) } catch (error) { toast.error(stringifyError(error)) } }
  return <div className="h-full overflow-auto p-3 sm:p-5"><Tabs defaultValue="addresses"><TabsList className="mb-4 rounded-md border border-border p-0.5"><TabsTrigger value="addresses">{t('address')}</TabsTrigger><TabsTrigger value="create"><Plus />{t('create_or_bind')}</TabsTrigger></TabsList><TabsContent value="addresses">{currentAddress && !query.isLoading && !currentIsBound && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{currentAddress}</p><p className="mt-1 text-xs text-muted-foreground">{t('bindCurrentDescription')}</p></div><Button className="shrink-0" onClick={bindCurrent}>{t('bindCurrent')}</Button></div>}<Table><TableHeader><TableRow><TableHead>{t('name')}</TableHead><TableHead>{t('mail_count')}</TableHead><TableHead>{t('send_count')}</TableHead><TableHead className="w-[336px] min-w-[336px]">{t('actions')}</TableHead></TableRow></TableHeader><TableBody>{(query.data?.results || []).map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name || row.address}</TableCell><TableCell><Badge>{row.mail_count || 0}</Badge></TableCell><TableCell><Badge>{row.send_count || 0}</Badge></TableCell><TableCell className="w-[336px] min-w-[336px]"><div className="flex flex-nowrap items-center gap-0.5 whitespace-nowrap"><Button size="sm" variant="ghost" className="shrink-0 px-2" onClick={() => change(row.id)}><ArrowRightLeft />{t('changeMailAddress')}</Button><Button size="sm" variant="ghost" className="shrink-0 px-2" onClick={() => setTransfer(row)}><MoveRight />{t('transferAddress')}</Button><Button size="sm" variant="ghost" className="shrink-0 px-2 text-destructive" onClick={() => unbind(row.id)}><Link2Off />{t('unbindAddress')}</Button></div></TableCell></TableRow>)}</TableBody></Table></TabsContent><TabsContent value="create" className="mx-auto max-w-xl py-3"><AddressLogin /></TabsContent></Tabs>
    <Dialog open={Boolean(transfer)} onOpenChange={(value) => !value && setTransfer(null)}><DialogContent><DialogHeader><DialogTitle>{t('transferAddress')}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{t('transferAddressTip')}</p><p className="text-sm font-medium">{transfer?.name || transfer?.address}</p><Field label={t('targetUserEmail')}><Input value={target} onChange={(event) => setTarget(event.target.value)} /></Field><DialogFooter><Button variant="destructive" onClick={transferAddress}><MoveRight />{t('transferAddress')}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
