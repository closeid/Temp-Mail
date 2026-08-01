import { Context } from 'hono';
import { Jwt } from 'hono/utils/jwt'

import i18n from '../i18n';
import {
    getJsonSetting,
    getMailDomain,
    getStringValue,
    getUserRoles,
    includesDomain,
    isValidUserEmail,
    secureRandomString,
    verifyExpiringJwt,
} from '../utils';
import { UserOauth2Settings } from '../models';
import { CONSTANTS } from '../constants';


export default {
    getOauth2LoginUrl: async (c: Context<HonoCustomType>) => {
        const settings = await getJsonSetting<UserOauth2Settings[]>(c, CONSTANTS.OAUTH2_SETTINGS_KEY);
        const { clientID } = c.req.query();
        const msgs = i18n.getMessagesbyContext(c);
        const setting = settings?.find(s => s.clientID === clientID);
        if (!setting) {
            return c.text(msgs.Oauth2ClientIDNotFoundMsg, 400);
        }
        const url = new URL(setting.authorizationURL);
        url.searchParams.set('client_id', setting.clientID);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('redirect_uri', setting.redirectURL);
        url.searchParams.set('scope', setting.scope);
        const now = Math.floor(Date.now() / 1000);
        const state = await Jwt.sign({
            purpose: 'oauth2-login',
            clientID: setting.clientID,
            nonce: secureRandomString(32, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
            iat: now,
            exp: now + 600,
        }, c.env.JWT_SECRET, 'HS256');
        url.searchParams.set('state', state);
        return c.json({ url: url.toString(), state });
    },
    oauth2Login: async (c: Context<HonoCustomType>) => {
        const { clientID, code, state } = await c.req.json<{ clientID?: string, code?: string, state?: string }>();
        const msgs = i18n.getMessagesbyContext(c);
        if (!clientID || !code || code.length > 4096 || !state) {
            return c.text(msgs.Oauth2CliendIDOrCodeMissingMsg, 400);
        }
        try {
            const payload = await verifyExpiringJwt<{ purpose?: string; clientID?: string }>(state, c.env.JWT_SECRET);
            if (payload.purpose !== 'oauth2-login' || payload.clientID !== clientID) throw new Error('Invalid state');
        } catch (_) {
            return c.text(msgs.Oauth2CliendIDOrCodeMissingMsg, 400);
        }
        const settings = await getJsonSetting<UserOauth2Settings[]>(c, CONSTANTS.OAUTH2_SETTINGS_KEY);
        const setting = settings?.find(s => s.clientID === clientID);
        if (!setting) {
            return c.text(msgs.Oauth2ClientIDNotFoundMsg, 400);
        }
        const params = {
            code,
            client_id: setting.clientID,
            client_secret: setting.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: setting.redirectURL,
        }
        const res = await fetch(setting.accessTokenURL, {
            method: 'POST',
            body: setting.accessTokenFormat === 'json'
                ? JSON.stringify(params) :
                new URLSearchParams(params).toString(),
            headers: {
                'Content-Type': setting.accessTokenFormat === 'json'
                    ? 'application/json'
                    : 'application/x-www-form-urlencoded',
                "Accept": "application/json"
            },
            signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) {
            console.error(`Failed to get access token: ${res.status} ${res.statusText}`)
            return c.text(msgs.Oauth2FailedGetAccessTokenMsg, 400);
        }
        const tokenResponseText = await res.text();
        if (new TextEncoder().encode(tokenResponseText).length > 65_536) {
            return c.text(msgs.Oauth2FailedGetAccessTokenMsg, 400);
        }
        let resJson: Record<string, unknown>;
        try {
            resJson = JSON.parse(tokenResponseText) as Record<string, unknown>;
        } catch (_) {
            return c.text(msgs.Oauth2FailedGetAccessTokenMsg, 400);
        }
        const { access_token, token_type } = resJson as { access_token: string, token_type?: string };
        if (typeof access_token !== 'string' || !access_token || access_token.length > 16_384
            || (token_type !== undefined && (typeof token_type !== 'string' || token_type.length > 64))
        ) {
            return c.text(msgs.Oauth2FailedGetAccessTokenMsg, 400);
        }
        const userRes = await fetch(setting.userInfoURL, {
            headers: {
                "Authorization": `${token_type || 'Bearer'} ${access_token}`,
                "Accept": "application/json",
                "User-Agent": "Cloudflare Workers"
            },
            signal: AbortSignal.timeout(10_000),
        })
        if (!userRes.ok) {
            console.error(`Failed to get user info: ${userRes.status} ${userRes.statusText}`)
            return c.text(msgs.Oauth2FailedGetUserInfoMsg, 400);
        }
        const userInfoText = await userRes.text();
        if (new TextEncoder().encode(userInfoText).length > 65_536) {
            return c.text(msgs.Oauth2FailedGetUserInfoMsg, 400);
        }
        let userInfo: any;
        try {
            userInfo = JSON.parse(userInfoText);
        } catch (_) {
            return c.text(msgs.Oauth2FailedGetUserInfoMsg, 400);
        }

        const rawEmail = await (async () => {
            if (setting.userEmailKey.startsWith("$")) {
                const { JSONPath } = await import('jsonpath-plus');
                const email = JSONPath({
                    path: setting.userEmailKey,
                    json: userInfo,
                })
                if (email && Array.isArray(email) && email.length > 0) {
                    return email[0];
                }
            }
            const { [setting.userEmailKey]: email } = userInfo as { [key: string]: string };
            return email;
        })()

        if (!rawEmail) {
            return c.text(msgs.Oauth2FailedGetUserEmailMsg, 400);
        }

        // Apply email format transformation if enabled
        const email = (() => {
            const rawEmailStr = String(rawEmail).slice(0, 256).trim();  // 限制长度防止 ReDoS
            if (!setting.enableEmailFormat || !setting.userEmailFormat) {
                return rawEmailStr;
            }
            try {
                const regex = new RegExp(setting.userEmailFormat);
                const replacement = setting.userEmailReplace || '$1';
                return rawEmailStr.replace(regex, replacement).trim();
            } catch (e) {
                console.error('Invalid OAuth2 user email format', e);
                return rawEmailStr;
            }
        })();

        if (!isValidUserEmail(email)) {
            return c.text(msgs.Oauth2FailedGetUserEmailMsg, 400);
        }
        // check email in mail allow list
        const mailDomain = getMailDomain(email);
        if (setting.enableMailAllowList && !includesDomain(setting.mailAllowList, mailDomain)) {
            return c.text(`${msgs.UserMailDomainMustInMsg} ${JSON.stringify(setting.mailAllowList, null, 2)}`, 400)
        }
        // insert or update user
        const { success } = await c.env.DB.prepare(
            `INSERT INTO users (user_email, password, user_info)`
            + ` VALUES (?, '', ?)`
            + ` ON CONFLICT(user_email) DO UPDATE SET updated_at = datetime('now')`
        ).bind(
            email, JSON.stringify(userInfo)
        ).run();
        if (!success) {
            return c.text(msgs.FailedToRegisterMsg, 500)
        }
        const { id: user_id } = await c.env.DB.prepare(
            `SELECT id FROM users where user_email = ?`
        ).bind(email).first() || {};
        if (!user_id) {
            return c.text(msgs.UserNotFoundMsg, 400)
        }
        // process user roles
        const defaultRole = getStringValue(c.env.USER_DEFAULT_ROLE);
        if (defaultRole) {
            const user_roles = getUserRoles(c);
            if (!user_roles.find((r) => r.role === defaultRole)) {
                return c.text(msgs.InvalidUserDefaultRoleMsg, 500);
            }
            // update user roles
            const { success: success2 } = await c.env.DB.prepare(
                `INSERT INTO user_roles (user_id, role_text)`
                + ` VALUES (?, ?)`
                + ` ON CONFLICT(user_id) DO NOTHING`
            ).bind(user_id, defaultRole).run();
            if (!success2) {
                return c.text(msgs.FailedUpdateUserDefaultRoleMsg, 500);
            }
        }
        // create jwt
        const jwt = await Jwt.sign({
            user_email: email,
            user_id: user_id,
            // 30 days expire in seconds
            exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            iat: Math.floor(Date.now() / 1000),
        }, c.env.JWT_SECRET, "HS256")
        return c.json({
            jwt: jwt
        })
    }
}
