import { useRef, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ADMIN_LOGIN_ROUTE, ADMIN_PAGE_ROUTES, ADMIN_DEFAULT_PAGE } from '@/app/routes'
import { Brand } from '@/components/brand'
import { Turnstile, type TurnstileHandle } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { appStore, canShowAdmin, useAppStore } from '@/lib/store'
import { hashPassword, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'

const getReturnPath = (value: unknown, fallback: string, dashboardRoot: string, loginPath: string) => {
  if (typeof value !== 'string' || (value !== dashboardRoot && !value.startsWith(`${dashboardRoot}/`)) || value.startsWith(loginPath)) return fallback
  return value
}

export function AdminLoginPage() {
  const { t, locale } = useScopedI18n('ui.admin')
  const adminT = useScopedI18n('views.Admin').t
  const state = useAppStore((value) => value)
  const location = useLocation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const turnstile = useRef<TurnstileHandle>(null)
  const fallback = getPathWithLocale(ADMIN_PAGE_ROUTES[ADMIN_DEFAULT_PAGE], locale)
  const dashboardRoot = getPathWithLocale('/dashboard', locale)
  const loginPath = getPathWithLocale(ADMIN_LOGIN_ROUTE, locale)
  const returnPath = getReturnPath((location.state as { from?: unknown } | null)?.from, fallback, dashboardRoot, loginPath)

  if (!state.openSettings.fetched || !state.userSettings.fetched) return <main className="min-h-[100dvh] bg-background" />
  if (canShowAdmin(state) && !state.showAdminAuth) return <Navigate to={returnPath} replace />

  const authenticate = async () => {
    if (submitting) return
    if (!username || !password) return toast.error(t('completeAllFields'))
    setSubmitting(true)
    try {
      await api.fetch('/api/open/admin_login', { method: 'POST', body: { username, password: await hashPassword(password), cf_token: token } })
      appStore.setState({ adminAuth: password, showAdminAuth: false })
      toast.success(t('signedIn'))
      navigate(returnPath, { replace: true })
    } catch (error) {
      toast.error(stringifyError(error))
      turnstile.current?.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-surface grid min-h-[100dvh] place-items-center px-4 py-6 sm:py-8">
    <section className="w-full max-w-[400px] rounded-lg border border-border/80 bg-card p-5 shadow-[0_20px_60px_rgba(33,84,72,0.12)] sm:p-7 dark:shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div className="mb-5 flex items-center gap-3"><Brand compact className="[&>span:first-child]:size-12" /><div className="min-w-0"><h1 className="text-lg font-semibold">{t('administratorAccess')}</h1><p className="text-xs text-muted-foreground">{t('administration')}</p></div></div>
      <p className="mb-5 text-sm text-muted-foreground">{t('administratorAccessDescription')}</p>
      <div className="grid gap-4">
        <Field label={t('administratorUsername')} htmlFor="administrator-username"><Input id="administrator-username" autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></Field>
        <Field label={t('administratorPassword')} htmlFor="administrator-password"><Input id="administrator-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && authenticate()} /></Field>
        {state.openSettings.enableGlobalTurnstileCheck && <Turnstile ref={turnstile} value={token} onChange={setToken} />}
        <Button className="h-11 w-full" disabled={submitting} onClick={authenticate}><KeyRound />{adminT('confirm')}</Button>
      </div>
    </section>
  </main>
}
