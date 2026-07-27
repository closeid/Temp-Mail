import { cn } from '@/lib/utils'

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <div className={cn('flex items-center gap-2.5 text-foreground', className)}>
    <span className={cn('grid shrink-0 place-items-center', compact ? 'size-8' : 'size-12')}><img className="size-full" src="/logo.svg" alt="" /></span>
    {!compact && <span className="text-base font-semibold">Get an Email</span>}
  </div>
}
