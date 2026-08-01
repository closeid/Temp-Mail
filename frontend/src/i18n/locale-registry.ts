export const LOCALE_REGISTRY = [
  { locale: 'zh', label: '中文', browserMatches: ['zh'], turnstileLocale: 'zh-CN' },
  { locale: 'en', label: 'English', browserMatches: ['en'], turnstileLocale: 'en' },
] as const

export type SupportedLocale = (typeof LOCALE_REGISTRY)[number]['locale']
export const SUPPORTED_LOCALES = LOCALE_REGISTRY.map((entry) => entry.locale) as SupportedLocale[]
const getLocaleRegistryEntry = (locale: SupportedLocale) => LOCALE_REGISTRY.find((entry) => entry.locale === locale)!
export const getTurnstileLocale = (locale: SupportedLocale) => getLocaleRegistryEntry(locale).turnstileLocale
