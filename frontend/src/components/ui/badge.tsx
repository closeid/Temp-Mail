import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const badgeVariants = cva('inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium', { variants: { variant: { default: 'bg-primary/10 text-primary', secondary: 'bg-accent text-muted-foreground', outline: 'border border-border text-foreground', destructive: 'bg-destructive/10 text-destructive' } }, defaultVariants: { variant: 'default' } })
export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) { return <span className={cn(badgeVariants({ variant }), className)} {...props} /> }
