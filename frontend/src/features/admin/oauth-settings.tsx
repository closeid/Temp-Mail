import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/action-dialogs'
import { SettingRow, SettingsLayout, splitSettingLabel } from '@/components/layout/settings-layout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { stringifyError } from '@/lib/utils'
import type { UserOauth2Settings } from '@/models'
import { useScopedI18n } from '@/i18n/react'
import { sanitizeSvg } from '@/lib/sanitize'

type ProviderType = 'github' | 'linuxdo' | 'authentik' | 'custom'
type Provider = UserOauth2Settings & { accessTokenFormat: string }

const createProvider = (name: string, type: ProviderType): Provider => {
  const common: Provider = {
    name,
    icon: '',
    clientID: '',
    clientSecret: '',
    authorizationURL: '',
    accessTokenURL: '',
    accessTokenFormat: 'urlencoded',
    userInfoURL: '',
    userEmailKey: 'email',
    redirectURL: `${location.origin}/user/oauth2/callback`,
    scope: '',
    enableEmailFormat: false,
    userEmailFormat: '',
    userEmailReplace: '',
    enableMailAllowList: false,
    mailAllowList: [],
  }
  if (type === 'github') return { ...common, authorizationURL: 'https://github.com/login/oauth/authorize', accessTokenURL: 'https://github.com/login/oauth/access_token', accessTokenFormat: 'json', userInfoURL: 'https://api.github.com/user', scope: 'user:email' }
  if (type === 'linuxdo') return { ...common, authorizationURL: 'https://connect.linux.do/oauth2/authorize', accessTokenURL: 'https://connect.linux.do/oauth2/token', userInfoURL: 'https://connect.linux.do/api/user', userEmailKey: 'id', scope: 'user', enableEmailFormat: true, userEmailFormat: '^(.+)$', userEmailReplace: 'linux_do_$1@oauth.linux.do' }
  if (type === 'authentik') return { ...common, authorizationURL: 'https://your-domain/application/o/authorize/', accessTokenURL: 'https://your-domain/application/o/token/', userInfoURL: 'https://your-domain/application/o/userinfo/', scope: 'email openid' }
  return common
}

export function OAuthSettingsPage() {
  const { t } = useScopedI18n('views.admin.UserOauth2Settings')
  const adminT = useScopedI18n('ui.admin').t
  const commonT = useScopedI18n('ui.common').t
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-oauth-settings'], queryFn: () => api.fetch<UserOauth2Settings[]>('/api/admin/user_oauth2_settings') })
  const [providers, setProviders] = useState<Provider[]>([])
  const [expanded, setExpanded] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProviderType>('github')
  useEffect(() => { if (query.data) setProviders(query.data.map((item) => ({ ...item, accessTokenFormat: item.accessTokenFormat || 'urlencoded' }))) }, [query.data])
  const save = useMutation({
    mutationFn: () => api.fetch('/api/admin/user_oauth2_settings', { method: 'POST', body: providers }),
    onSuccess: async () => { toast.success(t('successTip')); await client.invalidateQueries({ queryKey: ['admin-oauth-settings'] }) },
    onError: (error) => toast.error(stringifyError(error)),
  })
  const update = (index: number, patch: Partial<Provider>) => setProviders((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  const add = () => {
    if (!name.trim()) return toast.error(adminT('completeAllFields'))
    setProviders((current) => [...current, createProvider(name.trim(), type)])
    setExpanded(providers.length)
    setName('')
    setAddOpen(false)
  }
  const remove = async (index: number) => {
    if (!await confirmAction({ title: t('delete'), description: providers[index]?.name, destructive: true })) return
    setProviders((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setExpanded(Math.max(0, index - 1))
  }
  return <>
    <SettingsLayout title={adminT('oauthConfiguration')} description={t('tip')} action={<div className="flex gap-2"><Button variant="secondary" onClick={() => setAddOpen(true)}><Plus />{t('addOauth2')}</Button><Button disabled={save.isPending || query.isLoading} onClick={() => save.mutate()}><Save />{commonT('save')}</Button></div>} className="max-w-4xl">
      {query.isError && <p className="text-sm text-destructive">{stringifyError(query.error)}</p>}
      {!query.isLoading && providers.length === 0 && <p className="rounded-md bg-muted/35 py-8 text-center text-sm text-muted-foreground">{commonT('noData')}</p>}
      {providers.length > 0 && <div className="divide-y divide-border">
        {providers.map((provider, index) => {
          const iconLabel = splitSettingLabel(t('icon'))
          return <section key={`${provider.clientID}-${index}`}>
            <div className="flex min-h-12 items-center gap-2 py-1"><button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold" onClick={() => setExpanded(expanded === index ? -1 : index)}><ChevronDown className={`size-4 shrink-0 transition-transform ${expanded === index ? 'rotate-180' : ''}`} /><span className="truncate">{provider.name || `${adminT('oauthProvider')} ${index + 1}`}</span></button><Button size="icon" variant="ghost" className="text-destructive" title={t('delete')} onClick={() => remove(index)}><Trash2 /></Button></div>
            {expanded === index && <div className="grid gap-5 pb-6 pl-6">
              <Field label={t('name')}><Input value={provider.name} onChange={(event) => update(index, { name: event.target.value })} /></Field>
              <Field label={iconLabel.label} description={iconLabel.description}><Textarea className="min-h-24 font-mono text-xs" value={provider.icon || ''} onChange={(event) => update(index, { icon: event.target.value })} /></Field>
              {provider.icon && <div className="flex size-10 items-center justify-center rounded-md border border-border p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: sanitizeSvg(provider.icon) }} />}
              <div className="grid gap-5 sm:grid-cols-2"><Field label={adminT('clientId')}><Input value={provider.clientID} onChange={(event) => update(index, { clientID: event.target.value })} /></Field><Field label={adminT('clientSecret')}><Input type="password" value={provider.clientSecret} onChange={(event) => update(index, { clientSecret: event.target.value })} /></Field></div>
              <Field label={adminT('authorizationUrl')}><Input type="url" value={provider.authorizationURL} onChange={(event) => update(index, { authorizationURL: event.target.value })} /></Field>
              <Field label={adminT('accessTokenUrl')}><Input type="url" value={provider.accessTokenURL} onChange={(event) => update(index, { accessTokenURL: event.target.value })} /></Field>
              <Field label={adminT('accessTokenFormat')}><Select value={provider.accessTokenFormat} onValueChange={(value) => update(index, { accessTokenFormat: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="json">{adminT('jsonRequest')}</SelectItem><SelectItem value="urlencoded">{adminT('formEncodedRequest')}</SelectItem></SelectContent></Select></Field>
              <Field label={adminT('userInfoUrl')}><Input type="url" value={provider.userInfoURL} onChange={(event) => update(index, { userInfoURL: event.target.value })} /></Field>
              <Field label={adminT('userEmailKey')} description={adminT('userEmailKeyDescription')}><Input value={provider.userEmailKey} onChange={(event) => update(index, { userEmailKey: event.target.value })} /></Field>
              <SettingRow label={t('enableEmailFormat')} description={t('userEmailFormatTip')} control={<Switch checked={Boolean(provider.enableEmailFormat)} onCheckedChange={(value) => update(index, { enableEmailFormat: value })} />} />
              {provider.enableEmailFormat && <div className="grid gap-5 sm:grid-cols-2"><Field label={t('userEmailFormat')}><Input placeholder="^(.+)@old\.com$" value={provider.userEmailFormat || ''} onChange={(event) => update(index, { userEmailFormat: event.target.value })} /></Field><Field label={t('userEmailReplace')}><Input placeholder="$1@new.com" value={provider.userEmailReplace || ''} onChange={(event) => update(index, { userEmailReplace: event.target.value })} /></Field></div>}
              <Field label={adminT('redirectUrl')} description={adminT('redirectUrlDescription')}><Input type="url" value={provider.redirectURL} onChange={(event) => update(index, { redirectURL: event.target.value })} /></Field>
              <Field label={adminT('scope')}><Input value={provider.scope} onChange={(event) => update(index, { scope: event.target.value })} /></Field>
              <SettingRow label={t('enableMailAllowList')} control={<Switch checked={Boolean(provider.enableMailAllowList)} onCheckedChange={(value) => update(index, { enableMailAllowList: value })} />} />
              {provider.enableMailAllowList && <Field label={t('mailAllowList')} description={t('manualInputPrompt')}><Textarea className="min-h-24 font-mono text-xs" value={(provider.mailAllowList || []).join('\n')} onChange={(event) => update(index, { mailAllowList: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></Field>}
            </div>}
          </section>
        })}
      </div>}
    </SettingsLayout>
    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>{t('addOauth2')}</DialogTitle></DialogHeader><Field label={t('name')}><Input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label={t('oauth2Type')}><Select value={type} onValueChange={(value) => setType(value as ProviderType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="github">GitHub</SelectItem><SelectItem value="linuxdo">Linux Do</SelectItem><SelectItem value="authentik">Authentik</SelectItem><SelectItem value="custom">{adminT('customProvider')}</SelectItem></SelectContent></Select></Field><DialogFooter><Button onClick={add}><Plus />{t('addOauth2')}</Button></DialogFooter></DialogContent></Dialog>
  </>
}
