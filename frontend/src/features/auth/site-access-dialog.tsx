import { useRef, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { Turnstile, type TurnstileHandle } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { hashPassword, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export function SiteAccessDialog() {
  const { t } = useScopedI18n('views.Header')
  const { open, auth } = useAppStore((state) => ({ open: state.showSiteAuth, auth: state.auth }))
  const [password, setPassword] = useState(auth)
  const [token, setToken] = useState('')
  const turnstile = useRef<TurnstileHandle>(null)
  const authenticate = async () => {
    try {
      await api.fetch('/open_api/site_login', { method: 'POST', body: { password: await hashPassword(password), cf_token: token } })
      appStore.setState({ auth: password, showSiteAuth: false })
      location.reload()
    } catch (error) { toast.error(stringifyError(error)); turnstile.current?.refresh() }
  }
  return <Dialog open={open}><DialogContent showClose={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}><DialogHeader><DialogTitle>{t('accessHeader')}</DialogTitle><DialogDescription>{t('accessTip')}</DialogDescription></DialogHeader><Input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && authenticate()} /><Turnstile ref={turnstile} value={token} onChange={setToken} /><DialogFooter><Button onClick={authenticate}><LockKeyhole />{t('ok')}</Button></DialogFooter></DialogContent></Dialog>
}
