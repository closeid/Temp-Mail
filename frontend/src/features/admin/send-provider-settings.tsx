import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { SettingRow, SettingsLayout } from '@/components/layout/settings-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

type SendMailConfig = {
  cloudflareBinding: boolean
  resendGlobal: boolean
  resendDomains: string[]
  smtpDomains: string[]
  defaultSendBalance: number
}

function Status({ enabled }: { enabled: boolean }) {
  const { t } = useScopedI18n('ui.common')
  return <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? t('enabled') : t('disabled')}</Badge>
}

function ConfigValue({ status, variable, details }: { status: boolean; variable: string; details?: string }) {
  return <div className="grid justify-items-start gap-2 sm:justify-items-end"><Status enabled={status} /><code className="break-all rounded bg-muted px-2 py-1 text-xs">{variable}</code>{details && <span className="text-xs leading-5 text-muted-foreground">{details}</span>}</div>
}

export function SendProviderSettingsPage() {
  const { t } = useScopedI18n('ui.admin')
  const commonT = useScopedI18n('ui.common').t
  const query = useQuery({ queryKey: ['admin-worker-config'], queryFn: () => api.fetch<{ SEND_MAIL_CONFIG?: SendMailConfig }>('/api/admin/worker/configs') })
  const config = query.data?.SEND_MAIL_CONFIG
  const resendEnabled = Boolean(config?.resendGlobal || config?.resendDomains.length)
  const smtpEnabled = Boolean(config?.smtpDomains.length)
  const formatDomains = (domains?: string[]) => domains?.length ? domains.join(', ') : commonT('notConfigured')
  return <SettingsLayout title={t('sendConfiguration')} description={t('sendConfigurationIntro')} action={<Button size="icon" variant="secondary" title={commonT('refresh')} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} /></Button>} className="max-w-4xl">
    <p className="border-b border-border pb-5 text-xs leading-5 text-muted-foreground">{t('sendConfigurationSecurity')}</p>
    {query.isError ? <p className="text-sm text-destructive">{stringifyError(query.error)}</p> : <>
      <SettingRow label={t('cloudflareEmailBinding')} description={t('cloudflareEmailBindingDescription')} control={<ConfigValue status={Boolean(config?.cloudflareBinding)} variable="SEND_MAIL" />} />
      <SettingRow label="Resend" description={t('resendDescription')} control={<ConfigValue status={resendEnabled} variable="RESEND_TOKEN / RESEND_TOKEN_<DOMAIN>" details={config?.resendGlobal ? t('globalCredential') : formatDomains(config?.resendDomains)} />} />
      <SettingRow label="SMTP" description={t('smtpDescription')} control={<ConfigValue status={smtpEnabled} variable="SMTP_CONFIG" details={formatDomains(config?.smtpDomains)} />} />
      <SettingRow label={t('defaultSendBalance')} description={t('defaultSendBalanceDescription')} control={<span className="numeric text-sm font-medium">{config?.defaultSendBalance ?? 0}</span>} />
      <p className="text-xs leading-5 text-muted-foreground">{t('providerPriority')}</p>
    </>}
  </SettingsLayout>
}
