import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { I18N_MESSAGES } from './messages'
import { DEFAULT_LOCALE, getBrowserLocales, getPreferredLocale, replaceLocaleInFullPath, resolveSupportedLocale } from './utils'
import { appStore, useAppStore } from '@/lib/store'
import type { SupportedLocale } from './locale-registry'

type Params = Record<string, string | number>
type I18nContextValue = {
  locale: SupportedLocale
  t: (key: string, params?: Params) => string
  changeLocale: (locale: SupportedLocale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

const resolveMessage = (locale: SupportedLocale, key: string): string | undefined => {
  let value: any = I18N_MESSAGES[locale]
  for (const segment of key.split('.')) value = value?.[segment]
  if (typeof value === 'string') return value
  if (locale !== DEFAULT_LOCALE) return resolveMessage(DEFAULT_LOCALE, key)
  return undefined
}

const interpolate = (value: string, params?: Params) => {
  if (!params) return value
  return value.replace(/\{([^}]+)\}/g, (match, key) => params[key] == null ? match : String(params[key]))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const preferredLocale = useAppStore((state) => state.preferredLocale)
  const routeLocale = resolveSupportedLocale(location.pathname.split('/')[1])
  const locale = routeLocale || DEFAULT_LOCALE

  useEffect(() => {
    document.documentElement.lang = locale
    if (routeLocale) {
      if (preferredLocale !== routeLocale) appStore.setState({ preferredLocale: routeLocale })
      return
    }
    if (!preferredLocale) appStore.setState({ preferredLocale: getPreferredLocale('', getBrowserLocales()) })
  }, [locale, preferredLocale, routeLocale])

  const t = useCallback((key: string, params?: Params) => interpolate(resolveMessage(locale, key) || key.split('.').at(-1) || key, params), [locale])
  const changeLocale = useCallback((next: SupportedLocale) => {
    appStore.setState({ preferredLocale: next })
    navigate(replaceLocaleInFullPath(`${location.pathname}${location.search}${location.hash}`, next))
  }, [location.hash, location.pathname, location.search, navigate])

  const value = useMemo(() => ({ locale, t, changeLocale }), [changeLocale, locale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}

export const useScopedI18n = (namespace: string) => {
  const i18n = useI18n()
  return { ...i18n, t: (key: string, params?: Params) => i18n.t(`${namespace}.${key}`, params) }
}
