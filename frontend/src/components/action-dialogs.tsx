import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type ConfirmRequest = {
  kind: 'confirm'
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  resolve: (value: boolean) => void
}

type PromptRequest = {
  kind: 'prompt'
  title: string
  description?: string
  defaultValue?: string
  placeholder?: string
  inputType?: 'text' | 'password' | 'number'
  confirmLabel?: string
  resolve: (value: string | null) => void
}

type ActionRequest = ConfirmRequest | PromptRequest
let dispatch: ((request: ActionRequest) => void) | null = null

export function confirmAction(options: Omit<ConfirmRequest, 'kind' | 'resolve'> | string) {
  const request = typeof options === 'string' ? { title: options } : options
  return new Promise<boolean>((resolve) => {
    if (dispatch) dispatch({ kind: 'confirm', ...request, resolve })
    else resolve(false)
  })
}

export function promptAction(options: Omit<PromptRequest, 'kind' | 'resolve'> | string) {
  const request = typeof options === 'string' ? { title: options } : options
  return new Promise<string | null>((resolve) => {
    if (dispatch) dispatch({ kind: 'prompt', ...request, resolve })
    else resolve(null)
  })
}

export function ActionDialogs({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ActionRequest | null>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    dispatch = (next) => {
      setValue(next.kind === 'prompt' ? next.defaultValue || '' : '')
      setRequest(next)
    }
    return () => { dispatch = null }
  }, [])

  const finishConfirm = (result: boolean) => {
    if (request?.kind !== 'confirm') return
    const resolve = request.resolve
    setRequest(null)
    resolve(result)
  }
  const finishPrompt = (result: string | null) => {
    if (request?.kind !== 'prompt') return
    const resolve = request.resolve
    setRequest(null)
    resolve(result)
  }
  const submitPrompt = (event: FormEvent) => {
    event.preventDefault()
    finishPrompt(value)
  }

  return <>
    {children}
    <AlertDialog open={request?.kind === 'confirm'} onOpenChange={(open) => !open && finishConfirm(false)}>
      {request?.kind === 'confirm' && <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{request.title}</AlertDialogTitle>{request.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}</AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel asChild><Button variant="outline" onClick={() => finishConfirm(false)}>Cancel</Button></AlertDialogCancel><AlertDialogAction asChild><Button variant={request.destructive ? 'destructive' : 'default'} onClick={() => finishConfirm(true)}>{request.confirmLabel || 'Confirm'}</Button></AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>}
    </AlertDialog>
    <Dialog open={request?.kind === 'prompt'} onOpenChange={(open) => !open && finishPrompt(null)}>
      {request?.kind === 'prompt' && <DialogContent showClose={false}>
        <form className="grid gap-4" onSubmit={submitPrompt}>
          <DialogHeader><DialogTitle>{request.title}</DialogTitle>{request.description && <DialogDescription>{request.description}</DialogDescription>}</DialogHeader>
          <Input autoFocus type={request.inputType || 'text'} placeholder={request.placeholder} value={value} onChange={(event) => setValue(event.target.value)} />
          <DialogFooter><Button type="button" variant="outline" onClick={() => finishPrompt(null)}>Cancel</Button><Button type="submit">{request.confirmLabel || 'Confirm'}</Button></DialogFooter>
        </form>
      </DialogContent>}
    </Dialog>
  </>
}
