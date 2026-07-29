import { useQuery } from '@tanstack/react-query'
import { Mail, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { confirmAction } from '@/components/action-dialogs'
import { AddressLogin } from '@/features/auth/address-login'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { stringifyError } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { MAIL_ROUTES } from '@/app/routes'

export function TelegramAddressPage() {
  const { t } = useScopedI18n('ui.common')
  const { locale } = useI18n()
  const navigate = useNavigate()
  const initData = useAppStore((state) => state.telegramInitData)
  const query = useQuery({ queryKey: ['telegram-addresses', initData], queryFn: () => api.fetch<any[]>('/api/telegram/get_bind_address', { method: 'POST', body: { initData } }), enabled: Boolean(initData) })
  const bind = () => api.fetch('/api/telegram/bind_address', { method: 'POST', body: { initData, jwt: appStore.getState().jwt } })
  const create = (name: string, domain: string, token: string, random: boolean) => api.fetch('/api/telegram/new_address', { method: 'POST', body: { initData, address: `${name}@${domain}`, cf_token: token, enableRandomSubdomain: random } })
  const choose = async (jwt: string) => { appStore.setState({ jwt, mailboxAccessMode: 'standard' }); await api.getSettings(); navigate(getPathWithLocale(MAIL_ROUTES.mailbox, locale)) }
  const unbind = async (address: string) => { if (!(await confirmAction({ title: t('unbindAddress'), description: address, destructive: true }))) return; try { await api.fetch('/api/telegram/unbind_address', { method: 'POST', body: { initData, address } }); await query.refetch(); toast.success(t('addressUnbound')) } catch (error) { toast.error(stringifyError(error)) } }
  return <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-8"><section className="w-full max-w-2xl"><Tabs defaultValue="addresses"><TabsList className="mb-5 grid w-full grid-cols-2"><TabsTrigger value="addresses">{t('addresses')}</TabsTrigger><TabsTrigger value="connect">{t('addAddress')}</TabsTrigger></TabsList><TabsContent value="addresses"><div className="flex min-h-11 items-center justify-between border-b border-border"><span className="text-sm font-semibold">{t('telegramAddresses')}</span><Button size="icon" variant="ghost" title={t('refresh')} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} /></Button></div><Table><TableHeader><TableRow><TableHead>{t('addresses')}</TableHead><TableHead className="w-28 text-right">{t('actions')}</TableHead></TableRow></TableHeader><TableBody>{(query.data || []).map((row) => <TableRow key={row.address}><TableCell className="font-medium">{row.address}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title={t('open')} onClick={() => choose(row.jwt)}><Mail /></Button><Button size="icon" variant="ghost" className="text-destructive" title={t('unbind')} onClick={() => unbind(row.address)}><Trash2 /></Button></div></TableCell></TableRow>)}</TableBody></Table></TabsContent><TabsContent value="connect"><AddressLogin newAddressPath={create} bindUserAddress={bind} /></TabsContent></Tabs></section></main>
}
