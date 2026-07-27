import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/i18n/react'
import { getTurnstileLocale } from '@/i18n/locale-registry'

declare global {
  interface Window { turnstile?: { render: (target: string | HTMLElement, options: Record<string, any>) => string; remove: (id: string) => void } }
}

export type TurnstileHandle = { refresh: () => void }

export const Turnstile = forwardRef<TurnstileHandle, { value: string; onChange: (value: string) => void }>(({ onChange }, ref) => {
  const { locale } = useI18n()
  const { openSettings, isDark } = useAppStore((state) => ({ openSettings: state.openSettings, isDark: state.isDark }))
  const reactId = useId().replaceAll(':', '')
  const containerId = `cf-turnstile-${reactId}`
  const widgetId = useRef('')
  const [revision, setRevision] = useState(0)
  useImperativeHandle(ref, () => ({ refresh: () => setRevision((value) => value + 1) }))

  useEffect(() => {
    if (!openSettings.cfTurnstileSiteKey) return
    let cancelled = false
    const render = async () => {
      for (let index = 0; index < 150 && !window.turnstile; index += 1) await new Promise((resolve) => setTimeout(resolve, 20))
      if (cancelled || !window.turnstile) return
      if (widgetId.current) window.turnstile.remove(widgetId.current)
      onChange('')
      widgetId.current = window.turnstile.render(`#${containerId}`, {
        sitekey: openSettings.cfTurnstileSiteKey,
        language: getTurnstileLocale(locale),
        theme: isDark ? 'dark' : 'light',
        callback: onChange,
      })
    }
    render()
    return () => { cancelled = true; if (widgetId.current && window.turnstile) { window.turnstile.remove(widgetId.current); widgetId.current = '' } }
  }, [containerId, isDark, locale, onChange, openSettings.cfTurnstileSiteKey, revision])

  if (!openSettings.cfTurnstileSiteKey) return null
  return <div className="grid justify-items-center gap-1 py-1"><div id={containerId} /><Button type="button" variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}><RefreshCw />Refresh</Button></div>
})
Turnstile.displayName = 'Turnstile'
