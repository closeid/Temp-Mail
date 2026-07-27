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

const humanize = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (value) => value.toUpperCase())

function JsonEditor({ value, onChange }: { value: unknown; onChange: (value: any) => void }) {
  const serialized = JSON.stringify(value, null, 2)
  const [draft, setDraft] = useState(serialized)
  const [valid, setValid] = useState(true)
  useEffect(() => { setDraft(serialized); setValid(true) }, [serialized])
  return <div className="grid gap-1"><Textarea className={`min-h-40 font-mono text-xs ${valid ? '' : 'border-destructive focus:border-destructive'}`} value={draft} onChange={(event) => {
    const next = event.target.value
    setDraft(next)
    try { onChange(JSON.parse(next)); setValid(true) } catch { setValid(false) }
  }} />{!valid && <span className="text-xs text-destructive">Invalid JSON</span>}</div>
}

function SettingControl({ name, value, onChange }: { name: string; value: any; onChange: (value: any) => void }) {
  if (typeof value === 'boolean') return <Switch checked={value} onCheckedChange={onChange} />
  if (typeof value === 'number') return <Input className="max-w-56" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
  if (name === 'subdomainMatchMode') return <Select value={String(value || 'inherit')} onValueChange={onChange}><SelectTrigger className="max-w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inherit">Inherit</SelectItem><SelectItem value="enabled">Enabled</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent></Select>
  if (Array.isArray(value)) {
    const complex = value.some((item) => typeof item === 'object' && item !== null) || /forwarding|customSql|oauth/i.test(name)
    if (complex) return <JsonEditor value={value} onChange={onChange} />
    return <Textarea className="min-h-28 font-mono text-xs" value={value.join('\n')} onChange={(event) => onChange(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} />
  }
  if (value && typeof value === 'object') return <div className="grid gap-0 border-l border-border pl-4">{Object.entries(value).map(([child, childValue]) => <SettingRow key={child} name={child} value={childValue} onChange={(next) => onChange({ ...value, [child]: next })} />)}</div>
  const text = value == null ? '' : String(value)
  if (/sql|template|content|description|announcement|html|json/i.test(name) || text.length > 100) return <Textarea className="min-h-24 font-mono text-xs" value={text} onChange={(event) => onChange(event.target.value)} />
  return <Input value={text} onChange={(event) => onChange(event.target.value)} />
}

function SettingRow({ name, value, onChange }: { name: string; value: any; onChange: (value: any) => void }) {
  const nested = value && typeof value === 'object' && !Array.isArray(value)
  return <div className={nested ? 'py-3' : 'grid gap-3 border-b border-border py-3 sm:grid-cols-[minmax(180px,0.42fr)_minmax(0,1fr)] sm:items-center'}>
    <label className="text-sm font-medium text-foreground">{humanize(name)}</label>
    <SettingControl name={name} value={value} onChange={onChange} />
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
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-settings', endpoint], queryFn: () => api.fetch<any>(endpoint) })
  const [model, setModel] = useState<any>({})
  useEffect(() => { if (query.data) setModel(transformLoad ? transformLoad(query.data) : query.data) }, [query.data, transformLoad])
  const save = useMutation({
    mutationFn: () => api.fetch(endpoint, { method: 'POST', body: transformSave ? transformSave(model) : model }),
    onSuccess: async () => { toast.success('Saved'); await client.invalidateQueries({ queryKey: ['admin-settings', endpoint] }) },
    onError: (error) => toast.error(stringifyError(error)),
  })
  return <section className="h-full overflow-auto">
    <header className="sticky top-0 z-10 flex min-h-12 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
      <div className="min-w-0">{title && <h1 className="truncate text-sm font-semibold">{title}</h1>}{description && <p className="truncate text-xs text-muted-foreground">{description}</p>}</div>
      <div className="flex shrink-0 gap-2">{extraActions}<Button variant="secondary" size="icon" title="Refresh" onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} /></Button><Button onClick={() => save.mutate()} disabled={save.isPending || query.isLoading}><Save />Save</Button></div>
    </header>
    <div className="mx-auto w-full max-w-4xl px-4 pb-10">{query.isLoading ? <div className="py-8 text-sm text-muted-foreground">Loading...</div> : query.isError ? <div className="py-8 text-sm text-destructive">{stringifyError(query.error)}</div> : Array.isArray(model) ? <div className="py-4"><JsonEditor value={model} onChange={setModel} /></div> : Object.entries(model).map(([name, value]) => <SettingRow key={name} name={name} value={value} onChange={(next) => setModel((current: Record<string, any>) => ({ ...current, [name]: next }))} />)}</div>
  </section>
}
