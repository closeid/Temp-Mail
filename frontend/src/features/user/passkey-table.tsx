import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export type PasskeyRecord = {
  passkey_id: string
  passkey_name: string
  created_at: string
  updated_at?: string
}

export function PasskeyTable({ passkeys, onRename, onDelete, deletingId }: {
  passkeys: PasskeyRecord[]
  onRename?: (passkey: PasskeyRecord) => void
  onDelete?: (passkey: PasskeyRecord) => void
  deletingId?: string | null
}) {
  const { t } = useScopedI18n('views.user.UserSettings')
  const commonT = useScopedI18n('ui.common').t
  const canManage = Boolean(onRename || onDelete)

  return <Table className="min-w-[640px]">
    <TableHeader><TableRow>
      <TableHead>{t('passkeyId')}</TableHead>
      <TableHead>{t('passkey_name')}</TableHead>
      <TableHead className="whitespace-nowrap">{t('created_at')}</TableHead>
      {canManage && <TableHead className="w-24 text-right">{t('actions')}</TableHead>}
    </TableRow></TableHeader>
    <TableBody>
      {passkeys.map((passkey) => <TableRow key={passkey.passkey_id}>
        <TableCell className="numeric max-w-48 truncate text-xs">{passkey.passkey_id}</TableCell>
        <TableCell>{passkey.passkey_name}</TableCell>
        <TableCell className="numeric whitespace-nowrap text-xs">{formatDate(passkey.created_at)}</TableCell>
        {canManage && <TableCell className="text-right"><div className="flex justify-end gap-1">
          {onRename && <Button size="icon" variant="ghost" title={t('renamePasskey')} aria-label={t('renamePasskey')} onClick={() => onRename(passkey)}><Pencil /></Button>}
          {onDelete && <Button size="icon" variant="ghost" className="text-destructive" title={t('deletePasskey')} aria-label={t('deletePasskey')} disabled={deletingId === passkey.passkey_id} onClick={() => onDelete(passkey)}><Trash2 /></Button>}
        </div></TableCell>}
      </TableRow>)}
      {!passkeys.length && <TableRow><TableCell colSpan={canManage ? 4 : 3} className="h-24 text-center text-muted-foreground">{commonT('noData')}</TableCell></TableRow>}
    </TableBody>
  </Table>
}
