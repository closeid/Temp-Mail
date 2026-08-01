import { useEffect, useRef, useState } from 'react'
import { AtSign, Fingerprint, KeyRound, LogIn, Send, UserPlus } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Brand } from '@/components/brand'
import { Turnstile, type TurnstileHandle } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { getSafeExternalUrl, hashPassword, isValidEmailAddress, isWebAuthnCancellation, stringifyError } from '@/lib/utils'
import { getPathWithLocale } from '@/i18n/utils'
import { useScopedI18n } from '@/i18n/react'
import { AUTH_ROUTES, MAIL_ROUTES, type AuthRouteKey } from '@/app/routes'
import { AddressLogin } from './address-login'
import { sanitizeSvg } from '@/lib/sanitize'

export function AuthPage({ view = 'login' }: { view?: AuthRouteKey }) {
  const navigate = useNavigate()
  const { t, locale } = useScopedI18n('views.user.UserLogin')
  const { userOpenSettings, openSettings } = useAppStore((state) => ({ userOpenSettings: state.userOpenSettings, openSettings: state.openSettings }))
  const registrationEnabled = userOpenSettings.enable
  const tab = view === 'register' && registrationEnabled ? 'signup' : 'signin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loginToken, setLoginToken] = useState('')
  const [signupToken, setSignupToken] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [verifyUntil, setVerifyUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [addressLoginOpen, setAddressLoginOpen] = useState(false)
  const [passkeyPending, setPasskeyPending] = useState(false)
  const loginTurnstile = useRef<TurnstileHandle>(null)
  const go = (route: string, replace = false) => navigate(getPathWithLocale(route, locale), { replace })

  useEffect(() => {
    if (!verifyUntil) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [verifyUntil])
  const seconds = Math.max(0, Math.round((verifyUntil - now) / 1000))

  const login = async () => {
    if (!email || !password) return toast.error(t('pleaseInput'))
    if (!isValidEmailAddress(email)) return toast.error(t('invalidEmail'))
    try {
      const result = await api.fetch<{ jwt: string }>('/api/user/login', { method: 'POST', body: { email: email.trim(), password: await hashPassword(password), cf_token: loginToken } })
      const hasMailbox = await api.activateUserSession(result.jwt)
      go(hasMailbox ? MAIL_ROUTES.mailbox : MAIL_ROUTES.addresses)
    } catch (error) { toast.error(stringifyError(error)); loginTurnstile.current?.refresh() }
  }

  const sendCode = async (reset = false) => {
    if (!email) return toast.error(t('pleaseInputEmail'))
    if (!isValidEmailAddress(email)) return toast.error(t('invalidEmail'))
    const token = reset ? resetToken : signupToken
    if (openSettings.cfTurnstileSiteKey && !token && userOpenSettings.enableMailVerify) return toast.error(t('pleaseCompleteTurnstile'))
    try {
      const result = await api.fetch<{ expirationTtl?: number }>('/api/user/verify_code', { method: 'POST', body: { email: email.trim(), cf_token: token } })
      if (result.expirationTtl) { setVerifyUntil(Date.now() + result.expirationTtl * 1000); setNow(Date.now()); toast.success(t('verifyCodeSent', { timeout: result.expirationTtl })) }
    } catch (error) { toast.error(stringifyError(error)) }
  }

  const register = async (reset = false) => {
    if (!email || !password) return toast.error(t('pleaseInput'))
    if (!isValidEmailAddress(email)) return toast.error(t('invalidEmail'))
    if (!code && userOpenSettings.enableMailVerify) return toast.error(t('pleaseInputCode'))
    try {
      await api.fetch('/api/user/register', { method: 'POST', body: { email: email.trim(), password: await hashPassword(password), code, cf_token: reset ? resetToken : signupToken } })
      toast.success(t('pleaseLogin'))
      go(AUTH_ROUTES.login, true)
    } catch (error) { toast.error(stringifyError(error)) }
  }

  const passkeyLogin = async () => {
    if (passkeyPending) return
    setPasskeyPending(true)
    try {
      const options = await api.fetch<any>('/api/user/passkey/authenticate_request', { method: 'POST' })
      const credential = await startAuthentication({ optionsJSON: options })
      const result = await api.fetch<{ jwt: string }>('/api/user/passkey/authenticate_response', { method: 'POST', body: { credential } })
      const hasMailbox = await api.activateUserSession(result.jwt)
      go(hasMailbox ? MAIL_ROUTES.mailbox : MAIL_ROUTES.addresses)
    } catch (error) {
      if (!isWebAuthnCancellation(error)) toast.error(stringifyError(error))
    } finally {
      setPasskeyPending(false)
    }
  }

  const oauthLogin = async (clientID: string) => {
    try {
      const result = await api.fetch<{ url: string; state: string }>(`/api/user/oauth2/login_url?clientID=${encodeURIComponent(clientID)}`)
      const loginUrl = getSafeExternalUrl(result.url)
      if (!loginUrl || !result.state) throw new Error('Invalid OAuth2 login response')
      appStore.setState({ userOauth2SessionClientID: clientID, userOauth2SessionState: result.state })
      location.href = loginUrl
    } catch (error) { toast.error(stringifyError(error)) }
  }

  if (!userOpenSettings.fetched || !openSettings.fetched) return <main className="min-h-[100dvh] bg-background" />

  return <main className="auth-surface grid min-h-[100dvh] place-items-center px-4 py-6 sm:py-8">
    <section className="w-full max-w-[400px] rounded-lg border border-border/80 bg-card p-5 shadow-[0_20px_60px_rgba(33,84,72,0.12)] sm:p-7 dark:shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div className="mb-5 flex items-center gap-3">
        <Brand compact className="[&>span:first-child]:size-12" />
        <div className="min-w-0"><p className="text-lg font-semibold text-foreground">{tab === 'signin' ? t('login') : t('register')}</p><p className="truncate text-xs text-muted-foreground">Get an Email</p></div>
      </div>
      <Tabs value={tab} onValueChange={(value) => go(value === 'signup' ? AUTH_ROUTES.register : AUTH_ROUTES.login)}>
        <TabsList className={`mb-5 grid w-full ${registrationEnabled ? 'grid-cols-2' : 'grid-cols-1'} rounded-md bg-muted p-1`}>
          <TabsTrigger className="h-9 bg-transparent text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm" value="signin">{t('login')}</TabsTrigger>
          {registrationEnabled && <TabsTrigger className="h-9 bg-transparent text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm" value="signup">{t('register')}</TabsTrigger>}
        </TabsList>
        <TabsContent value="signin">
          <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void login() }}>
            <Field label={t('email')}><Input className="h-11 bg-muted/35" autoCapitalize="none" autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label={t('password')}><Input className="h-11 bg-muted/35" autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            {openSettings.enableGlobalTurnstileCheck && <Turnstile ref={loginTurnstile} value={loginToken} onChange={setLoginToken} />}
            <Button className="h-11 w-full shadow-[0_8px_20px_rgba(21,183,126,0.18)]" type="submit"><LogIn />{t('login')}</Button>
            <div className="flex justify-center"><Button className="h-[30px] px-[10px]" type="button" variant="link" onClick={() => go(AUTH_ROUTES.forgotPassword)}>{t('forgotPassword')}</Button></div>
            <Button className="h-10 w-full justify-start bg-background" type="button" variant="secondary" onClick={() => setAddressLoginOpen(true)}><AtSign />{t('loginWithAddressCredential')}</Button>
            <Button className="h-10 w-full justify-start bg-background" type="button" variant="secondary" disabled={passkeyPending} onClick={passkeyLogin}><KeyRound />{t('loginWithPasskey')}</Button>
            {userOpenSettings.oauth2ClientIDs.map((provider) => <Button key={provider.clientID} className="h-10 w-full justify-start bg-background" type="button" variant="secondary" onClick={() => oauthLogin(provider.clientID)}>
              {provider.icon ? <span className="size-4" dangerouslySetInnerHTML={{ __html: sanitizeSvg(provider.icon) }} /> : <Fingerprint />}
              {t('loginWith', { provider: provider.name })}
            </Button>)}
          </form>
        </TabsContent>
        {registrationEnabled && <TabsContent value="signup" className="grid gap-4">
          <>
            <Field label={t('email')}><Input className="h-11 bg-muted/35" autoCapitalize="none" autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label={t('password')}><Input className="h-11 bg-muted/35" autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            {userOpenSettings.enableMailVerify && <><Turnstile value={signupToken} onChange={setSignupToken} /><Field label={t('verifyCode')}><div className="flex"><Input className="h-11 rounded-r-none bg-muted/35" value={code} onChange={(event) => setCode(event.target.value)} /><Button className="h-11 rounded-l-none" variant="outline" disabled={seconds > 0} onClick={() => sendCode(false)}><Send />{seconds ? t('waitforVerifyCode', { timeout: seconds }) : t('sendVerificationCode')}</Button></div></Field></>}
            {!userOpenSettings.enableMailVerify && <Turnstile value={signupToken} onChange={setSignupToken} />}
            <Button className="h-11 w-full shadow-[0_8px_20px_rgba(21,183,126,0.18)]" onClick={() => register(false)}><UserPlus />{t('register')}</Button>
          </>
        </TabsContent>}
      </Tabs>
    </section>

    <Dialog open={addressLoginOpen} onOpenChange={setAddressLoginOpen}><DialogContent><DialogHeader><DialogTitle>{t('loginWithAddressCredential')}</DialogTitle></DialogHeader><AddressLogin loginOnly preferCredential bindAfterLogin={false} onAuthenticated={() => setAddressLoginOpen(false)} /></DialogContent></Dialog>
    <Dialog open={view === 'forgotPassword'} onOpenChange={(open) => !open && go(AUTH_ROUTES.login)}><DialogContent><DialogHeader><DialogTitle>{t('forgotPassword')}</DialogTitle><DialogDescription>{userOpenSettings.enable && userOpenSettings.enableMailVerify ? t('resetPassword') : t('cannotForgotPassword')}</DialogDescription></DialogHeader>
      {userOpenSettings.enable && userOpenSettings.enableMailVerify && <div className="grid gap-4"><Field label={t('email')}><Input autoCapitalize="none" autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label={t('password')}><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Turnstile value={resetToken} onChange={setResetToken} /><Field label={t('verifyCode')}><div className="flex"><Input className="rounded-r-none" value={code} onChange={(event) => setCode(event.target.value)} /><Button className="rounded-l-none" variant="outline" disabled={seconds > 0} onClick={() => sendCode(true)}>{seconds ? t('waitforVerifyCode', { timeout: seconds }) : t('sendVerificationCode')}</Button></div></Field><Button onClick={() => register(true)}>{t('resetPassword')}</Button></div>}
    </DialogContent></Dialog>
  </main>
}
