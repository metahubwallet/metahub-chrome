import { describe, it, expect } from 'vitest';
import { passwordSetupSchema } from '@/lib/schemas/password';
import { importBackupSchema } from '@/lib/schemas/importBackup';
import { customNetworkSchema } from '@/lib/schemas/network';
import { transferSchema } from '@/lib/schemas/transfer';

describe('passwordSetupSchema', () => {
    it('accepts valid matching passwords', () => {
        const result = passwordSetupSchema.safeParse({
            password: 'secret123',
            passwordConfirm: 'secret123',
        });
        expect(result.success).toBe(true);
    });

    it('rejects when password is too short', () => {
        const result = passwordSetupSchema.safeParse({
            password: 'abc',
            passwordConfirm: 'abc',
        });
        expect(result.success).toBe(false);
    });

    it('rejects when passwords do not match', () => {
        const result = passwordSetupSchema.safeParse({
            password: 'secret123',
            passwordConfirm: 'different456',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const confirmError = result.error.issues.find((e) => e.path.includes('passwordConfirm'));
            expect(confirmError).toBeDefined();
        }
    });

    it('rejects when password is empty', () => {
        const result = passwordSetupSchema.safeParse({
            password: '',
            passwordConfirm: '',
        });
        expect(result.success).toBe(false);
    });
});

describe('importBackupSchema', () => {
    const validData = {
        encryptPassword: 'encrypt123',
        password: 'newpass123',
        passwordConfirm: 'newpass123',
        fileName: 'backup.json',
    };

    it('accepts valid data', () => {
        const result = importBackupSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects when encryptPassword is empty', () => {
        const result = importBackupSchema.safeParse({ ...validData, encryptPassword: '' });
        expect(result.success).toBe(false);
    });

    it('rejects when passwords do not match', () => {
        const result = importBackupSchema.safeParse({
            ...validData,
            passwordConfirm: 'wrongpassword',
        });
        expect(result.success).toBe(false);
    });

    it('rejects when fileName is empty', () => {
        const result = importBackupSchema.safeParse({ ...validData, fileName: '' });
        expect(result.success).toBe(false);
    });

    it('rejects when password is too short', () => {
        const result = importBackupSchema.safeParse({
            ...validData,
            password: 'abc',
            passwordConfirm: 'abc',
        });
        expect(result.success).toBe(false);
    });
});

describe('customNetworkSchema', () => {
    const validData = {
        name: 'My Network',
        chainId: 'a'.repeat(64),
        endpoint: 'https://my.eos.node.com',
        tokenSymbol: 'EOS',
    };

    it('accepts valid network data', () => {
        const result = customNetworkSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects when chainId is not 64 characters', () => {
        const result = customNetworkSchema.safeParse({ ...validData, chainId: 'tooshort' });
        expect(result.success).toBe(false);
    });

    it('rejects when endpoint is not a valid URL', () => {
        const result = customNetworkSchema.safeParse({ ...validData, endpoint: 'not-a-url' });
        expect(result.success).toBe(false);
    });

    it('rejects when endpoint does not use https', () => {
        const result = customNetworkSchema.safeParse({
            ...validData,
            endpoint: 'http://my.eos.node.com',
        });
        expect(result.success).toBe(false);
    });

    it('rejects when name is empty', () => {
        const result = customNetworkSchema.safeParse({ ...validData, name: '' });
        expect(result.success).toBe(false);
    });

    it('accepts valid data with optional fields', () => {
        const result = customNetworkSchema.safeParse({
            ...validData,
            tokenContract: 'eosio.token',
            tokenPrecision: 4,
        });
        expect(result.success).toBe(true);
    });

    it('rejects tokenPrecision outside 0-8 range', () => {
        const result = customNetworkSchema.safeParse({ ...validData, tokenPrecision: 9 });
        expect(result.success).toBe(false);
    });

    it('rejects non-integer tokenPrecision', () => {
        const result = customNetworkSchema.safeParse({ ...validData, tokenPrecision: 1.5 });
        expect(result.success).toBe(false);
    });
});

describe('transferSchema', () => {
    const validData = {
        receiver: 'alice',
        amount: 1.5,
    };

    it('accepts valid transfer data', () => {
        const result = transferSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('accepts valid transfer with memo', () => {
        const result = transferSchema.safeParse({ ...validData, memo: 'for lunch' });
        expect(result.success).toBe(true);
    });

    it('accepts transfer without memo (memo is optional)', () => {
        const result = transferSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.memo).toBeUndefined();
        }
    });

    it('rejects when receiver is empty', () => {
        const result = transferSchema.safeParse({ ...validData, receiver: '' });
        expect(result.success).toBe(false);
    });

    it('rejects when amount is zero', () => {
        const result = transferSchema.safeParse({ ...validData, amount: 0 });
        expect(result.success).toBe(false);
    });

    it('rejects when amount is negative', () => {
        const result = transferSchema.safeParse({ ...validData, amount: -5 });
        expect(result.success).toBe(false);
    });

    it('rejects when amount is not a number', () => {
        const result = transferSchema.safeParse({ ...validData, amount: 'lots' });
        expect(result.success).toBe(false);
    });
});
