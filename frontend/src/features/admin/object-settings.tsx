import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { stringifyError } from '@/lib/utils'
import { useI18n, useScopedI18n } from '@/i18n/react'

const humanize = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (value) => value.toUpperCase())
type Translate = (key: string, params?: Record<string, string | number>) => string

const SETTING_KEYS: Record<string, string> = {
  blockList: 'views.admin.AccountSettings.address_block_list',
  sendBlockList: 'views.admin.AccountSettings.send_address_block_list',
  verifiedAddressList: 'views.admin.AccountSettings.verified_address_list',
  fromBlockList: 'views.admin.AccountSettings.fromBlockList',
  noLimitSendAddressList: 'views.admin.AccountSettings.noLimitSendAddressList',
  emailRuleSettings: 'views.admin.AccountSettings.email_forwarding_config',
  blockReceiveUnknowAddressEmail: 'views.admin.AccountSettings.block_receive_unknow_address_email',
  emailForwardingList: 'views.admin.AccountSettings.email_forwarding_config',
  subdomainMatchMode: 'views.admin.AccountSettings.create_address_subdomain_match',
  sendMailLimitConfig: 'views.admin.AccountSettings.send_mail_limit',
  dailyEnabled: 'views.admin.AccountSettings.send_mail_daily_limit',
  dailyLimit: 'views.admin.AccountSettings.send_mail_daily_limit',
  monthlyEnabled: 'views.admin.AccountSettings.send_mail_monthly_limit',
  monthlyLimit: 'views.admin.AccountSettings.send_mail_monthly_limit',
  enable: 'views.admin.UserSettings.enable',
  enableMailVerify: 'views.admin.UserSettings.enableMailVerify',
  verifyMailSender: 'views.admin.UserSettings.verifyMailSender',
  enableMailAllowList: 'views.admin.UserSettings.enableMailAllowList',
  mailAllowList: 'views.admin.UserSettings.mailAllowList',
  maxAddressCount: 'views.admin.UserSettings.maxAddressCount',
  enableEmailCheckRegex: 'views.admin.UserSettings.enableEmailCheckRegex',
  emailCheckRegex: 'views.admin.UserSettings.emailCheckRegex',
  enableMailsAutoCleanup: 'views.admin.Maintenance.mailBoxLabel',
  cleanMailsDays: 'views.admin.Maintenance.mailBoxLabel',
  enableUnknowMailsAutoCleanup: 'views.admin.Maintenance.mailUnknowLabel',
  cleanUnknowMailsDays: 'views.admin.Maintenance.mailUnknowLabel',
  enableSendBoxAutoCleanup: 'views.admin.Maintenance.sendBoxLabel',
  cleanSendBoxDays: 'views.admin.Maintenance.sendBoxLabel',
  enableAddressAutoCleanup: 'views.admin.Maintenance.addressCreateLabel',
  cleanAddressDays: 'views.admin.Maintenance.addressCreateLabel',
  enableInactiveAddressAutoCleanup: 'views.admin.Maintenance.inactiveAddressLabel',
  cleanInactiveAddressDays: 'views.admin.Maintenance.inactiveAddressLabel',
  enableUnboundAddressAutoCleanup: 'views.admin.Maintenance.unboundAddressLabel',
  cleanUnboundAddressDays: 'views.admin.Maintenance.unboundAddressLabel',
  enableEmptyAddressAutoCleanup: 'views.admin.Maintenance.emptyAddressLabel',
  cleanEmptyAddressDays: 'views.admin.Maintenance.emptyAddressLabel',
  customSqlCleanupList: 'views.admin.Maintenance.customSqlCleanup',
}

const endpointSettingKey = (endpoint: string, name: string) => {
  if (endpoint.includes('ip_blacklist')) return ({
    enabled: 'enable_ip_blacklist', blacklist: 'ip_blacklist', asnBlacklist: 'asn_blacklist',
    fingerprintBlacklist: 'fingerprint_blacklist', enableWhitelist: 'enable_ip_whitelist',
    whitelist: 'ip_whitelist', enableDailyLimit: 'enable_daily_limit', dailyRequestLimit: 'daily_request_limit',
  } as Record<string, string>)[name] ? `views.admin.IpBlacklistSettings.${({ enabled: 'enable_ip_blacklist', blacklist: 'ip_blacklist', asnBlacklist: 'asn_blacklist', fingerprintBlacklist: 'fingerprint_blacklist', enableWhitelist: 'enable_ip_whitelist', whitelist: 'ip_whitelist', enableDailyLimit: 'enable_daily_limit', dailyRequestLimit: 'daily_request_limit' } as Record<string, string>)[name]}` : undefined
  if (endpoint.includes('ai_extract')) return name === 'enableAllowList' ? 'views.admin.AiExtractSettings.enableAllowList' : name === 'allowList' ? 'views.admin.AiExtractSettings.allowList' : undefined
  if (endpoint.includes('/webhook/')) return name === 'enableAllowList' ? 'views.admin.Webhook.enableAllowList' : name === 'allowList' ? 'views.admin.Webhook.webhookAllowList' : undefined
  if (endpoint.includes('/telegram/')) return ({ enableAllowList: 'enableTelegramAllowList', allowList: 'telegramAllowList', miniAppUrl: 'miniAppUrl', enableGlobalMailPush: 'enableGlobalMailPush', globalMailPushList: 'globalMailPushList' } as Record<string, string>)[name] ? `views.admin.Telegram.${({ enableAllowList: 'enableTelegramAllowList', allowList: 'telegramAllowList', miniAppUrl: 'miniAppUrl', enableGlobalMailPush: 'enableGlobalMailPush', globalMailPushList: 'globalMailPushList' } as Record<string, string>)[name]}` : undefined
  return SETTING_KEYS[name]
}

function JsonEditor({ value, onChange, t }: { value: unknown; onChange: (value: any) => void; t: Translate }) {
  const serialized = JSON.stringify(value, null, 2)
  const [draft, setDraft] = useState(serialized)
  const [valid, setValid] = useState(true)
  useEffect(() => { setDraft(serialized); setValid(true) }, [serialized])
  return <div className="grid gap-1"><Textarea className={`min-h-40 font-mono text-xs ${valid ? '' : 'border-destructive focus:border-destructive'}`} value={draft} onChange={(event) => {
    const next = event.target.value
    setDraft(next)
    try { onChange(JSON.parse(next)); setValid(true) } catch { setValid(false) }
  }} />{!valid && <span className="text-xs text-destructive">{t('ui.common.invalidJson')}</span>}</div>
}

function SettingControl({ name, value, onChange, labelFor, t }: { name: string; value: any; onChange: (value: any) => void; labelFor: (name: string) => string; t: Translate }) {
  if (typeof value === 'boolean') return <Switch checked={value} onCheckedChange={onChange} />
  if (typeof value === 'number') return <Input className="max-w-56" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
  if (name === 'subdomainMatchMode') return <Select value={String(value || 'inherit')} onValueChange={onChange}><SelectTrigger className="max-w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inherit">{t('ui.common.inherit')}</SelectItem><SelectItem value="enabled">{t('ui.common.enabled')}</SelectItem><SelectItem value="disabled">{t('ui.common.disabled')}</SelectItem></SelectContent></Select>
  if (Array.isArray(value)) {
    const complex = value.some((item) => typeof item === 'object' && item !== null) || /forwarding|customSql|oauth/i.test(name)
    if (complex) return <JsonEditor value={value} onChange={onChange} t={t} />
    return <Textarea className="min-h-28 font-mono text-xs" value={value.join('\n')} onChange={(event) => onChange(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} />
  }
  if (value && typeof value === 'object') return <div className="grid gap-0 border-l border-border pl-4">{Object.entries(value).map(([child, childValue]) => <SettingRow key={child} name={child} value={childValue} onChange={(next) => onChange({ ...value, [child]: next })} labelFor={labelFor} t={t} />)}</div>
  const text = value == null ? '' : String(value)
  if (/sql|template|content|description|announcement|html|json/i.test(name) || text.length > 100) return <Textarea className="min-h-24 font-mono text-xs" value={text} onChange={(event) => onChange(event.target.value)} />
  return <Input value={text} onChange={(event) => onChange(event.target.value)} />
}

function SettingRow({ name, value, onChange, labelFor, t }: { name: string; value: any; onChange: (value: any) => void; labelFor: (name: string) => string; t: Translate }) {
  const nested = value && typeof value === 'object' && !Array.isArray(value)
  return <div className={nested ? 'py-3' : 'grid gap-3 border-b border-border py-3 sm:grid-cols-[minmax(180px,0.42fr)_minmax(0,1fr)] sm:items-center'}>
    <label className="text-sm font-medium text-foreground">{labelFor(name)}</label>
    <SettingControl name={name} value={value} onChange={onChange} labelFor={labelFor} t={t} />
  </div>
}

export function ObjectSettings({ endpoint, title, description, transformLoad, transformSave, extraActions }: {
  endpoint: string
  title?: string
  description?: string
  transformLoad?: (value: any) => any
  transformSave?: (value: any) => any
  extraActions?: ReactNode
}) {
  const { t } = useI18n()
  const commonT = useScopedI18n('ui.common').t
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-settings', endpoint], queryFn: () => api.fetch<any>(endpoint) })
  const [model, setModel] = useState<any>({})
  useEffect(() => { if (query.data) setModel(transformLoad ? transformLoad(query.data) : query.data) }, [query.data, transformLoad])
  const save = useMutation({
    mutationFn: () => api.fetch(endpoint, { method: 'POST', body: transformSave ? transformSave(model) : model }),
    onSuccess: async () => { toast.success(commonT('saved')); await client.invalidateQueries({ queryKey: ['admin-settings', endpoint] }) },
    onError: (error) => toast.error(stringifyError(error)),
  })
  const labelFor = (name: string) => {
    const key = endpointSettingKey(endpoint, name)
    return key ? t(key) : t('ui.admin.settingLabel', { name: humanize(name) })
  }
  return <section className="h-full overflow-auto">
    <header className="sticky top-0 z-10 flex min-h-12 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
      <div className="min-w-0">{title && <h1 className="truncate text-sm font-semibold">{title}</h1>}{description && <p className="truncate text-xs text-muted-foreground">{description}</p>}</div>
      <div className="flex shrink-0 gap-2">{extraActions}<Button variant="secondary" size="icon" title={commonT('refresh')} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} /></Button><Button onClick={() => save.mutate()} disabled={save.isPending || query.isLoading}><Save />{commonT('save')}</Button></div>
    </header>
    <div className="mx-auto w-full max-w-4xl px-4 pb-10">{query.isLoading ? <div className="py-8 text-sm text-muted-foreground">{commonT('loading')}</div> : query.isError ? <div className="py-8 text-sm text-destructive">{stringifyError(query.error)}</div> : Array.isArray(model) ? <div className="py-4"><JsonEditor value={model} onChange={setModel} t={t} /></div> : Object.entries(model).map(([name, value]) => <SettingRow key={name} name={name} value={value} onChange={(next) => setModel((current: Record<string, any>) => ({ ...current, [name]: next }))} labelFor={labelFor} t={t} />)}</div>
  </section>
}
