import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/cache', () => ({
  localCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { getEndPoint, getEosInfo } from '../networkHandler';
import { localCache } from '@/utils/cache';

describe('networkHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEndPoint', () => {
    it('should return endpoint from selectedRpcs if available', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'selectedRpcs') {
          return { chain1: 'https://custom-rpc.example.com' };
        }
        return [];
      });

      const result = await getEndPoint('chain1');
      expect(result).toBe('https://custom-rpc.example.com');
    });

    it('should fallback to networks cache when no selectedRpc', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'selectedRpcs') return {};
        if (key === 'networks') {
          return [
            { name: 'EOS', chain: 'eos', chainId: 'eos-chain', endpoint: 'https://eos.greymass.com' },
          ];
        }
        return null;
      });

      const result = await getEndPoint('eos-chain');
      expect(result).toBe('https://eos.greymass.com');
    });

    it('should return empty string when no matching network', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'selectedRpcs') return {};
        if (key === 'networks') return [];
        return null;
      });

      const result = await getEndPoint('unknown-chain');
      expect(result).toBe('');
    });
  });

  describe('getEosInfo', () => {
    it('should fetch chain info from endpoint', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'selectedRpcs') return { chain1: 'https://api.example.com' };
        return {};
      });

      const mockInfo = {
        chain_id: 'chain1',
        head_block_num: 12345,
        server_version: 'v1',
      };
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockInfo),
      });

      const result = await getEosInfo('chain1');
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/v1/chain/get_info');
      expect(result).toEqual(mockInfo);
    });
  });

});
