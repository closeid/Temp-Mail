import { useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { stringifyError } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export type DataColumn = { key: string; label: string; className?: string; render?: (row: Record<string, any>) => ReactNode }

export function DataTablePage({ endpoint, queryName = 'query', columns, actions, leading, initialQuery = '' }: {
  endpoint: string
  queryName?: string
  columns: DataColumn[]
  actions?: (row: Record<string, any>, refetch: () => Promise<any>) => ReactNode
  leading?: ReactNode
  initialQuery?: string
}) {
  const { t } = useScopedI18n('views.admin.Account')
  const commonT = useScopedI18n('ui.common').t
  const [search, setSearch] = useState(initialQuery)
  const [queryText, setQueryText] = useState(initialQuery)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const query = useQuery({
    queryKey: ['admin-table', endpoint, queryName, queryText, page, pageSize],
    queryFn: () => api.fetch<{ results?: Record<string, any>[]; count?: number }>(`${endpoint}?limit=${pageSize}&offset=${(page - 1) * pageSize}${queryText ? `&${queryName}=${encodeURIComponent(queryText)}` : ''}`),
    placeholderData: keepPreviousData,
  })
  const rows = query.data?.results || []
  const count = query.data?.count || 0
  const pages = Math.max(1, Math.ceil(count / pageSize))
  const submit = () => { setPage(1); setQueryText(search.trim()) }
  return <section className="flex h-full min-h-0 flex-col">
    <header className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
      <div className="flex min-w-[220px] max-w-xl flex-1"><Input className="h-10 rounded-r-none" placeholder={t('addressQueryTip')} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} /><Button className="h-10 rounded-l-none" variant="secondary" onClick={submit}><Search />{t('query')}</Button></div>
      {leading && <div className="[&>button]:h-10">{leading}</div>}
      <Button className="size-10" size="icon" variant="secondary" title={commonT('refresh')} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} /></Button>
      <Button className="size-10" size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button>
      <span className="numeric grid h-10 min-w-10 place-items-center rounded-md border border-border px-2">{page}</span>
      <Button className="size-10" size="icon" variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button>
      <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}><SelectTrigger className="h-10 w-[128px]"><SelectValue /></SelectTrigger><SelectContent>{[20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{commonT('perPage', { count: value })}</SelectItem>)}</SelectContent></Select>
      <span className="numeric text-xs text-muted-foreground">{t('itemCount')}: {count}</span>
    </header>
    <div className="min-h-0 flex-1 overflow-auto">{query.isError ? <div className="p-4 text-sm text-destructive">{stringifyError(query.error)}</div> : <Table className="min-w-[760px]"><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key} className={column.className}>{column.label}</TableHead>)}{actions && <TableHead className="w-16 text-right">{t('actions')}</TableHead>}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={row.id ?? index}>{columns.map((column) => <TableCell key={column.key} className={column.className}>{column.render ? column.render(row) : String(row[column.key] ?? '')}</TableCell>)}{actions && <TableCell className="text-right">{actions(row, query.refetch)}</TableCell>}</TableRow>)}{!query.isLoading && !rows.length && <TableRow><TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-40 text-center text-muted-foreground">{commonT('noData')}</TableCell></TableRow>}</TableBody></Table>}</div>
  </section>
}
