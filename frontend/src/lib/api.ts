import axios from 'axios'
import { getFingerprint } from '@/utils/fingerprint'
import { safeBearerHeader, safeHeaderValue, safeJwtValue } from '@/utils/headers'
import { appStore, type OpenSettings } from './store'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 30_000,
  validateStatus: (status) => status >= 200 && status <= 500,
})

const PUBLIC_USER_ENDPOINTS = new Set([
  '/api/user/open_settings',
  '/api/user/register',
  '/api/user/login',
  '/api/user/verify_code',
  '/api/user/passkey/authenticate_request',
  '/api/user/passkey/authenticate_response',
  '/api/user/oauth2/login_url',
  '/api/user/oauth2/callback',
])

export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  userJwt?: string
  addressJwt?: string
  signal?: AbortSignal
  headers?: Record<string, string>
}

async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  appStore.setState((current) => ({ loading: current.loading + 1 }))
  try {
    const state = appStore.getState()
    const headers: Record<string, string> = {
      'x-lang': document.documentElement.lang || 'zh',
      'x-fingerprint': await getFingerprint(),
      'Content-Type': 'application/json',
      ...options.headers,
    }
    const isOpenEndpoint = path.startsWith('/api/open/')
    const isTelegramEndpoint = path.startsWith('/api/telegram/')
    const isUserEndpoint = path.startsWith('/api/user/')
    const isAdminEndpoint = path.startsWith('/api/admin/')
    const isExternalEndpoint = path.startsWith('/api/external/')
    const endpointPath = path.split('?', 1)[0]
    const isPublicUserEndpoint = PUBLIC_USER_ENDPOINTS.has(endpointPath)
    const isPublicMailboxEndpoint = path === '/api/address_login' || path === '/api/new_address'
    const needsAddressCredential = !isOpenEndpoint && !isTelegramEndpoint && !isAdminEndpoint && !isExternalEndpoint && !isPublicMailboxEndpoint && (!isUserEndpoint || path === '/api/user/bind_address')
    const userToken = safeJwtValue(options.userJwt || state.userJwt)
    const userAccess = safeJwtValue(state.userSettings.access_token)
    const customAuth = safeHeaderValue(state.auth)
    const adminAuth = safeHeaderValue(state.adminAuth)
    const authorization = safeBearerHeader(options.addressJwt ?? state.jwt)
    if (isUserEndpoint && !isPublicUserEndpoint && userToken) headers['x-user-token'] = userToken
    if (isAdminEndpoint && userAccess) headers['x-user-access-token'] = userAccess
    if (!isOpenEndpoint && !isTelegramEndpoint && customAuth) headers['x-custom-auth'] = customAuth
    if (isAdminEndpoint && adminAuth) headers['x-admin-auth'] = adminAuth
    if (needsAddressCredential && authorization) headers.Authorization = authorization

    const response = await instance.request<T>({
      url: path,
      method: options.method || 'GET',
      data: options.body ?? null,
      headers,
      signal: options.signal,
    })
    if (response.status === 401 && path.startsWith('/api/admin/')) appStore.setState({ showAdminAuth: true })
    if (response.status === 401 && state.openSettings.needAuth) appStore.setState({ showSiteAuth: true })
    if (response.status >= 300) {
      const detail = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
      throw new Error(`[${response.status}]: ${detail || 'Request failed'}`)
    }
    return response.data
  } catch (error: any) {
    if (error?.response) throw new Error(`Code ${error.response.status}: ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`)
    throw error
  } finally {
    appStore.setState((current) => ({ loading: Math.max(0, current.loading - 1) }))
  }
}

export async function fetchOpenSettings() {
  try {
    const result = await apiFetch<Record<string, any>>('/api/open/settings')
    const domains = Array.isArray(result.domains) ? result.domains : []
    const labels = Array.isArray(result.domainLabels) ? result.domainLabels : []
    const current = appStore.getState().openSettings
    const normalized: OpenSettings = {
      ...current, ...result, fetched: true,
      title: result.title || '', prefix: result.prefix || '', minAddressLen: result.minAddressLen || 1,
      maxAddressLen: result.maxAddressLen || 30, needAuth: Boolean(result.needAuth), defaultDomains: result.defaultDomains || [],
      randomSubdomainDomains: result.randomSubdomainDomains || [],
      domains: domains.map((value: string, index: number) => ({ label: labels[index] || value, value })),
      copyright: result.copyright || current.copyright, cfTurnstileSiteKey: result.cfTurnstileSiteKey || '',
      smtpImapProxyConfig: result.smtpImapProxyConfig || current.smtpImapProxyConfig,
      statusUrl: result.statusUrl || '',
    }
    appStore.setState({ openSettings: normalized, showSiteAuth: Boolean(normalized.needAuth && !appStore.getState().auth) })
    return normalized
  } catch (error) {
    appStore.setState((state) => ({ openSettings: { ...state.openSettings, fetched: true } }))
    throw error
  }
}

export async function fetchAddressSettings() {
  const { jwt } = appStore.getState()
  if (!jwt || jwt === 'undefined') {
    appStore.setState((state) => ({ settings: { ...state.settings, fetched: true } }))
    return appStore.getState().settings
  }
  try {
    const result = await apiFetch<Record<string, any>>('/api/settings')
    const settings = { fetched: true, address: result.address || '', auto_reply: result.auto_reply || {}, send_balance: result.send_balance || 0 }
    appStore.setState({ settings })
    return settings
  } catch (error) {
    appStore.setState((state) => ({ settings: { ...state.settings, fetched: true } }))
    throw error
  }
}

async function activateUserSession(userJwt: string) {
  let effectiveUserJwt = userJwt
  let userResult = await apiFetch<Record<string, any>>('/api/user/settings', { userJwt: effectiveUserJwt })
  if (userResult.new_user_token) {
    effectiveUserJwt = userResult.new_user_token
    userResult = await apiFetch<Record<string, any>>('/api/user/settings', { userJwt: effectiveUserJwt })
  }
  const userSettings = { ...appStore.getState().userSettings, ...userResult, fetched: true }
  const boundAddresses = await apiFetch<{ results?: Array<{ id: number | string }> }>('/api/user/bind_address', { userJwt: effectiveUserJwt })
  const firstAddress = boundAddresses.results?.[0]
  if (firstAddress?.id == null) {
    appStore.setState({
      userJwt: effectiveUserJwt,
      userSettings,
      jwt: '',
      mailboxAccessMode: 'standard',
      settings: { fetched: true, address: '', auto_reply: {}, send_balance: 0 },
    })
    return false
  }

  const mailbox = await apiFetch<{ jwt: string }>(`/api/user/bind_address_jwt/${encodeURIComponent(firstAddress.id)}`, { userJwt: effectiveUserJwt })
  if (!mailbox.jwt) throw new Error('Mailbox token not found')
  const addressResult = await apiFetch<Record<string, any>>('/api/settings', { userJwt: effectiveUserJwt, addressJwt: mailbox.jwt })
  appStore.setState({
    userJwt: effectiveUserJwt,
    userSettings,
    jwt: mailbox.jwt,
    mailboxAccessMode: 'standard',
    settings: { fetched: true, address: addressResult.address || '', auto_reply: addressResult.auto_reply || {}, send_balance: addressResult.send_balance || 0 },
  })
  return true
}

export async function fetchUserOpenSettings() {
  try {
    const result = await apiFetch<Record<string, any>>('/api/user/open_settings')
    const settings = { ...appStore.getState().userOpenSettings, ...result, fetched: true }
    appStore.setState({ userOpenSettings: settings })
    return settings
  } catch (error) {
    appStore.setState((state) => ({ userOpenSettings: { ...state.userOpenSettings, fetched: true } }))
    throw error
  }
}

export async function fetchUserSettings() {
  const { userJwt } = appStore.getState()
  if (!userJwt) {
    appStore.setState((state) => ({ userSettings: { ...state.userSettings, fetched: true } }))
    return appStore.getState().userSettings
  }
  try {
    const result = await apiFetch<Record<string, any>>('/api/user/settings')
    const settings = { ...appStore.getState().userSettings, ...result, fetched: true }
    appStore.setState({ userSettings: settings })
    if (settings.new_user_token) {
      await apiFetch('/api/user/settings', { userJwt: settings.new_user_token })
      appStore.setState({ userJwt: settings.new_user_token })
    }
    return settings
  } catch (error) {
    appStore.setState((state) => ({ userSettings: { ...state.userSettings, fetched: true } }))
    throw error
  }
}

export const api = {
  fetch: apiFetch,
  getOpenSettings: fetchOpenSettings,
  getSettings: fetchAddressSettings,
  getUserOpenSettings: fetchUserOpenSettings,
  getUserSettings: fetchUserSettings,
  activateUserSession,
  bindUserAddress: () => apiFetch('/api/user/bind_address', { method: 'POST' }),
  adminShowAddressCredential: async (id: number | string) => (await apiFetch<{ jwt: string }>(`/api/admin/show_password/${id}`)).jwt,
  adminDeleteAddress: (id: number | string) => apiFetch(`/api/admin/delete_address/${id}`, { method: 'DELETE' }),
}
