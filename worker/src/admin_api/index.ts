import { Context, Hono } from 'hono'

import { getUserRoles } from '../utils'
import address_api from './address_api'
import address_sender_api from './address_sender_api'
import sendbox_api from './sendbox_api'
import statistics_api from './statistics_api'
import account_settings_api from './account_settings_api'
import cleanup_api from './cleanup_api'
import admin_user_api from './admin_user_api'
import webhook_settings from './webhook_settings'
import mail_webhook_settings from './mail_webhook_settings'
import oauth2_settings from './oauth2_settings'
import worker_config from './worker_config'
import admin_mail_api from './admin_mail_api'
import { sendMailbyAdmin, sendMailByBindingAdmin } from './send_mail'
import db_api from './db_api'
import ip_blacklist_settings from './ip_blacklist_settings'
import ai_extract_settings from './ai_extract_settings'
import e2e_test_api from './e2e_test_api'
import { createAccessToken, deleteAccessToken, listAccessTokens } from './admin_access_api'

export const api = new Hono<HonoCustomType>()

// address
api.get('/api/admin/address', address_api.listAddresses)
api.post('/api/admin/new_address', address_api.createNewAddress)
api.delete('/api/admin/delete_address/:id', address_api.deleteAddress)
api.delete('/api/admin/clear_inbox/:id', address_api.clearInbox)
api.delete('/api/admin/clear_sent_items/:id', address_api.clearSentItems)
api.get('/api/admin/show_password/:id', address_api.showPassword)
api.post('/api/admin/address/:id/reset_password', address_api.resetPassword)

// mail api
api.get('/api/admin/mails', admin_mail_api.getMails)
api.get('/api/admin/mails_unknow', admin_mail_api.getUnknowMails)
api.delete('/api/admin/mails/:id', admin_mail_api.deleteMail)

// address sender
api.get('/api/admin/address_sender', address_sender_api.list)
api.post('/api/admin/address_sender', address_sender_api.update)
api.delete('/api/admin/address_sender/:id', address_sender_api.remove)

// sendbox
api.get('/api/admin/sendbox', sendbox_api.list)
api.delete('/api/admin/sendbox/:id', sendbox_api.remove)

// statistics
api.get('/api/admin/statistics', statistics_api.get)

// account settings
api.get('/api/admin/account_settings', account_settings_api.get)
api.post('/api/admin/account_settings', account_settings_api.save)

// cleanup
api.post('/api/admin/cleanup', cleanup_api.cleanup)
api.get('/api/admin/auto_cleanup', cleanup_api.getCleanup)
api.post('/api/admin/auto_cleanup', cleanup_api.saveCleanup)

// user settings
api.get('/api/admin/user_settings', admin_user_api.getSetting)
api.post('/api/admin/user_settings', admin_user_api.saveSetting)
api.get('/api/admin/users', admin_user_api.getUsers)
api.delete('/api/admin/users/:user_id', admin_user_api.deleteUser)
api.post('/api/admin/users', admin_user_api.createUser)
api.post('/api/admin/users/:user_id/reset_password', admin_user_api.resetPassword)
api.get('/api/admin/user_roles', async (c: Context<HonoCustomType>) => c.json(getUserRoles(c)))
api.post('/api/admin/user_roles', admin_user_api.updateUserRoles)
api.get('/api/admin/access_tokens', listAccessTokens)
api.post('/api/admin/access_tokens', createAccessToken)
api.delete('/api/admin/access_tokens/:id', deleteAccessToken)
api.get('/api/admin/role_address_config', admin_user_api.getRoleAddressConfig)
api.post('/api/admin/role_address_config', admin_user_api.saveRoleAddressConfig)
api.get('/api/admin/users/bind_address/:user_id', admin_user_api.getBindedAddresses)
api.post('/api/admin/users/bind_address', admin_user_api.bindAddress)
api.delete('/api/admin/users/bind_address/:address_id', admin_user_api.unbindAddress)

// user oauth2 settings
api.get('/api/admin/user_oauth2_settings', oauth2_settings.getUserOauth2Settings)
api.post('/api/admin/user_oauth2_settings', oauth2_settings.saveUserOauth2Settings)

// webhook settings
api.get('/api/admin/webhook/settings', webhook_settings.getWebhookSettings)
api.post('/api/admin/webhook/settings', webhook_settings.saveWebhookSettings)

// mail webhook settings
api.get('/api/admin/mail_webhook/settings', mail_webhook_settings.getWebhookSettings)
api.post('/api/admin/mail_webhook/settings', mail_webhook_settings.saveWebhookSettings)
api.post('/api/admin/mail_webhook/test', mail_webhook_settings.testWebhookSettings)

// worker config
api.get('/api/admin/worker/configs', worker_config.getConfig)

// send mail by admin
api.post('/api/admin/send_mail', sendMailbyAdmin)
api.post('/api/admin/send_mail_by_binding', sendMailByBindingAdmin)

// db api
api.get('/api/admin/db_version', db_api.getVersion)
api.post('/api/admin/db_initialize', db_api.initialize)
api.post('/api/admin/db_migration', db_api.migrate)

// IP blacklist settings
api.get('/api/admin/ip_blacklist/settings', ip_blacklist_settings.getIpBlacklistSettings)
api.post('/api/admin/ip_blacklist/settings', ip_blacklist_settings.saveIpBlacklistSettings)

// AI extract settings
api.get('/api/admin/ai_extract/settings', ai_extract_settings.getAiExtractSettings)
api.post('/api/admin/ai_extract/settings', ai_extract_settings.saveAiExtractSettings)

// E2E test endpoints
api.post('/api/admin/test/seed_mail', e2e_test_api.seedMail)
api.post('/api/admin/test/receive_mail', e2e_test_api.receiveMail)
