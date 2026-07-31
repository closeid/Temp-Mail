import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ActionDialogs } from '@/components/action-dialogs'
import { MAIL_ROUTES, type MailRouteKey } from '@/app/routes'
import { useScopedI18n } from '@/i18n/react'
import { stripLocaleFromPath } from '@/i18n/utils'
import { fetchAddressSettings, fetchOpenSettings, fetchUserOpenSettings, fetchUserSettings } from '@/lib/api'
import { appStore, useAppStore } from '@/lib/store'

function RuntimeEffects() {
  const isDark = useAppStore((state) => state.isDark)
  const jwt = useAppStore((state) => state.jwt)
  const userJwt = useAppStore((state) => state.userJwt)
  const address = useAppStore((state) => state.settings.address)
  const siteTitle = useAppStore((state) => state.openSettings.title)
  const location = useLocation()
  const indexT = useScopedI18n('views.Index').t
  const userT = useScopedI18n('views.User').t
  const commonT = useScopedI18n('ui.common').t
  const adminT = useScopedI18n('ui.admin').t
  const path = stripLocaleFromPath(location.pathname)
  const mailPage = (Object.entries(MAIL_ROUTES) as [MailRouteKey, string][]).find(([, route]) => route === path)?.[0]
  const mailPageTitle = mailPage ? ({
    mailbox: indexT('mailbox'),
    sendbox: indexT('sendbox'),
    sendmail: indexT('sendmail'),
    addresses: userT('address_management'),
    accountSettings: indexT('credentials'),
    appearance: commonT('settings'),
    auto_reply: commonT('settings'),
    webhook: commonT('settings'),
    s3_attachment: commonT('settings'),
    user_settings: userT('security'),
  } satisfies Record<MailRouteKey, string>)[mailPage] : ''

  useEffect(() => { document.documentElement.classList.toggle('dark', isDark) }, [isDark])
  useEffect(() => {
    const brandTitle = siteTitle || 'Get an Email'
    if (mailPage) {
      document.title = [mailPageTitle, address, brandTitle].filter(Boolean).join(' - ')
      return
    }
    document.title = path === '/dashboard' || path.startsWith('/dashboard/')
      ? `${adminT('administration')} - ${brandTitle}`
      : brandTitle
  }, [address, adminT, mailPage, mailPageTitle, path, siteTitle])
  useQuery({ queryKey: ['open-settings'], queryFn: fetchOpenSettings, staleTime: 5 * 60_000, retry: 1 })
  useQuery({ queryKey: ['user-open-settings'], queryFn: fetchUserOpenSettings, staleTime: 5 * 60_000, retry: 1 })
  useQuery({ queryKey: ['address-settings', jwt], queryFn: fetchAddressSettings, retry: false })
  useQuery({ queryKey: ['user-settings', userJwt], queryFn: fetchUserSettings, retry: false })

  useEffect(() => {
    const token = import.meta.env.VITE_CF_WEB_ANALY_TOKEN
    if (!token || document.querySelector('script[src="https://static.cloudflareinsights.com/beacon.min.js"]')) return
    const script = document.createElement('script')
    script.defer = true
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
    script.dataset.cfBeacon = JSON.stringify({ token })
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (String(import.meta.env.VITE_IS_TELEGRAM) !== 'true') return
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://telegram.org/js/telegram-web-app.js"]')
    const sync = () => {
      const webApp = (window as any).Telegram?.WebApp
      webApp?.ready?.()
      webApp?.expand?.()
      appStore.setState({ isTelegram: Boolean(webApp?.initData), telegramInitData: webApp?.initData || '' })
    }
    if (existing) {
      if ((window as any).Telegram?.WebApp) sync()
      else existing.addEventListener('load', sync, { once: true })
      return () => existing.removeEventListener('load', sync)
    }
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.addEventListener('load', sync, { once: true })
    document.body.appendChild(script)
    return () => script.removeEventListener('load', sync)
  }, [])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, staleTime: 15_000, retry: 1 },
      mutations: { onError: (error) => toast.error(error instanceof Error ? error.message : String(error)) },
    },
  }))
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={400}>
      <ActionDialogs>
        <RuntimeEffects />
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: 'rounded-md' }} />
      </ActionDialogs>
    </TooltipProvider>
  </QueryClientProvider>
}
