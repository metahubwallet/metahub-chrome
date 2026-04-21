import { describe, it, expect, vi, beforeEach } from 'vitest';
import { localCache } from '@/utils/cache/index';

describe('utils/cache/localCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset chrome mock to default behavior
        (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
        (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (chrome.storage.local.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it('set serializes value as JSON inside a CacheData wrapper', async () => {
        const value = { name: 'alice', amount: 42 };
        await localCache.set('language', value);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            language: expect.objectContaining({
                value: JSON.stringify(value),
            }),
        });
    });

    it('set includes expire timestamp when liveSeconds is provided', async () => {
        const before = Date.now();
        await localCache.set('passhash', 'myhash', 60);
        const after = Date.now();

        const call = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const stored = call.passhash;
        expect(stored.expire).toBeGreaterThanOrEqual(before + 60000);
        expect(stored.expire).toBeLessThanOrEqual(after + 60000);
    });

    it('get returns default value when key is missing', async () => {
        (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
        const result = await localCache.get('language', 'en');
        expect(result).toBe('en');
    });

    it('get returns parsed value when key exists', async () => {
        const stored = { value: JSON.stringify(['eos', 'wax']) };
        (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({ allTokens: stored });
        const result = await localCache.get('allTokens', []);
        expect(result).toEqual(['eos', 'wax']);
    });

    it('get returns default and removes key when data is expired', async () => {
        const expired = { value: JSON.stringify('stale'), expire: Date.now() - 1000 };
        (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({ passhash: expired });
        const result = await localCache.get('passhash', 'default');
        expect(result).toBe('default');
        expect(chrome.storage.local.remove).toHaveBeenCalledWith('passhash');
    });

    it('remove does NOT remove the wallets key', async () => {
        await localCache.remove('wallets');
        expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    });

    it('remove calls chrome.storage.local.remove for non-protected keys', async () => {
        await localCache.remove('language');
        expect(chrome.storage.local.remove).toHaveBeenCalledWith('language');
    });
});
