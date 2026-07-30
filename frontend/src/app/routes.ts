export const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/login/forgot-password',
} as const

export const ADMIN_LOGIN_ROUTE = '/dashboard/login'

export type AuthRouteKey = keyof typeof AUTH_ROUTES

export const MAIL_ROUTES = {
  mailbox: '/mail/inbox',
  sendbox: '/mail/sent',
  sendmail: '/mail/compose',
  addresses: '/addresses',
  accountSettings: '/settings/mailbox',
  appearance: '/settings/appearance',
  auto_reply: '/settings/auto-reply',
  webhook: '/settings/webhook',
  s3_attachment: '/settings/attachments',
  user_settings: '/settings/account',
} as const

export type MailRouteKey = keyof typeof MAIL_ROUTES

export const ADMIN_PAGE_ROUTES = {
  statistics: '/dashboard',
  account: '/dashboard/addresses/list',
  account_create: '/dashboard/addresses/create',
  account_settings: '/dashboard/addresses/rules',
  senderAccess: '/dashboard/addresses/senders',
  user_management: '/dashboard/users/list',
  user_settings: '/dashboard/users/settings',
  roleAddressConfig: '/dashboard/users/role-addresses',
  userOauth2Settings: '/dashboard/users/oauth2',
  accessTokens: '/dashboard/users/access-tokens',
  adminAccount: '/dashboard/users/admin-login',
  mails: '/dashboard/mail/inbox',
  unknow: '/dashboard/mail/unknown',
  sendBox: '/dashboard/mail/sent',
  sendMail: '/dashboard/mail/compose',
  sendConfiguration: '/dashboard/mail/providers',
  aiExtractSettings: '/dashboard/mail/ai-extraction',
  mailWebhook: '/dashboard/mail/delivery-webhook',
  webhook: '/dashboard/mail/user-webhook',
  telegram: '/dashboard/mail/telegram',
  workerconfig: '/dashboard/configuration/worker',
  ipBlacklistSettings: '/dashboard/configuration/ip-access',
  database: '/dashboard/configuration/database',
  maintenance: '/dashboard/configuration/cleanup',
  appearance: '/dashboard/configuration/appearance',
  apiDocs: '/dashboard/configuration/api',
} as const

export type AdminPageKey = keyof typeof ADMIN_PAGE_ROUTES
export type AdminSectionKey = 'home' | 'account' | 'user' | 'mails' | 'maintenance'

export const ADMIN_SECTION_PAGES: Record<AdminSectionKey, readonly AdminPageKey[]> = {
  home: ['statistics'],
  account: ['account', 'account_create', 'account_settings', 'senderAccess'],
  user: ['user_management', 'user_settings', 'roleAddressConfig', 'userOauth2Settings', 'accessTokens', 'adminAccount'],
  mails: ['mails', 'unknow', 'sendBox', 'sendMail', 'sendConfiguration', 'aiExtractSettings', 'mailWebhook', 'webhook', 'telegram'],
  maintenance: ['workerconfig', 'ipBlacklistSettings', 'database', 'maintenance', 'appearance', 'apiDocs'],
}

export const ADMIN_SECTION_DEFAULTS: Record<AdminSectionKey, AdminPageKey> = {
  home: 'statistics',
  account: 'account',
  user: 'user_management',
  mails: 'mails',
  maintenance: 'workerconfig',
}

export const ADMIN_DEFAULT_PAGE: AdminPageKey = ADMIN_SECTION_DEFAULTS.home

export const getAdminSection = (page: AdminPageKey): AdminSectionKey => {
  return (Object.keys(ADMIN_SECTION_PAGES) as AdminSectionKey[])
    .find((section) => ADMIN_SECTION_PAGES[section].includes(page)) || 'account'
}

export const getAdminPath = (page: AdminPageKey) => ADMIN_PAGE_ROUTES[page]
export const getMailPath = (page: MailRouteKey) => MAIL_ROUTES[page]
