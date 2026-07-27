import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Database, KeyRound, MoreHorizontal, Plus, Save, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction, promptAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Mailbox } from '@/features/mail/mailbox'
import { SentBox } from '@/features/mail/sent-box'
import { SendMailPage } from '@/features/settings/send-mail'
import { WebhookSettings } from '@/features/settings/webhook-settings'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { copyText, hashPassword, stringifyError } from '@/lib/utils'
import { DataTablePage } from './data-table-page'
import { ObjectSettings } from './object-settings'
import { useScopedI18n } from '@/i18n/react'

const run = async (action: () => Promise<any>, success = 'Done') => { try { await action(); toast.success(success); return true } catch (error) { toast.error(stringifyError(error)); return false } }

function Actions({ children }: { children: React.ReactNode }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" title="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{children}</DropdownMenuContent></DropdownMenu>
}

export function AccountTable() {
  const { t } = useScopedI18n('views.admin.Account')
  const open = useAppStore((state) => state.openSettings)
  const [credential, setCredential] = useState<{ address: string; jwt: string } | null>(null)
  const columns = [
    { key: 'id', label: 'ID', className: 'numeric w-16' },
    { key: 'name', label: t('name'), className: 'font-medium' },
    { key: 'created_at', label: t('created_at'), className: 'numeric whitespace-nowrap text-xs text-muted-foreground' },
    { key: 'updated_at', label: t('updated_at'), className: 'numeric whitespace-nowrap text-xs text-muted-foreground' },
    { key: 'source_meta', label: t('source_meta'), className: 'text-xs' },
    { key: 'mail_count', label: t('mail_count'), className: 'numeric text-right' },
    { key: 'send_count', label: t('send_count'), className: 'numeric text-right' },
  ]
  return <><DataTablePage endpoint="/admin/address" columns={columns} actions={(row, refetch) => <Actions>
    <DropdownMenuItem onSelect={async () => { const jwt = await api.adminShowAddressCredential(row.id); setCredential({ address: row.name, jwt }) }}><KeyRound />Show credential</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => appStore.setState({ adminTab: 'mails', adminMailTabAddress: row.name })}>View inbox</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => appStore.setState({ adminTab: 'mails', adminSendBoxTabAddress: row.name })}>View sent mail</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem disabled={!row.mail_count} onSelect={async () => { if (await confirmAction({ title: 'Clear inbox', description: row.name, destructive: true }) && await run(() => api.fetch(`/admin/clear_inbox/${row.id}`, { method: 'DELETE' }))) await refetch() }}>Clear inbox</DropdownMenuItem>
    <DropdownMenuItem disabled={!row.send_count} onSelect={async () => { if (await confirmAction({ title: 'Clear sent mail', description: row.name, destructive: true }) && await run(() => api.fetch(`/admin/clear_sent_items/${row.id}`, { method: 'DELETE' }))) await refetch() }}>Clear sent mail</DropdownMenuItem>
    {open.enableAddressPassword && <DropdownMenuItem onSelect={async () => { const password = await promptAction({ title: 'Reset password', description: row.name, inputType: 'password' }); if (password) { const hashed = await hashPassword(password); await run(() => api.fetch(`/admin/address/${row.id}/reset_password`, { method: 'POST', body: { password: hashed } })) } }}>Reset password</DropdownMenuItem>}
    <DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onSelect={async () => { if (await confirmAction({ title: 'Delete address', description: row.name, destructive: true }) && await run(() => api.adminDeleteAddress(row.id))) await refetch() }}><Trash2 />Delete</DropdownMenuItem>
  </Actions>} />
  <Dialog open={Boolean(credential)} onOpenChange={(value) => !value && setCredential(null)}><DialogContent><DialogHeader><DialogTitle>Address credential</DialogTitle><DialogDescription>{credential?.address}</DialogDescription></DialogHeader><code className="max-h-64 overflow-auto break-all rounded-md bg-muted p-3 text-xs">{credential?.jwt}</code><DialogFooter><Button variant="secondary" onClick={() => credential && copyText(credential.jwt).then(() => toast.success('Copied'))}><Copy />Copy</Button></DialogFooter></DialogContent></Dialog>
  </>
}

export function CreateAddressPage() {
  const settings = useAppStore((state) => state.openSettings)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState(settings.domains[0]?.value || '')
  const [prefix, setPrefix] = useState(Boolean(settings.prefix))
  const [random, setRandom] = useState(false)
  const [result, setResult] = useState<Record<string, string> | null>(null)
  useEffect(() => { if (!domain && settings.domains[0]) setDomain(settings.domains[0].value) }, [domain, settings.domains])
  const create = async () => { if (!name || !domain) return toast.error('Complete all fields'); try { setResult(await api.fetch('/admin/new_address', { method: 'POST', body: { enablePrefix: prefix, enableRandomSubdomain: random, name, domain } })); toast.success('Address created') } catch (error) { toast.error(stringifyError(error)) } }
  return <div className="h-full overflow-auto"><div className="mx-auto grid max-w-2xl gap-5 p-5"><Field label="Address"><div className="flex"><Input className="rounded-r-none" value={name} onChange={(event) => setName(event.target.value)} /><span className="grid h-10 place-items-center border-y border-border bg-muted px-2">@</span><Select value={domain} onValueChange={setDomain}><SelectTrigger className="w-[220px] rounded-l-none"><SelectValue /></SelectTrigger><SelectContent>{settings.domains.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></Field>{settings.prefix && <label className="flex items-center justify-between border-b border-border pb-3 text-sm font-medium"><span>Use configured prefix ({settings.prefix})</span><Switch checked={prefix} onCheckedChange={setPrefix} /></label>}{settings.randomSubdomainDomains.includes(domain) && <label className="flex items-center justify-between border-b border-border pb-3 text-sm font-medium"><span>Use random subdomain</span><Switch checked={random} onCheckedChange={setRandom} /></label>}<Button onClick={create}><Plus />Create address</Button>{result && <div className="grid gap-3 border-t border-border pt-4"><Field label="Address"><Input readOnly value={result.address || ''} /></Field><Field label="Credential"><div className="flex gap-2"><Input className="font-mono text-xs" readOnly value={result.jwt || ''} /><Button size="icon" variant="secondary" onClick={() => copyText(result.jwt || '')}><Copy /></Button></div></Field>{result.password && <Field label="Password"><Input readOnly value={result.password} /></Field>}</div>}</div></div>
}

export function UserTable() {
  const client = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [addressesFor, setAddressesFor] = useState<number | null>(null)
  const addresses = useQuery({ queryKey: ['admin-user-addresses', addressesFor], queryFn: () => api.fetch<{ results?: any[] }>(`/admin/users/bind_address/${addressesFor}`), enabled: addressesFor != null })
  const create = async () => { if (!email || !password) return; const hashed = await hashPassword(password); if (await run(() => api.fetch('/admin/users', { method: 'POST', body: { email, password: hashed } }), 'User created')) { setCreateOpen(false); setEmail(''); setPassword(''); await client.invalidateQueries({ queryKey: ['admin-table', '/admin/users'] }) } }
  const columns = [{ key: 'id', label: 'ID', className: 'numeric w-16' }, { key: 'user_email', label: 'Email', className: 'font-medium' }, { key: 'role_text', label: 'Role' }, { key: 'address_count', label: 'Addresses', className: 'numeric text-right' }, { key: 'created_at', label: 'Created', className: 'numeric text-xs text-muted-foreground' }]
  return <><DataTablePage endpoint="/admin/users" columns={columns} leading={<Button onClick={() => setCreateOpen(true)}><Plus />Create user</Button>} actions={(row, refetch) => <Actions><DropdownMenuItem disabled={!row.address_count} onSelect={() => setAddressesFor(row.id)}>Manage addresses</DropdownMenuItem><DropdownMenuItem onSelect={async () => { const role = await promptAction({ title: 'Change role', defaultValue: row.role_text || '' }); if (role !== null && await run(() => api.fetch('/admin/user_roles', { method: 'POST', body: { user_id: row.id, role_text: role } }))) await refetch() }}>Change role</DropdownMenuItem><DropdownMenuItem onSelect={async () => { const value = await promptAction({ title: 'Reset password', description: row.user_email, inputType: 'password' }); if (value) { const hashed = await hashPassword(value); await run(() => api.fetch(`/admin/users/${row.id}/reset_password`, { method: 'POST', body: { password: hashed } })) } }}>Reset password</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onSelect={async () => { if (await confirmAction({ title: 'Delete user', description: row.user_email, destructive: true }) && await run(() => api.fetch(`/admin/users/${row.id}`, { method: 'DELETE' }))) await refetch() }}><Trash2 />Delete</DropdownMenuItem></Actions>} />
  <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader><Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><DialogFooter><Button onClick={create}>Create</Button></DialogFooter></DialogContent></Dialog>
  <Dialog open={addressesFor != null} onOpenChange={(value) => !value && setAddressesFor(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Bound addresses</DialogTitle></DialogHeader><div className="max-h-[60dvh] overflow-auto"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Address</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>{(addresses.data?.results || []).map((row) => <TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{row.name || row.address}</TableCell><TableCell>{row.created_at}</TableCell></TableRow>)}</TableBody></Table></div></DialogContent></Dialog></>
}

export function SenderAccessPage() {
  const [editing, setEditing] = useState<Record<string, any> | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [balance, setBalance] = useState(0)
  const columns = [{ key: 'id', label: 'ID', className: 'numeric w-16' }, { key: 'address', label: 'Address', className: 'font-medium' }, { key: 'created_at', label: 'Created', className: 'numeric text-xs' }, { key: 'balance', label: 'Balance', className: 'numeric text-right' }, { key: 'enabled', label: 'Enabled', render: (row: any) => row.enabled ? 'Yes' : 'No' }]
  return <><DataTablePage endpoint="/admin/address_sender" queryName="address" columns={columns} actions={(row, refetch) => <Actions><DropdownMenuItem onSelect={() => { setEditing({ ...row, refetch }); setEnabled(Boolean(row.enabled)); setBalance(Number(row.balance || 0)) }}>Modify</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={async () => { if (await confirmAction({ title: 'Delete sender access', description: row.address, destructive: true }) && await run(() => api.fetch(`/admin/address_sender/${row.id}`, { method: 'DELETE' }))) await refetch() }}><Trash2 />Delete</DropdownMenuItem></Actions>} />
  <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Sender access</DialogTitle><DialogDescription>{editing?.address}</DialogDescription></DialogHeader><label className="flex items-center justify-between text-sm font-medium"><span>Enabled</span><Switch checked={enabled} onCheckedChange={setEnabled} /></label><Field label="Balance"><Input type="number" min={0} max={1000} value={balance} onChange={(event) => setBalance(Number(event.target.value))} /></Field><DialogFooter><Button onClick={async () => { if (!editing) return; if (await run(() => api.fetch('/admin/address_sender', { method: 'POST', body: { address: editing.address, address_id: editing.id, balance, enabled: enabled ? 1 : 0 } }))) { await editing.refetch(); setEditing(null) } }}><Save />Save</Button></DialogFooter></DialogContent></Dialog></>
}

export function DatabasePage() {
  const query = useQuery({ queryKey: ['admin-db-version'], queryFn: () => api.fetch<any>('/admin/db_version') })
  const act = async (endpoint: string) => { if (await run(() => api.fetch(endpoint, { method: 'POST' }))) await query.refetch() }
  return <div className="h-full overflow-auto"><div className="mx-auto grid max-w-3xl gap-4 p-5"><div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border"><div className="bg-background p-4"><span className="text-xs text-muted-foreground">Current database</span><p className="numeric mt-1 text-lg font-semibold">{query.data?.current_db_version || 'unknown'}</p></div><div className="bg-background p-4"><span className="text-xs text-muted-foreground">Code database</span><p className="numeric mt-1 text-lg font-semibold">{query.data?.code_db_version || 'unknown'}</p></div></div>{query.data?.need_initialization && <div className="flex items-center justify-between gap-3 border-b border-border py-4"><p>Database initialization is required.</p><Button onClick={() => act('/admin/db_initialize')}><Database />Initialize</Button></div>}{query.data?.need_migration && <div className="flex items-center justify-between gap-3 border-b border-border py-4"><p>Database migration is required.</p><Button onClick={() => act('/admin/db_migration')}><Wrench />Migrate</Button></div>}</div></div>
}

export function WorkerConfigPage() {
  const query = useQuery({ queryKey: ['admin-worker-config'], queryFn: () => api.fetch('/admin/worker/configs') })
  return <div className="h-full overflow-auto p-4"><pre className="mx-auto max-w-5xl overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/35 p-4 text-xs">{JSON.stringify(query.data || {}, null, 2)}</pre></div>
}

export function StatisticsPage() {
  const query = useQuery({ queryKey: ['admin-statistics'], queryFn: () => api.fetch<Record<string, number>>('/admin/statistics') })
  return <div className="h-full overflow-auto"><div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">{Object.entries(query.data || {}).map(([key, value]) => <div key={key} className="min-h-32 bg-background p-5"><span className="text-xs text-muted-foreground">{key.replace(/([a-z])([A-Z])/g, '$1 $2')}</span><p className="numeric mt-3 text-2xl font-semibold">{value || 0}</p></div>)}</div></div>
}

export function MaintenancePage() {
  const cleanup = async () => { const type = await promptAction({ title: 'Cleanup type', description: 'mails, mails_unknow, sendbox, addressCreated, inactiveAddress, unboundAddress, emptyAddress', defaultValue: 'mails' }); if (!type) return; const daysValue = await promptAction({ title: 'Retention period', description: 'Delete records older than this many days.', defaultValue: '30', inputType: 'number' }); if (daysValue == null) return; const days = Number(daysValue); if (Number.isFinite(days)) await run(() => api.fetch('/admin/cleanup', { method: 'POST', body: { cleanType: type, cleanDays: days } }), 'Cleanup completed') }
  return <ObjectSettings endpoint="/admin/auto_cleanup" title="Automatic cleanup" description="Configure scheduled cleanup policies." extraActions={<Button variant="secondary" onClick={cleanup}><Trash2 />Cleanup now</Button>} />
}

export function RoleAddressConfigPage() {
  const client = useQueryClient()
  const roles = useQuery({ queryKey: ['admin-user-roles'], queryFn: () => api.fetch<any[]>('/admin/user_roles') })
  const config = useQuery({ queryKey: ['admin-role-address'], queryFn: () => api.fetch<{ configs?: Record<string, { maxAddressCount?: number }> }>('/admin/role_address_config') })
  const [values, setValues] = useState<Record<string, string>>({})
  useEffect(() => { if (roles.data && config.data) setValues(Object.fromEntries(roles.data.map((item) => [item.role, String(config.data?.configs?.[item.role]?.maxAddressCount ?? '')]))) }, [config.data, roles.data])
  const save = async () => { const configs = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '').map(([role, value]) => [role, { maxAddressCount: Number(value) }])); if (await run(() => api.fetch('/admin/role_address_config', { method: 'POST', body: { configs } }))) await client.invalidateQueries({ queryKey: ['admin-role-address'] }) }
  return <div className="h-full overflow-auto"><header className="flex min-h-12 items-center justify-end border-b border-border px-4"><Button onClick={save}><Save />Save</Button></header><div className="mx-auto max-w-3xl px-4">{(roles.data || []).map((item) => <div key={item.role} className="grid grid-cols-[1fr_180px] items-center gap-4 border-b border-border py-3"><span className="font-medium">{item.role}</span><Input type="number" min={0} placeholder="Not configured" value={values[item.role] || ''} onChange={(event) => setValues((current) => ({ ...current, [item.role]: event.target.value }))} /></div>)}</div></div>
}

export function TelegramAdminPage() {
  const status = useQuery({ queryKey: ['admin-telegram-status'], queryFn: () => api.fetch('/admin/telegram/status'), enabled: false })
  const init = async () => { await run(() => api.fetch('/admin/telegram/init', { method: 'POST' }), 'Telegram initialized'); await status.refetch() }
  return <ObjectSettings endpoint="/admin/telegram/settings" title="Telegram" extraActions={<><Button variant="secondary" onClick={() => status.refetch()}>Status</Button><Button variant="secondary" onClick={init}>Initialize</Button></>} description={status.data ? JSON.stringify(status.data) : 'Configure the Telegram mini app and push rules.'} />
}

export function AdminInbox({ unknown = false }: { unknown?: boolean }) {
  const address = useAppStore((state) => state.adminMailTabAddress)
  return <Mailbox queryKey={['admin-inbox', unknown, address]} fetchMailData={(limit, offset) => api.fetch(`${unknown ? '/admin/mails_unknow' : '/admin/mails'}?limit=${limit}&offset=${offset}${!unknown && address ? `&address=${encodeURIComponent(address)}` : ''}`)} deleteMail={(id) => api.fetch(`/admin/mails/${id}`, { method: 'DELETE' })} canDelete showEmailTo showFilter />
}

export function AdminSentBox() {
  const address = useAppStore((state) => state.adminSendBoxTabAddress)
  return <SentBox queryKey={['admin-sent', address]} fetchMailData={(limit, offset) => api.fetch(`/admin/sendbox?limit=${limit}&offset=${offset}${address ? `&address=${encodeURIComponent(address)}` : ''}`)} deleteMail={(id) => api.fetch(`/admin/sendbox/${id}`, { method: 'DELETE' })} canDelete showEmailFrom />
}

export function AdminMailWebhook() { return <WebhookSettings fetchData={() => api.fetch('/admin/mail_webhook/settings')} saveSettings={(model) => api.fetch('/admin/mail_webhook/settings', { method: 'POST', body: model })} testSettings={(model) => api.fetch('/admin/mail_webhook/test', { method: 'POST', body: model })} /> }
export function AdminSendMail() { return <SendMailPage admin /> }
