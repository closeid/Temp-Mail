import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint = ''
let pendingFingerprint: Promise<string> | null = null

/**
 * Get browser fingerprint
 * Uses cached value from global state if available to avoid unnecessary computation
 * @returns Fingerprint visitor ID, or 'ERROR' if failed
 */
export const getFingerprint = async (): Promise<string> => {
    // Return cached fingerprint if available
    if (cachedFingerprint) return cachedFingerprint;
    if (pendingFingerprint) return pendingFingerprint;

    pendingFingerprint = FingerprintJS.load()
        .then((fp) => fp.get())
        .then((result) => {
            cachedFingerprint = result.visitorId;
            return cachedFingerprint;
        })
        .catch((error) => {
            console.error('Failed to get fingerprint:', error);
            cachedFingerprint = 'ERROR';
            return cachedFingerprint;
        })
        .finally(() => { pendingFingerprint = null })
    return pendingFingerprint
};
