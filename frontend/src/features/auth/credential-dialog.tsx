import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { appStore, useAppStore } from '@/lib/store'
import { copyText } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

function CredentialField({ label, value }: { label: string; value: string }) {
  const { t } = useScopedI18n('ui.common')
  const copy = async () => { await copyText(value); toast.success(t('copied')) }
  return <div className="grid gap-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span><div className="flex min-w-0 items-start gap-2"><code className="numeric min-w-0 flex-1 break-words rounded-md bg-muted px-2.5 py-2 text-xs leading-5">{value || '-'}</code><Button size="icon" variant="ghost" title={t('copy')} onClick={copy}><Copy /></Button></div></div>
}

export function AddressCredentialDetails({ showHeading = true }: { showHeading?: boolean }) {
  const { t, locale } = useScopedI18n('components.AddressCredentialModal')
  const state = useAppStore((value) => value)
  const smtp = state.openSettings.smtpImapProxyConfig?.smtp || {}
  const imap = state.openSettings.smtpImapProxyConfig?.imap || {}
  const apiBase = (import.meta.env.VITE_API_BASE || location.origin).replace(/\/$/, '')
  const autoLogin = `${location.origin}${locale === 'zh' ? '/' : `/${locale}/`}#jwt=${encodeURIComponent(state.jwt)}`
  const agentConfig = JSON.stringify({ base: apiBase, jwt: state.jwt, site_password: state.auth || '' }, null, 2)
  return <div className="grid gap-4">{showHeading && <div><h1 className="text-lg font-semibold">{t('title')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('tip')}</p></div>}
    <div className="grid gap-4"><CredentialField label={t('currentAddress')} value={state.settings.address} /><CredentialField label={t('addressCredentialLabel')} value={state.jwt} />{state.addressPassword && <CredentialField label={t('addressPassword')} value={state.addressPassword} />}</div>
    {state.openSettings.enableAgentEmailInfo && <details className="group border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">{t('agentAccess')}</summary><div className="mt-3 grid gap-3"><p className="text-sm text-muted-foreground">{t('agentAccessTip')}</p><CredentialField label={t('apiBase')} value={apiBase} /><CredentialField label={t('agentConfig')} value={agentConfig} /><Button variant="link" asChild><a href={`https://temp-mail-docs.awsl.uk/${locale === 'zh' ? 'zh' : 'en'}/guide/feature/agent-email.html`} target="_blank" rel="noopener noreferrer">{t('docs')}<ExternalLink /></a></Button></div></details>}
    {(smtp.host || imap.host) && <details className="group border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">{t('smtpImapAccess')}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><CredentialField label={t('smtpHost')} value={smtp.host || '-'} /><CredentialField label={t('smtpPort')} value={String(smtp.port || 8025)} /><CredentialField label={t('imapHost')} value={imap.host || '-'} /><CredentialField label={t('imapPort')} value={String(imap.port || 11143)} /><div className="sm:col-span-2"><CredentialField label={t('username')} value={state.settings.address} /></div><div className="sm:col-span-2"><CredentialField label={t('password')} value={state.jwt} /></div></div></details>}
    <Separator /><CredentialField label={t('autoLoginLink')} value={autoLogin} />
  </div>
}

export function CredentialDialog() {
  const { t } = useScopedI18n('components.AddressCredentialModal')
  const state = useAppStore((value) => value)
  const open = state.showAddressCredential && Boolean(state.jwt)
  return <Dialog open={open} onOpenChange={(value) => appStore.setState({ showAddressCredential: value })}><DialogContent className="w-[min(720px,calc(100vw-32px))]"><DialogHeader><DialogTitle>{t('title')}</DialogTitle><DialogDescription>{t('tip')}</DialogDescription></DialogHeader><AddressCredentialDetails showHeading={false} /></DialogContent></Dialog>
}
