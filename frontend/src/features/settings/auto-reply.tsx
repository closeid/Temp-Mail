import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { api } from '@/lib/api'
import { stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export function AutoReplySettings() {
  const { t } = useScopedI18n('views.index.AutoReply')
  const query = useQuery({ queryKey: ['auto-reply'], queryFn: () => api.fetch<any>('/api/auto_reply') })
  const [model, setModel] = useState({ enabled: false, source_prefix: '', name: '', message: '', subject: '' })
  useEffect(() => { if (query.data) setModel({ ...model, ...query.data }) }, [query.data])
  const save = useMutation({ mutationFn: () => api.fetch('/api/auto_reply', { method: 'POST', body: { auto_reply: model } }), onSuccess: () => toast.success(t('success')), onError: (error) => toast.error(stringifyError(error)) })
  const update = (key: keyof typeof model, value: any) => setModel((current) => ({ ...current, [key]: value }))
  return <SettingsLayout title={t('settings')} action={<Button onClick={() => save.mutate()} disabled={save.isPending}><Save />{t('save')}</Button>}>
    <label className="flex items-center justify-between border-b border-border pb-4 text-sm font-medium"><span>{t('enableAutoReply')}</span><Switch checked={model.enabled} onCheckedChange={(value) => update('enabled', value)} /></label>
    <Field label={t('name')}><Input disabled={!model.enabled} value={model.name} onChange={(event) => update('name', event.target.value)} /></Field>
    <Field label={t('sourcePrefix')}><Input disabled={!model.enabled} value={model.source_prefix} placeholder={t('sourcePrefixPlaceholder')} onChange={(event) => update('source_prefix', event.target.value)} /></Field>
    <Field label={t('subject')}><Input disabled={!model.enabled} value={model.subject} onChange={(event) => update('subject', event.target.value)} /></Field>
    <Field label={t('autoReply')}><Textarea disabled={!model.enabled} rows={8} value={model.message} onChange={(event) => update('message', event.target.value)} /></Field>
  </SettingsLayout>
}
