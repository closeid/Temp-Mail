import { Context } from 'hono'
import { Jwt } from 'hono/utils/jwt'

import i18n from '../i18n'
import {
    checkUserPassword,
    getBooleanValue,
    isAddressCountLimitReached,
    protectPasswordHash,
} from '../utils'
import { newAddress, handleListQuery, commonGetUserRole } from '../common'

type AddressOwner = {
    id: number;
    user_email: string;
};

const resolveAddressOwner = async (
    c: Context<HonoCustomType>,
    ownerUserId: unknown,
    ownerUserEmail: unknown,
): Promise<AddressOwner | null> => {
    const msgs = i18n.getMessagesbyContext(c);
    const email = typeof ownerUserEmail === 'string' ? ownerUserEmail.trim() : '';
    const hasId = ownerUserId !== undefined && ownerUserId !== null && ownerUserId !== '';
    if (!hasId && !email) return null;

    let owner: AddressOwner | null = null;
    if (hasId) {
        const id = Number(ownerUserId);
        if (!Number.isInteger(id) || id <= 0) throw new Error(msgs.InvalidUserIdMsg);
        owner = await c.env.DB.prepare(
            `SELECT id, user_email FROM users WHERE id = ?`
        ).bind(id).first<AddressOwner>();
    } else {
        owner = await c.env.DB.prepare(
            `SELECT id, user_email FROM users WHERE user_email = ? COLLATE NOCASE`
        ).bind(email).first<AddressOwner>();
    }
    if (!owner) throw new Error(msgs.UserNotFoundMsg);

    const userRole = await commonGetUserRole(c, owner.id);
    if (await isAddressCountLimitReached(c, owner.id, userRole?.role)) {
        throw new Error(msgs.MaxAddressCountReachedMsg);
    }
    return owner;
};

const listAddresses = async (c: Context<HonoCustomType>) => {
    const { limit, offset, query, sort_by, sort_order } = c.req.query();
    const allowedSortColumns: Record<string, string> = {
        'id': 'a.id',
        'name': 'a.name',
        'created_at': 'a.created_at',
        'updated_at': 'a.updated_at',
        'source_meta': 'a.source_meta',
        'mail_count': 'mail_count',
        'send_count': 'send_count',
    };
    const sortColumn = Object.hasOwn(allowedSortColumns, sort_by) ? allowedSortColumns[sort_by] : 'a.id';
    const sortDirection = sort_order === 'ascend' ? 'asc' : 'desc';
    const orderBy = `${sortColumn} ${sortDirection}`;
    if (query) {
        // D1 caps LIKE pattern length at 50 bytes; fall back to instr() for
        // longer queries to avoid "LIKE or GLOB pattern too complex" (#956).
        const useInstr = new TextEncoder().encode(query).length + 2 > 50;
        const whereClause = useInstr ? `instr(a.name, ?) > 0` : `a.name like ?`;
        const countWhereClause = useInstr ? `instr(name, ?) > 0` : `name like ?`;
        const param = useInstr ? query : `%${query}%`;
        return await handleListQuery(c,
            `SELECT a.*,`
            + ` (SELECT COUNT(*) FROM raw_mails WHERE address = a.name) AS mail_count,`
            + ` (SELECT COUNT(*) FROM sendbox WHERE address = a.name) AS send_count,`
            + ` u.user_email AS owner_email, ua.user_id AS owner_user_id`
            + ` FROM address a`
            + ` LEFT JOIN users_address ua ON ua.address_id = a.id`
            + ` LEFT JOIN users u ON u.id = ua.user_id`
            + ` where ${whereClause}`,
            `SELECT count(*) as count FROM address where ${countWhereClause}`,
            [param], limit, offset, orderBy, ['password']
        );
    }
    return await handleListQuery(c,
        `SELECT a.*,`
        + ` (SELECT COUNT(*) FROM raw_mails WHERE address = a.name) AS mail_count,`
        + ` (SELECT COUNT(*) FROM sendbox WHERE address = a.name) AS send_count,`
        + ` u.user_email AS owner_email, ua.user_id AS owner_user_id`
        + ` FROM address a`
        + ` LEFT JOIN users_address ua ON ua.address_id = a.id`
        + ` LEFT JOIN users u ON u.id = ua.user_id`,
        `SELECT count(*) as count FROM address`,
        [], limit, offset, orderBy, ['password']
    );
};

const createNewAddress = async (c: Context<HonoCustomType>) => {
    const {
        name, domain, enablePrefix, enableRandomSubdomain,
        ownerUserId, ownerUserEmail,
    } = await c.req.json();
    const msgs = i18n.getMessagesbyContext(c);
    if (!name) {
        return c.text(msgs.RequiredFieldMsg, 400)
    }
    try {
        const owner = await resolveAddressOwner(c, ownerUserId, ownerUserEmail);
        const res = await newAddress(c, {
            name, domain, enablePrefix,
            enableRandomSubdomain: getBooleanValue(enableRandomSubdomain),
            checkLengthByConfig: false,
            addressPrefix: null,
            checkAllowDomains: false,
            enableCheckNameRegex: false,
            sourceMeta: 'admin'
        });
        if (!owner) return c.json({ ...res, owner_user_id: null, owner_user_email: null });

        try {
            const { success } = await c.env.DB.prepare(
                `INSERT INTO users_address (user_id, address_id) VALUES (?, ?)`
            ).bind(owner.id, res.address_id).run();
            if (!success) throw new Error(msgs.OperationFailedMsg);
        } catch (error) {
            // Do not leave an unexpected anonymous address when ownership binding fails.
            await c.env.DB.prepare(`DELETE FROM users_address WHERE address_id = ?`).bind(res.address_id).run();
            await c.env.DB.prepare(`DELETE FROM address WHERE id = ?`).bind(res.address_id).run();
            throw error;
        }
        return c.json({ ...res, owner_user_id: owner.id, owner_user_email: owner.user_email });
    } catch (e) {
        return c.text(`${msgs.FailedCreateAddressMsg}: ${(e as Error).message}`, 400)
    }
};

const deleteAddress = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    // single batch runs as one transaction: rows keyed by address name are
    // deleted first and the address row last, so the name subqueries still
    // resolve and a failed statement rolls back the whole deletion
    const results = await c.env.DB.batch([
        c.env.DB.prepare(
            `DELETE FROM raw_mails WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM address_sender WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM sendbox WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM auto_reply_mails WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM users_address WHERE address_id = ?`
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM address WHERE id = ? `
        ).bind(id),
    ]);
    const success = results.every((result) => result.success);
    if (!success) {
        return c.text(msgs.OperationFailedMsg, 500)
    }
    return c.json({ success })
};

const clearInbox = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const { success: mailSuccess } = await c.env.DB.prepare(
        `DELETE FROM raw_mails WHERE address IN`
        + ` (select name from address where id = ?) `
    ).bind(id).run();
    if (!mailSuccess) {
        return c.text(msgs.OperationFailedMsg, 500)
    }
    return c.json({ success: mailSuccess });
};

const clearSentItems = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const { success: sendboxSuccess } = await c.env.DB.prepare(
        `DELETE FROM sendbox WHERE address IN`
        + ` (select name from address where id = ?) `
    ).bind(id).run();
    if (!sendboxSuccess) {
        return c.text(msgs.OperationFailedMsg, 500)
    }
    return c.json({ success: sendboxSuccess });
};

const showPassword = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const addressId = Number(id);
    if (!Number.isInteger(addressId) || addressId <= 0) return c.text(msgs.InvalidInputMsg, 400);
    const name = await c.env.DB.prepare(
        `SELECT name FROM address WHERE id = ? `
    ).bind(addressId).first<string | null>("name");
    if (!name) return c.text(msgs.AddressNotFoundMsg, 404);
    const jwt = await Jwt.sign({
        address: name,
        address_id: addressId
    }, c.env.JWT_SECRET, "HS256")
    return c.json({ jwt });
};

const resetPassword = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const { password } = await c.req.json();
    // NOTE: Keep the admin API field as password, but the value is a frontend SHA-256 hash.
    if (!getBooleanValue(c.env.ENABLE_ADDRESS_PASSWORD)) {
        return c.text(msgs.PasswordChangeDisabledMsg, 403);
    }
    try {
        checkUserPassword(password);
    } catch (_) {
        return c.text(msgs.NewPasswordRequiredMsg, 400);
    }
    const protectedPassword = await protectPasswordHash(password, c.env.JWT_SECRET);
    const { success } = await c.env.DB.prepare(
        `UPDATE address SET password = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(protectedPassword, id).run();
    if (!success) {
        return c.text(msgs.FailedUpdatePasswordMsg, 500);
    }
    return c.json({ success: true });
};

export default {
    listAddresses, createNewAddress, deleteAddress, clearInbox, clearSentItems,
    showPassword, resetPassword
};
