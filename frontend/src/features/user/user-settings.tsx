import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startRegistration } from '@simplewebauthn/browser'
import { KeyRound, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { api } from '@/lib/api'
import { appStore } from '@/lib/store'
import { formatDate, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export function UserSettingsPage() {
  const { t } = useScopedI18n('views.user.UserSettings')
  const [createOpen, setCreateOpen] = useState(false), [renameOpen, setRenameOpen] = useState(false), [listOpen, setListOpen] = useState(false), [logoutOpen, setLogoutOpen] = useState(false)
  const [name, setName] = useState(''), [current, setCurrent] = useState<any>(null)
  const passkeys = useQuery({ queryKey: ['passkeys'], queryFn: () => api.fetch<any[]>('/api/user/passkey'), enabled: listOpen })
  const create = async () => { try { const options = await api.fetch<any>('/api/user/passkey/register_request', { method: 'POST', body: { domain: location.hostname } }); const credential = await startRegistration({ optionsJSON: options }); await api.fetch('/api/user/passkey/register_response', { method: 'POST', body: { origin: location.origin, passkey_name: name || `${navigator.platform || 'Unknown'}: ${Math.random().toString(36).slice(7)}`, credential } }); toast.success(t('passkeyCreated')); setName(''); setCreateOpen(false); if (listOpen) await passkeys.refetch() } catch (error) { toast.error(stringifyError(error)) } }
  const rename = async () => { try { await api.fetch('/api/user/passkey/rename', { method: 'POST', body: { passkey_name: name, passkey_id: current.passkey_id } }); await passkeys.refetch(); setRenameOpen(false); setName('') } catch (error) { toast.error(stringifyError(error)) } }
  const remove = async (id: string) => { if (!(await confirmAction({ title: t('deletePasskey'), destructive: true }))) return; try { await api.fetch(`/api/user/passkey/${id}`, { method: 'DELETE' }); await passkeys.refetch() } catch (error) { toast.error(stringifyError(error)) } }
  const logout = () => { appStore.resetUser(); location.reload() }
  return <SettingsLayout><div className="grid gap-2"><Button className="justify-start" variant="secondary" onClick={() => { setListOpen(true); passkeys.refetch() }}><KeyRound />{t('showPasskeyList')}</Button><Button className="justify-start" variant="secondary" onClick={() => setCreateOpen(true)}><Plus />{t('createPasskey')}</Button><p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('passordTip')}</p><Button className="justify-start" variant="secondary" onClick={() => setLogoutOpen(true)}><LogOut />{t('logout')}</Button></div>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>{t('createPasskey')}</DialogTitle></DialogHeader><Input value={name} placeholder={t('passkeyNamePlaceholder')} onChange={(event) => setName(event.target.value)} /><DialogFooter><Button onClick={create}><Plus />{t('createPasskey')}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={renameOpen} onOpenChange={setRenameOpen}><DialogContent><DialogHeader><DialogTitle>{t('renamePasskey')}</DialogTitle></DialogHeader><Input value={name} placeholder={t('renamePasskeyNamePlaceholder')} onChange={(event) => setName(event.target.value)} /><DialogFooter><Button onClick={rename}><Pencil />{t('renamePasskey')}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={listOpen} onOpenChange={setListOpen}><DialogContent className="w-[min(820px,calc(100vw-32px))]"><DialogHeader><DialogTitle>{t('showPasskeyList')}</DialogTitle></DialogHeader><Table><TableHeader><TableRow><TableHead>Passkey ID</TableHead><TableHead>{t('passkey_name')}</TableHead><TableHead>{t('created_at')}</TableHead><TableHead>{t('actions')}</TableHead></TableRow></TableHeader><TableBody>{(passkeys.data || []).map((row) => <TableRow key={row.passkey_id}><TableCell className="numeric max-w-48 truncate text-xs">{row.passkey_id}</TableCell><TableCell>{row.passkey_name}</TableCell><TableCell className="numeric text-xs">{formatDate(row.created_at)}</TableCell><TableCell><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setCurrent(row); setName(row.passkey_name || ''); setRenameOpen(true) }}><Pencil /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(row.passkey_id)}><Trash2 /></Button></div></TableCell></TableRow>)}</TableBody></Table></DialogContent></Dialog>
    <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}><DialogContent><DialogHeader><DialogTitle>{t('logout')}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{t('logoutConfirm')}</p><DialogFooter><Button onClick={logout}><LogOut />{t('logout')}</Button></DialogFooter></DialogContent></Dialog>
  </SettingsLayout>
}
