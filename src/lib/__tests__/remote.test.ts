import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSupportChain, getBalanceList, hyperionApis } from '@/lib/remote';

describe('remote', () => {
    describe('isSupportChain', () => {
        it('returns true for eos', () => {
            expect(isSupportChain('eos')).toBe(true);
        });

        it('returns true for wax', () => {
            expect(isSupportChain('wax')).toBe(true);
        });

        it('returns true for telos', () => {
            expect(isSupportChain('telos')).toBe(true);
        });

        it('returns false for solana', () => {
            expect(isSupportChain('solana')).toBe(false);
        });

        it('returns false for bitcoin', () => {
            expect(isSupportChain('bitcoin')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isSupportChain('')).toBe(false);
        });

        it('returns false for ethereum', () => {
            expect(isSupportChain('ethereum')).toBe(false);
        });
    });

    describe('hyperionApis', () => {
        it('has an entry for eos', () => {
            expect(hyperionApis).toHaveProperty('eos');
            expect(hyperionApis.eos).toBeTruthy();
        });

        it('has an entry for wax', () => {
            expect(hyperionApis).toHaveProperty('wax');
            expect(hyperionApis.wax).toBeTruthy();
        });

        it('eos entry starts with https', () => {
            expect(hyperionApis.eos.startsWith('https')).toBe(true);
        });

        it('wax entry starts with https', () => {
            expect(hyperionApis.wax.startsWith('https')).toBe(true);
        });
    });

    describe('getBalanceList', () => {
        const mockTokens = [
            { symbol: 'EOS', contract: 'eosio.token', chain: 'eos', precision: 4 },
            { symbol: 'USDT', contract: 'tethertether', chain: 'eos', precision: 4 },
        ];

        it('returns balances for each token', async () => {
            const mockApi = {
                getCurrencyBalance: vi.fn()
                    .mockResolvedValueOnce('10.0000 EOS')
                    .mockResolvedValueOnce('5.0000 USDT'),
            };

            const results = await getBalanceList('alice', mockTokens, mockApi, () => {});
            expect(results).toHaveLength(2);
            expect(results[0].amount).toBe(10);
            expect(results[1].amount).toBe(5);
        });

        it('calls onBlanceInquired for each token', async () => {
            const mockApi = {
                getCurrencyBalance: vi.fn().mockResolvedValue('1.0000 EOS'),
            };
            const callback = vi.fn();

            await getBalanceList('alice', mockTokens, mockApi, callback);
            expect(callback).toHaveBeenCalledTimes(2);
        });

        it('returns 0 amount when balance is empty', async () => {
            const mockApi = {
                getCurrencyBalance: vi.fn().mockResolvedValue(''),
            };

            const results = await getBalanceList('alice', mockTokens, mockApi, () => {});
            expect(results[0].amount).toBe(0);
        });

        it('returns empty array on API error', async () => {
            const mockApi = {
                getCurrencyBalance: vi.fn().mockRejectedValue(new Error('network error')),
            };

            const results = await getBalanceList('alice', mockTokens, mockApi, () => {});
            expect(results).toEqual([]);
        });

        it('preserves token metadata in balance items', async () => {
            const mockApi = {
                getCurrencyBalance: vi.fn().mockResolvedValue('3.5000 EOS'),
            };

            const results = await getBalanceList('alice', [mockTokens[0]], mockApi, () => {});
            expect(results[0].symbol).toBe('EOS');
            expect(results[0].contract).toBe('eosio.token');
            expect(results[0].chain).toBe('eos');
        });
    });
});
