import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Dices } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useScopedI18n } from '@/i18n/react'
import { copyText, generateUserPassword } from '@/lib/utils'

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
  generatePassword?: boolean
  validate?: (value: string) => string | null
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
  const { t } = useScopedI18n('ui.common')
  const [request, setRequest] = useState<ActionRequest | null>(null)
  const [value, setValue] = useState('')
  const [promptError, setPromptError] = useState('')
  const [generatedPasswordVisible, setGeneratedPasswordVisible] = useState(false)

  useEffect(() => {
    dispatch = (next) => {
      setValue(next.kind === 'prompt' ? next.defaultValue || '' : '')
      setPromptError('')
      setGeneratedPasswordVisible(false)
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
    setValue('')
    setPromptError('')
    setGeneratedPasswordVisible(false)
    setRequest(null)
    resolve(result)
  }
  const generateAndCopyPassword = async () => {
    const password = generateUserPassword()
    setValue(password)
    setPromptError('')
    setGeneratedPasswordVisible(true)
    try {
      await copyText(password)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }
  const submitPrompt = (event: FormEvent) => {
    event.preventDefault()
    if (request?.kind !== 'prompt') return
    const error = request.validate?.(value)
    if (error) {
      setPromptError(error)
      return
    }
    finishPrompt(value)
  }

  return <>
    {children}
    <AlertDialog open={request?.kind === 'confirm'} onOpenChange={(open) => !open && finishConfirm(false)}>
      {request?.kind === 'confirm' && <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{request.title}</AlertDialogTitle>{request.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}</AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel asChild><Button variant="outline" onClick={() => finishConfirm(false)}>{t('cancel')}</Button></AlertDialogCancel><AlertDialogAction asChild><Button variant={request.destructive ? 'destructive' : 'default'} onClick={() => finishConfirm(true)}>{request.confirmLabel || t('confirm')}</Button></AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>}
    </AlertDialog>
    <Dialog open={request?.kind === 'prompt'} onOpenChange={(open) => !open && finishPrompt(null)}>
      {request?.kind === 'prompt' && <DialogContent showClose={false}>
        <form className="grid gap-4" onSubmit={submitPrompt}>
          <DialogHeader><DialogTitle>{request.title}</DialogTitle>{request.description && <DialogDescription>{request.description}</DialogDescription>}</DialogHeader>
          <Input autoFocus aria-invalid={Boolean(promptError)} autoComplete={request.inputType === 'password' ? 'new-password' : undefined} type={request.generatePassword && generatedPasswordVisible ? 'text' : request.inputType || 'text'} placeholder={request.placeholder} value={value} onChange={(event) => { setValue(event.target.value); setPromptError(''); setGeneratedPasswordVisible(false) }} />
          {promptError && <p className="text-xs leading-5 text-destructive">{promptError}</p>}
          {request.generatePassword
            ? <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <Button className="px-2" type="button" variant="secondary" onClick={generateAndCopyPassword}><Dices />{t('generatePassword')}</Button>
              <div className="flex items-center gap-2"><Button className="px-2" type="button" variant="outline" onClick={() => finishPrompt(null)}>{t('cancel')}</Button><Button className="px-2" type="submit">{request.confirmLabel || t('confirm')}</Button></div>
            </DialogFooter>
            : <DialogFooter><Button type="button" variant="outline" onClick={() => finishPrompt(null)}>{t('cancel')}</Button><Button type="submit">{request.confirmLabel || t('confirm')}</Button></DialogFooter>}
        </form>
      </DialogContent>}
    </Dialog>
  </>
}
