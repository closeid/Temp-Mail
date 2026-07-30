import { Context } from 'hono';

import i18n from '../i18n';
import { hashPassword } from '../utils';

const TOKEN_PREFIX = 'gae_admin_';
const MAX_TOKEN_COUNT = 100;
const MAX_TOKEN_NAME_LENGTH = 80;

const createOpaqueToken = (): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const base64 = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    return `${TOKEN_PREFIX}${base64}`;
};

const normalizeExpiration = (value: unknown): string | null | undefined => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') return undefined;
    const expiresAt = new Date(value);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return undefined;
    return expiresAt.toISOString();
};

export const listAccessTokens = async (c: Context<HonoCustomType>) => {
    const result = await c.env.DB.prepare(
        `SELECT id, name, expires_at, created_at, last_used_at
         FROM admin_access_tokens ORDER BY id DESC`
    ).all();
    return c.json({ results: result.results || [] });
};

export const createAccessToken = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const body = await c.req.json<{ name?: unknown, expiresAt?: unknown }>();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const expiresAt = normalizeExpiration(body.expiresAt);
    if (!name || name.length > MAX_TOKEN_NAME_LENGTH || expiresAt === undefined) {
        return c.text(msgs.InvalidInputMsg, 400);
    }
    const count = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM admin_access_tokens`).first<number>('count') || 0;
    if (count >= MAX_TOKEN_COUNT) return c.text(msgs.OperationFailedMsg, 409);

    const token = createOpaqueToken();
    const tokenHash = await hashPassword(token);
    const result = await c.env.DB.prepare(
        `INSERT INTO admin_access_tokens (name, token_hash, expires_at) VALUES (?, ?, ?)`
    ).bind(name, tokenHash, expiresAt).run();
    return c.json({
        id: result.meta.last_row_id,
        name,
        token,
        expires_at: expiresAt,
    }, 201);
};

export const deleteAccessToken = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) return c.text(msgs.InvalidInputMsg, 400);
    const result = await c.env.DB.prepare(`DELETE FROM admin_access_tokens WHERE id = ?`).bind(id).run();
    if (!result.meta.changes) return c.text(msgs.OperationFailedMsg, 404);
    return c.json({ success: true });
};
