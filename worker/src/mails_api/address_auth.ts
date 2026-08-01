import { Context } from 'hono';
import { Jwt } from 'hono/utils/jwt';

import i18n from '../i18n';
import utils, {
    checkCfTurnstile,
    checkUserPassword,
    getBooleanValue,
    passwordHashNeedsUpgrade,
    protectPasswordHash,
    verifyPasswordHash,
} from '../utils';

export default {
    changePassword: async (c: Context<HonoCustomType>) => {
        const { new_password } = await c.req.json();
        const msgs = i18n.getMessagesbyContext(c);
        const { address, address_id } = c.get('jwtPayload');

        if (!getBooleanValue(c.env.ENABLE_ADDRESS_PASSWORD)) {
            return c.text(msgs.PasswordChangeDisabledMsg, 403);
        }
        try {
            checkUserPassword(new_password);
        } catch (_) {
            return c.text(msgs.NewPasswordRequiredMsg, 400);
        }
        if (!address || !address_id) {
            return c.text(msgs.InvalidAddressTokenMsg, 400);
        }

        const protectedPassword = await protectPasswordHash(new_password, c.env.JWT_SECRET);
        const { success } = await c.env.DB.prepare(
            `UPDATE address SET password = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(protectedPassword, address_id).run();
        if (!success) {
            return c.text(msgs.FailedUpdatePasswordMsg, 500);
        }
        return c.json({ success: true });
    },

    login: async (c: Context<HonoCustomType>) => {
        const { email, password, cf_token } = await c.req.json();
        const msgs = i18n.getMessagesbyContext(c);

        if (!getBooleanValue(c.env.ENABLE_ADDRESS_PASSWORD)) {
            return c.text(msgs.PasswordLoginDisabledMsg, 403);
        }
        if (typeof email !== 'string' || typeof password !== 'string') {
            return c.text(msgs.EmailPasswordRequiredMsg, 400);
        }
        try {
            checkUserPassword(password);
        } catch (_) {
            return c.text(msgs.InvalidEmailOrPasswordMsg, 401);
        }
        if (utils.isGlobalTurnstileEnabled(c)) {
            try {
                await checkCfTurnstile(c, cf_token);
            } catch (_) {
                return c.text(msgs.TurnstileCheckFailedMsg, 400);
            }
        }

        const address = await c.env.DB.prepare(
            `SELECT id, name, password FROM address WHERE name = ?`
        ).bind(email.trim()).first<{ id: number; name: string; password: string | null }>();
        if (!address?.password
            || !await verifyPasswordHash(address.password, password, c.env.JWT_SECRET)
        ) {
            return c.text(msgs.InvalidEmailOrPasswordMsg, 401);
        }
        if (passwordHashNeedsUpgrade(address.password)) {
            const protectedPassword = await protectPasswordHash(password, c.env.JWT_SECRET);
            await c.env.DB.prepare(
                `UPDATE address SET password = ?, updated_at = datetime('now') WHERE id = ? AND password = ?`
            ).bind(protectedPassword, address.id, address.password).run();
        }

        const jwt = await Jwt.sign({
            address: address.name,
            address_id: address.id,
        }, c.env.JWT_SECRET, 'HS256');
        return c.json({ jwt, address: address.name });
    },
};
