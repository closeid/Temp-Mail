import { Context } from 'hono';
import { Jwt } from 'hono/utils/jwt'

import i18n from '../i18n';
import utils, {
    checkCfTurnstile,
    constantTimeEqual,
    getJsonSetting,
    checkUserPassword,
    getUserRoles,
    getStringValue,
    getMailDomain,
    includesDomain,
    isValidUserEmail,
    passwordHashNeedsUpgrade,
    protectPasswordHash,
    secureRandomInt,
    verifyPasswordHash,
} from "../utils"
import { CONSTANTS } from "../constants";
import { GeoData, UserInfo, UserSettings } from "../models";
import { sendMail } from "../mails_api/send_mail_api";

export default {
    verifyCode: async (c: Context<HonoCustomType>) => {
        const body = await c.req.json();
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const { cf_token } = body;
        const msgs = i18n.getMessagesbyContext(c);
        if (!isValidUserEmail(email)) return c.text(msgs.UserEmailNotMatchRegexMsg, 400);
        // check cf turnstile
        try {
            await checkCfTurnstile(c, cf_token);
        } catch (error) {
            return c.text(msgs.TurnstileCheckFailedMsg, 400)
        }
        const value = await getJsonSetting(c, CONSTANTS.USER_SETTINGS_KEY);
        const settings = new UserSettings(value)
        // check mail domain allow list
        const mailDomain = getMailDomain(email);
        if (settings.enableMailAllowList
            && settings.mailAllowList
            && !includesDomain(settings.mailAllowList, mailDomain)
        ) {
            return c.text(`${msgs.UserMailDomainMustInMsg} ${JSON.stringify(settings.mailAllowList, null, 2)}`, 400)
        }
        // check email regex
        if (settings.enableEmailCheckRegex && settings.emailCheckRegex) {
            try {
                const regex = new RegExp(settings.emailCheckRegex);
                if (!regex.test(email)) {
                    return c.text(`${msgs.UserEmailNotMatchRegexMsg}: /${settings.emailCheckRegex}/`, 400)
                }
            } catch (e) {
                console.error("Failed to check user email regex", e);
            }
        }
        if (!settings.verifyMailSender) {
            return c.text(msgs.VerifyMailSenderNotSetMsg, 400)
        }
        // check if code exists in KV
        const tmpcode = await c.env.KV.get(`temp-mail:${email}`)
        if (tmpcode) {
            return c.text(msgs.CodeAlreadySentMsg, 400)
        }
        // generate code 6 digits and convert to string
        const code = (100000 + secureRandomInt(900000)).toString();
        // send code to email
        try {
            await sendMail(c, settings.verifyMailSender, {
                from_name: "Temp Mail Verify",
                to_name: '',
                to_mail: email as string,
                subject: "Temp Mail Verify code",
                content: `Your verify code is ${code}`,
                is_html: false,
            })
        } catch (e) {
            console.error("Failed to send verification code", e);
            return c.text(msgs.OperationFailedMsg, 500)
        }
        // save to KV
        await c.env.KV.put(`temp-mail:${email}`, code, { expirationTtl: 300 });
        return c.json({
            success: true,
            expirationTtl: 300
        })
    },
    register: async (c: Context<HonoCustomType>) => {
        const value = await getJsonSetting(c, CONSTANTS.USER_SETTINGS_KEY);
        const settings = new UserSettings(value)
        const msgs = i18n.getMessagesbyContext(c);
        // check enable
        if (!settings.enable) {
            return c.text(msgs.UserRegistrationDisabledMsg, 403);
        }
        // check request
        const body = await c.req.json();
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const { password, code, cf_token } = body;
        if (!isValidUserEmail(email) || !password) {
            return c.text(msgs.InvalidEmailOrPasswordMsg, 400)
        }
        try {
            checkUserPassword(password);
        } catch (_) {
            return c.text(msgs.InvalidEmailOrPasswordMsg, 400);
        }
        const protectedPassword = await protectPasswordHash(password, c.env.JWT_SECRET);
        // check cf turnstile only when mail verify is disabled
        // (when enabled, verify_code endpoint already checks turnstile)
        if (!settings.enableMailVerify) {
            try {
                await checkCfTurnstile(c, cf_token);
            } catch (error) {
                return c.text(msgs.TurnstileCheckFailedMsg, 400)
            }
        }
        if (settings.enableMailVerify && (typeof code !== 'string' || !/^\d{6}$/.test(code))) {
            return c.text(msgs.InvalidVerifyCodeMsg, 400)
        }
        // check mail domain allow list
        const mailDomain = getMailDomain(email);
        if (settings.enableMailAllowList
            && settings.mailAllowList
            && !includesDomain(settings.mailAllowList, mailDomain)
        ) {
            return c.text(`${msgs.UserMailDomainMustInMsg} ${JSON.stringify(settings.mailAllowList, null, 2)}`, 400)
        }
        // check email regex
        if (settings.enableEmailCheckRegex && settings.emailCheckRegex) {
            try {
                const regex = new RegExp(settings.emailCheckRegex);
                if (!regex.test(email)) {
                    return c.text(`${msgs.UserEmailNotMatchRegexMsg}: /${settings.emailCheckRegex}/`, 400)
                }
            } catch (e) {
                console.error("Failed to check user email regex", e);
            }
        }
        // check code
        if (settings.enableMailVerify) {
            const verifyCode = await c.env.KV.get(`temp-mail:${email}`)
            if (!verifyCode || !constantTimeEqual(verifyCode, code)) {
                return c.text(msgs.InvalidVerifyCodeMsg, 400)
            }
        }
        // geo data
        const reqIp = c.req.raw.headers.get("cf-connecting-ip")
        const geoData = new GeoData(reqIp, c.req.raw.cf as any);
        const userInfo = new UserInfo(geoData, email);
        // if not enable mail verify, do not on conflict update
        if (!settings.enableMailVerify) {
            try {
                const { success } = await c.env.DB.prepare(
                    `INSERT INTO users (user_email, password, user_info)`
                    + ` VALUES (?, ?, ?)`
                ).bind(
                    email, protectedPassword, JSON.stringify(userInfo)
                ).run();
                if (!success) {
                    return c.text(msgs.FailedToRegisterMsg, 500)
                }
            } catch (e) {
                const error = e as Error;
                if (error.message && error.message.includes("UNIQUE")) {
                    return c.text(msgs.UserAlreadyExistsMsg, 400)
                }
                console.error("Failed to register user", error);
                return c.text(msgs.FailedToRegisterMsg, 500)
            }
            return c.json({ success: true })
        }
        // if enable mail verify, on conflict update
        const { success } = await c.env.DB.prepare(
            `INSERT INTO users (user_email, password, user_info)`
            + ` VALUES (?, ?, ?)`
            + ` ON CONFLICT(user_email) DO UPDATE SET password = ?, user_info = ?, updated_at = datetime('now')`
        ).bind(
            email, protectedPassword, JSON.stringify(userInfo),
            protectedPassword, JSON.stringify(userInfo)
        ).run();
        if (!success) {
            return c.text(msgs.FailedToRegisterMsg, 400);
        }
        await c.env.KV.delete(`temp-mail:${email}`);
        const defaultRole = getStringValue(c.env.USER_DEFAULT_ROLE);
        if (!defaultRole) return c.json({ success: true })
        const user_roles = getUserRoles(c);
        if (!user_roles.find((r) => r.role === defaultRole)) {
            return c.text(msgs.InvalidUserDefaultRoleMsg, 500);
        }
        // find user_id
        const user_id = await c.env.DB.prepare(
            `SELECT id FROM users where user_email = ?`
        ).bind(email).first<number | undefined | null>("id");
        if (!user_id) {
            return c.text(msgs.UserNotFoundMsg, 500);
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
        return c.json({ success: true })
    },
    login: async (c: Context<HonoCustomType>) => {
        const body = await c.req.json();
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const { password, cf_token } = body;
        const msgs = i18n.getMessagesbyContext(c);
        if (!isValidUserEmail(email) || !password) return c.text(msgs.InvalidEmailOrPasswordMsg, 400);
        try {
            checkUserPassword(password);
        } catch (_) {
            return c.text(msgs.InvalidEmailOrPasswordMsg, 401);
        }
        // check cf turnstile if global turnstile is enabled
        if (utils.isGlobalTurnstileEnabled(c)) {
            try {
                await checkCfTurnstile(c, cf_token);
            } catch (error) {
                return c.text(msgs.TurnstileCheckFailedMsg, 400)
            }
        }
        const { id: user_id, password: dbPassword } = await c.env.DB.prepare(
            `SELECT id, password FROM users where user_email = ?`
        ).bind(email).first() || {};
        const passwordMatches = typeof dbPassword === "string"
            && await verifyPasswordHash(dbPassword, password, c.env.JWT_SECRET);
        if (!passwordMatches || !user_id) {
            return c.text(msgs.InvalidEmailOrPasswordMsg, 401)
        }
        if (passwordHashNeedsUpgrade(dbPassword)) {
            const protectedPassword = await protectPasswordHash(password, c.env.JWT_SECRET);
            await c.env.DB.prepare(
                `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ? AND password = ?`
            ).bind(protectedPassword, user_id, dbPassword).run();
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
    },
    changePassword: async (c: Context<HonoCustomType>) => {
        const user = c.get("userPayload");
        const msgs = i18n.getMessagesbyContext(c);
        const { current_password, new_password } = await c.req.json();
        if (typeof current_password !== "string" || typeof new_password !== "string") {
            return c.text(msgs.InvalidEmailOrPasswordMsg, 400);
        }
        try {
            checkUserPassword(current_password);
            checkUserPassword(new_password);
        } catch (error) {
            return c.text(msgs.FailedUpdatePasswordMsg, 400);
        }
        const currentStoredPassword = await c.env.DB.prepare(
            `SELECT password FROM users WHERE id = ?`
        ).bind(user.user_id).first<string | null>('password');
        if (!currentStoredPassword
            || !await verifyPasswordHash(currentStoredPassword, current_password, c.env.JWT_SECRET)
        ) {
            return c.text(msgs.CurrentPasswordIncorrectMsg, 400);
        }
        const protectedPassword = await protectPasswordHash(new_password, c.env.JWT_SECRET);
        const result = await c.env.DB.prepare(
            `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(protectedPassword, user.user_id).run();
        if (!result.success) {
            return c.text(msgs.FailedUpdatePasswordMsg, 500);
        }
        return c.json({ success: true });
    },
}
