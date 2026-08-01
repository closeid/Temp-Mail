import { Context } from 'hono';

import { CONSTANTS } from '../constants';
import {
    getStoredWebhookSettings,
    saveStoredWebhookSettings,
    testStoredWebhookSettings,
} from '../webhook_settings_service';

export default {
    getWebhookSettings: (c: Context<HonoCustomType>) => getStoredWebhookSettings(
        c,
        CONSTANTS.WEBHOOK_KV_ADMIN_MAIL_SETTINGS_KEY,
    ),
    saveWebhookSettings: (c: Context<HonoCustomType>) => saveStoredWebhookSettings(
        c,
        CONSTANTS.WEBHOOK_KV_ADMIN_MAIL_SETTINGS_KEY,
    ),
    testWebhookSettings: (c: Context<HonoCustomType>) => testStoredWebhookSettings(c),
};
