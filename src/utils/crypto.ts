import CryptoJS from 'crypto-js';

// ============================================================
// Legacy functions - ONLY used for migrating old wallet v2 data
// ============================================================
const LEGACY_KEY = '1E24L27O12ATTDEF';
const LEGACY_IV = CryptoJS.enc.Utf8.parse('A3CE6FKE34SG3LD2');

export const metahubKey = 'YM4BqViCkPs2qt3tTdTuP3ABUimU7sBU';

/** @deprecated Use decryptV3 for new data. Kept for wallet v2 migration only. */
export const legacyDecrypt = (word: string, seed = LEGACY_KEY) => {
    const encryptedHexStr = CryptoJS.enc.Hex.parse(word);
    const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    const parseSeed = CryptoJS.enc.Utf8.parse(seed);
    const decrypted = CryptoJS.AES.decrypt(srcs, parseSeed, {
        iv: LEGACY_IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
};

/** @deprecated Use encryptV3 for new data. Kept for wallet v2 migration only. */
export const legacyEncrypt = (word: string, seed = LEGACY_KEY) => {
    const parseSeed = CryptoJS.enc.Utf8.parse(seed);
    const srcs = CryptoJS.enc.Utf8.parse(word);
    const encrypted = CryptoJS.AES.encrypt(srcs, parseSeed, {
        iv: LEGACY_IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.ciphertext.toString().toUpperCase();
};

export const legacyMd5 = (word: string) => {
    return CryptoJS.MD5(word).toString();
};

export const legacyPassword1 = (word: string) => {
    return CryptoJS.SHA1(CryptoJS.SHA1('metahub-' + word) + '#c22Dc1B6').toString();
};

export const legacyPassword2 = (word: string) => {
    return CryptoJS.SHA1(CryptoJS.SHA1('metahub-' + word) + '#B33c4A15').toString();
};

// ============================================================
// V3 Secure functions - Web Crypto API based (current wallet format)
// ============================================================

const PBKDF2_ITERATIONS = 100_000;
const V3_PREFIX = 'v3:';

// --- Helpers ---

function hexEncode(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexDecode(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

async function getKeyMaterial(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
        'deriveBits',
        'deriveKey',
    ]);
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await getKeyMaterial(password);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// --- Password Hashing (for password verification) ---

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await getKeyMaterial(password);
    const hashBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        256
    );
    return `${V3_PREFIX}${hexEncode(salt.buffer as ArrayBuffer)}:${hexEncode(hashBits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    if (stored.startsWith(V3_PREFIX)) {
        const parts = stored.slice(V3_PREFIX.length).split(':');
        const salt = hexDecode(parts[0]);
        const expectedHash = parts[1];
        const keyMaterial = await getKeyMaterial(password);
        const hashBits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            256
        );
        return hexEncode(hashBits) === expectedHash;
    }
    // Legacy fallback: wallet v2 stored `password2(raw)` as passhash (salt #B33c4A15).
    // Note: `password1` (salt #c22Dc1B6) is a DIFFERENT hash — used for private-key
    // derivation elsewhere. Don't swap these, every unlock will silently fail.
    const legacyHash = legacyPassword2(password);
    return legacyHash === stored;
}

export function isV3Hash(stored: string): boolean {
    return stored.startsWith(V3_PREFIX);
}

// --- AES-256-GCM Encrypt/Decrypt (for private keys) ---

export async function encryptV3(plaintext: string, password: string, salt: Uint8Array): Promise<string> {
    const aesKey = await deriveAesKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        aesKey,
        enc.encode(plaintext)
    );
    // AES-GCM appends 16-byte auth tag to ciphertext
    const cipherArray = new Uint8Array(cipherBuffer);
    const ciphertext = cipherArray.slice(0, cipherArray.length - 16);
    const authTag = cipherArray.slice(cipherArray.length - 16);
    return `${V3_PREFIX}${hexEncode(iv)}:${hexEncode(ciphertext)}:${hexEncode(authTag)}`;
}

export async function decryptV3(encrypted: string, password: string, salt: Uint8Array): Promise<string> {
    if (!encrypted.startsWith(V3_PREFIX)) {
        throw new Error('Not a v3 encrypted string');
    }
    const parts = encrypted.slice(V3_PREFIX.length).split(':');
    const iv = hexDecode(parts[0]);
    const ciphertext = hexDecode(parts[1]);
    const authTag = hexDecode(parts[2]);

    const aesKey = await deriveAesKey(password, salt);
    // Reconstruct the combined buffer (ciphertext + authTag) for Web Crypto
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);

    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        aesKey,
        combined.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(plainBuffer);
}

export function isV3Encrypted(value: string): boolean {
    return value.startsWith(V3_PREFIX);
}

// --- Key Encryption Salt ---

export function makeKeySalt(walletSeed: string): Uint8Array {
    const prefix = 'metahub-keyenc-';
    const enc = new TextEncoder();
    return enc.encode(prefix + walletSeed);
}

// --- Backup Encryption ---

export async function encryptBackup(
    data: string,
    backupPassword: string
): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await deriveAesKey(backupPassword, salt);
    const enc = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        aesKey,
        enc.encode(data)
    );
    const cipherArray = new Uint8Array(cipherBuffer);
    const ciphertext = cipherArray.slice(0, cipherArray.length - 16);
    const authTag = cipherArray.slice(cipherArray.length - 16);
    return JSON.stringify({
        version: 3,
        salt: hexEncode(salt),
        iv: hexEncode(iv),
        data: hexEncode(ciphertext),
        tag: hexEncode(authTag),
    });
}

export async function decryptBackup(
    content: string,
    backupPassword: string
): Promise<string> {
    // Try v3 format first
    try {
        const parsed = JSON.parse(content);
        if (parsed.version === 3) {
            const salt = hexDecode(parsed.salt);
            const iv = hexDecode(parsed.iv);
            const ciphertext = hexDecode(parsed.data);
            const authTag = hexDecode(parsed.tag);
            const aesKey = await deriveAesKey(backupPassword, salt);
            const combined = new Uint8Array(ciphertext.length + authTag.length);
            combined.set(ciphertext);
            combined.set(authTag, ciphertext.length);
            const plainBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
                aesKey,
                combined.buffer as ArrayBuffer
            );
            return new TextDecoder().decode(plainBuffer);
        }
    } catch {
        // Not JSON / not v3, fall through to legacy wallet v2 backup
    }

    // Legacy fallback: wallet v2 backup format
    const decryptKey = legacyMd5(metahubKey + legacyMd5(backupPassword));
    const result = legacyDecrypt(content, decryptKey);
    if (result) return result;

    // Even older legacy format: decrypt with metahubKey directly
    return legacyDecrypt(content, metahubKey);
}

// --- Session Password Encryption ---

let sessionEncryptionKey: CryptoKey | null = null;

async function getSessionKey(): Promise<CryptoKey> {
    if (!sessionEncryptionKey) {
        sessionEncryptionKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }
    return sessionEncryptionKey;
}

export async function encryptSessionPassword(password: string): Promise<string> {
    if (!password) return '';
    const key = await getSessionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        enc.encode(password)
    );
    return hexEncode(iv) + ':' + hexEncode(cipherBuffer);
}

export async function decryptSessionPassword(encrypted: string): Promise<string> {
    if (!encrypted) return '';
    const key = await getSessionKey();
    const [ivHex, cipherHex] = encrypted.split(':');
    const iv = hexDecode(ivHex);
    const cipherBuffer = hexDecode(cipherHex);
    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        cipherBuffer.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(plainBuffer);
}

// --- Utility functions ---

export const sha256 = (word: Buffer | string, secret: string = '') => {
    const input = typeof word === 'string' ? word : CryptoJS.lib.WordArray.create(word as any);
    if (secret === null || secret === '') {
        return CryptoJS.SHA256(input).toString();
    }
    return CryptoJS.HmacSHA256(input, secret).toString();
};

// --- Legacy compatibility aliases (for migration code) ---
// These are the old function names, redirected to legacy implementations
export const decrypt = legacyDecrypt;
export const encrypt = legacyEncrypt;
export const md5 = legacyMd5;
export const password1 = legacyPassword1;
export const password2 = legacyPassword2;
