import { Context } from "hono";
import { CONSTANTS } from "../constants";
import { AdminWebhookSettings } from "../models";
import { normalizeStringArray } from '../utils';
import i18n from '../i18n';

async function getWebhookSettings(c: Context<HonoCustomType>): Promise<Response> {
    const settings = await c.env.KV.get<AdminWebhookSettings>(CONSTANTS.WEBHOOK_KV_SETTINGS_KEY, "json");
    return c.json(settings || new AdminWebhookSettings(false, []));
}

async function saveWebhookSettings(c: Context<HonoCustomType>): Promise<Response> {
    const input = await c.req.json<AdminWebhookSettings>();
    const allowList = normalizeStringArray(input?.allowList, 5_000, 320);
    if (typeof input?.enableAllowList !== 'boolean' || !allowList) {
        return c.text(i18n.getMessagesbyContext(c).InvalidInputMsg, 400);
    }
    const settings = new AdminWebhookSettings(
        input.enableAllowList,
        allowList.map((address) => address.toLowerCase()),
    );
    await c.env.KV.put(CONSTANTS.WEBHOOK_KV_SETTINGS_KEY, JSON.stringify(settings));
    return c.json({ success: true })
}

export default {
    getWebhookSettings,
    saveWebhookSettings,
}
