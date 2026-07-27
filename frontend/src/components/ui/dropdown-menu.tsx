import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup
export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) { return <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content sideOffset={sideOffset} className={cn('z-50 min-w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg', className)} {...props} /></DropdownMenuPrimitive.Portal> }
export function DropdownMenuItem({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) { return <DropdownMenuPrimitive.Item className={cn('relative flex h-8 cursor-default select-none items-center gap-2 rounded px-2 text-sm outline-none focus:bg-accent data-[disabled]:opacity-50 [&_svg]:size-4', inset && 'pl-8', className)} {...props} /> }
export function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) { return <DropdownMenuPrimitive.CheckboxItem checked={checked} className={cn('relative flex h-8 cursor-default select-none items-center rounded py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent', className)} {...props}><span className="absolute left-2"><DropdownMenuPrimitive.ItemIndicator><Check className="size-4" /></DropdownMenuPrimitive.ItemIndicator></span>{children}</DropdownMenuPrimitive.CheckboxItem> }
export function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) { return <DropdownMenuPrimitive.Label className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', inset && 'pl-8', className)} {...props} /> }
export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) { return <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} /> }
export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) { return <DropdownMenuPrimitive.SubTrigger className={cn('flex h-8 items-center gap-2 rounded px-2 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent', className)} {...props}>{children}<ChevronRight className="ml-auto size-4" /></DropdownMenuPrimitive.SubTrigger> }
export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) { return <DropdownMenuPrimitive.SubContent className={cn('z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-lg', className)} {...props} /> }
