import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, md5, password1, password2 } from '@/utils/crypto';

describe('utils/crypto', () => {
    it('encrypt/decrypt round-trip', () => {
        const original = 'hello world secret';
        const encrypted = encrypt(original);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(original);
    });

    it('encrypt/decrypt round-trip with custom seed', () => {
        const original = 'my private key data';
        const seed = 'ABCD1234ABCD1234'; // 16 chars
        const encrypted = encrypt(original, seed);
        const decrypted = decrypt(encrypted, seed);
        expect(decrypted).toBe(original);
    });

    it('password1 is consistent for same input', () => {
        const pw = 'mySecurePassword';
        expect(password1(pw)).toBe(password1(pw));
    });

    it('password1 and password2 differ for the same input', () => {
        const pw = 'mySecurePassword';
        expect(password1(pw)).not.toBe(password2(pw));
    });

    it('md5 produces a 32-character hex string', () => {
        const hash = md5('test string');
        expect(hash).toHaveLength(32);
        expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    it('md5 is deterministic', () => {
        expect(md5('hello')).toBe(md5('hello'));
    });
});
