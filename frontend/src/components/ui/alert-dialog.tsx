import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/utils'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogCancel = AlertDialogPrimitive.Cancel
export const AlertDialogAction = AlertDialogPrimitive.Action
export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) { return <AlertDialogPrimitive.Portal><AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-950/28 backdrop-blur-[1px]" /><AlertDialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-50 grid w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border border-border bg-popover p-5 shadow-xl outline-none', className)} {...props} /></AlertDialogPrimitive.Portal> }
export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('space-y-1.5', className)} {...props} /> }
export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} /> }
export function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) { return <AlertDialogPrimitive.Title className={cn('text-base font-semibold', className)} {...props} /> }
export function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) { return <AlertDialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} /> }
