import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startRegistration } from '@simplewebauthn/browser'
import { KeyRound, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { api } from '@/lib/api'
import { hashPassword, isValidUserPassword, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { PasskeyTable, type PasskeyRecord } from './passkey-table'

export function UserSettingsPage() {
  const { t } = useScopedI18n('views.user.UserSettings')
  const commonT = useScopedI18n('ui.common').t
  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [name, setName] = useState('')
  const [current, setCurrent] = useState<PasskeyRecord | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(null)
  const passkeys = useQuery({ queryKey: ['passkeys'], queryFn: () => api.fetch<PasskeyRecord[]>('/api/user/passkey'), enabled: listOpen })

  const create = async () => {
    try {
      const options = await api.fetch<any>('/api/user/passkey/register_request', { method: 'POST' })
      const credential = await startRegistration({ optionsJSON: options })
      await api.fetch('/api/user/passkey/register_response', { method: 'POST', body: { passkey_name: name || `${navigator.platform || 'Unknown'}: ${crypto.randomUUID().slice(0, 8)}`, credential } })
      toast.success(t('passkeyCreated'))
      setName('')
      setCreateOpen(false)
      if (listOpen) await passkeys.refetch()
    } catch (error) { toast.error(stringifyError(error)) }
  }
  const rename = async () => {
    if (!current) return
    try {
      await api.fetch('/api/user/passkey/rename', { method: 'POST', body: { passkey_name: name, passkey_id: current.passkey_id } })
      await passkeys.refetch()
      setRenameOpen(false)
      setName('')
      setCurrent(null)
    } catch (error) { toast.error(stringifyError(error)) }
  }
  const remove = async (passkey: PasskeyRecord) => {
    if (!(await confirmAction({ title: t('deletePasskey'), description: passkey.passkey_name, destructive: true }))) return
    setDeletingPasskeyId(passkey.passkey_id)
    try {
      await api.fetch(`/api/user/passkey/${encodeURIComponent(passkey.passkey_id)}`, { method: 'DELETE' })
      await passkeys.refetch()
    } catch (error) { toast.error(stringifyError(error)) } finally { setDeletingPasskeyId(null) }
  }
  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return toast.error(t('changePasswordDescription'))
    if (!isValidUserPassword(newPassword)) return toast.error(commonT('passwordRequirements'))
    if (newPassword !== confirmPassword) return toast.error(t('passwordMismatch'))
    setIsChangingPassword(true)
    try {
      await api.fetch('/api/user/change_password', {
        method: 'POST',
        body: { current_password: await hashPassword(currentPassword), new_password: await hashPassword(newPassword) },
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success(t('passwordChanged'))
    } catch (error) { toast.error(stringifyError(error)) } finally { setIsChangingPassword(false) }
  }

  return <SettingsLayout>
    <section className="grid gap-4 border-b border-border pb-5">
      <div><h2 className="text-sm font-medium">{t('changePassword')}</h2><p className="mt-1 text-xs text-muted-foreground">{t('changePasswordDescription')}</p></div>
      <Field label={t('currentPassword')} htmlFor="user-current-password"><Input id="user-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
      <Field label={t('newPassword')} htmlFor="user-new-password" description={commonT('passwordRequirements')}><Input id="user-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
      <Field label={t('confirmPassword')} htmlFor="user-confirm-password"><Input id="user-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field>
      <Button className="w-fit" disabled={isChangingPassword} onClick={changePassword}><KeyRound />{t('changePassword')}</Button>
    </section>
    <section className="grid gap-2">
      <Button className="justify-start" variant="secondary" onClick={() => { setListOpen(true); void passkeys.refetch() }}><KeyRound />{t('showPasskeyList')}</Button>
      <Button className="justify-start" variant="secondary" onClick={() => setCreateOpen(true)}><Plus />{t('createPasskey')}</Button>
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('passordTip')}</p>
    </section>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>{t('createPasskey')}</DialogTitle></DialogHeader><Input value={name} placeholder={t('passkeyNamePlaceholder')} onChange={(event) => setName(event.target.value)} /><DialogFooter><Button onClick={create}><Plus />{t('createPasskey')}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={renameOpen} onOpenChange={(open) => { setRenameOpen(open); if (!open) setCurrent(null) }}><DialogContent><DialogHeader><DialogTitle>{t('renamePasskey')}</DialogTitle></DialogHeader><Input value={name} placeholder={t('renamePasskeyNamePlaceholder')} onChange={(event) => setName(event.target.value)} /><DialogFooter><Button onClick={rename}><KeyRound />{t('renamePasskey')}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={listOpen} onOpenChange={setListOpen}><DialogContent className="w-[min(820px,calc(100vw-32px))]"><DialogHeader><DialogTitle>{t('showPasskeyList')}</DialogTitle></DialogHeader><div className="max-h-[60dvh] overflow-auto"><PasskeyTable passkeys={passkeys.data || []} deletingId={deletingPasskeyId} onRename={(passkey) => { setCurrent(passkey); setName(passkey.passkey_name || ''); setRenameOpen(true) }} onDelete={remove} /></div></DialogContent></Dialog>
  </SettingsLayout>
}
