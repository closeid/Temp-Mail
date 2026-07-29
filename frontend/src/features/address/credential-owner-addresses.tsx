import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { useScopedI18n } from '@/i18n/react'

type OwnerAddressesResponse = {
  hasOwner: boolean
  results: Array<{ id: number; name: string }>
}

export function CredentialOwnerAddresses() {
  const { t } = useScopedI18n('ui.common')
  const jwt = useAppStore((state) => state.jwt)
  const query = useQuery({
    queryKey: ['credential-owner-addresses', jwt],
    queryFn: () => api.fetch<OwnerAddressesResponse>('/api/address/owner_addresses'),
  })

  return <section className="h-full overflow-auto">
    <header className="border-b border-border px-5 py-4">
      <h1 className="text-base font-semibold">{t('relatedMailboxes')}</h1>
      <p className="mt-1 text-xs text-muted-foreground">{t('credentialReadOnlyDescription')}</p>
    </header>
    <div className="p-5">
      {query.isPending ? <p className="text-sm text-muted-foreground">{t('loading')}</p>
        : query.isError ? <p className="text-sm text-destructive">{t('relatedMailboxesUnavailable')}</p>
          : !query.data?.hasOwner ? <p className="text-sm text-muted-foreground">{t('mailboxHasNoOwner')}</p>
            : !query.data.results.length ? <p className="text-sm text-muted-foreground">{t('noRelatedMailboxes')}</p>
              : <div className="overflow-hidden rounded-md border border-border"><Table>
                <TableHeader><TableRow><TableHead>{t('addresses')}</TableHead></TableRow></TableHeader>
                <TableBody>{query.data.results.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.name}</TableCell></TableRow>)}</TableBody>
              </Table></div>}
    </div>
  </section>
}
