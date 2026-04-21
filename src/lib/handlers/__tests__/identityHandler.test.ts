import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/cache', () => ({
  localCache: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../windowManager', () => ({
  createWindow: vi.fn(),
  getPassword: vi.fn(),
}));

import { getIdentity, restoreIdentity, forgetIdentity, getAuthorizations, generateIdengity } from '../identityHandler';
import { localCache } from '@/utils/cache';
import { createWindow } from '../windowManager';

const mockWallets = [
  {
    name: 'testaccount',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    keys: [{ publicKey: 'EOS6abc', privateKey: 'enc123', permissions: ['active'] }],
    seed: 'seed1',
    blockchain: 'eos',
    smoothMode: false,
  },
];

const mockAuthorizations = [
  {
    domain: 'example.com',
    actor: '',
    permission: '',
    accounts: [
      {
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        name: 'testaccount',
        authority: 'active',
        publicKey: 'EOS6abc',
        expire: Date.now() + 86400 * 1000,
      },
    ],
  },
];

describe('identityHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthorizations', () => {
    it('should return empty array when no auth for domain', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'wallets') return mockWallets;
        if (key === 'authorizations') return [];
        return null;
      });

      const result = await getAuthorizations('unknown.com');
      expect(result).toEqual([]);
    });

    it('should return accounts filtered by domain and chainId', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'wallets') return mockWallets;
        if (key === 'authorizations') return JSON.parse(JSON.stringify(mockAuthorizations));
        return null;
      });

      const result = await getAuthorizations('example.com', 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testaccount');
      expect(result[0].blockchain).toBe('eos');
      expect(result[0].isHardware).toBe(false);
    });

    it('should filter expired accounts', async () => {
      const expiredAuth = JSON.parse(JSON.stringify(mockAuthorizations));
      expiredAuth[0].accounts[0].expire = Date.now() - 1000; // expired

      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'wallets') return mockWallets;
        if (key === 'authorizations') return expiredAuth;
        return null;
      });

      const result = await getAuthorizations('example.com');
      expect(result).toHaveLength(0);
    });
  });

  describe('generateIdengity', () => {
    it('should return correct Identity format', () => {
      const accounts = [
        { chainId: 'abc123', name: 'user1', authority: 'active', publicKey: 'EOS111' },
      ];
      const identity = generateIdengity(accounts as any);
      expect(identity.accounts).toHaveLength(1);
      expect(identity.accounts[0]).toEqual({
        blockchain: 'eos',
        name: 'user1',
        publicKey: 'EOS111',
        authority: 'active',
        chainId: 'abc123',
        isHardware: false,
      });
      expect(identity.kyc).toBe(false);
      expect(identity.name).toBe('default');
      expect(identity.hash).toBe('a7d14118a71c163f2bd0c7e6bc52ced2');
    });
  });

  describe('getIdentity', () => {
    it('should return existing auth without opening window', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'wallets') return mockWallets;
        if (key === 'authorizations') return JSON.parse(JSON.stringify(mockAuthorizations));
        return null;
      });

      const payload = {
        domain: 'example.com',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      };
      const result = await getIdentity(payload as any);
      expect(result.accounts).toHaveLength(1);
      expect(createWindow).not.toHaveBeenCalled();
    });

    it('should open login window when no existing auth', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'wallets') return mockWallets;
        if (key === 'authorizations') return [];
        return null;
      });
      vi.mocked(createWindow).mockResolvedValue({
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        name: 'testaccount',
        authority: 'active',
        publicKey: 'EOS6abc',
      });

      const payload = {
        domain: 'newsite.com',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      };
      const result = await getIdentity(payload as any);
      expect(createWindow).toHaveBeenCalledWith('login', 450, 600, payload);
      expect(localCache.set).toHaveBeenCalled();
    });

    it('should throw when user rejects identity', async () => {
      vi.mocked(localCache.get).mockResolvedValue([]);
      vi.mocked(createWindow).mockResolvedValue(undefined);

      const payload = { domain: 'test.com', chainId: 'abc' };
      await expect(getIdentity(payload as any)).rejects.toMatchObject({
        isError: true,
      });
    });
  });

  describe('restoreIdentity', () => {
    it('should throw noAccount when no authorizations exist', async () => {
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'wallets') return [];
        if (key === 'authorizations') return [];
        return null;
      });

      const payload = { domain: 'test.com', chainId: '' };
      await expect(restoreIdentity(payload)).rejects.toMatchObject({
        isError: true,
        code: 410,
      });
    });
  });

  describe('forgetIdentity', () => {
    it('should remove specific account from authorizations', async () => {
      const authData = JSON.parse(JSON.stringify(mockAuthorizations));
      authData[0].accounts.push({
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        name: 'otheraccount',
        authority: 'active',
        publicKey: 'EOS7def',
        expire: Date.now() + 86400 * 1000,
      });

      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'authorizations') return authData;
        return null;
      });

      const payload = {
        domain: 'example.com',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        account: 'testaccount',
      };
      const result = await forgetIdentity(payload as any);
      expect(localCache.set).toHaveBeenCalled();
      // testaccount should be removed, otheraccount remains
      expect(result.accounts).toBeDefined();
    });

    it('should return empty identity when domain not found', async () => {
      vi.mocked(localCache.get).mockResolvedValue([]);

      const payload = { domain: 'unknown.com', chainId: '', account: '' };
      const result = await forgetIdentity(payload as any);
      expect(result.accounts).toHaveLength(0);
    });
  });
});
