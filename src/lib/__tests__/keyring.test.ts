import { describe, it, expect } from 'vitest';
import {
    isValidPrivate,
    privateToPublic,
    isValidPublic,
    getRandomKeyPair,
    signature,
} from '@/lib/keyring';

// Well-known EOS test private key
const KNOWN_PRIVATE_KEY = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
// Its corresponding public key
const KNOWN_PUBLIC_KEY = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';

describe('keyring', () => {
    describe('isValidPrivate', () => {
        it('returns true for a known valid EOS private key', () => {
            expect(isValidPrivate(KNOWN_PRIVATE_KEY)).toBe(true);
        });

        it('returns false for garbage input', () => {
            expect(isValidPrivate('notaprivatekey')).toBe(false);
        });

        it('returns false for an empty string', () => {
            expect(isValidPrivate('')).toBe(false);
        });

        it('returns false for a random string', () => {
            expect(isValidPrivate('abc123xyz')).toBe(false);
        });
    });

    describe('privateToPublic', () => {
        it('converts known private key to correct public key', () => {
            const pub = privateToPublic(KNOWN_PRIVATE_KEY);
            expect(pub).toBe(KNOWN_PUBLIC_KEY);
        });

        it('result starts with EOS', () => {
            const pub = privateToPublic(KNOWN_PRIVATE_KEY);
            expect(pub.startsWith('EOS')).toBe(true);
        });

        it('returns empty string for invalid private key', () => {
            expect(privateToPublic('invalidkey')).toBe('');
        });
    });

    describe('isValidPublic', () => {
        it('validates a known EOS public key', () => {
            expect(isValidPublic(KNOWN_PUBLIC_KEY)).toBe(true);
        });

        it('returns false for garbage', () => {
            expect(isValidPublic('notapublickey')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isValidPublic('')).toBe(false);
        });
    });

    describe('getRandomKeyPair', () => {
        it('generates a valid key pair', async () => {
            const { privateKey, publicKey } = await getRandomKeyPair();
            expect(isValidPrivate(privateKey)).toBe(true);
            expect(isValidPublic(publicKey)).toBe(true);
        });

        it('derived public key matches private key', async () => {
            const { privateKey, publicKey } = await getRandomKeyPair();
            expect(privateToPublic(privateKey)).toBe(publicKey);
        });

        it('generates different pairs each time', async () => {
            const pair1 = await getRandomKeyPair();
            const pair2 = await getRandomKeyPair();
            expect(pair1.privateKey).not.toBe(pair2.privateKey);
            expect(pair1.publicKey).not.toBe(pair2.publicKey);
        });
    });

    describe('signature', () => {
        it('signs data and returns a non-empty SIG_ string', () => {
            const sig = signature(Buffer.from('hello'), KNOWN_PRIVATE_KEY);
            expect(sig).toBeTruthy();
            expect(sig.startsWith('SIG_K1_')).toBe(true);
        });

        it('returns empty string when no private key', () => {
            expect(signature(Buffer.from('hello'), '')).toBe('');
        });
    });
});
