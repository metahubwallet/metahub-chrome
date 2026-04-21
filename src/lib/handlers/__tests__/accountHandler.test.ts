import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/cache', () => ({
  localCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../identityHandler', () => ({
  getAuthorizations: vi.fn(),
}));

import { requestAvailableKeys } from '../accountHandler';
import { getAuthorizations } from '../identityHandler';

describe('accountHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestAvailableKeys', () => {
    it('should return deduplicated public keys', async () => {
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'user1', authority: 'active', publicKey: 'EOS111', chainId: 'c1', isHardware: false },
        { blockchain: 'eos', name: 'user1', authority: 'owner', publicKey: 'EOS111', chainId: 'c1', isHardware: false },
        { blockchain: 'eos', name: 'user2', authority: 'active', publicKey: 'EOS222', chainId: 'c1', isHardware: false },
      ]);

      const result = await requestAvailableKeys({ domain: 'test.com', chainId: 'c1' });
      expect(result).toEqual(['EOS111', 'EOS222']);
    });

    it('should throw noNetwork when chainId is empty', async () => {
      const payload = { domain: 'test.com', chainId: '' };
      await expect(requestAvailableKeys(payload)).rejects.toMatchObject({
        isError: true,
      });
    });

    it('should return empty array when no authorizations', async () => {
      vi.mocked(getAuthorizations).mockResolvedValue([]);

      const result = await requestAvailableKeys({ domain: 'test.com', chainId: 'c1' });
      expect(result).toEqual([]);
    });
  });
});
