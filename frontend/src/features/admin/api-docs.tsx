import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { copyText } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

type Endpoint = readonly [method: string, path: string]
type ApiGroup = { title: string; auth: string; endpoints: Endpoint[] }

const PUBLIC_ENDPOINTS: Endpoint[] = [
  ['GET', '/api/health'], ['GET', '/api/open/settings'], ['POST', '/api/open/site_login'],
  ['POST', '/api/open/admin_login'], ['POST', '/api/open/credential_login'],
]
const MAILBOX_ENDPOINTS: Endpoint[] = [
  ['GET', '/api/settings'], ['POST', '/api/new_address'], ['POST', '/api/address_login'], ['POST', '/api/address_change_password'],
  ['DELETE', '/api/delete_address'], ['DELETE', '/api/clear_inbox'], ['DELETE', '/api/clear_sent_items'],
  ['GET', '/api/mails'], ['GET', '/api/mail/:mail_id'], ['DELETE', '/api/mails/:id'], ['GET', '/api/parsed_mails'], ['GET', '/api/parsed_mail/:mail_id'],
  ['GET', '/api/auto_reply'], ['POST', '/api/auto_reply'], ['GET', '/api/webhook/settings'], ['POST', '/api/webhook/settings'], ['POST', '/api/webhook/test'],
  ['GET', '/api/attachment/list'], ['POST', '/api/attachment/delete'], ['POST', '/api/attachment/put_url'], ['POST', '/api/attachment/get_url'],
  ['POST', '/api/request_send_mail_access'], ['POST', '/api/send_mail'], ['GET', '/api/sendbox'], ['DELETE', '/api/sendbox/:id'],
]
const USER_ENDPOINTS: Endpoint[] = [
  ['GET', '/api/user/open_settings'], ['GET', '/api/user/settings'], ['POST', '/api/user/login'], ['POST', '/api/user/register'], ['POST', '/api/user/verify_code'],
  ['GET', '/api/user/oauth2/login_url'], ['POST', '/api/user/oauth2/callback'], ['GET', '/api/user/mails'], ['DELETE', '/api/user/mails/:id'],
  ['GET', '/api/user/bind_address'], ['POST', '/api/user/bind_address'], ['GET', '/api/user/bind_address_jwt/:address_id'], ['POST', '/api/user/unbind_address'], ['POST', '/api/user/transfer_address'],
  ['GET', '/api/user/passkey'], ['POST', '/api/user/passkey/rename'], ['DELETE', '/api/user/passkey/:passkey_id'],
  ['POST', '/api/user/passkey/register_request'], ['POST', '/api/user/passkey/register_response'], ['POST', '/api/user/passkey/authenticate_request'], ['POST', '/api/user/passkey/authenticate_response'],
]
const ADMIN_ENDPOINTS: Endpoint[] = [
  ['GET', '/api/admin/address'], ['POST', '/api/admin/new_address'], ['DELETE', '/api/admin/delete_address/:id'],
  ['DELETE', '/api/admin/clear_inbox/:id'], ['DELETE', '/api/admin/clear_sent_items/:id'], ['GET', '/api/admin/show_password/:id'], ['POST', '/api/admin/address/:id/reset_password'],
  ['GET', '/api/admin/mails'], ['GET', '/api/admin/mails_unknow'], ['DELETE', '/api/admin/mails/:id'], ['GET', '/api/admin/sendbox'], ['DELETE', '/api/admin/sendbox/:id'],
  ['GET', '/api/admin/address_sender'], ['POST', '/api/admin/address_sender'], ['DELETE', '/api/admin/address_sender/:id'], ['GET', '/api/admin/statistics'],
  ['GET', '/api/admin/account_settings'], ['POST', '/api/admin/account_settings'], ['POST', '/api/admin/cleanup'], ['GET', '/api/admin/auto_cleanup'], ['POST', '/api/admin/auto_cleanup'],
  ['GET', '/api/admin/user_settings'], ['POST', '/api/admin/user_settings'], ['GET', '/api/admin/users'], ['POST', '/api/admin/users'], ['DELETE', '/api/admin/users/:user_id'], ['POST', '/api/admin/users/:user_id/reset_password'],
  ['GET', '/api/admin/user_roles'], ['POST', '/api/admin/user_roles'], ['GET', '/api/admin/role_address_config'], ['POST', '/api/admin/role_address_config'],
  ['GET', '/api/admin/access_tokens'], ['POST', '/api/admin/access_tokens'], ['DELETE', '/api/admin/access_tokens/:id'],
  ['GET', '/api/admin/users/bind_address/:user_id'], ['POST', '/api/admin/users/bind_address'], ['GET', '/api/admin/user_oauth2_settings'], ['POST', '/api/admin/user_oauth2_settings'],
  ['GET', '/api/admin/webhook/settings'], ['POST', '/api/admin/webhook/settings'], ['GET', '/api/admin/mail_webhook/settings'], ['POST', '/api/admin/mail_webhook/settings'], ['POST', '/api/admin/mail_webhook/test'],
  ['GET', '/api/admin/worker/configs'], ['POST', '/api/admin/send_mail'], ['POST', '/api/admin/send_mail_by_binding'],
  ['GET', '/api/admin/db_version'], ['POST', '/api/admin/db_initialize'], ['POST', '/api/admin/db_migration'],
  ['GET', '/api/admin/ip_blacklist/settings'], ['POST', '/api/admin/ip_blacklist/settings'], ['GET', '/api/admin/ai_extract/settings'], ['POST', '/api/admin/ai_extract/settings'],
  ['POST', '/api/admin/telegram/init'], ['GET', '/api/admin/telegram/status'], ['GET', '/api/admin/telegram/settings'], ['POST', '/api/admin/telegram/settings'],
  ['POST', '/api/admin/test/seed_mail'], ['POST', '/api/admin/test/receive_mail'],
]
const TELEGRAM_ENDPOINTS: Endpoint[] = [
  ['POST', '/api/telegram/webhook'], ['POST', '/api/telegram/get_bind_address'], ['POST', '/api/telegram/new_address'],
  ['POST', '/api/telegram/bind_address'], ['POST', '/api/telegram/unbind_address'], ['POST', '/api/telegram/get_mail'],
]
const EXTERNAL_ENDPOINTS: Endpoint[] = [['POST', '/api/external/send_mail']]

export function ApiDocsPage() {
  const { t } = useScopedI18n('ui.admin')
  const commonT = useScopedI18n('ui.common').t
  const baseUrl = (import.meta.env.VITE_API_BASE || location.origin).replace(/\/$/, '')
  const example = `curl "${baseUrl}/api/open/settings"`
  const adminCreateAddressBody = JSON.stringify({ name: 'inbox', domain: 'example.com', enablePrefix: false, ownerUserEmail: 'user@example.com' }, null, 2)
  const groups: ApiGroup[] = [
    { title: t('publicApis'), auth: t('publicAuth'), endpoints: PUBLIC_ENDPOINTS },
    { title: t('mailboxApis'), auth: t('mailboxAuth'), endpoints: MAILBOX_ENDPOINTS },
    { title: t('userApis'), auth: t('userAuth'), endpoints: USER_ENDPOINTS },
    { title: t('adminApis'), auth: t('adminAuth'), endpoints: ADMIN_ENDPOINTS },
    { title: t('telegramApis'), auth: t('telegramAuth'), endpoints: TELEGRAM_ENDPOINTS },
    { title: t('externalApis'), auth: t('externalAuth'), endpoints: EXTERNAL_ENDPOINTS },
  ]
  const copy = async () => { await copyText(example); toast.success(commonT('copied')) }
  return <section className="h-full overflow-auto">
    <header className="border-b border-border px-5 py-4"><h1 className="text-base font-semibold">{t('apiDocumentation')}</h1></header>
    <div className="mx-auto grid w-full max-w-5xl gap-7 px-5 py-6">
      <div className="grid gap-3 border-b border-border pb-6"><div><span className="text-xs font-medium text-muted-foreground">{t('baseUrl')}</span><code className="mt-1 block break-all text-sm">{baseUrl}</code></div><div><span className="text-xs font-medium text-muted-foreground">{t('authentication')}</span><p className="mt-1 text-sm">{t('customAuth')}</p></div><div><span className="text-xs font-medium text-muted-foreground">{t('requestExample')}</span><div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 overflow-auto rounded-md bg-muted px-3 py-2 text-xs">{example}</code><Button size="icon" variant="secondary" title={commonT('copy')} onClick={copy}><Copy /></Button></div></div><div><span className="text-xs font-medium text-muted-foreground">{t('adminCreateAddressRequest')}</span><p className="mt-1 text-xs text-muted-foreground">{t('adminCreateAddressRequestDescription')}</p><pre className="mt-2 overflow-auto rounded-md bg-muted px-3 py-2 text-xs">{adminCreateAddressBody}</pre></div></div>
      {groups.map((group) => <section key={group.title} className="grid gap-3"><div><h2 className="text-sm font-semibold">{group.title}</h2><p className="mt-1 text-xs text-muted-foreground">{group.auth}</p></div><div className="overflow-hidden rounded-md border border-border"><Table><TableHeader><TableRow><TableHead className="w-28">{t('method')}</TableHead><TableHead>{t('endpoint')}</TableHead></TableRow></TableHeader><TableBody>{group.endpoints.map(([method, path]) => <TableRow key={`${method}-${path}`}><TableCell><code className="text-xs font-semibold">{method}</code></TableCell><TableCell><code className="break-all text-xs">{path}</code></TableCell></TableRow>)}</TableBody></Table></div></section>)}
    </div>
  </section>
}
