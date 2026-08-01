import { Context } from 'hono';

import { commonParseMail, sendWebhook, validateWebhookSettings } from './common';
import { resolveRawEmail } from './gzip';
import i18n from './i18n';
import { RawMailRow, WebhookSettings } from './models';

export const getStoredWebhookSettings = async (
    c: Context<HonoCustomType>,
    key: string,
): Promise<Response> => {
    const settings = await c.env.KV.get<WebhookSettings>(key, 'json') || new WebhookSettings();
    return c.json(settings);
};

export const saveStoredWebhookSettings = async (
    c: Context<HonoCustomType>,
    key: string,
): Promise<Response> => {
    const settings = await c.req.json<WebhookSettings>();
    if (!validateWebhookSettings(settings)) {
        return c.text(i18n.getMessagesbyContext(c).InvalidInputMsg, 400);
    }
    await c.env.KV.put(key, JSON.stringify(settings));
    return c.json({ success: true });
};

export const testStoredWebhookSettings = async (
    c: Context<HonoCustomType>,
    address?: string,
): Promise<Response> => {
    const settings = await c.req.json<WebhookSettings>();
    if (!validateWebhookSettings(settings)) {
        return c.text(i18n.getMessagesbyContext(c).InvalidInputMsg, 400);
    }
    const statement = address
        ? c.env.DB.prepare(`SELECT * FROM raw_mails WHERE address = ? ORDER BY RANDOM() LIMIT 1`).bind(address)
        : c.env.DB.prepare(`SELECT * FROM raw_mails ORDER BY RANDOM() LIMIT 1`);
    const mailRow = await statement.first<RawMailRow>();
    const mailId = mailRow?.id;
    const raw = mailRow ? await resolveRawEmail(mailRow) : '';
    const parsedEmail = await commonParseMail({ rawEmail: raw });
    const recipient = address || 'admin@test.com';
    const result = await sendWebhook(settings, {
        id: String(mailId || 0),
        url: c.env.FRONTEND_URL ? `${c.env.FRONTEND_URL}?mail_id=${mailId}` : '',
        from: parsedEmail?.sender || 'test@test.com',
        to: recipient,
        subject: parsedEmail?.subject || 'test subject',
        raw: raw || 'test raw email',
        parsedText: parsedEmail?.text || 'test parsed text',
        parsedHtml: parsedEmail?.html || 'test parsed html',
        aiExtract: null,
        aiExtractType: '',
        aiExtractResult: '',
        aiExtractResultText: '',
    });
    if (!result.success) return c.text(result.message || 'send webhook error', 400);
    return c.json({ success: true });
};
