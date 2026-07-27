import { useState } from 'react'
import { DatabaseZap, KeyRound, LogOut, MailCheck, ShieldAlert, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { hashPassword, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'

export function AddressAccountSettings() {
  const { t, locale } = useScopedI18n('views.index.AccountSettings')
  const navigate = useNavigate()
  const { openSettings } = useAppStore((state) => ({ openSettings: state.openSettings }))
  const [confirmAction, setConfirmAction] = useState<null | 'logout' | 'delete' | 'inbox' | 'sent'>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const run = async () => {
    try {
      if (confirmAction === 'logout') appStore.resetAddress()
      if (confirmAction === 'delete') { await api.fetch('/api/delete_address', { method: 'DELETE' }); appStore.resetAddress() }
      if (confirmAction === 'inbox') await api.fetch('/api/clear_inbox', { method: 'DELETE' })
      if (confirmAction === 'sent') await api.fetch('/api/clear_sent_items', { method: 'DELETE' })
      toast.success(t('success')); setConfirmAction(null)
      if (confirmAction === 'logout' || confirmAction === 'delete') navigate(getPathWithLocale('/', locale))
    } catch (error) { toast.error(stringifyError(error)) }
  }
  const changePassword = async () => {
    if (password !== confirmation) return toast.error(t('passwordMismatch'))
    try { await api.fetch('/api/address_change_password', { method: 'POST', body: { new_password: await hashPassword(password) } }); toast.success(t('passwordChanged')); setPassword(''); setConfirmation(''); setPasswordOpen(false) } catch (error) { toast.error(stringifyError(error)) }
  }
  const labels = { logout: [t('logout'), t('logoutConfirm')], delete: [t('deleteAccount'), t('deleteAccountConfirm')], inbox: [t('clearInbox'), t('clearInboxConfirm')], sent: [t('clearSentItems'), t('clearSentItemsConfirm')] } as const
  return <SettingsLayout>
    <div className="grid gap-2"><Button className="justify-start" variant="secondary" onClick={() => appStore.setState({ showAddressCredential: true })}><MailCheck />{t('showAddressCredential')}</Button>{openSettings.enableAddressPassword && <Button className="justify-start" variant="secondary" onClick={() => setPasswordOpen(true)}><KeyRound />{t('changePassword')}</Button>}{openSettings.enableUserDeleteEmail && <><Button className="justify-start" variant="secondary" onClick={() => setConfirmAction('inbox')}><DatabaseZap />{t('clearInbox')}</Button><Button className="justify-start" variant="secondary" onClick={() => setConfirmAction('sent')}><DatabaseZap />{t('clearSentItems')}</Button></>}<Button className="justify-start" variant="secondary" onClick={() => setConfirmAction('logout')}><LogOut />{t('logout')}</Button></div>
    {openSettings.enableUserDeleteEmail && <><Separator /><Button className="justify-start" variant="destructive" onClick={() => setConfirmAction('delete')}><Trash2 />{t('deleteAccount')}</Button></>}
    <Dialog open={Boolean(confirmAction)} onOpenChange={(value) => !value && setConfirmAction(null)}><DialogContent><DialogHeader><DialogTitle>{confirmAction && labels[confirmAction][0]}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{confirmAction && labels[confirmAction][1]}</p><DialogFooter><Button variant={confirmAction === 'delete' ? 'destructive' : 'default'} onClick={run}><ShieldAlert />{confirmAction && labels[confirmAction][0]}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}><DialogContent><DialogHeader><DialogTitle>{t('changePassword')}</DialogTitle></DialogHeader><Field label={t('newPassword')}><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Field label={t('confirmPassword')}><Input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field><DialogFooter><Button onClick={changePassword}><KeyRound />{t('changePassword')}</Button></DialogFooter></DialogContent></Dialog>
  </SettingsLayout>
}
