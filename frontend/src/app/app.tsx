import { Fragment, lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { LoadingBar } from '@/components/loading-bar'
import { AuthPage } from '@/features/auth/auth-page'
import { CredentialDialog } from '@/features/auth/credential-dialog'
import { SiteAccessDialog } from '@/features/auth/site-access-dialog'
import { appStore, canShowAdmin, useAppStore } from '@/lib/store'
import { DEFAULT_LOCALE, getPathWithLocale, resolveSupportedLocale } from '@/i18n/utils'
import {
  ADMIN_DEFAULT_PAGE,
  ADMIN_LOGIN_ROUTE,
  ADMIN_PAGE_ROUTES,
  ADMIN_SECTION_DEFAULTS,
  AUTH_ROUTES,
  MAIL_ROUTES,
  type AdminPageKey,
  type AdminSectionKey,
  type AuthRouteKey,
  type MailRouteKey,
} from './routes'

const MailWorkspace = lazy(() => import('@/features/mail/mail-workspace').then((module) => ({ default: module.MailWorkspace })))
const AdminWorkspace = lazy(() => import('@/features/admin/admin-workspace').then((module) => ({ default: module.AdminWorkspace })))
const AdminLoginPage = lazy(() => import('@/features/admin/admin-login-page').then((module) => ({ default: module.AdminLoginPage })))
const OauthCallback = lazy(() => import('@/features/auth/oauth-callback').then((module) => ({ default: module.OauthCallback })))
const TelegramMailPage = lazy(() => import('@/features/telegram/telegram-mail').then((module) => ({ default: module.TelegramMailPage })))
const TelegramAddressPage = lazy(() => import('@/features/telegram/telegram-address').then((module) => ({ default: module.TelegramAddressPage })))

const PageLoading = () => <div className="min-h-[100dvh] bg-background" />

function LocalizedRoute({ children }: { children: ReactNode }) {
  const { locale } = useParams()
  if (!resolveSupportedLocale(locale)) return <Navigate to="/" replace />
  return children
}

function useRouteLocale() {
  const { locale } = useParams()
  return resolveSupportedLocale(locale) || DEFAULT_LOCALE
}

function LocalizedRedirect({ path }: { path: string }) {
  const locale = useRouteLocale()
  return <Navigate to={getPathWithLocale(path, locale)} replace />
}

function RuntimeRouteSync() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const jwt = params.get('jwt')
    if (!jwt) return
    appStore.resetUser()
    appStore.setState((state) => ({ jwt, mailboxAccessMode: 'credential', settings: { ...state.settings, fetched: false, address: '' } }))
    params.delete('jwt')
    const locale = resolveSupportedLocale(location.pathname.split('/')[1]) || DEFAULT_LOCALE
    navigate({ pathname: getPathWithLocale(MAIL_ROUTES.mailbox, locale), search: params.toString() ? `?${params}` : '' }, { replace: true })
  }, [location.pathname, location.search, navigate])
  return null
}

function EntryRedirect() {
  const locale = useRouteLocale()
  const state = useAppStore((value) => value)
  if (!state.openSettings.fetched || !state.userOpenSettings.fetched || !state.settings.fetched || !state.userSettings.fetched) return <PageLoading />
  if (state.settings.address) return <Navigate to={getPathWithLocale(MAIL_ROUTES.mailbox, locale)} replace />
  if (state.userSettings.user_email) return <Navigate to={getPathWithLocale(MAIL_ROUTES.addresses, locale)} replace />
  if (state.isTelegram) return <Navigate to={getPathWithLocale('/telegram/addresses', locale)} replace />
  return <Navigate to={getPathWithLocale(AUTH_ROUTES.login, locale)} replace />
}

function AuthRoute({ view }: { view: AuthRouteKey }) {
  const state = useAppStore((value) => value)
  if (!state.openSettings.fetched || !state.userOpenSettings.fetched) return <PageLoading />
  return <AuthPage view={view} />
}

const addressRequiredPages: MailRouteKey[] = ['mailbox', 'sendbox', 'sendmail', 'accountSettings', 'auto_reply', 'webhook', 's3_attachment']

function MailRoute({ page }: { page: MailRouteKey }) {
  const locale = useRouteLocale()
  const state = useAppStore((value) => value)
  if (!state.openSettings.fetched || !state.userOpenSettings.fetched || !state.settings.fetched || !state.userSettings.fetched) return <PageLoading />

  const hasAddress = Boolean(state.settings.address)
  const hasUser = Boolean(state.userSettings.user_email)
  const fallback = hasUser ? MAIL_ROUTES.addresses : AUTH_ROUTES.login
  if (addressRequiredPages.includes(page) && !hasAddress) return <Navigate to={getPathWithLocale(fallback, locale)} replace />
  if (page === 'addresses' && state.mailboxAccessMode === 'credential') return <Navigate to={getPathWithLocale(MAIL_ROUTES.mailbox, locale)} replace />
  if (page === 'user_settings' && !hasUser) return <Navigate to={getPathWithLocale(AUTH_ROUTES.login, locale)} replace />
  if ((page === 'sendbox' || page === 'sendmail') && !state.openSettings.enableSendMail) return <Navigate to={getPathWithLocale(MAIL_ROUTES.mailbox, locale)} replace />
  if (page === 'auto_reply' && !state.openSettings.enableAutoReply) return <Navigate to={getPathWithLocale(MAIL_ROUTES.accountSettings, locale)} replace />
  if (page === 'webhook' && !state.openSettings.enableWebhook) return <Navigate to={getPathWithLocale(MAIL_ROUTES.accountSettings, locale)} replace />
  if (page === 's3_attachment' && !state.openSettings.isS3Enabled) return <Navigate to={getPathWithLocale(MAIL_ROUTES.accountSettings, locale)} replace />
  return <MailWorkspace page={page} />
}

function AdminRoute({ page }: { page: AdminPageKey }) {
  const locale = useRouteLocale()
  const location = useLocation()
  const state = useAppStore((value) => value)
  if (!state.openSettings.fetched || !state.userSettings.fetched) return <PageLoading />
  if (!canShowAdmin(state) || state.showAdminAuth) {
    return <Navigate to={getPathWithLocale(ADMIN_LOGIN_ROUTE, locale)} replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  }
  return <AdminWorkspace page={page} />
}

const localeRoutePair = (path: string, element: ReactNode) => <Fragment key={path}>
  <Route path={path} element={element} />
  <Route path={`/:locale${path}`} element={<LocalizedRoute>{element}</LocalizedRoute>} />
</Fragment>

export function App() {
  return <>
    <LoadingBar />
    <RuntimeRouteSync />
    <Suspense fallback={<PageLoading />}><Routes>
      <Route path="/" element={<EntryRedirect />} />
      <Route path="/:locale" element={<LocalizedRoute><EntryRedirect /></LocalizedRoute>} />

      {(Object.entries(AUTH_ROUTES) as [AuthRouteKey, string][]).map(([view, path]) => localeRoutePair(path, <AuthRoute view={view} />))}
      {(Object.entries(MAIL_ROUTES) as [MailRouteKey, string][]).map(([page, path]) => localeRoutePair(path, <MailRoute page={page} />))}
      {(Object.entries(ADMIN_PAGE_ROUTES) as [AdminPageKey, string][]).map(([page, path]) => localeRoutePair(path, <AdminRoute page={page} />))}
      {localeRoutePair(ADMIN_LOGIN_ROUTE, <AdminLoginPage />)}

      {localeRoutePair('/dashboard', <LocalizedRedirect path={ADMIN_PAGE_ROUTES[ADMIN_DEFAULT_PAGE]} />)}
      {(Object.entries(ADMIN_SECTION_DEFAULTS) as [AdminSectionKey, AdminPageKey][]).map(([section, page]) => localeRoutePair(`/dashboard/${section === 'account' ? 'addresses' : section === 'user' ? 'users' : section === 'mails' ? 'mail' : 'configuration'}`, <LocalizedRedirect path={ADMIN_PAGE_ROUTES[page]} />))}
      {localeRoutePair('/mail', <LocalizedRedirect path={MAIL_ROUTES.mailbox} />)}
      {localeRoutePair('/settings', <LocalizedRedirect path={MAIL_ROUTES.appearance} />)}
      {localeRoutePair('/user', <LocalizedRedirect path={MAIL_ROUTES.addresses} />)}
      {localeRoutePair('/user/oauth2/callback', <OauthCallback />)}
      {localeRoutePair('/telegram/addresses', <TelegramAddressPage />)}
      {localeRoutePair('/telegram/mail', <TelegramMailPage />)}
      {localeRoutePair('/telegram_mail', <TelegramMailPage />)}
      <Route path="*" element={<EntryRedirect />} />
    </Routes></Suspense>
    <SiteAccessDialog />
    <CredentialDialog />
  </>
}
