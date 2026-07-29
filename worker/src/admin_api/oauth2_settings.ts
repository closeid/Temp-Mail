import { Context } from 'hono';

import { CONSTANTS } from '../constants';
import { UserOauth2Settings } from "../models";
import { getJsonSetting, saveSetting } from '../utils';

async function getUserOauth2Settings(c: Context<HonoCustomType>): Promise<Response> {
    const settings = await getJsonSetting<UserOauth2Settings[]>(c, CONSTANTS.OAUTH2_SETTINGS_KEY);
    return c.json(settings || []);
}

async function saveUserOauth2Settings(c: Context<HonoCustomType>): Promise<Response> {
    const settings = await c.req.json<UserOauth2Settings[]>();
    if (!Array.isArray(settings) || settings.length > 20) {
        return c.text('Invalid OAuth2 provider list', 400);
    }
    for (const setting of settings) {
        if (!setting.name || !setting.clientID || !setting.clientSecret
            || !setting.authorizationURL || !setting.accessTokenURL
            || !setting.accessTokenFormat
            || !setting.userInfoURL || !setting.redirectURL
            || !setting.userEmailKey || !setting.scope) {
            return c.text(`${setting.name} is missing required fields`, 400);
        }
        for (const value of [setting.authorizationURL, setting.accessTokenURL, setting.userInfoURL, setting.redirectURL]) {
            try {
                const url = new URL(value);
                if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
            } catch {
                return c.text(`${setting.name} contains an invalid URL`, 400);
            }
        }
        if (setting.userEmailFormat && setting.userEmailFormat.length > 200) {
            return c.text(`${setting.name} email format pattern is too long`, 400);
        }
        if (setting.userEmailFormat) {
            try { new RegExp(setting.userEmailFormat); } catch { return c.text(`${setting.name} contains an invalid email format pattern`, 400) }
        }
        if (setting.icon && setting.icon.length > 32768) {
            return c.text(`${setting.name} icon is too large`, 400);
        }
        if (setting.enableMailAllowList && (setting.mailAllowList?.length || 0) < 1) {
            return c.text(`${setting.name} is missing mail allow list`, 400);
        }
    }
    await saveSetting(c, CONSTANTS.OAUTH2_SETTINGS_KEY, JSON.stringify(settings));
    return c.json({ success: true })
}

export default {
    getUserOauth2Settings,
    saveUserOauth2Settings,
}
