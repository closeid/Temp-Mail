import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0',
  { variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-accent',
      outline: 'border border-border bg-background text-foreground hover:bg-accent',
      ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
      destructive: 'bg-destructive text-white hover:bg-destructive/90',
      link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
    },
    size: { default: 'h-9 px-3', sm: 'h-8 px-2.5 text-xs', lg: 'h-10 px-4', icon: 'size-9 px-0' },
  }, defaultVariants: { variant: 'default', size: 'default' } },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Component = asChild ? Slot : 'button'
  return <Component ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
Button.displayName = 'Button'
