import { useEffect, useState } from 'react'
import { ExternalLink, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

type Model = { enabled: boolean; url: string; method: string; headers: string; body: string }
const blank: Model = { enabled: false, url: '', method: 'POST', headers: '{}', body: '{}' }
const presets = [
  ['Message Pusher', 'https://github.com/songquanpeng/message-pusher', 'https://msgpusher.com/push/username', { token: 'token', title: '${subject}', description: '${subject}', content: '*${subject}*\n\nFrom: ${from}\nTo: ${to}\n\n${parsedText}\n' }],
  ['Bark', 'https://github.com/Finb/Bark', 'https://api.day.app/YOUR_KEY', { title: '${subject}', body: 'From: ${from}\nTo: ${to}\n\n${parsedText}', group: 'email' }],
  ['ntfy', 'https://docs.ntfy.sh/publish/', 'https://ntfy.sh/YOUR_TOPIC', { topic: 'YOUR_TOPIC', title: '${subject}', message: 'From: ${from}\nTo: ${to}\n\n${parsedText}', tags: ['envelope'] }],
  ['Telegram Bot', 'https://core.telegram.org/bots/api#sendmessage', 'https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage', { chat_id: 'YOUR_CHAT_ID', text: 'New Email\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nURL: ${url}' }],
  ['WeChat Work', 'https://developer.work.weixin.qq.com/document/path/91770', 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY', { msgtype: 'text', text: { content: 'New Email\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nURL: ${url}' } }],
  ['Discord', 'https://discord.com/developers/docs/resources/webhook', 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN', { content: '**New Email**\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nURL: ${url}' }],
] as const

export function WebhookSettings({ fetchData, saveSettings, testSettings, notice, unavailableTitle, title, description, embedded = false }: { fetchData: () => Promise<any>; saveSettings: (model: Model) => Promise<any>; testSettings: (model: Model) => Promise<any>; notice?: string; unavailableTitle?: string; title?: string; description?: string; embedded?: boolean }) {
  const { t } = useScopedI18n('components.WebhookComponent')
  const [model, setModel] = useState(blank)
  const [available, setAvailable] = useState(true)
  const [loadError, setLoadError] = useState('')
  useEffect(() => { fetchData().then((result) => setModel({ ...blank, ...result })).catch((error) => { setLoadError(stringifyError(error)); setAvailable(false) }) }, [])
  const update = (key: keyof Model, value: any) => setModel((current) => ({ ...current, [key]: value }))
  const run = async (type: 'save' | 'test') => { if (!model.url) return toast.error(t('urlMissing')); try { await (type === 'save' ? saveSettings(model) : testSettings(model)); toast.success(t('successTip')) } catch (error) { toast.error(stringifyError(error)) } }
  const apply = (preset: typeof presets[number]) => { setModel({ enabled: true, url: preset[2], method: 'POST', headers: JSON.stringify({ 'Content-Type': 'application/json' }, null, 2), body: JSON.stringify(preset[3], null, 2) }); toast.success(t('fillInDemoTip')); window.open(preset[1], '_blank', 'noopener,noreferrer') }
  if (!available) return <div className={embedded ? 'grid place-items-center py-8 text-center' : 'grid h-full place-items-center px-5 text-center'}><div><p className="text-sm font-medium text-foreground">{unavailableTitle || t('notEnabled')}</p>{loadError && <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{loadError}</p>}</div></div>
  const actions = <div className="flex flex-wrap gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary">{t('presets')}</Button></DropdownMenuTrigger><DropdownMenuContent>{presets.map((preset) => <DropdownMenuItem key={preset[0]} onSelect={() => apply(preset)}>{preset[0]}<ExternalLink className="ml-auto" /></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>{model.enabled && <Button variant="secondary" onClick={() => run('test')}><Send />{t('test')}</Button>}<Button onClick={() => run('save')}><Save />{t('save')}</Button></div>
  const fields = <>
    {notice && <p className="border-b border-border pb-4 text-xs leading-5 text-muted-foreground">{notice}</p>}
    <label className="flex items-center justify-between border-b border-border pb-4 text-sm font-medium"><span>{t('enable')}</span><Switch checked={model.enabled} onCheckedChange={(value) => update('enabled', value)} /></label>
    {model.enabled && <><Field label="URL"><Input value={model.url} onChange={(event) => update('url', event.target.value)} /></Field><Field label="METHOD"><Input value={model.method} onChange={(event) => update('method', event.target.value.toUpperCase())} /></Field><Field label="HEADERS"><Textarea className="font-mono text-xs" rows={6} value={model.headers} onChange={(event) => update('headers', event.target.value)} /></Field><Field label="BODY"><Textarea className="font-mono text-xs" rows={10} value={model.body} onChange={(event) => update('body', event.target.value)} /></Field></>}
  </>
  if (embedded) return <div className="grid gap-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div>{title && <h2 className="text-sm font-semibold">{title}</h2>}{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div>{actions}</div>{fields}</div>
  return <SettingsLayout title={title} description={description} action={actions}>{fields}</SettingsLayout>
}
