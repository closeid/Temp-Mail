import { Code2, Copy, ExternalLink, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'
import { useScopedI18n } from '@/i18n/react'

export function AiExtract({ metadata, compact = false }: { metadata?: string; compact?: boolean }) {
  const { t } = useScopedI18n('components.AiExtractInfo')
  let item: any = null
  try { item = metadata ? JSON.parse(metadata).ai_extract : null } catch { return null }
  if (!item?.result) return null
  const labels: Record<string, string> = { auth_code: t('authCode'), auth_link: t('authLink'), service_link: t('serviceLink'), subscription_link: t('subscriptionLink'), other_link: t('otherLink') }
  const isLink = item.type !== 'auth_code'
  const text = item.type === 'auth_code' ? item.result : item.result_text || item.result
  const copy = async () => { await copyText(item.result); toast.success(t('copySuccess')) }
  if (compact) return <Badge className="max-w-40 cursor-pointer gap-1" onClick={copy}>{isLink ? <Link2 className="size-3" /> : <Code2 className="size-3" />}<span className="truncate">{labels[item.type]}: {text}</span></Badge>
  return <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm"><span className="font-medium text-primary">{labels[item.type]}</span><span className={item.type === 'auth_code' ? 'numeric text-base font-semibold' : 'min-w-0 flex-1 truncate'}>{text}</span><Button variant="ghost" size="icon" onClick={copy}><Copy /></Button>{isLink && <Button variant="ghost" size="sm" onClick={() => window.open(item.result, '_blank', 'noopener,noreferrer')}>{t('open')}<ExternalLink /></Button>}</div>
}
