import { Context } from "hono";
import { Jwt } from "hono/utils/jwt";
import { createMimeMessage } from "mimetext";
import { UserSettings, RoleAddressConfig } from "./models";
import { CONSTANTS } from "./constants";
import { compressText } from "./gzip";

export const getJsonObjectValue = <T = any>(
    value: string | any
): T | null => {
    if (value == undefined || value == null) {
        return null;
    }
    if (typeof value === "object") {
        return value as T;
    }
    if (typeof value !== "string") {
        return null;
    }
    try {
        return JSON.parse(value) as T;
    } catch (e) {
        console.error("GetJsonValue: Failed to parse JSON value", e);
    }
    return null;
}

export const getJsonSetting = async <T = any>(
    c: Context<HonoCustomType>, key: string
): Promise<T | null> => {
    const value = await getSetting(c, key);
    if (!value) {
        return null;
    }
    try {
        return JSON.parse(value) as T;
    } catch (e) {
        console.error(`GetJsonSetting: Failed to parse ${key}`, e);
    }
    return null;
}

export const getSetting = async (
    c: Context<HonoCustomType>, key: string
): Promise<string | null> => {
    try {
        const value = await c.env.DB.prepare(
            `SELECT value FROM settings where key = ?`
        ).bind(key).first<string>("value");
        return value;
    } catch (error) {
        console.error(`GetSetting: Failed to get ${key}`, error);
    }
    return null;
}

export const saveSetting = async (
    c: Context<HonoCustomType>,
    key: string, value: string
) => {
    await c.env.DB.prepare(
        `INSERT or REPLACE INTO settings (key, value) VALUES (?, ?)`
        + ` ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`
    ).bind(key, value, value).run();
    return true;
}

export const deleteSetting = async (
    c: Context<HonoCustomType>,
    key: string
) => {
    await c.env.DB.prepare(
        `DELETE FROM settings WHERE key = ?`
    ).bind(key).run();
    return true;
}

export const getStringValue = (value: any): string => {
    if (typeof value === "string") {
        return value;
    }
    return "";
}

export const getSplitStringListValue = (
    value: any, demiliter: string = ","
): string[] => {
    const valueToSplit = getStringValue(value);
    return valueToSplit.split(demiliter)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
}

export const normalizeStringArray = (
    value: unknown,
    maxItems: number = 1000,
    maxItemLength: number = 320,
): string[] | null => {
    if (!Array.isArray(value) || value.length > maxItems) return null;
    const normalized: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
        if (typeof item !== 'string') return null;
        const trimmed = item.trim();
        if (!trimmed) continue;
        if (trimmed.length > maxItemLength) return null;
        if (!seen.has(trimmed)) {
            seen.add(trimmed);
            normalized.push(trimmed);
        }
    }
    return normalized;
}

export const getBooleanValue = (
    value: boolean | string | any
): boolean => {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        return value === "true";
    }
    return false;
}

export const getIntValue = (
    value: number | string | any,
    defaultValue: number = 0
): number => {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        try {
            return parseInt(value);
        } catch (e) {
            console.error(`Failed to parse int value: ${value}`);
        }
    }
    return defaultValue;
}

export const getStringArray = (
    value: string | string[] | undefined | null
): string[] => {
    if (!value) {
        return [];
    }
    // check if value is an array, if not use json.parse
    let parsed: unknown = value;
    if (!Array.isArray(value)) {
        try {
            parsed = JSON.parse(value);
        } catch (e) {
            console.error("Failed to parse value", e);
            return [];
        }
    }
    return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
}

export const trimLower = (
    value: string | undefined | null
): string => {
    return getStringValue(value).trim().toLowerCase();
}

export const normalizeDomain = (
    value: string | undefined | null
): string => {
    return trimLower(value);
}

export const normalizeDomains = (domains: string[]): string[] => {
    return domains
        .map((domain) => normalizeDomain(domain))
        .filter((domain) => domain.length > 0);
}

export const getMailDomain = (
    value: string | undefined | null
): string => {
    const address = getStringValue(value).trim();
    const atIndex = address.lastIndexOf("@");
    if (atIndex < 0) {
        return "";
    }
    return normalizeDomain(address.slice(atIndex + 1));
}

const USER_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const isValidUserEmail = (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    const email = value.trim();
    if (!email || email.length > 254) return false;
    const localPart = email.split("@")[0] || "";
    return localPart.length <= 64
        && !localPart.startsWith(".")
        && !localPart.endsWith(".")
        && !localPart.includes("..")
        && USER_EMAIL_PATTERN.test(email);
}

export const normalizeAddressDomain = (
    value: string | undefined | null
): string => {
    const address = getStringValue(value).trim();
    const atIndex = address.lastIndexOf("@");
    if (atIndex < 0) {
        return address;
    }
    const localPart = address.slice(0, atIndex).trim();
    const domain = normalizeDomain(address.slice(atIndex + 1));
    if (!localPart || !domain) {
        return address;
    }
    return `${localPart}@${domain}`;
}

export const includesDomain = (
    domains: string[] | undefined | null,
    domain: string | undefined | null
): boolean => {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain || !domains || domains.length === 0) {
        return false;
    }
    return normalizeDomains(domains).includes(normalizedDomain);
}

export const isDomainOrSubdomain = (
    domain: string | undefined | null,
    allowDomain: string | undefined | null
): boolean => {
    const normalizedDomain = normalizeDomain(domain);
    const normalizedAllowDomain = normalizeDomain(allowDomain);
    if (!normalizedDomain || !normalizedAllowDomain) {
        return false;
    }
    return normalizedDomain === normalizedAllowDomain
        || normalizedDomain.endsWith(`.${normalizedAllowDomain}`);
}

export const getDomainMapValue = <T>(
    valueMap: Record<string, T> | undefined | null,
    domain: string | undefined | null
): T | null => {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain || !valueMap) {
        return null;
    }
    for (const [key, value] of Object.entries(valueMap)) {
        if (normalizeDomain(key) === normalizedDomain) {
            return value;
        }
    }
    return null;
}

export const getDefaultDomains = (c: Context<HonoCustomType>): string[] => {
    if (c.env.DEFAULT_DOMAINS == undefined || c.env.DEFAULT_DOMAINS == null) {
        return getDomains(c);
    }
    const domains = normalizeDomains(getStringArray(c.env.DEFAULT_DOMAINS));
    return domains.length > 0 ? domains : getDomains(c);
}

export const getDomains = (c: Context<HonoCustomType>): string[] => {
    if (!c.env.DOMAINS) {
        return [];
    }
    // check if DOMAINS is an array, if not use json.parse
    if (!Array.isArray(c.env.DOMAINS)) {
        try {
            return normalizeDomains(JSON.parse(c.env.DOMAINS));
        } catch (e) {
            console.error("Failed to parse DOMAINS", e);
            return [];
        }
    }
    return normalizeDomains(c.env.DOMAINS);
}

export const getRandomSubdomainDomains = (c: Context<HonoCustomType>): string[] => {
    if (!c.env.RANDOM_SUBDOMAIN_DOMAINS) {
        return [];
    }
    return normalizeDomains(getStringArray(c.env.RANDOM_SUBDOMAIN_DOMAINS));
}

export const getUserRoles = (c: Context<HonoCustomType>): UserRole[] => {
    if (!c.env.USER_ROLES) {
        return [];
    }
    const normalizeRoles = (roles: UserRole[]): UserRole[] => {
        return roles.map((role) => ({
            ...role,
            domains: Array.isArray(role.domains)
                ? normalizeDomains(role.domains)
                : typeof role.domains === "string"
                    ? normalizeDomains([role.domains])
                    : role.domains,
        }));
    };
    // check if USER_ROLES is an array, if not use json.parse
    if (!Array.isArray(c.env.USER_ROLES)) {
        try {
            return normalizeRoles(JSON.parse(c.env.USER_ROLES));
        } catch (e) {
            console.error("Failed to parse USER_ROLES", e);
            return [];
        }
    }
    return normalizeRoles(c.env.USER_ROLES);
}

export const getAnotherWorkerList = (c: Context<HonoCustomType>): AnotherWorker[] => {
    if (!c.env.ANOTHER_WORKER_LIST) {
        return [];
    }
    // check if ANOTHER_WORKER_LIST is an array, if not use json.parse
    if (!Array.isArray(c.env.ANOTHER_WORKER_LIST)) {
        try {
            return JSON.parse(c.env.ANOTHER_WORKER_LIST);
        } catch (e) {
            console.error("Failed to parse ANOTHER_WORKER_LIST", e);
            return [];
        }
    }
    return c.env.ANOTHER_WORKER_LIST;
}

export const getPasswords = (c: Context<HonoCustomType>): string[] => {
    if (!c.env.PASSWORDS) {
        return [];
    }
    // check if PASSWORDS is an array, if not use json.parse
    if (!Array.isArray(c.env.PASSWORDS)) {
        try {
            const res = JSON.parse(c.env.PASSWORDS) as unknown;
            return Array.isArray(res)
                ? res.filter((item): item is string => typeof item === "string" && item.length > 0)
                : [];
        } catch (e) {
            console.error("Failed to parse PASSWORDS", e);
            return [];
        }
    }
    return c.env.PASSWORDS.filter((item) => typeof item === "string" && item.length > 0);
}

export const getAdminPasswords = (c: Context<HonoCustomType>): string[] => {
    if (!c.env.ADMIN_PASSWORDS) {
        return [];
    }
    // check if ADMIN_PASSWORDS is an array, if not use json.parse
    if (!Array.isArray(c.env.ADMIN_PASSWORDS)) {
        try {
            const res = JSON.parse(c.env.ADMIN_PASSWORDS) as unknown;
            return Array.isArray(res)
                ? res.filter((item): item is string => typeof item === "string" && item.length > 0)
                : [];
        } catch (e) {
            console.error("Failed to parse ADMIN_PASSWORDS", e);
            return [];
        }
    }
    return c.env.ADMIN_PASSWORDS.filter((item) => typeof item === "string" && item.length > 0);
}

export const checkIsAdmin = (c: Context<HonoCustomType>): boolean => {
    const adminAuth = c.req.raw.headers.get("x-admin-auth");
    if (!adminAuth) return false;
    return getAdminPasswords(c).reduce(
        (matched, password) => constantTimeEqual(password, adminAuth) || matched,
        false
    );
}

export const getEnvStringList = (value: string | string[] | undefined): string[] => {
    if (!value) {
        return [];
    }
    // check if is an array, if not use json.parse
    if (!Array.isArray(value)) {
        try {
            const res = JSON.parse(value) as unknown;
            return Array.isArray(res)
                ? res.filter((item): item is string => typeof item === "string" && item.length > 0)
                : [];
        } catch (e) {
            console.error("Failed to parse string list", e);
            return [];
        }
    }
    return value.filter((item) => typeof item === "string" && item.length > 0);
}

export const sendAdminInternalMail = async (
    c: Context<HonoCustomType>, toMail: string, subject: string, text: string
): Promise<boolean> => {
    try {

        const msg = createMimeMessage();
        msg.setSender({
            name: "Admin",
            addr: "admin@internal"
        });
        msg.setRecipient(toMail);
        msg.setSubject(subject);
        msg.addMessage({
            contentType: 'text/plain',
            data: text
        });
        const message_id = secureRandomString(13, 'abcdefghijklmnopqrstuvwxyz0123456789');
        const rawText = msg.asRaw();
        let success = false;
        if (getBooleanValue(c.env.ENABLE_MAIL_GZIP)) {
            let compressed: ArrayBuffer | null = null;
            try {
                compressed = await compressText(rawText);
            } catch (gzipError) {
                console.error("gzip compression failed, falling back to plaintext", gzipError);
            }
            if (compressed) {
                try {
                    ({ success } = await c.env.DB.prepare(
                        `INSERT INTO raw_mails (source, address, raw_blob, message_id) VALUES (?, ?, ?, ?)`
                    ).bind("admin@internal", toMail, compressed, message_id).run());
                } catch (dbError) {
                    const errMsg = String(dbError);
                    if (errMsg.includes('raw_blob') || errMsg.includes('no such column')) {
                        console.error("raw_blob column missing, falling back to plaintext", dbError);
                        ({ success } = await c.env.DB.prepare(
                            `INSERT INTO raw_mails (source, address, raw, message_id) VALUES (?, ?, ?, ?)`
                        ).bind("admin@internal", toMail, rawText, message_id).run());
                    } else {
                        throw dbError;
                    }
                }
            } else {
                ({ success } = await c.env.DB.prepare(
                    `INSERT INTO raw_mails (source, address, raw, message_id) VALUES (?, ?, ?, ?)`
                ).bind("admin@internal", toMail, rawText, message_id).run());
            }
        } else {
            ({ success } = await c.env.DB.prepare(
                `INSERT INTO raw_mails (source, address, raw, message_id) VALUES (?, ?, ?, ?)`
            ).bind("admin@internal", toMail, rawText, message_id).run());
        }
        if (!success) {
            console.log(`Failed save message from admin@internal to ${toMail}`);
        }
        return success;
    } catch (error) {
        console.log("sendAdminInternalMail error", error);
        return false;
    }
};

export const isGlobalTurnstileEnabled = (c: Context<HonoCustomType>): boolean => {
    return getBooleanValue(c.env.ENABLE_GLOBAL_TURNSTILE_CHECK)
        && !!c.env.CF_TURNSTILE_SITE_KEY
        && !!c.env.CF_TURNSTILE_SECRET_KEY;
}

export const checkCfTurnstile = async (
    c: Context<HonoCustomType>, token: string | undefined | null
): Promise<void> => {
    if (!c.env.CF_TURNSTILE_SITE_KEY || !c.env.CF_TURNSTILE_SECRET_KEY) {
        return;
    }
    if (!token) {
        throw new Error("Captcha token is required");
    }
    const reqIp = c.req.raw.headers.get("cf-connecting-ip");
    const formData = new FormData();
    formData.append('secret', c.env.CF_TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (reqIp) formData.append('remoteip', reqIp);
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const result = await fetch(url, {
        body: formData,
        method: 'POST',
    });
    const captchaRes: any = await result.json();
    if (!captchaRes.success) {
        console.log("Captcha failed", captchaRes);
        throw new Error("Captcha failed");
    }
}

export const checkUserPassword = (password: string) => {
    if (!/^[a-f0-9]{64}$/i.test(password)) {
        throw new Error("Invalid password")
    }
    return true;
}

export const hashPassword = async (password: string): Promise<string> => {
    // use crypto to hash password
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const getMaxAddressCount = async (
    c: Context<HonoCustomType>,
    userRole: string | null | undefined,
    settings: UserSettings
): Promise<number> => {
    if (!userRole) return settings.maxAddressCount;
    const roleConfigs = await getJsonSetting<RoleAddressConfig>(c, CONSTANTS.ROLE_ADDRESS_CONFIG_KEY);
    if (!roleConfigs) return settings.maxAddressCount;
    const roleMaxCount = roleConfigs[userRole]?.maxAddressCount;
    if (typeof roleMaxCount !== 'number') return settings.maxAddressCount;
    if (roleMaxCount < 0) return settings.maxAddressCount;
    return roleMaxCount;
};

const encoder = new TextEncoder();
const PASSWORD_STORAGE_PREFIX = "hmac-sha256$";
const RANDOM_INTEGER_RANGE = 0x1_0000_0000;

const bytesToHex = (value: ArrayBuffer): string => Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const constantTimeEqual = (left: string, right: string): boolean => {
    const leftBytes = encoder.encode(left);
    const rightBytes = encoder.encode(right);
    const length = Math.max(leftBytes.length, rightBytes.length);
    let difference = leftBytes.length ^ rightBytes.length;
    for (let index = 0; index < length; index++) {
        difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
    }
    return difference === 0;
};

const hmacPasswordHash = async (passwordHash: string, secret: string): Promise<string> => {
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const digest = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(`get-an-email/password/v1:${passwordHash}`)
    );
    return bytesToHex(digest);
};

export const protectPasswordHash = async (
    passwordHash: string,
    secret: string
): Promise<string> => {
    checkUserPassword(passwordHash);
    return `${PASSWORD_STORAGE_PREFIX}${await hmacPasswordHash(passwordHash, secret)}`;
};

export const verifyPasswordHash = async (
    storedPassword: string | null | undefined,
    passwordHash: string,
    secret: string
): Promise<boolean> => {
    if (!storedPassword || !/^[a-f0-9]{64}$/i.test(passwordHash)) return false;
    const candidate = storedPassword.startsWith(PASSWORD_STORAGE_PREFIX)
        ? `${PASSWORD_STORAGE_PREFIX}${await hmacPasswordHash(passwordHash, secret)}`
        : passwordHash;
    return constantTimeEqual(storedPassword, candidate);
};

export const passwordHashNeedsUpgrade = (storedPassword: string): boolean => {
    return !storedPassword.startsWith(PASSWORD_STORAGE_PREFIX);
};

export const secureRandomInt = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > RANDOM_INTEGER_RANGE) {
        throw new RangeError("maxExclusive must be an integer between 1 and 2^32");
    }
    const unbiasedLimit = Math.floor(RANDOM_INTEGER_RANGE / maxExclusive) * maxExclusive;
    const buffer = new Uint32Array(1);
    do {
        crypto.getRandomValues(buffer);
    } while (buffer[0] >= unbiasedLimit);
    return buffer[0] % maxExclusive;
};

export const secureRandomString = (length: number, charset: string): string => {
    if (!Number.isInteger(length) || length < 0 || !charset || charset.length > RANDOM_INTEGER_RANGE) {
        throw new RangeError("Invalid random string parameters");
    }
    let value = "";
    while (value.length < length) value += charset[secureRandomInt(charset.length)];
    return value;
};

export const verifyJwt = async <T extends Record<string, unknown>>(
    token: string,
    secret: string,
): Promise<T> => await Jwt.verify(token, secret, "HS256") as T;

export const verifyExpiringJwt = async <T extends Record<string, unknown>>(
    token: string,
    secret: string,
): Promise<T> => {
    const payload = await verifyJwt<T>(token, secret);
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
    }
    return payload;
};

/**
 * 检查用户是否已达到地址数量限制
 * @param c - Hono Context
 * @param user_id - 用户 ID
 * @param userRole - 用户角色
 * @returns true 表示已超限，false 表示未超限
 */
export const isAddressCountLimitReached = async (
    c: Context<HonoCustomType>,
    user_id: number | string,
    userRole: string | null | undefined
): Promise<boolean> => {
    const value = await getJsonSetting(c, CONSTANTS.USER_SETTINGS_KEY);
    const settings = new UserSettings(value);
    const maxAddressCount = await getMaxAddressCount(c, userRole, settings);

    if (maxAddressCount <= 0) return false;

    const { count } = await c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM users_address where user_id = ?`
    ).bind(user_id).first<{ count: number }>() || { count: 0 };

    return count >= maxAddressCount;
};

export default {
    getJsonObjectValue,
    getSetting,
    saveSetting,
    getStringValue,
    getSplitStringListValue,
    getBooleanValue,
    getIntValue,
    getStringArray,
    trimLower,
    normalizeDomain,
    normalizeDomains,
    getMailDomain,
    isValidUserEmail,
    normalizeAddressDomain,
    includesDomain,
    getDomainMapValue,
    getDefaultDomains,
    getDomains,
    getRandomSubdomainDomains,
    getUserRoles,
    getAnotherWorkerList,
    getPasswords,
    getAdminPasswords,
    checkIsAdmin,
    getEnvStringList,
    sendAdminInternalMail,
    isGlobalTurnstileEnabled,
    checkCfTurnstile,
    checkUserPassword,
    getJsonSetting,
    getJsonValue: getJsonObjectValue,
    getStringList: getStringArray
}
