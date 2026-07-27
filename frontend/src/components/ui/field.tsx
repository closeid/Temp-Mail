import type { ReactNode } from 'react'
import { Label } from './label'
import { cn } from '@/lib/utils'
export function Field({ label, htmlFor, description, error, children, className }: { label: ReactNode; htmlFor?: string; description?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) { return <div className={cn('grid gap-2', className)}>{label && <Label htmlFor={htmlFor}>{label}</Label>}{children}{description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}{error && <p className="text-xs leading-5 text-destructive">{error}</p>}</div> }
