import { useQuery } from '@tanstack/react-query'
import { Mail, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { AddressLogin } from '@/features/auth/address-login'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { stringifyError } from '@/lib/utils'

export function TelegramAddressPage() {
  const initData = useAppStore((state) => state.telegramInitData)
  const query = useQuery({ queryKey: ['telegram-addresses', initData], queryFn: () => api.fetch<any[]>('/api/telegram/get_bind_address', { method: 'POST', body: { initData } }), enabled: Boolean(initData) })
  const bind = () => api.fetch('/api/telegram/bind_address', { method: 'POST', body: { initData, jwt: appStore.getState().jwt } })
  const create = (name: string, domain: string, token: string, random: boolean) => api.fetch('/api/telegram/new_address', { method: 'POST', body: { initData, address: `${name}@${domain}`, cf_token: token, enableRandomSubdomain: random } })
  const choose = (jwt: string) => { appStore.setState({ jwt }); location.reload() }
  const unbind = async (address: string) => { if (!(await confirmAction({ title: 'Unbind address', description: address, destructive: true }))) return; try { await api.fetch('/api/telegram/unbind_address', { method: 'POST', body: { initData, address } }); await query.refetch(); toast.success('Address unbound') } catch (error) { toast.error(stringifyError(error)) } }
  return <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-8"><section className="w-full max-w-2xl"><Tabs defaultValue="addresses"><TabsList className="mb-5 grid w-full grid-cols-2"><TabsTrigger value="addresses">Addresses</TabsTrigger><TabsTrigger value="connect">Add address</TabsTrigger></TabsList><TabsContent value="addresses"><div className="flex min-h-11 items-center justify-between border-b border-border"><span className="text-sm font-semibold">Telegram addresses</span><Button size="icon" variant="ghost" onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} /></Button></div><Table><TableHeader><TableRow><TableHead>Address</TableHead><TableHead className="w-28 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{(query.data || []).map((row) => <TableRow key={row.address}><TableCell className="font-medium">{row.address}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="Open" onClick={() => choose(row.jwt)}><Mail /></Button><Button size="icon" variant="ghost" className="text-destructive" title="Unbind" onClick={() => unbind(row.address)}><Trash2 /></Button></div></TableCell></TableRow>)}</TableBody></Table></TabsContent><TabsContent value="connect"><AddressLogin newAddressPath={create} bindUserAddress={bind} /></TabsContent></Tabs></section></main>
}
