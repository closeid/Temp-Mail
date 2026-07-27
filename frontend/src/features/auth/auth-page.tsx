import { useEffect, useRef, useState } from 'react'
import { AtSign, Fingerprint, KeyRound, LogIn, Send, UserPlus } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'
import DOMPurify from 'dompurify'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Brand } from '@/components/brand'
import { Turnstile, type TurnstileHandle } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { hashPassword, stringifyError } from '@/lib/utils'
import { getPathWithLocale } from '@/i18n/utils'
import { useScopedI18n } from '@/i18n/react'
import { AddressLogin } from './address-login'

export function AuthPage() {
  const navigate = useNavigate()
  const { t, locale } = useScopedI18n('views.user.UserLogin')
  const { userOpenSettings, openSettings } = useAppStore((state) => ({ userOpenSettings: state.userOpenSettings, openSettings: state.openSettings }))
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loginToken, setLoginToken] = useState('')
  const [signupToken, setSignupToken] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [addressDialog, setAddressDialog] = useState(false)
  const [forgotDialog, setForgotDialog] = useState(false)
  const [verifyUntil, setVerifyUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const loginTurnstile = useRef<TurnstileHandle>(null)

  useEffect(() => {
    if (!verifyUntil) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [verifyUntil])
  const seconds = Math.max(0, Math.round((verifyUntil - now) / 1000))

  const login = async () => {
    if (!email || !password) return toast.error(t('pleaseInput'))
    try {
      const result = await api.fetch<{ jwt: string }>('/user_api/login', { method: 'POST', body: { email, password: await hashPassword(password), cf_token: loginToken } })
      appStore.setState({ userJwt: result.jwt, workspaceSection: 'user' })
      await api.getUserSettings()
      navigate(getPathWithLocale('/', locale))
    } catch (error) { toast.error(stringifyError(error)); loginTurnstile.current?.refresh() }
  }

  const sendCode = async (reset = false) => {
    if (!email) return toast.error(t('pleaseInputEmail'))
    const token = reset ? resetToken : signupToken
    if (openSettings.cfTurnstileSiteKey && !token && userOpenSettings.enableMailVerify) return toast.error(t('pleaseCompleteTurnstile'))
    try {
      const result = await api.fetch<{ expirationTtl?: number }>('/user_api/verify_code', { method: 'POST', body: { email, cf_token: token } })
      if (result.expirationTtl) { setVerifyUntil(Date.now() + result.expirationTtl * 1000); setNow(Date.now()); toast.success(t('verifyCodeSent', { timeout: result.expirationTtl })) }
    } catch (error) { toast.error(stringifyError(error)) }
  }

  const register = async (reset = false) => {
    if (!email || !password) return toast.error(t('pleaseInput'))
    if (!code && userOpenSettings.enableMailVerify) return toast.error(t('pleaseInputCode'))
    try {
      await api.fetch('/user_api/register', { method: 'POST', body: { email, password: await hashPassword(password), code, cf_token: reset ? resetToken : signupToken } })
      toast.success(t('pleaseLogin'))
      setForgotDialog(false)
      setTab('signin')
    } catch (error) { toast.error(stringifyError(error)) }
  }

  const passkeyLogin = async () => {
    try {
      const options = await api.fetch<any>('/user_api/passkey/authenticate_request', { method: 'POST', body: { domain: location.hostname } })
      const credential = await startAuthentication({ optionsJSON: options })
      const result = await api.fetch<{ jwt: string }>('/user_api/passkey/authenticate_response', { method: 'POST', body: { origin: location.origin, domain: location.hostname, credential } })
      appStore.setState({ userJwt: result.jwt, workspaceSection: 'user' })
      await api.getUserSettings()
      navigate(getPathWithLocale('/', locale))
    } catch (error) { toast.error(stringifyError(error)) }
  }

  const oauthLogin = async (clientID: string) => {
    try {
      const state = Math.random().toString(36).slice(2)
      appStore.setState({ userOauth2SessionClientID: clientID, userOauth2SessionState: state })
      const result = await api.fetch<{ url: string }>(`/user_api/oauth2/login_url?clientID=${encodeURIComponent(clientID)}&state=${encodeURIComponent(state)}`)
      location.href = result.url
    } catch (error) { toast.error(stringifyError(error)) }
  }

  if (!userOpenSettings.fetched || !openSettings.fetched) return <main className="min-h-[100dvh] bg-background" />

  return <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-8">
    <section className="w-full max-w-[420px]">
      <div className="mb-7 flex justify-center"><Brand compact className="[&>span:first-child]:size-[60px] [&_svg]:size-7" /></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid w-full grid-cols-2 border-b border-border">
          <TabsTrigger className="h-10 rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent" value="signin">{t('login')}</TabsTrigger>
          <TabsTrigger className="h-10 rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent" value="signup">{t('register')}</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="grid gap-4">
          <Field label={t('email')}><Input autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label={t('password')}><Input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && login()} /></Field>
          {openSettings.enableGlobalTurnstileCheck && <Turnstile ref={loginTurnstile} value={loginToken} onChange={setLoginToken} />}
          <Button className="w-full" onClick={login}><LogIn />{t('login')}</Button>
          <div className="flex justify-center"><Button className="h-[30px] px-[10px]" variant="link" onClick={() => setForgotDialog(true)}>{t('forgotPassword')}</Button></div>
          <Separator />
          <Button className="w-full" variant="secondary" onClick={() => setAddressDialog(true)}><AtSign />{t('loginWithAddressCredential')}</Button>
          <Button className="w-full" variant="secondary" onClick={passkeyLogin}><KeyRound />{t('loginWithPasskey')}</Button>
          {userOpenSettings.oauth2ClientIDs.map((provider) => <Button key={provider.clientID} className="w-full" variant="secondary" onClick={() => oauthLogin(provider.clientID)}>
            {provider.icon ? <span className="size-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(provider.icon, { USE_PROFILES: { svg: true, svgFilters: true } }) }} /> : <Fingerprint />}
            {t('loginWith', { provider: provider.name })}
          </Button>)}
        </TabsContent>
        <TabsContent value="signup" className="grid gap-4">
          {!userOpenSettings.enable ? <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{t('registrationUnavailable')}</div> : <>
            <Field label={t('email')}><Input autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label={t('password')}><Input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            {userOpenSettings.enableMailVerify && <><Turnstile value={signupToken} onChange={setSignupToken} /><Field label={t('verifyCode')}><div className="flex"><Input className="rounded-r-none" value={code} onChange={(event) => setCode(event.target.value)} /><Button className="rounded-l-none" variant="outline" disabled={seconds > 0} onClick={() => sendCode(false)}><Send />{seconds ? t('waitforVerifyCode', { timeout: seconds }) : t('sendVerificationCode')}</Button></div></Field></>}
            {!userOpenSettings.enableMailVerify && <Turnstile value={signupToken} onChange={setSignupToken} />}
            <Button className="w-full" onClick={() => register(false)}><UserPlus />{t('register')}</Button>
          </>}
        </TabsContent>
      </Tabs>
    </section>

    <Dialog open={addressDialog} onOpenChange={setAddressDialog}><DialogContent><DialogHeader><DialogTitle>{t('loginWithAddressCredential')}</DialogTitle></DialogHeader><AddressLogin loginOnly preferCredential bindAfterLogin={false} onAuthenticated={() => setAddressDialog(false)} /></DialogContent></Dialog>
    <Dialog open={forgotDialog} onOpenChange={setForgotDialog}><DialogContent><DialogHeader><DialogTitle>{t('forgotPassword')}</DialogTitle><DialogDescription>{userOpenSettings.enable && userOpenSettings.enableMailVerify ? t('resetPassword') : t('cannotForgotPassword')}</DialogDescription></DialogHeader>
      {userOpenSettings.enable && userOpenSettings.enableMailVerify && <div className="grid gap-4"><Field label={t('email')}><Input value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label={t('password')}><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Turnstile value={resetToken} onChange={setResetToken} /><Field label={t('verifyCode')}><div className="flex"><Input className="rounded-r-none" value={code} onChange={(event) => setCode(event.target.value)} /><Button className="rounded-l-none" variant="outline" disabled={seconds > 0} onClick={() => sendCode(true)}>{seconds ? t('waitforVerifyCode', { timeout: seconds }) : t('sendVerificationCode')}</Button></div></Field><Button onClick={() => register(true)}>{t('resetPassword')}</Button></div>}
    </DialogContent></Dialog>
  </main>
}
