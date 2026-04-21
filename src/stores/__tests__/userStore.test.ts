import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrivateKey } from '@wharfkit/antelope';
import { useUserStore } from '@/stores/userStore';
import {
    legacyEncrypt,
    legacyMd5,
    legacyPassword1,
    legacyPassword2,
    hashPassword,
    encryptV3,
    makeKeySalt,
} from '@/utils/crypto';
import type { Wallet } from '@/types/wallet';

beforeEach(() => {
    useUserStore.setState({
        password: '',
        passhash: '',
    });
    vi.clearAllMocks();
});

describe('userStore', () => {
    it('isLock returns true when password is empty', () => {
        useUserStore.setState({ password: '' });
        expect(useUserStore.getState().isLock()).toBe(true);
    });

    it('isLock returns false when password is set', () => {
        useUserStore.setState({ password: 'mypassword123' });
        expect(useUserStore.getState().isLock()).toBe(false);
    });

    it('isInited returns false when passhash is empty', () => {
        useUserStore.setState({ passhash: '' });
        expect(useUserStore.getState().isInited()).toBe(false);
    });

    it('isInited returns true when passhash exists', () => {
        useUserStore.setState({ passhash: 'abc123hashvalue' });
        expect(useUserStore.getState().isInited()).toBe(true);
    });

    it('setPassword updates password state', async () => {
        await useUserStore.getState().setPassword('newpassword');
        expect(useUserStore.getState().password).toBe('newpassword');
    });

    it('setLocked clears password', async () => {
        useUserStore.setState({ password: 'somepassword' });
        await useUserStore.getState().setLocked();
        expect(useUserStore.getState().password).toBe('');
        expect(useUserStore.getState().isLock()).toBe(true);
    });

    it('setPasshash updates passhash state', async () => {
        await useUserStore.getState().setPasshash('newhash456');
        expect(useUserStore.getState().passhash).toBe('newhash456');
        expect(useUserStore.getState().isInited()).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Wallet migration safety — "never lose a private key" invariant
// ---------------------------------------------------------------------------

// Helpers to wire chrome.storage.local mock to a specific stored wallets payload
// (localCache wraps values as { value: JSON.stringify(payload) })
function setStoredWallets(wallets: Wallet[]) {
    vi.mocked(chrome.storage.local.get as any).mockImplementation(async (key: any) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'wallets') {
            return { wallets: { value: JSON.stringify(wallets) } };
        }
        if (k === 'autoLockTime') {
            return { autoLockTime: { value: JSON.stringify(15) } };
        }
        return {};
    });
}

function captureStoredWallets(): Wallet[] | null {
    const setMock = vi.mocked(chrome.storage.local.set);
    for (const call of setMock.mock.calls) {
        const payload = call[0] as Record<string, any>;
        if (payload && payload.wallets) {
            return JSON.parse(payload.wallets.value) as Wallet[];
        }
    }
    return null;
}

function makeLegacyWallet(password: string, seed: string, name: string): {
    wallet: Wallet;
    plainKey: string;
    pubKey: string;
} {
    const priv = PrivateKey.generate('K1');
    const plainKey = priv.toWif();
    const pubKey = priv.toPublic().toLegacyString();
    const encrypted = legacyEncrypt(plainKey, legacyMd5(seed + legacyPassword1(password)));
    const wallet: Wallet = {
        name,
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        keys: [{ publicKey: pubKey, privateKey: encrypted, permissions: ['active'] }],
        seed,
        blockchain: 'eos',
        smoothMode: false,
    };
    return { wallet, plainKey, pubKey };
}

describe('verifyAndUnlock — migration safety', () => {
    it('returns false on wrong password and does not touch wallets', async () => {
        const password = 'correct-horse-battery';
        const passhash = await hashPassword(password);
        setStoredWallets([]);
        useUserStore.setState({ passhash });

        const ok = await useUserStore.getState().verifyAndUnlock('wrong-password');
        expect(ok).toBe(false);
        expect(captureStoredWallets()).toBeNull();
    });

    it('migrates legacy-encrypted keys to v3 with correct password', async () => {
        const password = 'migrationpw-123';
        const { wallet, pubKey } = makeLegacyWallet(password, 'seed-a', 'alice');
        // wallet v2 stored passhash via password2 (#B33c4A15), not password1.
        const passhash = legacyPassword2(password);
        setStoredWallets([wallet]);
        useUserStore.setState({ passhash });

        const ok = await useUserStore.getState().verifyAndUnlock(password);
        expect(ok).toBe(true);

        const saved = captureStoredWallets();
        expect(saved).not.toBeNull();
        const savedKey = saved![0].keys[0];
        expect(savedKey.publicKey).toBe(pubKey);
        expect(savedKey.privateKey.startsWith('v3:')).toBe(true);
    });

    it('leaves already-v3 wallets untouched (idempotent)', async () => {
        const password = 'v3-only';
        const priv = PrivateKey.generate('K1');
        const plainKey = priv.toWif();
        const pubKey = priv.toPublic().toLegacyString();
        const seed = 'seed-v3';
        const v3Ciphertext = await encryptV3(plainKey, password, makeKeySalt(seed));
        const wallet: Wallet = {
            name: 'alice',
            chainId: 'x',
            keys: [{ publicKey: pubKey, privateKey: v3Ciphertext, permissions: ['active'] }],
            seed,
            blockchain: 'eos',
            smoothMode: false,
        };
        const passhash = await hashPassword(password);
        setStoredWallets([wallet]);
        useUserStore.setState({ passhash });

        const ok = await useUserStore.getState().verifyAndUnlock(password);
        expect(ok).toBe(true);

        // No wallets write expected — nothing changed.
        expect(captureStoredWallets()).toBeNull();
    });

    it('aborts and re-locks when decrypted key does not derive to stored public key', async () => {
        const password = 'mypw';
        // Build a wallet where publicKey is deliberately wrong vs what privateKey decrypts to
        const priv = PrivateKey.generate('K1');
        const plainKey = priv.toWif();
        const wrongPub = PrivateKey.generate('K1').toPublic().toLegacyString();
        const seed = 'seed-mismatch';
        const encrypted = legacyEncrypt(plainKey, legacyMd5(seed + legacyPassword1(password)));
        const wallet: Wallet = {
            name: 'mallory',
            chainId: 'x',
            keys: [{ publicKey: wrongPub, privateKey: encrypted, permissions: ['active'] }],
            seed,
            blockchain: 'eos',
            smoothMode: false,
        };
        const passhash = legacyPassword2(password);
        setStoredWallets([wallet]);
        useUserStore.setState({ passhash });

        await expect(
            useUserStore.getState().verifyAndUnlock(password)
        ).rejects.toThrow(/does not derive to stored public key/);

        // Storage untouched
        expect(captureStoredWallets()).toBeNull();
        // Session re-locked
        expect(useUserStore.getState().password).toBe('');
        expect(useUserStore.getState().isLock()).toBe(true);
    });

    it('aborts and re-locks when legacy ciphertext is malformed', async () => {
        const password = 'mypw';
        const wallet: Wallet = {
            name: 'broken',
            chainId: 'x',
            keys: [
                {
                    publicKey: 'EOS7EarnUhcyrqpsoPTNpi8e6BbhjoyoK2uz7QYDsLHrtxbQNVfaW',
                    privateKey: 'ZZZZ-not-valid-hex-ciphertext',
                    permissions: ['active'],
                },
            ],
            seed: 'seed-x',
            blockchain: 'eos',
            smoothMode: false,
        };
        const passhash = legacyPassword2(password);
        setStoredWallets([wallet]);
        useUserStore.setState({ passhash });

        await expect(
            useUserStore.getState().verifyAndUnlock(password)
        ).rejects.toThrow(/migration aborted/i);

        expect(captureStoredWallets()).toBeNull();
        expect(useUserStore.getState().isLock()).toBe(true);
    });

    it('aborts on any single bad key even when other keys are valid', async () => {
        const password = 'mypw';
        const { wallet: goodWallet } = makeLegacyWallet(password, 'seed-good', 'alice');
        const wrongPub = PrivateKey.generate('K1').toPublic().toLegacyString();
        const priv2 = PrivateKey.generate('K1');
        const encBad = legacyEncrypt(
            priv2.toWif(),
            legacyMd5('seed-bad' + legacyPassword1(password))
        );
        const badWallet: Wallet = {
            name: 'bob',
            chainId: 'x',
            keys: [{ publicKey: wrongPub, privateKey: encBad, permissions: ['active'] }],
            seed: 'seed-bad',
            blockchain: 'eos',
            smoothMode: false,
        };

        const passhash = legacyPassword2(password);
        setStoredWallets([goodWallet, badWallet]);
        useUserStore.setState({ passhash });

        await expect(
            useUserStore.getState().verifyAndUnlock(password)
        ).rejects.toThrow();

        // Even the good wallet is NOT partially written — migration is all-or-nothing.
        expect(captureStoredWallets()).toBeNull();
    });
});
