import { Context } from 'hono';

const listOwnerAddresses = async (c: Context<HonoCustomType>) => {
    const { address_id } = c.get('jwtPayload');
    const owner = await c.env.DB.prepare(
        `SELECT user_id FROM users_address WHERE address_id = ?`
    ).bind(address_id).first<{ user_id: number }>();

    if (!owner) return c.json({ hasOwner: false, results: [] });

    const { results } = await c.env.DB.prepare(
        `SELECT a.id, a.name`
        + ` FROM address a`
        + ` JOIN users_address ua ON ua.address_id = a.id`
        + ` WHERE ua.user_id = ? AND a.id != ?`
        + ` ORDER BY a.id DESC`
    ).bind(owner.user_id, address_id).all<{ id: number; name: string }>();

    return c.json({ hasOwner: true, results: results || [] });
};

export default { listOwnerAddresses };
