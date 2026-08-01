import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Code2, Italic, List, ListOrdered, Redo2, Send, Strikethrough, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { api } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'
import { getSafeExternalUrl, isValidEmailAddress, stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'
import { sanitizeHtml } from '@/lib/sanitize'

const emptyModel = { fromName: '', fromMail: '', toName: '', toMail: '', subject: '', contentType: 'text', content: '' }
const hasContent = (value: string, type: string) => {
  if (type === 'text') return value.replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '').trim().length > 0
  const element = document.createElement('div'); element.innerHTML = value; element.querySelectorAll('script,style,noscript,template').forEach((node) => node.remove())
  return Boolean(element.textContent?.trim() || element.querySelector('img,audio,video,iframe,svg,canvas,table'))
}

export function SendMailPage({ admin = false, onSent }: { admin?: boolean; onSent?: () => void }) {
  const { t } = useScopedI18n(admin ? 'views.admin.SendMail' : 'views.index.SendMail')
  const { settings, model: storedModel, adminContact } = useAppStore((state) => ({ settings: state.settings, model: state.sendMailModel, adminContact: state.openSettings.adminContact }))
  const adminContactUrl = getSafeExternalUrl(adminContact) || (isValidEmailAddress(adminContact) ? `mailto:${adminContact.trim()}` : null)
  const [model, setModel] = useState({ ...emptyModel, ...storedModel })
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const editor = useEditor({ extensions: [StarterKit], content: model.content, onUpdate: ({ editor }) => update('content', editor.getHTML()), immediatelyRender: false })
  useEffect(() => { appStore.setState({ sendMailModel: model }) }, [model])
  useEffect(() => { if (editor && model.content !== editor.getHTML() && model.contentType === 'rich') editor.commands.setContent(model.content) }, [editor, model.contentType])
  const update = (key: string, value: any) => setModel((current) => ({ ...current, [key]: value }))
  const send = async () => {
    const subject = model.subject.trim(), to = model.toMail.trim()
    if (!subject) return toast.error(t('subjectEmpty'))
    if (!to) return toast.error(t('toMailEmpty'))
    if (!hasContent(model.content, model.contentType)) return toast.error(t('contentEmpty'))
    setSending(true)
    try {
      await api.fetch(admin ? '/api/admin/send_mail' : '/api/send_mail', { method: 'POST', body: { from_name: model.fromName, from_mail: admin ? (model.fromMail || '') : undefined, to_name: model.toName, to_mail: to, subject, is_html: model.contentType !== 'text', content: model.content } })
      setModel(emptyModel); setPreview(false); toast.success(t('successSend')); if (!admin) onSent?.()
    } catch (error) { toast.error(stringifyError(error)) } finally { setSending(false) }
  }
  const requestAccess = async () => { try { await api.fetch('/api/request_send_mail_access', { method: 'POST', body: {} }); await api.getSettings(); toast.success(t('success')) } catch (error) { toast.error(stringifyError(error)) } }
  if (!admin && (!settings.send_balance || settings.send_balance <= 0)) return <SettingsLayout><div className="rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground"><p>{t('requestAccessTip')}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={requestAccess}>{t('requestAccess')}</Button>{adminContactUrl ? <Button variant="link" asChild><a href={adminContactUrl}>{adminContact}</a></Button> : adminContact ? <span className="px-3 py-2">{adminContact}</span> : null}</div></div></SettingsLayout>
  const toolbar = editor && <div className="flex flex-wrap gap-1 border-b border-border p-1">{[
    [Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')], [Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')], [Strikethrough, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike')], [Code2, () => editor.chain().focus().toggleCode().run(), editor.isActive('code')], [List, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList')], [ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList')], [Undo2, () => editor.chain().focus().undo().run(), false], [Redo2, () => editor.chain().focus().redo().run(), false],
  ].map(([Icon, action, active], index) => { const C = Icon as any; return <Button key={index} type="button" size="icon" variant={active ? 'secondary' : 'ghost'} onClick={action as any}><C /></Button> })}</div>
  return <SettingsLayout action={<Button disabled={sending} onClick={send}><Send />{t('send')}</Button>}>
    {!admin && <p className="text-sm text-muted-foreground">{t('send_balance')}: <span className="numeric font-medium text-foreground">{settings.send_balance}</span></p>}
    <Field label={t('fromName')}><div className="grid gap-2 sm:grid-cols-2"><Input value={model.fromName} onChange={(event) => update('fromName', event.target.value)} />{admin ? <Input placeholder="sender@example.com" value={model.fromMail || ''} onChange={(event) => update('fromMail', event.target.value)} /> : <Input value={settings.address} disabled />}</div></Field>
    <Field label={t('toName')}><div className="grid gap-2 sm:grid-cols-2"><Input value={model.toName} onChange={(event) => update('toName', event.target.value)} /><Input type="email" value={model.toMail} onChange={(event) => update('toMail', event.target.value)} /></div></Field>
    <Field label={t('subject')}><Input value={model.subject} onChange={(event) => update('subject', event.target.value)} /></Field>
    <Field label={t('options')}><div className="flex flex-wrap items-center gap-2"><Tabs value={model.contentType} onValueChange={(value) => { update('contentType', value); setPreview(false) }}><TabsList className="rounded-md border border-border p-0.5"><TabsTrigger value="text">{t('text')}</TabsTrigger><TabsTrigger value="html">{t('html')}</TabsTrigger><TabsTrigger value="rich">{t('rich text')}</TabsTrigger></TabsList></Tabs>{model.contentType !== 'text' && <Button variant="secondary" onClick={() => setPreview((value) => !value)}>{preview ? t('edit') : t('preview')}</Button>}</div></Field>
    <Field label={t('content')}>{preview ? <div className="min-h-64 rounded-md border border-border p-4 mail-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(model.content) }} /> : model.contentType === 'rich' ? <div className="overflow-hidden rounded-md border border-input">{toolbar}<EditorContent editor={editor} className="min-h-[360px] px-4 py-3 [&_.tiptap]:min-h-[330px] [&_.tiptap]:outline-none" /></div> : <Textarea className="min-h-[360px] font-mono text-xs" value={model.content} onChange={(event) => update('content', event.target.value)} />}</Field>
  </SettingsLayout>
}
