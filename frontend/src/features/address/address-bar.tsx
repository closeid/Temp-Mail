import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, LogOut, RefreshCw, Shuffle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { appStore, hasAccountSession, isCredentialOnlySession, useAppStore } from '@/lib/store'
import { copyText, stringifyError } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'
import { getPathWithLocale } from '@/i18n/utils'
import { AddressLogin } from '@/features/auth/address-login'
import { useBoundAddresses } from '@/features/address/use-bound-addresses'

type AddressOption = { key: string; scope: 'local' | 'user' | 'tg'; payload: string; address: string; label: string }

const parseJwtAddress = (jwt: string) => {
  try {
    const part = jwt.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
    const bytes = Uint8Array.from(atob(part), (character) => character.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)).address as string
  } catch { return '' }
}
const readCache = () => { try { return JSON.parse(localStorage.getItem('LocalAddressCache') || '[]') as string[] } catch { return [] } }
const writeCache = (items: string[]) => localStorage.setItem('LocalAddressCache', JSON.stringify(items))

export function AddressBar({ manageContent, onManage }: { manageContent?: React.ReactNode; onManage?: () => void }) {
  const { t } = useScopedI18n('views.index.AddressBar')
  const addressT = useScopedI18n('components.AddressSelect').t
  const commonT = useScopedI18n('ui.common').t
  const accountT = useScopedI18n('views.index.AccountSettings').t
  const { locale } = useI18n()
  const navigate = useNavigate()
  const state = useAppStore((value) => value)
  const accountSession = hasAccountSession(state)
  const credentialOnly = isCredentialOnlySession(state)
  const [manage, setManage] = useState(false)
  const [cacheRevision, setCacheRevision] = useState(0)
  useEffect(() => {
    if (!state.jwt) return
    const cache = readCache()
    if (!cache.includes(state.jwt)) { cache.push(state.jwt); writeCache(cache); setCacheRevision((value) => value + 1) }
  }, [state.jwt])
  const userAddresses = useBoundAddresses(accountSession)
  const telegramAddresses = useQuery({ queryKey: ['telegram-bound-addresses', state.telegramInitData], enabled: !credentialOnly && state.isTelegram, queryFn: () => api.fetch<any[]>('/api/telegram/get_bind_address', { method: 'POST', body: { initData: state.telegramInitData } }) })
  const localOptions = useMemo<AddressOption[]>(() => readCache().map((jwt): AddressOption => ({ key: `local:${jwt}`, scope: 'local', payload: jwt, address: parseJwtAddress(jwt), label: parseJwtAddress(jwt) })).filter((item) => item.address), [cacheRevision, state.jwt])
  const userOptions = useMemo<AddressOption[]>(() => (userAddresses.data?.results || []).flatMap((item): AddressOption[] => {
    const address = item.address || item.name
    return address ? [{ key: `user:${item.id}`, scope: 'user', payload: String(item.id), address, label: address }] : []
  }), [userAddresses.data?.results])
  const telegramOptions = useMemo<AddressOption[]>(() => (telegramAddresses.data || []).map((item): AddressOption => ({ key: `tg:${item.address}`, scope: 'tg', payload: item.jwt, address: item.address, label: item.address })), [telegramAddresses.data])
  const remoteOptions = [...userOptions, ...telegramOptions.filter((item) => !userOptions.some((userItem) => userItem.address === item.address))]
  const currentOption: AddressOption | null = state.settings.address
    ? { key: `local:current:${state.settings.address}`, scope: 'local', payload: state.jwt, address: state.settings.address, label: state.settings.address }
    : null
  let options: AddressOption[]
  if (credentialOnly) options = currentOption ? [currentOption] : []
  else if (accountSession) options = [...remoteOptions]
  else options = [...remoteOptions, ...localOptions.filter((localItem) => !remoteOptions.some((item) => item.address === localItem.address))]
  if (currentOption && !options.some((item) => item.address === currentOption.address)) options.unshift(currentOption)
  const current = options.find((item) => item.address === state.settings.address)?.key
  const localDisplayOptions = options.filter((item) => item.scope === 'local')
  const change = async (key: string) => {
    const item = options.find((option) => option.key === key)
    if (!item) return
    try {
      if (item.scope === 'user') { const result = await api.fetch<{ jwt: string }>(`/api/user/bind_address_jwt/${item.payload}`); appStore.setState({ jwt: result.jwt, mailboxAccessMode: 'standard' }) }
      else appStore.setState({ jwt: item.payload })
      await api.getSettings()
    } catch (error) { toast.error(stringifyError(error)) }
  }
  const removeLocal = (jwt: string) => { if (jwt === state.jwt) return; writeCache(readCache().filter((item) => item !== jwt)); setCacheRevision((value) => value + 1) }
  const logout = async () => {
    if (!(await confirmAction({ title: accountT('logout'), description: accountT('logoutConfirm') }))) return
    appStore.resetUser()
    appStore.resetAddress()
    navigate(getPathWithLocale('/', locale))
  }
  const logoutButton = <Button className="ml-auto size-9 shrink-0 px-0 sm:w-auto sm:px-3" variant="secondary" aria-label={accountT('logout')} title={accountT('logout')} onClick={logout}><LogOut /><span className="hidden sm:inline">{accountT('logout')}</span></Button>
  if (!state.settings.address) return state.userJwt || state.userSettings.user_email
    ? <div className="flex w-full items-center justify-end">{logoutButton}</div>
    : null
  return <div className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 sm:gap-2">
    <Select value={current} onValueChange={change}><SelectTrigger className="h-9 w-0 min-w-0 flex-1 px-2 sm:max-w-[500px] sm:px-3"><SelectValue placeholder={addressT('address')} /></SelectTrigger><SelectContent>{!credentialOnly && userOptions.length > 0 && <SelectGroup><SelectLabel>{addressT('userAddresses')}</SelectLabel>{userOptions.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectGroup>}{!credentialOnly && telegramOptions.length > 0 && <SelectGroup><SelectLabel>Telegram</SelectLabel>{telegramOptions.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectGroup>}{localDisplayOptions.length > 0 && <SelectGroup><SelectLabel>{addressT('localAddresses')}</SelectLabel>{localDisplayOptions.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectGroup>}</SelectContent></Select>
    {!credentialOnly && <Button className="size-9 shrink-0 px-0 sm:w-auto sm:px-3" variant="secondary" aria-label={t('addressManage')} title={t('addressManage')} onClick={() => onManage ? onManage() : setManage(true)}><Shuffle /><span className="hidden sm:inline">{t('addressManage')}</span></Button>}
    <Button className="size-9 shrink-0 px-0 sm:w-auto sm:px-3" variant="secondary" aria-label={addressT('copy')} title={addressT('copy')} onClick={async () => { await copyText(state.settings.address); toast.success(addressT('copied')) }}><Copy /><span className="hidden sm:inline">{addressT('copy')}</span></Button>
    {logoutButton}
    <Dialog open={manage} onOpenChange={setManage}><DialogContent className="w-[min(760px,calc(100vw-32px))]"><DialogHeader><DialogTitle>{t('addressManage')}</DialogTitle></DialogHeader>{manageContent || <div className="grid gap-5"><Table><TableHeader><TableRow><TableHead>{addressT('address')}</TableHead><TableHead className="w-40">{commonT('actions')}</TableHead></TableRow></TableHeader><TableBody>{localOptions.map((item) => <TableRow key={item.key}><TableCell>{item.address}</TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => change(item.key)}><RefreshCw />{commonT('switch')}</Button><Button size="sm" variant="ghost" className="text-destructive" disabled={item.payload === state.jwt} onClick={() => removeLocal(item.payload)}>{commonT('remove')}</Button></div></TableCell></TableRow>)}</TableBody></Table><div className="border-t border-border pt-5"><AddressLogin bindUserAddress={async () => { setCacheRevision((value) => value + 1) }} /></div></div>}</DialogContent></Dialog>
  </div>
}
