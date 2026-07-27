import { cn } from '@/lib/utils'
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) { return <div className="w-full overflow-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...props} /></div> }
export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) { return <thead className={cn('border-b border-border bg-muted/45 text-xs text-muted-foreground', className)} {...props} /> }
export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) { return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} /> }
export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) { return <tr className={cn('border-b border-border/80 transition-colors hover:bg-muted/35 data-[state=selected]:bg-accent', className)} {...props} /> }
export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) { return <th className={cn('h-9 px-3 text-left align-middle font-medium whitespace-nowrap', className)} {...props} /> }
export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) { return <td className={cn('px-3 py-2 align-middle', className)} {...props} /> }
