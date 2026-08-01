import { Context } from 'hono'

import i18n from '../i18n'
import { deleteSetting, getJsonSetting, normalizeStringArray, saveSetting } from '../utils'
import { getAddressCreationSettings, getAddressCreationSubdomainMatchStatus } from '../common'
import { CONSTANTS } from '../constants'
import {
    getSendMailLimitConfig,
    getSendMailLimitConfigToSave,
    validateSendMailLimitConfig
} from '../mails_api/send_mail_limit_utils'
import { EmailRuleSettings } from '../models'

const normalizeAddressCreationSettingsUpdate = (
    value: unknown
): {
    shouldUpdate: boolean,
    shouldClear: boolean,
    nextEnableSubdomainMatch?: boolean,
} | null => {
    if (typeof value === 'undefined') {
        return { shouldUpdate: false, shouldClear: false };
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const nextEnableSubdomainMatch = (value as Record<string, unknown>).enableSubdomainMatch;
    if (typeof nextEnableSubdomainMatch === 'undefined') {
        return { shouldUpdate: false, shouldClear: false };
    }
    // null 代表"清空后台覆盖，恢复为未设置并回退到 env"，这是给前端三态显式使用的正式路径。
    if (nextEnableSubdomainMatch === null) {
        return { shouldUpdate: true, shouldClear: true };
    }
    if (typeof nextEnableSubdomainMatch !== 'boolean') {
        return null;
    }
    return {
        shouldUpdate: true,
        shouldClear: false,
        nextEnableSubdomainMatch,
    };
};

const normalizeEmailRuleSettings = (value: unknown): EmailRuleSettings | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    if (typeof input.blockReceiveUnknowAddressEmail !== 'boolean'
        || !Array.isArray(input.emailForwardingList)
        || input.emailForwardingList.length > 100
    ) return null;
    const emailForwardingList: SubdomainForwardAddressList[] = [];
    for (const entry of input.emailForwardingList) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const candidate = entry as Record<string, unknown>;
        const domains = candidate.domains == null ? [] : normalizeStringArray(candidate.domains, 100, 253);
        const sourcePatterns = candidate.sourcePatterns == null
            ? []
            : normalizeStringArray(candidate.sourcePatterns, 100, 200);
        if (!domains || !sourcePatterns || typeof candidate.forward !== 'string'
            || !candidate.forward.trim() || candidate.forward.length > 320
            || (candidate.sourceMatchMode !== undefined && !['any', 'all'].includes(String(candidate.sourceMatchMode)))
        ) return null;
        emailForwardingList.push({
            domains,
            forward: candidate.forward.trim(),
            sourcePatterns,
            sourceMatchMode: candidate.sourceMatchMode as 'any' | 'all' | undefined,
        });
    }
    return { blockReceiveUnknowAddressEmail: input.blockReceiveUnknowAddressEmail, emailForwardingList };
};

const get = async (c: Context<HonoCustomType>) => {
    try {
        const blockList = await getJsonSetting(c, CONSTANTS.ADDRESS_BLOCK_LIST_KEY);
        const sendBlockList = await getJsonSetting(c, CONSTANTS.SEND_BLOCK_LIST_KEY);
        const verifiedAddressList = await getJsonSetting(c, CONSTANTS.VERIFIED_ADDRESS_LIST_KEY);
        const fromBlockList = c.env.KV ? await c.env.KV.get<string[]>(CONSTANTS.EMAIL_KV_BLACK_LIST, 'json') : [];
        const emailRuleSettings = await getJsonSetting<EmailRuleSettings>(c, CONSTANTS.EMAIL_RULE_SETTINGS_KEY);
        const noLimitSendAddressList = await getJsonSetting(c, CONSTANTS.NO_LIMIT_SEND_ADDRESS_LIST_KEY);
        const addressCreationSettings = await getAddressCreationSettings(c);
        const addressCreationSubdomainMatchStatus = await getAddressCreationSubdomainMatchStatus(c, addressCreationSettings);
        const sendMailLimitConfig = await getSendMailLimitConfig(c);
        return c.json({
            blockList: blockList || [],
            sendBlockList: sendBlockList || [],
            verifiedAddressList: verifiedAddressList || [],
            fromBlockList: fromBlockList || [],
            noLimitSendAddressList: noLimitSendAddressList || [],
            emailRuleSettings: emailRuleSettings || {},
            addressCreationSettings: typeof addressCreationSettings.enableSubdomainMatch === 'boolean'
                ? { enableSubdomainMatch: addressCreationSettings.enableSubdomainMatch }
                : {},
            addressCreationSubdomainMatchStatus,
            sendMailLimitConfig,
        })
    } catch (error) {
        console.error(error);
        return c.json({})
    }
};

const save = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const {
        blockList, sendBlockList, noLimitSendAddressList,
        verifiedAddressList, fromBlockList, emailRuleSettings, addressCreationSettings,
        sendMailLimitConfig
    } = await c.req.json();
    const normalizedBlockList = normalizeStringArray(blockList, 1000, 320);
    const normalizedSendBlockList = normalizeStringArray(sendBlockList, 1000, 320);
    const normalizedVerifiedAddressList = normalizeStringArray(verifiedAddressList, 1000, 320);
    const normalizedFromBlockList = normalizeStringArray(fromBlockList || [], 1000, 320);
    const normalizedNoLimitSendAddressList = normalizeStringArray(noLimitSendAddressList || [], 1000, 320);
    const normalizedEmailRuleSettings = normalizeEmailRuleSettings(emailRuleSettings || {
        blockReceiveUnknowAddressEmail: false,
        emailForwardingList: [],
    });
    if (!normalizedBlockList || !normalizedSendBlockList || !normalizedVerifiedAddressList
        || !normalizedFromBlockList || !normalizedNoLimitSendAddressList || !normalizedEmailRuleSettings
    ) {
        return c.text(msgs.InvalidInputMsg, 400)
    }
    const addressCreationSettingsUpdate = normalizeAddressCreationSettingsUpdate(addressCreationSettings);
    if (!addressCreationSettingsUpdate) {
        return c.text(msgs.InvalidInputMsg, 400)
    }
    if (!c.env.SEND_MAIL && normalizedVerifiedAddressList.length > 0) {
        return c.text(msgs.EnableSendMailMsg, 400)
    }
    // 所有输入依赖都先校验，再执行任意写入，避免接口返回 400 时出现部分设置已落库的半成功状态。
    if (normalizedFromBlockList.length > 0 && !c.env.KV) {
        return c.text(msgs.EnableKVMsg, 400)
    }
    if (sendMailLimitConfig && !validateSendMailLimitConfig(sendMailLimitConfig)) {
        return c.text(msgs.InvalidInputMsg, 400)
    }
    const sendMailLimitConfigToSave = sendMailLimitConfig
        ? getSendMailLimitConfigToSave(sendMailLimitConfig)
        : null;
    await saveSetting(c, CONSTANTS.ADDRESS_BLOCK_LIST_KEY, JSON.stringify(normalizedBlockList));
    await saveSetting(c, CONSTANTS.SEND_BLOCK_LIST_KEY, JSON.stringify(normalizedSendBlockList));
    await saveSetting(c, CONSTANTS.VERIFIED_ADDRESS_LIST_KEY, JSON.stringify(normalizedVerifiedAddressList));
    if (c.env.KV) {
        await c.env.KV.put(CONSTANTS.EMAIL_KV_BLACK_LIST, JSON.stringify(normalizedFromBlockList))
    }
    await saveSetting(c, CONSTANTS.NO_LIMIT_SEND_ADDRESS_LIST_KEY, JSON.stringify(normalizedNoLimitSendAddressList));
    await saveSetting(c, CONSTANTS.EMAIL_RULE_SETTINGS_KEY, JSON.stringify(normalizedEmailRuleSettings));
    if (addressCreationSettingsUpdate.shouldUpdate) {
        if (addressCreationSettingsUpdate.shouldClear) {
            await deleteSetting(c, CONSTANTS.ADDRESS_CREATION_SETTINGS_KEY);
        } else {
            await saveSetting(
                c, CONSTANTS.ADDRESS_CREATION_SETTINGS_KEY,
                JSON.stringify({
                    enableSubdomainMatch: addressCreationSettingsUpdate.nextEnableSubdomainMatch
                })
            )
        }
    }
    if (sendMailLimitConfigToSave) {
        await saveSetting(
            c, CONSTANTS.SEND_MAIL_LIMIT_CONFIG_KEY,
            JSON.stringify(sendMailLimitConfigToSave)
        )
    }
    return c.json({ success: true });
};

export default { get, save };
