import { Hono } from 'hono'
import { ServerResponse } from 'node:http'
import { Writable } from 'node:stream'

import { newTelegramBot, initTelegramBotCommands, sendMailToTelegram } from './telegram'
import settings from './settings'
import miniapp from './miniapp'
import i18n from '../i18n'

export const api = new Hono<HonoCustomType>();
export { sendMailToTelegram }

api.use("/api/telegram/*", async (c, next) => {
    const msgs = i18n.getMessagesbyContext(c);
    if (!c.env.TELEGRAM_BOT_TOKEN) {
        return c.text(msgs.TgBotTokenRequiredMsg, 400);
    }
    if (!c.env.KV) {
        return c.text(msgs.KVNotAvailableMsg, 400);
    }
    return await next();
});

api.use("/api/admin/telegram/*", async (c, next) => {
    const msgs = i18n.getMessagesbyContext(c);
    if (!c.env.TELEGRAM_BOT_TOKEN) {
        return c.text(msgs.TgBotTokenRequiredMsg, 400);
    }
    if (!c.env.KV) {
        return c.text(msgs.KVNotAvailableMsg, 400);
    }
    return await next();
});

api.post("/api/telegram/webhook", async (c) => {
    const token = c.env.TELEGRAM_BOT_TOKEN;
    const bot = newTelegramBot(c, token);
    let body = null;
    const res = new Writable();
    Object.assign(res, {
        headersSent: false,
        setHeader: (name: string, value: string) => c.header(name, value),
        end: (data: any) => body = data,
    });
    const reqJson = await c.req.json();
    await bot.handleUpdate(reqJson, res as ServerResponse);
    return c.body(body);
});

api.post("/api/admin/telegram/init", async (c) => {
    const domain = new URL(c.req.url).host;
    const token = c.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = `https://${domain}/api/telegram/webhook`;
    const bot = newTelegramBot(c, token);
    await bot.telegram.setWebhook(webhookUrl)
    await initTelegramBotCommands(c, bot);
    return c.json({
        message: "webhook set successfully",
    });
});

api.get("/api/admin/telegram/status", async (c) => {
    const token = c.env.TELEGRAM_BOT_TOKEN;
    const bot = newTelegramBot(c, token);
    const info = await bot.telegram.getWebhookInfo()
    const commands = await bot.telegram.getMyCommands()
    return c.json({ info, commands });
});

api.get("/api/admin/telegram/settings", settings.getTelegramSettings);
api.post("/api/admin/telegram/settings", settings.saveTelegramSettings);
api.post("/api/telegram/get_bind_address", miniapp.getTelegramBindAddress);
api.post("/api/telegram/new_address", miniapp.newTelegramAddress);
api.post("/api/telegram/bind_address", miniapp.bindAddress);
api.post("/api/telegram/unbind_address", miniapp.unbindAddress);
api.post("/api/telegram/get_mail", miniapp.getMail);
