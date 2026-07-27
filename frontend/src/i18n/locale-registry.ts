export const LOCALE_REGISTRY = [
  { locale: 'zh', label: '中文', browserMatches: ['zh'], turnstileLocale: 'zh-CN' },
  { locale: 'en', label: 'English', browserMatches: ['en'], turnstileLocale: 'en' },
  { locale: 'es', label: 'Español', browserMatches: ['es'], turnstileLocale: 'es' },
  { locale: 'pt-BR', label: 'Português (Brasil)', browserMatches: ['pt'], turnstileLocale: 'pt-BR' },
  { locale: 'ja', label: '日本語', browserMatches: ['ja'], turnstileLocale: 'ja' },
  { locale: 'de', label: 'Deutsch', browserMatches: ['de'], turnstileLocale: 'de' },
] as const

export type SupportedLocale = (typeof LOCALE_REGISTRY)[number]['locale']
export const SUPPORTED_LOCALES = LOCALE_REGISTRY.map((entry) => entry.locale) as SupportedLocale[]
export const getLocaleRegistryEntry = (locale: SupportedLocale) => LOCALE_REGISTRY.find((entry) => entry.locale === locale)!
export const getLocaleLabel = (locale: SupportedLocale) => getLocaleRegistryEntry(locale).label
export const getLocaleOptions = () => LOCALE_REGISTRY.map(({ locale, label }) => ({ label, value: locale, key: locale }))
export const getTurnstileLocale = (locale: SupportedLocale) => getLocaleRegistryEntry(locale).turnstileLocale
