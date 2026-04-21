import { describe, it, expect } from 'vitest';
import { isValidPrivate, privateToPublic, isValidPublic, getRandomKeyPair, signature } from '../keyring';
import { encryptV3, decryptV3, makeKeySalt } from '../../utils/crypto';

const TEST_ACCOUNTS = [
    {
        name: 'marketsteep5',
        privateKey: '5KEPqKve8Pav91SHyNvMWTBfL2Td9L37gcUgP4XSvJdsuXQQEy7',
    },
    {
        name: 'scoutfoul11j',
        privateKey: '5J8yzg76XW8coAusBUmTowTSKXYpD1v3Wk3cHPwJSiwjkvZ4Kbk',
    },
];

describe('Wallet Import Flow', () => {
    describe('isValidPrivate', () => {
        it('returns true for valid WIF keys', () => {
            for (const account of TEST_ACCOUNTS) {
                expect(isValidPrivate(account.privateKey)).toBe(true);
            }
        });

        it('returns false for invalid keys', () => {
            expect(isValidPrivate('')).toBe(false);
            expect(isValidPrivate('notakey')).toBe(false);
            expect(isValidPrivate('5KEPqKve8Pav91SHyNvMWTBfL2Td9L37gcUgP4XSvJdsuXQQEy7X')).toBe(false);
            expect(isValidPrivate('EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV')).toBe(false);
        });
    });

    describe('privateToPublic', () => {
        it('derives a public key from each valid private key', () => {
            for (const account of TEST_ACCOUNTS) {
                const pubKey = privateToPublic(account.privateKey);
                expect(pubKey).toBeTruthy();
                expect(pubKey.startsWith('EOS')).toBe(true);
            }
        });

        it('returns empty string for invalid private key', () => {
            expect(privateToPublic('invalid')).toBe('');
        });
    });

    describe('isValidPublic', () => {
        it('validates public keys derived from test accounts', () => {
            for (const account of TEST_ACCOUNTS) {
                const pubKey = privateToPublic(account.privateKey);
                expect(isValidPublic(pubKey)).toBe(true);
            }
        });

        it('returns false for invalid public keys', () => {
            expect(isValidPublic('')).toBe(false);
            expect(isValidPublic('notakey')).toBe(false);
        });
    });

    describe('getRandomKeyPair', () => {
        it('generates a valid key pair', async () => {
            const { privateKey, publicKey } = await getRandomKeyPair();
            expect(isValidPrivate(privateKey)).toBe(true);
            expect(isValidPublic(publicKey)).toBe(true);
            expect(publicKey).toBe(privateToPublic(privateKey));
        });

        it('generates unique key pairs on each call', async () => {
            const pair1 = await getRandomKeyPair();
            const pair2 = await getRandomKeyPair();
            expect(pair1.privateKey).not.toBe(pair2.privateKey);
            expect(pair1.publicKey).not.toBe(pair2.publicKey);
        });
    });

    describe('Full import flow: validate, derive, encrypt, decrypt', () => {
        it('round-trips a private key through encryptV3/decryptV3', async () => {
            const account = TEST_ACCOUNTS[0];
            const password = 'testPassword123!';
            const walletSeed = 'test-wallet-seed';
            const salt = makeKeySalt(walletSeed);

            // Step 1: validate the key
            expect(isValidPrivate(account.privateKey)).toBe(true);

            // Step 2: derive public key
            const pubKey = privateToPublic(account.privateKey);
            expect(pubKey.startsWith('EOS')).toBe(true);

            // Step 3: encrypt the private key
            const encrypted = await encryptV3(account.privateKey, password, salt);
            expect(encrypted.startsWith('v3:')).toBe(true);

            // Step 4: decrypt and verify roundtrip
            const decrypted = await decryptV3(encrypted, password, salt);
            expect(decrypted).toBe(account.privateKey);

            // Step 5: the decrypted key still derives the same public key
            expect(privateToPublic(decrypted)).toBe(pubKey);
        });
    });

    describe('signature', () => {
        it('produces a valid signature string from a private key', () => {
            const account = TEST_ACCOUNTS[0];
            const data = 'hello world';
            const sig = signature(data, account.privateKey);
            expect(sig).toBeTruthy();
            expect(sig.startsWith('SIG_K1_')).toBe(true);
        });

        it('returns empty string when no private key is provided', () => {
            expect(signature('data', '')).toBe('');
        });

        it('produces different signatures for different data', () => {
            const account = TEST_ACCOUNTS[0];
            const sig1 = signature('message1', account.privateKey);
            const sig2 = signature('message2', account.privateKey);
            expect(sig1).not.toBe(sig2);
        });
    });
});
