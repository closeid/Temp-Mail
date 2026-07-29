export const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  addressLogin: '/address-login',
} as const

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
  account: '/dashboard/addresses/list',
  account_create: '/dashboard/addresses/create',
  account_settings: '/dashboard/addresses/rules',
  senderAccess: '/dashboard/addresses/senders',
  user_management: '/dashboard/users/list',
  user_settings: '/dashboard/users/settings',
  roleAddressConfig: '/dashboard/users/role-addresses',
  userOauth2Settings: '/dashboard/users/oauth2',
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
  statistics: '/dashboard/configuration/statistics',
  appearance: '/dashboard/configuration/appearance',
  apiDocs: '/dashboard/configuration/api',
} as const

export type AdminPageKey = keyof typeof ADMIN_PAGE_ROUTES
export type AdminSectionKey = 'account' | 'user' | 'mails' | 'maintenance'

export const ADMIN_SECTION_PAGES: Record<AdminSectionKey, readonly AdminPageKey[]> = {
  account: ['account', 'account_create', 'account_settings', 'senderAccess'],
  user: ['user_management', 'user_settings', 'roleAddressConfig', 'userOauth2Settings', 'adminAccount'],
  mails: ['mails', 'unknow', 'sendBox', 'sendMail', 'sendConfiguration', 'aiExtractSettings', 'mailWebhook', 'webhook', 'telegram'],
  maintenance: ['workerconfig', 'ipBlacklistSettings', 'database', 'maintenance', 'statistics', 'appearance', 'apiDocs'],
}

export const ADMIN_SECTION_DEFAULTS: Record<AdminSectionKey, AdminPageKey> = {
  account: 'account',
  user: 'user_management',
  mails: 'mails',
  maintenance: 'workerconfig',
}

export const ADMIN_DEFAULT_PAGE: AdminPageKey = ADMIN_SECTION_DEFAULTS.account

export const getAdminSection = (page: AdminPageKey): AdminSectionKey => {
  return (Object.keys(ADMIN_SECTION_PAGES) as AdminSectionKey[])
    .find((section) => ADMIN_SECTION_PAGES[section].includes(page)) || 'account'
}

export const getAdminPath = (page: AdminPageKey) => ADMIN_PAGE_ROUTES[page]
export const getMailPath = (page: MailRouteKey) => MAIL_ROUTES[page]
