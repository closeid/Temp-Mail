import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Database, MoreHorizontal, Plus, Save, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { SettingRow, SettingsLayout } from '@/components/layout/settings-layout'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { copyText, hashPassword, stringifyError } from '@/lib/utils'
import { DataTablePage } from './data-table-page'
import { ObjectSettings } from './object-settings'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { ADMIN_PAGE_ROUTES } from '@/app/routes'

const run = async (action: () => Promise<any>, success?: string) => { try { await action(); if (success) toast.success(success); return true } catch (error) { toast.error(stringifyError(error)); return false } }

function Actions({ children }: { children: React.ReactNode }) {
  const { t } = useScopedI18n('ui.common')
  return <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" title={t('actions')}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{children}</DropdownMenuContent></DropdownMenu>
}

export function AccountTable() {
  const { t } = useScopedI18n('views.admin.Account')
  const { locale } = useI18n()
  const navigate = useNavigate()
  const commonT = useScopedI18n('ui.common').t
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
  return <><DataTablePage endpoint="/api/admin/address" columns={columns} actions={(row, refetch) => <Actions>
    <DropdownMenuItem onSelect={async () => { const jwt = await api.adminShowAddressCredential(row.id); setCredential({ address: row.name, jwt }) }}>{t('showCredential')}</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => navigate(`${getPathWithLocale(ADMIN_PAGE_ROUTES.mails, locale)}?address=${encodeURIComponent(row.name)}`)}>{t('viewMails')}</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => navigate(`${getPathWithLocale(ADMIN_PAGE_ROUTES.sendBox, locale)}?address=${encodeURIComponent(row.name)}`)}>{t('viewSendBox')}</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem disabled={!row.mail_count} onSelect={async () => { if (await confirmAction({ title: t('clearInbox'), description: row.name, destructive: true }) && await run(() => api.fetch(`/api/admin/clear_inbox/${row.id}`, { method: 'DELETE' }))) await refetch() }}>{t('clearInbox')}</DropdownMenuItem>
    <DropdownMenuItem disabled={!row.send_count} onSelect={async () => { if (await confirmAction({ title: t('clearSentItems'), description: row.name, destructive: true }) && await run(() => api.fetch(`/api/admin/clear_sent_items/${row.id}`, { method: 'DELETE' }))) await refetch() }}>{t('clearSentItems')}</DropdownMenuItem>
    {open.enableAddressPassword && <DropdownMenuItem onSelect={async () => { const password = await promptAction({ title: t('resetPassword'), description: row.name, inputType: 'password' }); if (password) { const hashed = await hashPassword(password); await run(() => api.fetch(`/api/admin/address/${row.id}/reset_password`, { method: 'POST', body: { password: hashed } })) } }}>{t('resetPassword')}</DropdownMenuItem>}
    <DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onSelect={async () => { if (await confirmAction({ title: t('deleteAccount'), description: row.name, destructive: true }) && await run(() => api.adminDeleteAddress(row.id))) await refetch() }}><Trash2 />{t('delete')}</DropdownMenuItem>
  </Actions>} />
  <Dialog open={Boolean(credential)} onOpenChange={(value) => !value && setCredential(null)}><DialogContent><DialogHeader><DialogTitle>{t('addressCredential')}</DialogTitle><DialogDescription>{credential?.address}</DialogDescription></DialogHeader><code className="max-h-64 overflow-auto break-all rounded-md bg-muted p-3 text-xs">{credential?.jwt}</code><DialogFooter><Button variant="secondary" onClick={() => credential && copyText(credential.jwt).then(() => toast.success(commonT('copied')))}><Copy />{commonT('copy')}</Button></DialogFooter></DialogContent></Dialog>
  </>
}

export function CreateAddressPage() {
  const { t } = useScopedI18n('ui.admin')
  const settings = useAppStore((state) => state.openSettings)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState(settings.domains[0]?.value || '')
  const [prefix, setPrefix] = useState(Boolean(settings.prefix))
  const [random, setRandom] = useState(false)
  const [result, setResult] = useState<Record<string, string> | null>(null)
  useEffect(() => { if (!domain && settings.domains[0]) setDomain(settings.domains[0].value) }, [domain, settings.domains])
  const create = async () => { if (!name || !domain) return toast.error(t('completeAllFields')); try { setResult(await api.fetch('/api/admin/new_address', { method: 'POST', body: { enablePrefix: prefix, enableRandomSubdomain: random, name, domain } })); toast.success(t('addressCreated')) } catch (error) { toast.error(stringifyError(error)) } }
  return <div className="h-full overflow-auto"><div className="mx-auto grid max-w-2xl gap-5 p-5"><Field label={t('address')}><div className="flex"><Input className="h-10 rounded-r-none" value={name} onChange={(event) => setName(event.target.value)} /><span className="grid h-10 place-items-center border-y border-border bg-muted px-2">@</span><Select value={domain} onValueChange={setDomain}><SelectTrigger className="h-10 w-[220px] rounded-l-none"><SelectValue /></SelectTrigger><SelectContent>{settings.domains.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></Field>{settings.prefix && <label className="flex items-center justify-between border-b border-border pb-3 text-sm font-medium"><span>{t('useConfiguredPrefix', { prefix: settings.prefix })}</span><Switch checked={prefix} onCheckedChange={setPrefix} /></label>}{settings.randomSubdomainDomains.includes(domain) && <label className="flex items-center justify-between border-b border-border pb-3 text-sm font-medium"><span>{t('useRandomSubdomain')}</span><Switch checked={random} onCheckedChange={setRandom} /></label>}<Button onClick={create}><Plus />{t('createAddress')}</Button>{result && <div className="grid gap-3 border-t border-border pt-4"><Field label={t('address')}><Input readOnly value={result.address || ''} /></Field><Field label={t('credential')}><div className="flex gap-2"><Input className="font-mono text-xs" readOnly value={result.jwt || ''} /><Button size="icon" variant="secondary" onClick={() => copyText(result.jwt || '')}><Copy /></Button></div></Field>{result.password && <Field label={t('password')}><Input readOnly value={result.password} /></Field>}</div>}</div></div>
}

export function UserTable() {
  const { t } = useScopedI18n('ui.admin')
  const client = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [addressesFor, setAddressesFor] = useState<number | null>(null)
  const addresses = useQuery({ queryKey: ['admin-user-addresses', addressesFor], queryFn: () => api.fetch<{ results?: any[] }>(`/api/admin/users/bind_address/${addressesFor}`), enabled: addressesFor != null })
  const create = async () => { if (!email || !password) return; const hashed = await hashPassword(password); if (await run(() => api.fetch('/api/admin/users', { method: 'POST', body: { email, password: hashed } }), t('userCreated'))) { setCreateOpen(false); setEmail(''); setPassword(''); await client.invalidateQueries({ queryKey: ['admin-table', '/api/admin/users'] }) } }
  const columns = [{ key: 'id', label: 'ID', className: 'numeric w-16' }, { key: 'user_email', label: t('email'), className: 'font-medium' }, { key: 'role_text', label: t('role') }, { key: 'address_count', label: t('addresses'), className: 'numeric text-right' }, { key: 'created_at', label: t('created'), className: 'numeric text-xs text-muted-foreground' }]
  return <><DataTablePage endpoint="/api/admin/users" columns={columns} leading={<Button onClick={() => setCreateOpen(true)}><Plus />{t('createUser')}</Button>} actions={(row, refetch) => <Actions><DropdownMenuItem disabled={!row.address_count} onSelect={() => setAddressesFor(row.id)}>{t('manageAddresses')}</DropdownMenuItem><DropdownMenuItem onSelect={async () => { const role = await promptAction({ title: t('changeRole'), defaultValue: row.role_text || '' }); if (role !== null && await run(() => api.fetch('/api/admin/user_roles', { method: 'POST', body: { user_id: row.id, role_text: role } }))) await refetch() }}>{t('changeRole')}</DropdownMenuItem><DropdownMenuItem onSelect={async () => { const value = await promptAction({ title: t('resetPassword'), description: row.user_email, inputType: 'password' }); if (value) { const hashed = await hashPassword(value); await run(() => api.fetch(`/api/admin/users/${row.id}/reset_password`, { method: 'POST', body: { password: hashed } })) } }}>{t('resetPassword')}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onSelect={async () => { if (await confirmAction({ title: t('deleteUser'), description: row.user_email, destructive: true }) && await run(() => api.fetch(`/api/admin/users/${row.id}`, { method: 'DELETE' }))) await refetch() }}><Trash2 />{t('delete')}</DropdownMenuItem></Actions>} />
  <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>{t('createUser')}</DialogTitle></DialogHeader><Field label={t('email')}><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label={t('password')}><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><DialogFooter><Button onClick={create}>{t('createUser')}</Button></DialogFooter></DialogContent></Dialog>
  <Dialog open={addressesFor != null} onOpenChange={(value) => !value && setAddressesFor(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{t('boundAddresses')}</DialogTitle></DialogHeader><div className="max-h-[60dvh] overflow-auto"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>{t('address')}</TableHead><TableHead>{t('created')}</TableHead></TableRow></TableHeader><TableBody>{(addresses.data?.results || []).map((row) => <TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{row.name || row.address}</TableCell><TableCell>{row.created_at}</TableCell></TableRow>)}</TableBody></Table></div></DialogContent></Dialog></>
}

export function SenderAccessPage() {
  const { t } = useScopedI18n('ui.admin')
  const commonT = useScopedI18n('ui.common').t
  const [editing, setEditing] = useState<Record<string, any> | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [balance, setBalance] = useState(0)
  const columns = [{ key: 'id', label: 'ID', className: 'numeric w-16' }, { key: 'address', label: t('address'), className: 'font-medium' }, { key: 'created_at', label: t('created'), className: 'numeric text-xs' }, { key: 'balance', label: t('balance'), className: 'numeric text-right' }, { key: 'enabled', label: commonT('enabled'), render: (row: any) => row.enabled ? commonT('yes') : commonT('no') }]
  return <><DataTablePage endpoint="/api/admin/address_sender" queryName="address" columns={columns} actions={(row, refetch) => <Actions><DropdownMenuItem onSelect={() => { setEditing({ ...row, refetch }); setEnabled(Boolean(row.enabled)); setBalance(Number(row.balance || 0)) }}>{t('modify')}</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={async () => { if (await confirmAction({ title: t('deleteSenderAccess'), description: row.address, destructive: true }) && await run(() => api.fetch(`/api/admin/address_sender/${row.id}`, { method: 'DELETE' }))) await refetch() }}><Trash2 />{t('delete')}</DropdownMenuItem></Actions>} />
  <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{t('senderAccess')}</DialogTitle><DialogDescription>{editing?.address}</DialogDescription></DialogHeader><label className="flex items-center justify-between text-sm font-medium"><span>{commonT('enabled')}</span><Switch checked={enabled} onCheckedChange={setEnabled} /></label><Field label={t('balance')}><Input type="number" min={0} max={1000} value={balance} onChange={(event) => setBalance(Number(event.target.value))} /></Field><DialogFooter><Button onClick={async () => { if (!editing) return; if (await run(() => api.fetch('/api/admin/address_sender', { method: 'POST', body: { address: editing.address, address_id: editing.id, balance, enabled: enabled ? 1 : 0 } }))) { await editing.refetch(); setEditing(null) } }}><Save />{commonT('save')}</Button></DialogFooter></DialogContent></Dialog></>
}

export function DatabasePage() {
  const { t } = useScopedI18n('ui.admin')
  const commonT = useScopedI18n('ui.common').t
  const query = useQuery({ queryKey: ['admin-db-version'], queryFn: () => api.fetch<any>('/api/admin/db_version') })
  const act = async (endpoint: string) => { if (await run(() => api.fetch(endpoint, { method: 'POST' }))) await query.refetch() }
  return <div className="h-full overflow-auto"><div className="mx-auto grid max-w-3xl gap-4 p-5"><div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border"><div className="bg-background p-4"><span className="text-xs text-muted-foreground">{t('currentDatabase')}</span><p className="numeric mt-1 text-lg font-semibold">{query.data?.current_db_version || commonT('unknown')}</p></div><div className="bg-background p-4"><span className="text-xs text-muted-foreground">{t('codeDatabase')}</span><p className="numeric mt-1 text-lg font-semibold">{query.data?.code_db_version || commonT('unknown')}</p></div></div>{query.data?.need_initialization && <div className="flex items-center justify-between gap-3 border-b border-border py-4"><p>{t('databaseInitializationRequired')}</p><Button onClick={() => act('/api/admin/db_initialize')}><Database />{t('initialize')}</Button></div>}{query.data?.need_migration && <div className="flex items-center justify-between gap-3 border-b border-border py-4"><p>{t('databaseMigrationRequired')}</p><Button onClick={() => act('/api/admin/db_migration')}><Wrench />{t('migrate')}</Button></div>}</div></div>
}

export function WorkerConfigPage() {
  const query = useQuery({ queryKey: ['admin-worker-config'], queryFn: () => api.fetch('/api/admin/worker/configs') })
  return <div className="h-full overflow-auto p-4"><pre className="mx-auto max-w-5xl overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/35 p-4 text-xs">{JSON.stringify(query.data || {}, null, 2)}</pre></div>
}

export function StatisticsPage() {
  const { t } = useScopedI18n('ui.admin')
  const query = useQuery({ queryKey: ['admin-statistics'], queryFn: () => api.fetch<Record<string, number>>('/api/admin/statistics') })
  return <div className="h-full overflow-auto"><div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">{Object.entries(query.data || {}).map(([key, value]) => <div key={key} className="min-h-32 bg-background p-5"><span className="text-xs text-muted-foreground">{t(key)}</span><p className="numeric mt-3 text-2xl font-semibold">{value || 0}</p></div>)}</div></div>
}

export function MaintenancePage() {
  const { t } = useScopedI18n('ui.admin')
  const cleanup = async () => { const type = await promptAction({ title: t('cleanupType'), description: t('cleanupTypeDescription'), defaultValue: 'mails' }); if (!type) return; const daysValue = await promptAction({ title: t('retentionPeriod'), description: t('retentionDescription'), defaultValue: '30', inputType: 'number' }); if (daysValue == null) return; const days = Number(daysValue); if (Number.isFinite(days)) await run(() => api.fetch('/api/admin/cleanup', { method: 'POST', body: { cleanType: type, cleanDays: days } }), t('cleanupCompleted')) }
  return <ObjectSettings endpoint="/api/admin/auto_cleanup" title={t('automaticCleanup')} description={t('automaticCleanupDescription')} extraActions={<Button variant="secondary" onClick={cleanup}><Trash2 />{t('cleanupNow')}</Button>} />
}

export function RoleAddressConfigPage() {
  const { t } = useScopedI18n('views.admin.RoleAddressConfig')
  const commonT = useScopedI18n('ui.common').t
  const adminT = useScopedI18n('views.Admin').t
  const sessionT = useScopedI18n('ui.admin').t
  const client = useQueryClient()
  const roles = useQuery({ queryKey: ['admin-user-roles'], queryFn: () => api.fetch<any[]>('/api/admin/user_roles') })
  const config = useQuery({ queryKey: ['admin-role-address'], queryFn: () => api.fetch<{ configs?: Record<string, { maxAddressCount?: number }> }>('/api/admin/role_address_config') })
  const [rows, setRows] = useState<Array<{ id: string; role: string; maxAddressCount: string; fixed: boolean }>>([{ id: 'empty:0', role: '', maxAddressCount: '', fixed: false }])
  useEffect(() => {
    if (!roles.data || !config.data) return
    const configs = config.data.configs || {}
    const fixedRoles = (roles.data || []).map((item) => String(item.role || '').trim()).filter(Boolean)
    const names = [...new Set([...fixedRoles, ...Object.keys(configs)])]
    setRows((names.length ? names : ['']).map((role, index) => ({
      id: role ? `role:${role}` : `empty:${index}`,
      role,
      maxAddressCount: role && configs[role]?.maxAddressCount != null ? String(configs[role].maxAddressCount) : '',
      fixed: fixedRoles.includes(role),
    })))
  }, [config.data, roles.data])
  const update = (id: string, patch: Partial<{ role: string; maxAddressCount: string }>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row))
  const add = () => setRows((current) => [...current, { id: `new:${Date.now()}:${current.length}`, role: '', maxAddressCount: '', fixed: false }])
  const remove = (id: string) => setRows((current) => current.filter((row) => row.id !== id))
  const save = async () => {
    const configured = rows.map((row) => ({ role: row.role.trim(), value: row.maxAddressCount.trim() })).filter((row) => row.role || row.value)
    if (configured.some((row) => !row.role)) return toast.error(sessionT('completeAllFields'))
    if (new Set(configured.map((row) => row.role)).size !== configured.length) return toast.error(sessionT('duplicateRole'))
    if (configured.some((row) => row.value && (!Number.isInteger(Number(row.value)) || Number(row.value) < 0))) return toast.error(sessionT('invalidRoleLimit'))
    const configs = Object.fromEntries(configured.filter((row) => row.value !== '').map((row) => [row.role, { maxAddressCount: Number(row.value) }]))
    if (await run(() => api.fetch('/api/admin/role_address_config', { method: 'POST', body: { configs } }), commonT('saved'))) await client.invalidateQueries({ queryKey: ['admin-role-address'] })
  }
  return <SettingsLayout title={adminT('roleAddressConfig')} description={t('roleConfigDesc')} action={<div className="flex shrink-0 gap-2"><Button variant="secondary" onClick={add}><Plus />{sessionT('addRoleLimit')}</Button><Button onClick={save}><Save />{commonT('save')}</Button></div>}>
    {(roles.isLoading || config.isLoading) && <p className="py-8 text-center text-sm text-muted-foreground">{commonT('loading')}</p>}
    {!roles.isLoading && !config.isLoading && <div className="grid gap-5">
      {rows.map((row) => <div key={row.id} className="grid gap-3 border-b border-border pb-5 last:border-0 sm:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_36px] sm:items-end">
        <Field label={t('role')} description={row.fixed ? sessionT('configuredWorkerRole') : undefined}><Input disabled={row.fixed} placeholder={sessionT('roleNamePlaceholder')} value={row.role} onChange={(event) => update(row.id, { role: event.target.value })} /></Field>
        <Field label={t('maxAddressCount')}><Input type="number" min={0} step={1} placeholder={commonT('notConfigured')} value={row.maxAddressCount} onChange={(event) => update(row.id, { maxAddressCount: event.target.value })} /></Field>
        <Button className="mb-0.5" size="icon" variant="ghost" title={commonT('delete')} disabled={row.fixed} onClick={() => remove(row.id)}><Trash2 /></Button>
      </div>)}
      <p className="text-xs leading-5 text-muted-foreground">{sessionT('roleLimitHelp')}</p>
    </div>}
  </SettingsLayout>
}

export function TelegramAdminPage() {
  const adminT = useScopedI18n('ui.admin').t
  const telegramT = useScopedI18n('views.admin.Telegram').t
  const status = useQuery({ queryKey: ['admin-telegram-status'], queryFn: () => api.fetch('/api/admin/telegram/status'), enabled: false })
  const init = async () => { await run(() => api.fetch('/api/admin/telegram/init', { method: 'POST' }), adminT('telegramInitialized')); await status.refetch() }
  return <ObjectSettings endpoint="/api/admin/telegram/settings" title="Telegram" extraActions={<><Button variant="secondary" onClick={() => status.refetch()}>{telegramT('status')}</Button><Button variant="secondary" onClick={init}>{telegramT('init')}</Button></>} description={status.data ? JSON.stringify(status.data) : adminT('telegramDescription')} />
}

export function AdminInbox({ unknown = false }: { unknown?: boolean }) {
  const [searchParams] = useSearchParams()
  const address = searchParams.get('address') || ''
  return <Mailbox queryKey={['admin-inbox', unknown, address]} fetchMailData={(limit, offset) => api.fetch(`${unknown ? '/api/admin/mails_unknow' : '/api/admin/mails'}?limit=${limit}&offset=${offset}${!unknown && address ? `&address=${encodeURIComponent(address)}` : ''}`)} deleteMail={(id) => api.fetch(`/api/admin/mails/${id}`, { method: 'DELETE' })} canDelete showEmailTo showFilter />
}

export function AdminSentBox() {
  const [searchParams] = useSearchParams()
  const address = searchParams.get('address') || ''
  return <SentBox queryKey={['admin-sent', address]} fetchMailData={(limit, offset) => api.fetch(`/api/admin/sendbox?limit=${limit}&offset=${offset}${address ? `&address=${encodeURIComponent(address)}` : ''}`)} deleteMail={(id) => api.fetch(`/api/admin/sendbox/${id}`, { method: 'DELETE' })} canDelete showEmailFrom />
}

export function AdminMailWebhook() {
  const enabled = useAppStore((state) => state.openSettings.enableWebhook)
  const { t } = useScopedI18n('ui.admin')
  return <WebhookSettings
    fetchData={() => api.fetch('/api/admin/mail_webhook/settings')}
    saveSettings={(model) => api.fetch('/api/admin/mail_webhook/settings', { method: 'POST', body: model })}
    testSettings={(model) => api.fetch('/api/admin/mail_webhook/test', { method: 'POST', body: model })}
    notice={!enabled ? t('webhookDeliveryDisabled') : undefined}
    unavailableTitle={t('webhookConfigurationUnavailable')}
  />
}
export function AdminSendMail() { return <SendMailPage admin /> }
