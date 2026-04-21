import { describe, it, expect } from 'vitest';
import { tool } from '@/utils/tool';

describe('utils/tool - briefAccount', () => {
    it('truncates long account names with ellipsis', () => {
        const long = 'abcdefghijklmnopqrstuvwxyz'; // > 12 chars
        const result = tool.briefAccount(long);
        expect(result).toContain('...');
        expect(result.length).toBeLessThan(long.length);
    });

    it('returns short names unchanged (12 chars or fewer)', () => {
        expect(tool.briefAccount('alice')).toBe('alice');
        expect(tool.briefAccount('123456789012')).toBe('123456789012');
    });

    it('respects custom prefix and suffix lengths', () => {
        // NOTE: the original implementation uses substring(subfixLength * -1, subfixLength)
        // JavaScript's substring() treats negative indices as 0, so the suffix is actually
        // the first subfixLength chars (same as prefix region). This matches the source behavior.
        const long = 'abcdefghijklmnopqrstuvwxyz';
        const result = tool.briefAccount(long, 3, 3);
        // substring(-3, 3) => substring(0, 3) => 'abc'
        expect(result).toBe('abc...abc');
    });
});

describe('utils/tool - bignum', () => {
    it('converts a valid numeric string', () => {
        const bn = tool.bignum('123.456');
        expect(bn.toNumber()).toBeCloseTo(123.456);
    });

    it('handles NaN input by defaulting to 0', () => {
        const bn = tool.bignum('not-a-number');
        expect(bn.toNumber()).toBe(0);
    });

    it('handles empty string as NaN fallback', () => {
        const bn = tool.bignum('');
        expect(bn.toNumber()).toBe(0);
    });
});

describe('utils/tool - timeFormat', () => {
    it('formats a timestamp as YYYY/MM/DD HH:mm:ss', () => {
        // Use a fixed timestamp: 2024-01-15 10:30:00 UTC
        const timestamp = new Date('2024-01-15T10:30:00').getTime();
        const result = tool.timeFormat(timestamp);
        expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(result).toContain('2024/01/15');
    });

    it('formats an ISO date string', () => {
        const result = tool.timeFormat('2024-06-20T08:00:00');
        expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(result).toContain('2024/06/20');
    });
});

describe('utils/tool - randomInt', () => {
    it('returns an integer within [min, max)', () => {
        for (let i = 0; i < 50; i++) {
            const result = tool.randomInt(1, 10);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThan(10);
            expect(Number.isInteger(result)).toBe(true);
        }
    });
});
