import { create } from 'zustand';
import { localCache } from '@/utils/cache';
import {
    hashPassword,
    verifyPassword,
    isV3Hash,
    isV3Encrypted,
    encryptV3,
    makeKeySalt,
    legacyDecrypt,
    legacyMd5,
    legacyPassword1,
} from '@/utils/crypto';
import { privateToPublic } from '@/lib/keyring';
import type { Wallet, Key } from '@/types/wallet';

interface UserState {
    password: string;
    passhash: string;
}

interface UserActions {
    // Getters
    isLock: () => boolean;
    isInited: () => boolean;
    // Actions
    init: () => Promise<void>;
    setLocked: () => Promise<void>;
    setPassword: (password: string) => Promise<void>;
    setPasshash: (hash: string) => Promise<void>;
    verifyAndUnlock: (rawPassword: string) => Promise<boolean>;
}

export const useUserStore = create<UserState & UserActions>((set, get) => ({
    password: '',
    passhash: '',

    isLock: (): boolean => {
        return get().password === '';
    },

    isInited: (): boolean => {
        return get().passhash !== '';
    },

    init: async () => {
        const result: any = (await chrome.storage.session.get(['password'])) ?? {};
        const password = (result.password as string) || '';
        const passhash = (await localCache.get('passhash', '')) as string;
        set({ password, passhash });
    },

    setLocked: async () => {
        await get().setPassword('');
    },

    setPassword: async (password: string) => {
        set({ password });
        await chrome.storage.session.set({ password });
        // Reset auto-lock timer on password change (unlock/lock)
        resetAutoLockAlarm();
    },

    setPasshash: async (hash: string) => {
        set({ passhash: hash });
        await localCache.set('passhash', hash);
    },

    verifyAndUnlock: async (rawPassword: string): Promise<boolean> => {
        const { passhash } = get();
        const valid = await verifyPassword(rawPassword, passhash);
        if (!valid) return false;

        // Upgrade passhash to v3 if still in legacy (wallet v2) format.
        // Safe regardless of key migration — same password, stronger KDF only.
        if (!isV3Hash(passhash)) {
            const newHash = await hashPassword(rawPassword);
            await get().setPasshash(newHash);
        }

        // Store raw password in encrypted session
        await get().setPassword(rawPassword);

        // Idempotent per-key scan with integrity checks. Throws on any
        // suspicious decrypt — refuses to overwrite with potentially-junk
        // ciphertext. Caller must handle (re-lock + surface error).
        try {
            await migrateWalletKeys(rawPassword);
        } catch (e) {
            await get().setLocked();
            throw e;
        }

        return true;
    },
}));

async function migrateWalletKeys(rawPassword: string): Promise<void> {
    const wallets = (await localCache.get('wallets', [])) as Wallet[];
    const migratedWallets: Wallet[] = [];
    let changed = false;

    for (const wallet of wallets) {
        const salt = makeKeySalt(wallet.seed);
        const legacyKey = legacyMd5(wallet.seed + legacyPassword1(rawPassword));
        const newKeys: Key[] = [];

        for (const key of wallet.keys) {
            if (isV3Encrypted(key.privateKey)) {
                newKeys.push(key);
                continue;
            }

            // AES-CBC has no auth tag, so wrong key → random bytes, not an error.
            // Multiple checks below detect junk before we overwrite the ciphertext.
            let plainKey: string;
            try {
                plainKey = legacyDecrypt(key.privateKey, legacyKey);
            } catch (e: any) {
                throw new Error(
                    `Wallet migration aborted: failed to decrypt key ${key.publicKey} in wallet "${wallet.name}" (${e?.message || e}). Storage left untouched.`
                );
            }
            if (!plainKey) {
                throw new Error(
                    `Wallet migration aborted: empty plaintext for key ${key.publicKey} in wallet "${wallet.name}". Storage left untouched.`
                );
            }

            // Integrity check: the decrypted WIF must derive back to the stored public key.
            // If this fails the decrypt result is garbage — refuse to re-encrypt and overwrite.
            const derivedPub = privateToPublic(plainKey);
            if (!derivedPub || derivedPub !== key.publicKey) {
                throw new Error(
                    `Wallet migration aborted: decrypted key does not derive to stored public key ${key.publicKey} in wallet "${wallet.name}". Refusing to overwrite private key.`
                );
            }

            const encrypted = await encryptV3(plainKey, rawPassword, salt);
            newKeys.push({ ...key, privateKey: encrypted });
            changed = true;
        }

        migratedWallets.push({ ...wallet, keys: newKeys });
    }

    if (changed) {
        await localCache.set('wallets', migratedWallets);
    }
}

async function resetAutoLockAlarm() {
    try {
        const autoLockTime = (await localCache.get('autoLockTime', 15)) as number;
        if (autoLockTime > 0) {
            chrome.alarms.create('autoLock', { delayInMinutes: autoLockTime });
        } else {
            chrome.alarms.clear('autoLock');
        }
    } catch {
        // alarms API may not be available in popup context, only background
    }
}
