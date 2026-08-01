import { Context } from 'hono';

import { CONSTANTS } from '../constants';
import i18n from '../i18n';
import { AdminWebhookSettings } from '../models';
import {
    getStoredWebhookSettings,
    saveStoredWebhookSettings,
    testStoredWebhookSettings,
} from '../webhook_settings_service';

const ensureWebhookAccess = async (c: Context<HonoCustomType>, address: string): Promise<Response | null> => {
    const settings = await c.env.KV.get<AdminWebhookSettings>(CONSTANTS.WEBHOOK_KV_SETTINGS_KEY, 'json');
    if (settings?.enableAllowList && !settings.allowList.includes(address)) {
        return c.text(i18n.getMessagesbyContext(c).WebhookNotAllowedForUserMsg, 403);
    }
    return null;
};

const getAddress = (c: Context<HonoCustomType>): string => c.get('jwtPayload').address;

async function getWebhookSettings(c: Context<HonoCustomType>): Promise<Response> {
    const address = getAddress(c);
    const denied = await ensureWebhookAccess(c, address);
    if (denied) return denied;
    return getStoredWebhookSettings(c, `${CONSTANTS.WEBHOOK_KV_USER_SETTINGS_KEY}:${address}`);
}

async function saveWebhookSettings(c: Context<HonoCustomType>): Promise<Response> {
    const address = getAddress(c);
    const denied = await ensureWebhookAccess(c, address);
    if (denied) return denied;
    return saveStoredWebhookSettings(c, `${CONSTANTS.WEBHOOK_KV_USER_SETTINGS_KEY}:${address}`);
}

async function testWebhookSettings(c: Context<HonoCustomType>): Promise<Response> {
    const address = getAddress(c);
    const denied = await ensureWebhookAccess(c, address);
    if (denied) return denied;
    return testStoredWebhookSettings(c, address);
}

export default { getWebhookSettings, saveWebhookSettings, testWebhookSettings };
