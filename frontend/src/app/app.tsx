import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { LoadingBar } from '@/components/loading-bar'
import { AuthPage } from '@/features/auth/auth-page'
import { CredentialDialog } from '@/features/auth/credential-dialog'
import { SiteAccessDialog } from '@/features/auth/site-access-dialog'
import { appStore, useAppStore } from '@/lib/store'
import { DEFAULT_LOCALE, getPathWithLocale, resolveSupportedLocale } from '@/i18n/utils'

const MailWorkspace = lazy(() => import('@/features/mail/mail-workspace').then((module) => ({ default: module.MailWorkspace })))
const AdminWorkspace = lazy(() => import('@/features/admin/admin-workspace').then((module) => ({ default: module.AdminWorkspace })))
const OauthCallback = lazy(() => import('@/features/auth/oauth-callback').then((module) => ({ default: module.OauthCallback })))
const TelegramMailPage = lazy(() => import('@/features/telegram/telegram-mail').then((module) => ({ default: module.TelegramMailPage })))
const TelegramAddressPage = lazy(() => import('@/features/telegram/telegram-address').then((module) => ({ default: module.TelegramAddressPage })))

function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = useAppStore((value) => value)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const jwt = params.get('jwt')
    if (!jwt) return
    appStore.setState({ jwt, workspaceSection: 'mail' })
    params.delete('jwt')
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' }, { replace: true })
  }, [location.pathname, location.search, navigate])

  if (!state.openSettings.fetched || !state.userOpenSettings.fetched || !state.settings.fetched || !state.userSettings.fetched) {
    return <div className="min-h-[100dvh] bg-background" />
  }
  if (state.settings.address || state.userSettings.user_email) return <MailWorkspace />
  if (state.isTelegram) return <TelegramAddressPage />
  return <AuthPage />
}

function LocalizedRoute({ children }: { children: ReactNode }) {
  const { locale } = useParams()
  if (!resolveSupportedLocale(locale)) return <Navigate to="/" replace />
  return children
}

function LegacyUserRedirect() {
  const { locale } = useParams()
  const routeLocale = resolveSupportedLocale(locale) || DEFAULT_LOCALE
  appStore.setState({ workspaceSection: 'mail', indexTab: 'addresses' })
  return <Navigate to={getPathWithLocale('/', routeLocale)} replace />
}

export function App() {
  return <>
    <LoadingBar />
    <Suspense fallback={<div className="min-h-[100dvh] bg-background" />}><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<AdminWorkspace />} />
      <Route path="/user/oauth2/callback" element={<OauthCallback />} />
      <Route path="/telegram_mail" element={<TelegramMailPage />} />
      <Route path="/user" element={<LegacyUserRedirect />} />
      <Route path="/:locale" element={<LocalizedRoute><HomePage /></LocalizedRoute>} />
      <Route path="/:locale/dashboard" element={<LocalizedRoute><AdminWorkspace /></LocalizedRoute>} />
      <Route path="/:locale/user/oauth2/callback" element={<LocalizedRoute><OauthCallback /></LocalizedRoute>} />
      <Route path="/:locale/telegram_mail" element={<LocalizedRoute><TelegramMailPage /></LocalizedRoute>} />
      <Route path="/:locale/user" element={<LegacyUserRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
    <SiteAccessDialog />
    <CredentialDialog />
  </>
}
