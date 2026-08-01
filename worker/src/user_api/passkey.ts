import { Context } from 'hono';
import { Jwt } from 'hono/utils/jwt'
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} from '@simplewebauthn/server';

import { Passkey } from '../models';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import i18n from '../i18n';
import { verifyExpiringJwt } from '../utils';

const PASSKEY_CHALLENGE_TTL_SECONDS = 300;

const resolveWebAuthnContext = (c: Context<HonoCustomType>): { origin: string; rpID: string } => {
    // The expected origin is a server-side trust decision. A caller-controlled
    // Origin header must never define the WebAuthn relying party.
    const candidate = c.env.FRONTEND_URL || new URL(c.req.url).origin;
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('Invalid WebAuthn origin');
    }
    return { origin: url.origin, rpID: url.hostname };
};

const createChallenge = async (
    c: Context<HonoCustomType>,
    purpose: 'passkey-registration' | 'passkey-authentication',
    rpID: string,
    user?: UserPayload,
): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    return Jwt.sign({
        purpose,
        rpID,
        user_id: user?.user_id,
        user_email: user?.user_email,
        iat: now,
        exp: now + PASSKEY_CHALLENGE_TTL_SECONDS,
    }, c.env.JWT_SECRET, 'HS256');
};

export default {
    getPassKeys: async (c: Context<HonoCustomType>) => {
        const user = c.get("userPayload");
        const { results } = await c.env.DB.prepare(
            `SELECT passkey_name, passkey_id, created_at, updated_at FROM user_passkeys WHERE user_id = ?`
        ).bind(user.user_id).all<Record<string, string>>();
        return c.json(results);
    },
    renamePassKey: async (c: Context<HonoCustomType>) => {
        const msgs = i18n.getMessagesbyContext(c);
        const user = c.get("userPayload");
        const { passkey_id, passkey_name } = await c.req.json();
        if (typeof passkey_name !== 'string' || !passkey_name.trim() || passkey_name.length > 255) {
            return c.text(msgs.InvalidPasskeyNameMsg, 400);
        }
        const { success } = await c.env.DB.prepare(
            `UPDATE user_passkeys SET passkey_name = ? WHERE user_id = ? AND passkey_id = ?`
        ).bind(passkey_name.trim(), user.user_id, passkey_id).run();
        return c.json({ success });
    },
    deletePassKey: async (c: Context<HonoCustomType>) => {
        const user = c.get("userPayload");
        const { passkey_id } = c.req.param();
        const { success } = await c.env.DB.prepare(
            `DELETE FROM user_passkeys WHERE user_id = ? AND passkey_id = ?`
        ).bind(user.user_id, passkey_id).run();
        return c.json({ success });
    },
    registerRequest: async (c: Context<HonoCustomType>) => {
        const user = c.get("userPayload");
        await c.req.json();
        const { rpID } = resolveWebAuthnContext(c);
        const { results } = await c.env.DB.prepare(
            `SELECT passkey FROM user_passkeys WHERE user_id = ?`
        ).bind(user.user_id).all<Record<string, string>>();
        const excludeCredentials = results
            .map((record: any) => JSON.parse(record.passkey) as Passkey)
            .map((passkey: Passkey) => ({
                id: passkey.id,
                transports: passkey.transports,
            }));
        const challenge = await createChallenge(c, 'passkey-registration', rpID, user);
        // Use SimpleWebAuthn's handy function to create registration options.
        const options = await generateRegistrationOptions({
            rpName: c.env.TITLE || "Temp Mail",
            rpID,
            userID: Uint8Array.from(new TextEncoder().encode(user.user_id.toString())),
            userName: user.user_email,
            userDisplayName: user.user_email,
            attestationType: 'none',
            excludeCredentials: excludeCredentials,
            challenge: challenge,
        });

        return c.json(options);
    },
    registerResponse: async (c: Context<HonoCustomType>) => {
        const msgs = i18n.getMessagesbyContext(c);
        const user = c.get("userPayload");
        const { credential, passkey_name } = await c.req.json();
        if (typeof passkey_name !== 'string' || !passkey_name.trim() || passkey_name.length > 255) {
            return c.text(msgs.InvalidPasskeyNameMsg, 400);
        }
        const { origin, rpID } = resolveWebAuthnContext(c);
        // Verify the registration response
        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge: async (challenge: string) => {
                try {
                    const payload = await verifyExpiringJwt<{
                        purpose?: string;
                        rpID?: string;
                        user_id?: number;
                    }>(atob(challenge), c.env.JWT_SECRET);
                    return payload.purpose === 'passkey-registration'
                        && payload.rpID === rpID
                        && payload.user_id === user.user_id;
                } catch (_) {
                    return false;
                }
            },
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: false,
        });
        const { verified, registrationInfo } = verification;

        if (!verified || !registrationInfo) {
            return c.text(msgs.RegistrationFailedMsg, 400);
        }

        const { credentialDeviceType: deviceType, credentialBackedUp: backedUp } = registrationInfo;
        const { id: credentialID, publicKey, counter, transports } = registrationInfo.credential;

        // Base64URL encode ArrayBuffers.
        const base64PublicKey = isoBase64URL.fromBuffer(publicKey);

        const newPasskey: Passkey = {
            id: credentialID,
            publicKey: base64PublicKey,
            counter,
            deviceType,
            backedUp,
            transports,
        };

        // Store the credential ID in the database
        const { success } = await c.env.DB.prepare(
            `INSERT INTO user_passkeys (user_id, passkey_name, passkey_id, passkey, counter) VALUES (?, ?, ?, ?, ?)`
        ).bind(user.user_id, passkey_name.trim(), credentialID, JSON.stringify(newPasskey), counter).run();

        return c.json({ success });
    },
    authenticateRequest: async (c: Context<HonoCustomType>) => {
        await c.req.json();
        const { rpID } = resolveWebAuthnContext(c);
        const challenge = await createChallenge(c, 'passkey-authentication', rpID);
        const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
            rpID,
            challenge: challenge,
            allowCredentials: [],
        });
        return c.json(options);
    },
    authenticateResponse: async (c: Context<HonoCustomType>) => {
        const msgs = i18n.getMessagesbyContext(c);
        const { credential } = await c.req.json();
        const { origin, rpID } = resolveWebAuthnContext(c);
        const passkey_id = credential?.id;
        if (!passkey_id) {
            return c.text(msgs.InvalidInputMsg, 400);
        }
        const { user_id, counter, passkey } = await c.env.DB.prepare(
            `SELECT user_id, counter, passkey FROM user_passkeys WHERE passkey_id = ?`
        ).bind(passkey_id).first<{
            counter: number; passkey: string; user_id: number;
        }>() || {};
        if (!passkey) {
            return c.text(msgs.PasskeyNotFoundMsg, 404);
        }
        const passkeyData = JSON.parse(passkey) as Passkey;
        // Verify the registration response
        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge: async (challenge: string) => {
                try {
                    const payload = await verifyExpiringJwt<{
                        purpose?: string;
                        rpID?: string;
                    }>(atob(challenge), c.env.JWT_SECRET);
                    return payload.purpose === 'passkey-authentication' && payload.rpID === rpID;
                } catch (_) {
                    return false;
                }
            },
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: false,
            credential: {
                id: passkeyData.id,
                publicKey: isoBase64URL.toBuffer(passkeyData.publicKey),
                counter: counter || passkeyData.counter,
                transports: passkeyData.transports,
            },
        });
        const { verified, authenticationInfo } = verification;
        if (!verified) {
            return c.text(msgs.AuthenticationFailedMsg, 400);
        }

        if (authenticationInfo) {
            const { newCounter } = authenticationInfo;
            // Update the counter in the database
            await c.env.DB.prepare(
                `UPDATE user_passkeys SET counter = ? WHERE passkey_id = ?`
            ).bind(newCounter, passkey_id).run();
        }
        // update passkey updated_at
        await c.env.DB.prepare(
            `UPDATE user_passkeys SET updated_at = datetime('now') WHERE passkey_id = ?`
        ).bind(passkey_id).run();

        // return jwt
        const { user_email } = await c.env.DB.prepare(
            `SELECT user_email FROM users WHERE id = ?`
        ).bind(user_id).first<{ user_email: string }>() || {};
        if (!user_email) {
            return c.text(msgs.UserNotFoundMsg, 404);
        }
        // create jwt
        const jwt = await Jwt.sign({
            user_email: user_email,
            user_id: user_id,
            // 30 days expire in seconds
            exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            iat: Math.floor(Date.now() / 1000),
        }, c.env.JWT_SECRET, "HS256")
        return c.json({
            jwt: jwt
        })
    },
}
