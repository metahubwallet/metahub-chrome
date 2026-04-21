import { describe, it, expect } from 'vitest';
import {
    legacyEncrypt,
    legacyDecrypt,
    encryptV3,
    decryptV3,
    hashPassword,
    verifyPassword,
    isV3Hash,
    isV3Encrypted,
    makeKeySalt,
    encryptBackup,
    decryptBackup,
    encryptSessionPassword,
    decryptSessionPassword,
    legacyPassword1,
    legacyPassword2,
    legacyMd5,
    metahubKey,
} from '@/utils/crypto';

describe('Crypto wallet v2 → v3 migration', () => {
    it('legacyEncrypt/legacyDecrypt roundtrip works', () => {
        const plaintext = 'hello world secret key';
        const encrypted = legacyEncrypt(plaintext);
        const decrypted = legacyDecrypt(encrypted);
        expect(decrypted).toBe(plaintext);
    });

    it('legacyEncrypt/legacyDecrypt roundtrip with custom seed', () => {
        const plaintext = 'custom seed test';
        const seed = 'CUSTOMSEED123456';
        const encrypted = legacyEncrypt(plaintext, seed);
        const decrypted = legacyDecrypt(encrypted, seed);
        expect(decrypted).toBe(plaintext);
    });

    it('encryptV3/decryptV3 roundtrip works', async () => {
        const plaintext = 'my secret private key 5K...';
        const password = 'strong-password-123';
        const salt = makeKeySalt('testwallet');
        const encrypted = await encryptV3(plaintext, password, salt);
        const decrypted = await decryptV3(encrypted, password, salt);
        expect(decrypted).toBe(plaintext);
    });

    it('hashPassword/verifyPassword roundtrip works (v3 format)', async () => {
        const password = 'mypassword123';
        const hash = await hashPassword(password);
        expect(hash.startsWith('v3:')).toBe(true);
        const valid = await verifyPassword(password, hash);
        expect(valid).toBe(true);
        const invalid = await verifyPassword('wrongpassword', hash);
        expect(invalid).toBe(false);
    });

    it('verifyPassword with legacy hash (wallet v2 format) works', async () => {
        const password = 'mypassword123';
        // wallet v2 stored passhash as password2 (#B33c4A15 salt), NOT password1.
        const legacyHash = legacyPassword2(password);
        expect(legacyHash.startsWith('v3:')).toBe(false);
        const valid = await verifyPassword(password, legacyHash);
        expect(valid).toBe(true);
        const invalid = await verifyPassword('wrongpassword', legacyHash);
        expect(invalid).toBe(false);
    });

    it('verifyPassword rejects a password1-style hash (wrong salt)', async () => {
        // Regression: legacy fallback previously used password1, which silently
        // rejected every unlock. Stay on password2 for wallet v2 passhash compat.
        const password = 'mypassword123';
        const wrongShapedHash = legacyPassword1(password);
        const valid = await verifyPassword(password, wrongShapedHash);
        expect(valid).toBe(false);
    });

    it('isV3Hash correctly identifies v3 vs legacy hashes', async () => {
        const v3Hash = await hashPassword('test');
        expect(isV3Hash(v3Hash)).toBe(true);

        const legacyHash = legacyPassword2('test');
        expect(isV3Hash(legacyHash)).toBe(false);
    });

    it('isV3Encrypted correctly identifies v3 vs legacy encrypted data', async () => {
        const salt = makeKeySalt('testwallet');
        const v3Encrypted = await encryptV3('secret', 'password', salt);
        expect(isV3Encrypted(v3Encrypted)).toBe(true);

        const legacyEncrypted = legacyEncrypt('secret');
        expect(isV3Encrypted(legacyEncrypted)).toBe(false);
    });

    it('makeKeySalt produces consistent salt for same seed', () => {
        const salt1 = makeKeySalt('mywallet');
        const salt2 = makeKeySalt('mywallet');
        expect(salt1).toEqual(salt2);

        const salt3 = makeKeySalt('otherwallet');
        expect(salt1).not.toEqual(salt3);
    });

    it('full migration simulation: legacy encrypt -> detect -> decrypt -> v3 re-encrypt -> v3 decrypt -> same plaintext', async () => {
        const plaintext = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';

        // Step 1: Encrypt with legacy (wallet v2)
        const legacyEncrypted = legacyEncrypt(plaintext);

        // Step 2: Detect as legacy
        expect(isV3Encrypted(legacyEncrypted)).toBe(false);

        // Step 3: Decrypt with legacy
        const recovered = legacyDecrypt(legacyEncrypted);
        expect(recovered).toBe(plaintext);

        // Step 4: Re-encrypt with v3
        const password = 'migration-password';
        const salt = makeKeySalt('mywallet');
        const v3Encrypted = await encryptV3(recovered, password, salt);

        // Step 5: Verify it is detected as v3
        expect(isV3Encrypted(v3Encrypted)).toBe(true);

        // Step 6: Decrypt with v3 and verify same plaintext
        const finalResult = await decryptV3(v3Encrypted, password, salt);
        expect(finalResult).toBe(plaintext);
    });

    it('encryptBackup/decryptBackup roundtrip works', async () => {
        const data = JSON.stringify({ accounts: ['alice', 'bob'], keys: ['key1', 'key2'] });
        const backupPassword = 'backup-pass-123';
        const encrypted = await encryptBackup(data, backupPassword);
        const decrypted = await decryptBackup(encrypted, backupPassword);
        expect(decrypted).toBe(data);
    });

    it('decryptBackup can decrypt legacy (wallet v2) format backup', async () => {
        const data = 'some backup data here';
        const backupPassword = 'oldpassword';
        // Legacy wallet v2 backup uses legacyEncrypt with a derived key
        const decryptKey = legacyMd5(metahubKey + legacyMd5(backupPassword));
        const legacyEncrypted = legacyEncrypt(data, decryptKey);
        // decryptBackup should handle legacy format (non-JSON string)
        const decrypted = await decryptBackup(legacyEncrypted, backupPassword);
        expect(decrypted).toBe(data);
    });

    it('encryptSessionPassword/decryptSessionPassword roundtrip works', async () => {
        const password = 'session-password-test';
        const encrypted = await encryptSessionPassword(password);
        expect(encrypted).not.toBe(password);
        expect(encrypted.length).toBeGreaterThan(0);
        const decrypted = await decryptSessionPassword(encrypted);
        expect(decrypted).toBe(password);
    });

    it('encryptSessionPassword returns empty string for empty input', async () => {
        const encrypted = await encryptSessionPassword('');
        expect(encrypted).toBe('');
    });
});
