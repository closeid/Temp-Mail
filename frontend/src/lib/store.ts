import { useSyncExternalStore } from 'react'

export type OpenSettings = {
  fetched: boolean
  title: string
  description?: string
  announcement?: string
  alwaysShowAnnouncement?: boolean
  prefix: string
  addressRegex?: string
  minAddressLen: number
  maxAddressLen: number
  needAuth: boolean
  adminContact: string
  enableUserCreateEmail: boolean
  disableAnonymousUserCreateEmail: boolean
  disableCustomAddressName: boolean
  enableUserDeleteEmail: boolean
  enableAutoReply: boolean
  enableIndexAbout: boolean
  defaultDomains: string[]
  randomSubdomainDomains: string[]
  domains: Array<{ label: string; value: string }>
  copyright: string
  cfTurnstileSiteKey: string
  enableWebhook: boolean
  isS3Enabled: boolean
  enableSendMail: boolean
  disableAdminPasswordCheck: boolean
  enableAddressPassword: boolean
  enableAgentEmailInfo: boolean
  smtpImapProxyConfig: Record<string, any>
  statusUrl: string
  enableGlobalTurnstileCheck: boolean
  [key: string]: any
}

export type AddressSettings = {
  fetched: boolean
  send_balance: number
  address: string
  auto_reply: Record<string, any>
}

export type UserSettings = {
  fetched: boolean
  user_email: string
  user_id: number
  is_admin: boolean
  access_token: string | null
  new_user_token: string | null
  user_role: Record<string, any> | null
  [key: string]: any
}

export type UserOpenSettings = {
  fetched: boolean
  enable: boolean
  enableMailVerify: boolean
  oauth2ClientIDs: Array<{ clientID: string; name: string; icon?: string }>
  [key: string]: any
}

export type MailboxAccessMode = 'standard' | 'credential'

export type AppState = {
  loading: number
  isDark: boolean
  auth: string
  adminAuth: string
  jwt: string
  userJwt: string
  mailboxAccessMode: MailboxAccessMode
  addressPassword: string
  preferredLocale: string
  mailboxSplitSize: number
  mailListView: boolean
  mailListPreviewLineClamp: number
  useIframeShowMail: boolean
  preferShowTextMail: boolean
  useSimpleIndex: boolean
  useUTCDate: boolean
  autoRefresh: boolean
  configAutoRefreshInterval: number
  announcement: string
  showAddressCredential: boolean
  showAdminAuth: boolean
  showSiteAuth: boolean
  openSettings: OpenSettings
  settings: AddressSettings
  userOpenSettings: UserOpenSettings
  userSettings: UserSettings
  sendMailModel: Record<string, any>
  userOauth2SessionState: string
  userOauth2SessionClientID: string
  isTelegram: boolean
  telegramInitData: string
}

const local = typeof window === 'undefined' ? null : window.localStorage
const session = typeof window === 'undefined' ? null : window.sessionStorage

// Keep administrator credentials within the current tab so reloads preserve the session,
// while closing the tab still clears the plaintext credential.
local?.removeItem('adminAuth')
for (const key of ['indexTab', 'userTab', 'adminTab', 'workspaceSection']) session?.removeItem(key)

const readString = (storage: Storage | null, key: string, fallback = '') => storage?.getItem(key) ?? fallback
const readBoolean = (storage: Storage | null, key: string, fallback: boolean) => {
  const value = storage?.getItem(key)
  return value == null ? fallback : value === 'true' || value === 'dark'
}
const readNumber = (storage: Storage | null, key: string, fallback: number) => {
  const raw = storage?.getItem(key)
  if (raw == null || raw.trim() === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}
const readObject = <T>(storage: Storage | null, key: string, fallback: T): T => {
  try { return JSON.parse(storage?.getItem(key) || '') as T } catch { return fallback }
}

const openSettingsDefaults: OpenSettings = {
  fetched: false, title: '', prefix: '', minAddressLen: 1, maxAddressLen: 30,
  needAuth: false, adminContact: '', enableUserCreateEmail: false,
  disableAnonymousUserCreateEmail: false, disableCustomAddressName: false,
  enableUserDeleteEmail: false, enableAutoReply: false, enableIndexAbout: false,
  defaultDomains: [], randomSubdomainDomains: [], domains: [], copyright: 'Dream Hunter',
  cfTurnstileSiteKey: '', enableWebhook: false, isS3Enabled: false, enableSendMail: false,
  disableAdminPasswordCheck: false, enableAddressPassword: false, enableAgentEmailInfo: false,
  smtpImapProxyConfig: { smtp: { host: '', port: 8025, starttls: false }, imap: { host: '', port: 11143, starttls: false } },
  statusUrl: '', enableGlobalTurnstileCheck: false,
}

const initialState: AppState = {
  loading: 0,
  isDark: readString(local, 'vueuse-color-scheme', '') === 'dark' || (!local?.getItem('vueuse-color-scheme') && typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)),
  auth: readString(local, 'auth'), adminAuth: readString(session, 'adminAuth'), jwt: readString(local, 'jwt'),
  userJwt: readString(local, 'userJwt'),
  mailboxAccessMode: readString(local, 'mailboxAccessMode') === 'credential' ? 'credential' : 'standard',
  addressPassword: readString(session, 'addressPassword'),
  preferredLocale: readString(local, 'preferredLocale'),
  mailboxSplitSize: readNumber(local, 'mailboxSplitSize', 0.32), mailListView: readBoolean(local, 'mailListView', false),
  mailListPreviewLineClamp: readNumber(local, 'mailListPreviewLineClamp', 1),
  useIframeShowMail: readBoolean(local, 'useIframeShowMail', false),
  preferShowTextMail: readBoolean(local, 'preferShowTextMail', false),
  useSimpleIndex: readBoolean(local, 'useSimpleIndex', false),
  useUTCDate: readBoolean(local, 'useUTCDate', false), autoRefresh: readBoolean(local, 'autoRefresh', false),
  configAutoRefreshInterval: readNumber(local, 'configAutoRefreshInterval', 60), announcement: readString(local, 'announcement'),
  showAddressCredential: false, showAdminAuth: false, showSiteAuth: false,
  openSettings: openSettingsDefaults,
  settings: { fetched: false, send_balance: 0, address: '', auto_reply: {} },
  userOpenSettings: { fetched: false, enable: false, enableMailVerify: false, oauth2ClientIDs: [] },
  userSettings: { fetched: false, user_email: '', user_id: 0, is_admin: false, access_token: null, new_user_token: null, user_role: null },
  sendMailModel: readObject(session, 'sendMailModel', { fromName: '', toName: '', toMail: '', subject: '', contentType: 'text', content: '' }),
  userOauth2SessionState: readString(session, 'userOauth2SessionState') || readString(local, 'userOauth2SessionState_fb'),
  userOauth2SessionClientID: readString(session, 'userOauth2SessionClientID') || readString(local, 'userOauth2SessionClientID_fb'),
  isTelegram: typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp?.initData),
  telegramInitData: typeof window === 'undefined' ? '' : ((window as any).Telegram?.WebApp?.initData || ''),
}

const persistence: Partial<Record<keyof AppState, [Storage | null, string, 'string' | 'json']>> = {
  isDark: [local, 'vueuse-color-scheme', 'string'], auth: [local, 'auth', 'string'],
  adminAuth: [session, 'adminAuth', 'string'],
  jwt: [local, 'jwt', 'string'], userJwt: [local, 'userJwt', 'string'], mailboxAccessMode: [local, 'mailboxAccessMode', 'string'], addressPassword: [session, 'addressPassword', 'string'],
  preferredLocale: [local, 'preferredLocale', 'string'],
  mailboxSplitSize: [local, 'mailboxSplitSize', 'string'], mailListView: [local, 'mailListView', 'string'],
  mailListPreviewLineClamp: [local, 'mailListPreviewLineClamp', 'string'], useIframeShowMail: [local, 'useIframeShowMail', 'string'],
  preferShowTextMail: [local, 'preferShowTextMail', 'string'], useSimpleIndex: [local, 'useSimpleIndex', 'string'],
  useUTCDate: [local, 'useUTCDate', 'string'], autoRefresh: [local, 'autoRefresh', 'string'],
  configAutoRefreshInterval: [local, 'configAutoRefreshInterval', 'string'], announcement: [local, 'announcement', 'string'],
  sendMailModel: [session, 'sendMailModel', 'json'], userOauth2SessionState: [session, 'userOauth2SessionState', 'string'],
  userOauth2SessionClientID: [session, 'userOauth2SessionClientID', 'string'],
}

let state = initialState
const listeners = new Set<() => void>()

export const appStore = {
  getState: () => state,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) },
  setState: (patch: Partial<AppState> | ((current: AppState) => Partial<AppState>)) => {
    const next = typeof patch === 'function' ? patch(state) : patch
    state = { ...state, ...next }
    for (const key of Object.keys(next) as Array<keyof AppState>) {
      const entry = persistence[key]
      if (!entry) continue
      const [storage, storageKey, mode] = entry
      const value = state[key]
      storage?.setItem(storageKey, mode === 'json' ? JSON.stringify(value) : key === 'isDark' ? (value ? 'dark' : 'light') : String(value))
      if (key === 'userOauth2SessionState') local?.setItem('userOauth2SessionState_fb', String(value))
      if (key === 'userOauth2SessionClientID') local?.setItem('userOauth2SessionClientID_fb', String(value))
    }
    listeners.forEach((listener) => listener())
  },
  resetAddress: () => appStore.setState({ jwt: '', mailboxAccessMode: 'standard', addressPassword: '', settings: { ...initialState.settings, fetched: true } }),
  resetUser: () => appStore.setState({ userJwt: '', userSettings: { ...initialState.userSettings, fetched: true } }),
}

export const useAppStore = <T,>(selector: (value: AppState) => T = ((value) => value as T)) => {
  const snapshot = useSyncExternalStore(appStore.subscribe, appStore.getState, () => initialState)
  return selector(snapshot)
}

export const canShowAdmin = (value = state) => Boolean(value.adminAuth || value.userSettings.is_admin || value.openSettings.disableAdminPasswordCheck)
export const hasAccountSession = (value: AppState) => Boolean(value.userJwt && value.userSettings.user_email)
export const isCredentialOnlySession = (value: AppState) => value.mailboxAccessMode === 'credential' && !hasAccountSession(value)
