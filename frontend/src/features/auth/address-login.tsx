import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AtSign, Dices, LogIn, MailPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { hashPassword, secureRandomInt, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Turnstile, type TurnstileHandle } from '@/components/turnstile'
import { boundAddressesQueryKey } from '@/features/address/use-bound-addresses'
import { MAIL_ROUTES } from '@/app/routes'

type Props = {
  loginOnly?: boolean
  preferCredential?: boolean
  bindAfterLogin?: boolean
  onAuthenticated?: () => void
  newAddressPath?: (name: string, domain: string, token: string, randomSubdomain: boolean) => Promise<any>
  bindUserAddress?: () => Promise<any>
}

export function AddressLogin({ loginOnly = false, preferCredential = false, bindAfterLogin = true, onAuthenticated, newAddressPath, bindUserAddress }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, locale } = useScopedI18n('views.common.Login')
  const { openSettings, userSettings, loading } = useAppStore((state) => ({ openSettings: state.openSettings, userSettings: state.userSettings, loading: state.loading > 0 }))
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [method, setMethod] = useState<'credential' | 'password'>(preferCredential || !openSettings.enableAddressPassword ? 'credential' : 'password')
  const [credential, setCredential] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [token, setToken] = useState('')
  const [randomSubdomain, setRandomSubdomain] = useState(false)
  const turnstileRef = useRef<TurnstileHandle>(null)

  const domains = useMemo(() => {
    const roleDomains = userSettings.user_role?.domains
    if (roleDomains) return openSettings.domains.filter((item) => roleDomains.includes(item.value))
    if (openSettings.defaultDomains?.length) return openSettings.domains.filter((item) => openSettings.defaultDomains.includes(item.value))
    return openSettings.domains
  }, [openSettings.defaultDomains, openSettings.domains, userSettings.user_role])
  useEffect(() => { if (!domain && domains[0]) setDomain(domains[0].value) }, [domain, domains])

  const bind = bindUserAddress || api.bindUserAddress
  const bindCurrentAddress = async () => {
    await bind()
    if (appStore.getState().userJwt) await queryClient.invalidateQueries({ queryKey: boundAddressesQueryKey })
  }
  const finishLogin = async (jwt: string, credentialSession = false) => {
    appStore.setState({ jwt, mailboxAccessMode: credentialSession ? 'credential' : 'standard' })
    await api.getSettings()
    if (bindAfterLogin && (bindUserAddress || appStore.getState().userSettings.user_email)) {
      try { await bindCurrentAddress() } catch (error) { toast.error(`${t('bindUserAddressError')}: ${stringifyError(error)}`) }
    }
    onAuthenticated?.()
    navigate(getPathWithLocale(MAIL_ROUTES.mailbox, locale))
  }

  const login = async () => {
    try {
      if (method === 'password') {
        if (!address || !password) return toast.error(t('emailPasswordRequired'))
        const result = await api.fetch<{ jwt: string }>('/api/address_login', { method: 'POST', body: { email: address, password: await hashPassword(password), cf_token: token } })
        await finishLogin(result.jwt)
      } else {
        if (!credential) return toast.error(t('credentialInput'))
        await api.fetch('/api/open/credential_login', { method: 'POST', body: { credential, cf_token: token } })
        const credentialSession = !bindAfterLogin || (!appStore.getState().userSettings.user_email && !bindUserAddress)
        await finishLogin(credential, credentialSession)
      }
    } catch (error) { toast.error(stringifyError(error)); turnstileRef.current?.refresh() }
  }

  const createAddress = async () => {
    try {
      const cleanName = openSettings.disableCustomAddressName ? '' : name
      const result = newAddressPath
        ? await newAddressPath(cleanName, domain, token, randomSubdomain)
        : await api.fetch<{ jwt: string; password?: string }>('/api/new_address', { method: 'POST', body: { name: cleanName, domain, cf_token: token, enableRandomSubdomain: randomSubdomain } })
      appStore.setState({ jwt: result.jwt, mailboxAccessMode: 'standard', addressPassword: result.password || '', showAddressCredential: true })
      await api.getSettings()
      if (bindUserAddress || appStore.getState().userSettings.user_email) { try { await bindCurrentAddress() } catch (error) { toast.error(`${t('bindUserAddressError')}: ${stringifyError(error)}`) } }
      navigate(getPathWithLocale(MAIL_ROUTES.mailbox, locale))
    } catch (error) { toast.error(stringifyError(error)) }
  }

  const generateName = () => {
    const parts = ['ember', 'quiet', 'clear', 'moss', 'cedar', 'paper', 'north', 'silver', 'signal', 'orbit']
    const suffix = 100 + secureRandomInt(900)
    const raw = `${parts[secureRandomInt(parts.length)]}.${parts[secureRandomInt(parts.length)]}${suffix}`
    let regex = /[^a-z0-9.]/g
    try { if (openSettings.addressRegex) regex = new RegExp(openSettings.addressRegex, 'g') } catch { /* keep safe default */ }
    setName(raw.replace(regex, '').slice(0, openSettings.maxAddressLen))
  }

  const canCreate = openSettings.enableUserCreateEmail && (!openSettings.disableAnonymousUserCreateEmail || Boolean(userSettings.user_email))
  const prefix = userSettings.user_role?.prefix || openSettings.prefix || ''
  const canRandomize = openSettings.randomSubdomainDomains?.includes(domain)

  if (mode === 'register' && !loginOnly) return <div className="grid gap-4">
    <div className="flex items-center justify-between"><h2 className="text-base font-semibold">{t('getNewEmail')}</h2><Button variant="ghost" size="sm" onClick={() => setMode('login')}>{t('login')}</Button></div>
    {!canCreate ? <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{t('createEmailUnavailable')}</div> : <>
      {!openSettings.disableCustomAddressName && <Button variant="secondary" type="button" onClick={generateName}><Dices />{t('generateName')}</Button>}
      <Field label={t('address')}>
        <div className="flex min-w-0 items-stretch">
          {prefix && <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-2 text-sm text-muted-foreground">{prefix}</span>}
          <Input className="h-10 min-w-24 rounded-none first:rounded-l-md" value={openSettings.disableCustomAddressName ? t('autoGeneratedName') : name} disabled={openSettings.disableCustomAddressName} minLength={openSettings.minAddressLen} maxLength={openSettings.maxAddressLen} onChange={(event) => setName(event.target.value)} />
          <span className="flex h-10 items-center border-y border-input bg-muted px-2 text-muted-foreground">@</span>
          <Select value={domain} onValueChange={setDomain}><SelectTrigger className="h-10 min-w-36 rounded-l-none"><SelectValue /></SelectTrigger><SelectContent>{domains.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
        </div>
      </Field>
      {canRandomize && <label className="flex items-start gap-2 text-sm"><Checkbox checked={randomSubdomain} onCheckedChange={(value) => setRandomSubdomain(Boolean(value))} /><span>{t('enableRandomSubdomain')}<small className="mt-1 block text-muted-foreground">{t('randomSubdomainTip')}</small></span></label>}
      <Turnstile value={token} onChange={setToken} />
      <Button className="w-full" disabled={loading} onClick={createAddress}><MailPlus />{t('getNewEmail')}</Button>
    </>}
  </div>

  return <div className="grid gap-4">
    {method === 'password' ? <>
      <Field label={t('email')}><Input autoComplete="username" value={address} onChange={(event) => setAddress(event.target.value)} /></Field>
      <Field label={t('password')}><Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && login()} /></Field>
    </> : <Field label={t('credential')}><Textarea rows={4} value={credential} onChange={(event) => setCredential(event.target.value)} /></Field>}
    <Turnstile ref={turnstileRef} value={token} onChange={setToken} />
    {openSettings.enableAddressPassword && <Button className="justify-self-center" variant="link" size="sm" onClick={() => setMethod(method === 'password' ? 'credential' : 'password')}>{method === 'password' ? t('credentialLogin') : t('passwordLogin')}</Button>}
    <Button className="w-full" disabled={loading} onClick={login}><LogIn />{userSettings.user_email ? t('loginAndBind') : t('login')}</Button>
    {!loginOnly && <Button className="w-full" variant="secondary" onClick={() => setMode('register')}><AtSign />{t('getNewEmail')}</Button>}
  </div>
}
