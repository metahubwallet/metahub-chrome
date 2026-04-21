import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/cache', () => ({
  localCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../windowManager', () => ({
  createWindow: vi.fn(),
  getPassword: vi.fn(),
}));

vi.mock('../identityHandler', () => ({
  getAuthorizations: vi.fn(),
}));

vi.mock('../abiHandler', () => ({
  parseEosjsRequest: vi.fn(),
  buildSigningBuffer: vi.fn(() => Buffer.from('signbuf')),
  buildSmoothTransaction: vi.fn(),
  materializeTransactArgs: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    resource: {
      pushTx: vi.fn(),
    },
  },
}));

vi.mock('@/lib/keyring', () => ({
  signature: vi.fn(() => 'SIG_K1_test_signature'),
}));

vi.mock('@/utils/crypto', () => ({
  md5: vi.fn((input: string) => 'md5_' + input),
  isV3Encrypted: vi.fn((value: string) => value.startsWith('v3:')),
  decryptV3: vi.fn(async () => '5KTestPrivateKey'),
  makeKeySalt: vi.fn((seed: string) => new Uint8Array([1, 2, 3])),
  legacyDecrypt: vi.fn(() => '5KTestPrivateKey'),
  legacyMd5: vi.fn((input: string) => 'md5_' + input),
  legacyPassword1: vi.fn((input: string) => 'p1_' + input),
}));

import { requestLegacySignature, requestSignature, getPrivateKey, requestArbitrarySignature } from '../signatureHandler';
import { localCache } from '@/utils/cache';
import { createWindow, getPassword } from '../windowManager';
import { getAuthorizations } from '../identityHandler';
import { parseEosjsRequest, buildSmoothTransaction, materializeTransactArgs } from '../abiHandler';
import { signature } from '@/lib/keyring';
import { legacyDecrypt } from '@/utils/crypto';
import { api } from '@/lib/api';

describe('signatureHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPrivateKey', () => {
    it('should decrypt v1 private key using legacy functions', async () => {
      vi.mocked(localCache.get).mockResolvedValue([
        {
          name: 'testaccount',
          chainId: 'chain1',
          keys: [{ publicKey: 'EOS6abc', privateKey: 'encrypted123', permissions: ['active'] }],
          seed: 'myseed',
          blockchain: 'eos',
          smoothMode: false,
        },
      ]);
      vi.mocked(getPassword).mockResolvedValue('mypassword');

      const result = await getPrivateKey('chain1', 'EOS6abc');
      expect(result).toBe('5KTestPrivateKey');
      expect(legacyDecrypt).toHaveBeenCalledWith('encrypted123', 'md5_myseedp1_mypassword');
    });

    it('should throw when key not found', async () => {
      vi.mocked(localCache.get).mockResolvedValue([]);

      await expect(getPrivateKey('chain1', 'EOS999')).rejects.toMatchObject({
        isError: true,
      });
    });
  });

  describe('requestLegacySignature', () => {
    it('should auto-sign when whitelist matches all actions', async () => {
      const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'testuser', authority: 'active', publicKey: 'EOS6abc', chainId, isHardware: false },
      ] as any);
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'testuser', permission: 'active' }],
            data: { from: 'testuser', to: 'receiver', quantity: '1.0000 EOS', memo: '' },
          },
        ],
        buffer: Buffer.from('test'),
        transaction: {},
      });

      // Whitelist matches
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'whitelist') {
          return [
            {
              hash: 'md5_example.com-' + chainId + '-testuser-active-eosio.token-transfer',
              properties: { from: '*', to: '*', quantity: '*', memo: '*' },
            },
          ];
        }
        if (key === 'wallets') {
          return [
            {
              name: 'testuser',
              chainId,
              keys: [{ publicKey: 'EOS6abc', privateKey: 'enc', permissions: ['active'] }],
              seed: 'seed',
              blockchain: 'eos',
              smoothMode: false,
            },
          ];
        }
        return [];
      });
      vi.mocked(getPassword).mockResolvedValue('pass123');

      const payload = {
        domain: 'example.com',
        chainId,
        serializedTransaction: [0, 1, 2],
        requiredKeys: [],
        abis: [],
      };

      const result = await requestLegacySignature(payload as any);
      expect(result.signatures).toHaveLength(1);
      expect(result.signatures[0]).toBe('SIG_K1_test_signature');
      expect(createWindow).not.toHaveBeenCalled();
    });

    it('should open window when no whitelist match', async () => {
      const chainId = 'chain1';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'user1', authority: 'active', publicKey: 'EOS111', chainId, isHardware: false },
      ] as any);
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'user1', permission: 'active' }],
            data: { from: 'user1', to: 'user2', quantity: '1.0000 EOS', memo: '' },
          },
        ],
        buffer: Buffer.from('test'),
        transaction: {},
      });
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'whitelist') return [];
        if (key === 'wallets') {
          return [
            {
              name: 'user1',
              chainId,
              keys: [{ publicKey: 'EOS111', privateKey: 'enc', permissions: ['active'] }],
              seed: 'seed',
              blockchain: 'eos',
              smoothMode: false,
            },
          ];
        }
        return [];
      });
      vi.mocked(createWindow).mockResolvedValue({ approve: true, whitelist: [] });
      vi.mocked(getPassword).mockResolvedValue('pass');

      const payload = {
        domain: 'site.com',
        chainId,
        serializedTransaction: [0, 1, 2],
        requiredKeys: [],
        abis: [],
      };

      const result = await requestLegacySignature(payload as any);
      expect(createWindow).toHaveBeenCalledWith('transaction', 600, 530, expect.any(Object));
      expect(result.signatures).toHaveLength(1);
    });

    it('should throw when user rejects signature', async () => {
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'user1', authority: 'active', publicKey: 'EOS111', chainId: 'c1', isHardware: false },
      ] as any);
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: [
          {
            account: 'test',
            name: 'action',
            authorization: [{ actor: 'user1', permission: 'active' }],
            data: {},
          },
        ],
        buffer: Buffer.from('test'),
        transaction: {},
      });
      vi.mocked(localCache.get).mockResolvedValue([]);
      vi.mocked(createWindow).mockResolvedValue(null);

      const payload = {
        domain: 'site.com',
        chainId: 'c1',
        serializedTransaction: [0],
        requiredKeys: [],
        abis: [],
      };

      await expect(requestLegacySignature(payload as any)).rejects.toMatchObject({
        isError: true,
      });
    });

    it('should throw when no chainId provided', async () => {
      const payload = { domain: 'test.com', chainId: '' } as any;
      await expect(requestLegacySignature(payload)).rejects.toMatchObject({
        isError: true,
      });
    });

    it('returns [serverSig, userSig] + transformed serializedTransaction when smoothMode is on', async () => {
      const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'alice', authority: 'active', publicKey: 'EOS6abc', chainId, isHardware: false },
      ] as any);
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: '' },
          },
        ],
        buffer: Buffer.from('orig'),
        transaction: {},
      });
      const transformedSerialized = new Uint8Array([9, 9, 9, 1, 2, 3]);
      vi.mocked(buildSmoothTransaction).mockResolvedValue({
        serializedTransaction: transformedSerialized,
        buffer: Buffer.from('smooth-buffer'),
        transaction: { actions: [{ account: 'metahubpower', name: 'noop' }], expiration: 'x' },
      });
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'whitelist') return [];
        if (key === 'wallets') {
          return [
            {
              name: 'alice',
              chainId,
              keys: [{ publicKey: 'EOS6abc', privateKey: 'enc', permissions: ['active'] }],
              seed: 'seed',
              blockchain: 'eos',
              smoothMode: true,
            },
          ];
        }
        return [];
      });
      vi.mocked(createWindow).mockResolvedValue({ approve: true, whitelist: [] });
      vi.mocked(getPassword).mockResolvedValue('pass');
      vi.mocked(api.resource.pushTx).mockResolvedValue({ result: { signature: 'SIG_K1_server' } } as any);

      const payload = {
        domain: 'dapp.com',
        chainId,
        serializedTransaction: [0, 1, 2],
        requiredKeys: [],
        abis: [],
      };

      const result = await requestLegacySignature(payload as any);

      expect(buildSmoothTransaction).toHaveBeenCalledWith(chainId, expect.any(Uint8Array));
      expect(result.signatures).toEqual(['SIG_K1_server', 'SIG_K1_test_signature']);
      expect(result.serializedTransaction).toEqual(Array.from(transformedSerialized));
      expect(api.resource.pushTx).toHaveBeenCalledWith({ signed: expect.any(String) });
    });

    it('propagates pushTx error as SdkError when server rejects smoothly-signed tx', async () => {
      const chainId = 'c1';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'alice', authority: 'active', publicKey: 'EOS6abc', chainId, isHardware: false },
      ] as any);
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: {},
          },
        ],
        buffer: Buffer.from('orig'),
        transaction: {},
      });
      vi.mocked(buildSmoothTransaction).mockResolvedValue({
        serializedTransaction: new Uint8Array([1]),
        buffer: Buffer.from('smooth'),
        transaction: { actions: [], expiration: 'x' },
      });
      vi.mocked(localCache.get).mockImplementation(async (k: string) =>
        k === 'wallets'
          ? [{
              name: 'alice', chainId,
              keys: [{ publicKey: 'EOS6abc', privateKey: 'enc', permissions: ['active'] }],
              seed: 's', blockchain: 'eos', smoothMode: true,
            }]
          : []
      );
      vi.mocked(createWindow).mockResolvedValue({ approve: true, whitelist: [] });
      vi.mocked(getPassword).mockResolvedValue('p');
      vi.mocked(api.resource.pushTx).mockRejectedValue(new Error('reach free cpu'));

      await expect(
        requestLegacySignature({
          domain: 'd.com', chainId, serializedTransaction: [0], requiredKeys: [], abis: [],
        } as any)
      ).rejects.toMatchObject({ isError: true });
    });

    it('falls back to single-sig flow when smoothMode is off', async () => {
      const chainId = 'c1';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'alice', authority: 'active', publicKey: 'EOS6abc', chainId, isHardware: false },
      ] as any);
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: {},
          },
        ],
        buffer: Buffer.from('orig'),
        transaction: {},
      });
      vi.mocked(localCache.get).mockImplementation(async (k: string) =>
        k === 'wallets'
          ? [{
              name: 'alice', chainId,
              keys: [{ publicKey: 'EOS6abc', privateKey: 'enc', permissions: ['active'] }],
              seed: 's', blockchain: 'eos', smoothMode: false,
            }]
          : []
      );
      vi.mocked(createWindow).mockResolvedValue({ approve: true, whitelist: [] });
      vi.mocked(getPassword).mockResolvedValue('p');

      const result = await requestLegacySignature({
        domain: 'd.com', chainId, serializedTransaction: [0], requiredKeys: [], abis: [],
      } as any);

      expect(buildSmoothTransaction).not.toHaveBeenCalled();
      expect(api.resource.pushTx).not.toHaveBeenCalled();
      expect(result.signatures).toHaveLength(1);
      // Legacy path now also returns the decoded transaction + serialized bytes
      // (mirrors the new requestSignature path, useful for eosHook callers).
      expect(result.transaction).toBeDefined();
      expect(result.serializedTransaction).toEqual([0]);
    });
  });

  describe('requestSignature', () => {
    it('materializes transactArgs and returns {signatures, transaction, serializedTransaction}', async () => {
      const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'alice', authority: 'active', publicKey: 'EOS6abc', chainId, isHardware: false },
      ] as any);

      const serialized = [10, 20, 30, 40];
      const decoded = {
        expiration: '2026-04-17T10:00:00',
        ref_block_num: 1,
        ref_block_prefix: 2,
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: '' },
          },
        ],
      };
      vi.mocked(materializeTransactArgs).mockResolvedValue({
        serializedTransaction: serialized,
        transaction: decoded,
        resolvedAbis: new Map(),
      });

      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'whitelist') return [];
        if (key === 'wallets') {
          return [
            {
              name: 'alice',
              chainId,
              keys: [{ publicKey: 'EOS6abc', privateKey: 'enc', permissions: ['active'] }],
              seed: 'seed',
              blockchain: 'eos',
              smoothMode: false,
            },
          ];
        }
        return [];
      });
      vi.mocked(createWindow).mockResolvedValue({ approve: true, whitelist: [] });
      vi.mocked(getPassword).mockResolvedValue('pw');

      const payload = {
        domain: 'dapp.com',
        chainId,
        transactArgs: {
          actions: decoded.actions,
          expiration: decoded.expiration,
          ref_block_num: decoded.ref_block_num,
          ref_block_prefix: decoded.ref_block_prefix,
        },
        options: { requiredKeys: ['EOS6abc'] },
      };

      const result = await requestSignature(payload as any);

      expect(materializeTransactArgs).toHaveBeenCalledWith(chainId, payload);
      expect(parseEosjsRequest).not.toHaveBeenCalled();
      expect(result.signatures).toHaveLength(1);
      expect(result.transaction).toEqual(decoded);
      expect(result.serializedTransaction).toEqual(serialized);
    });

    it('whitelist auto-sign on transactArgs path still returns transaction + serializedTransaction', async () => {
      const chainId = 'chainX';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'alice', authority: 'active', publicKey: 'EOS6abc', chainId, isHardware: false },
      ] as any);

      const serialized = [1, 2, 3];
      const decoded = {
        expiration: '2026-04-17T10:00:00',
        ref_block_num: 1,
        ref_block_prefix: 2,
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: '' },
          },
        ],
      };
      vi.mocked(materializeTransactArgs).mockResolvedValue({
        serializedTransaction: serialized,
        transaction: decoded,
        resolvedAbis: new Map(),
      });
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: decoded.actions,
        buffer: Buffer.from('x'),
        transaction: decoded,
      } as any);
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'whitelist') {
          return [
            {
              hash: 'md5_dapp.com-' + chainId + '-alice-active-eosio.token-transfer',
              properties: { from: '*', to: '*', quantity: '*', memo: '*' },
            },
          ];
        }
        if (key === 'wallets') {
          return [
            {
              name: 'alice', chainId,
              keys: [{ publicKey: 'EOS6abc', privateKey: 'enc', permissions: ['active'] }],
              seed: 's', blockchain: 'eos', smoothMode: false,
            },
          ];
        }
        return [];
      });
      vi.mocked(getPassword).mockResolvedValue('pw');

      const result = await requestSignature({
        domain: 'dapp.com',
        chainId,
        transactArgs: {
          actions: decoded.actions,
          expiration: decoded.expiration,
          ref_block_num: 1,
          ref_block_prefix: 2,
        },
        options: {},
      } as any);

      expect(createWindow).not.toHaveBeenCalled();
      expect(result.transaction).toEqual(decoded);
      expect(result.serializedTransaction).toEqual(serialized);
    });

    it('smooth mode on transactArgs path returns [serverSig, userSig] + transformed serializedTransaction + transaction', async () => {
      const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'alice', authority: 'active', publicKey: 'EOS6abc', chainId, isHardware: false },
      ] as any);

      const materializedSerialized = [10, 20, 30];
      const decoded = {
        expiration: '2026-04-17T10:00:00',
        ref_block_num: 1,
        ref_block_prefix: 2,
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: '' },
          },
        ],
      };
      vi.mocked(materializeTransactArgs).mockResolvedValue({
        serializedTransaction: materializedSerialized,
        transaction: decoded,
        resolvedAbis: new Map(),
      });
      vi.mocked(parseEosjsRequest).mockResolvedValue({
        actions: decoded.actions,
        buffer: Buffer.from('orig'),
        transaction: decoded,
      } as any);
      const transformed = new Uint8Array([9, 9, 9, 1, 2, 3]);
      vi.mocked(buildSmoothTransaction).mockResolvedValue({
        serializedTransaction: transformed,
        buffer: Buffer.from('smooth'),
        transaction: { actions: [{ account: 'metahubpower', name: 'noop' }] },
      });
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'whitelist') return [];
        if (key === 'wallets') {
          return [
            {
              name: 'alice',
              chainId,
              keys: [{ publicKey: 'EOS6abc', privateKey: 'enc', permissions: ['active'] }],
              seed: 'seed',
              blockchain: 'eos',
              smoothMode: true,
            },
          ];
        }
        return [];
      });
      vi.mocked(createWindow).mockResolvedValue({ approve: true, whitelist: [] });
      vi.mocked(getPassword).mockResolvedValue('pw');
      vi.mocked(api.resource.pushTx).mockResolvedValue({ result: { signature: 'SIG_K1_server' } } as any);

      const result = await requestSignature({
        domain: 'dapp.com',
        chainId,
        transactArgs: {
          actions: decoded.actions,
          expiration: decoded.expiration,
          ref_block_num: 1,
          ref_block_prefix: 2,
        },
        options: { requiredKeys: ['EOS6abc'] },
      } as any);

      expect(result.signatures).toEqual(['SIG_K1_server', 'SIG_K1_test_signature']);
      expect(result.serializedTransaction).toEqual(Array.from(transformed));
      expect(result.transaction).toEqual(decoded);
    });
  });

  describe('requestArbitrarySignature', () => {
    it('should find chainId from authorizations by publicKey', async () => {
      vi.mocked(getAuthorizations).mockResolvedValue([
        { blockchain: 'eos', name: 'user1', authority: 'active', publicKey: 'EOS111', chainId: 'found_chain', isHardware: false },
      ] as any);

      const payload = {
        domain: 'test.com',
        chainId: '',
        publicKey: 'EOS111',
        data: 'hello world',
      };

      // It will call requestLegacySignature internally which needs more mocks
      vi.mocked(localCache.get).mockImplementation(async (key: string) => {
        if (key === 'whitelist') return [];
        if (key === 'wallets') {
          return [
            {
              name: 'user1',
              chainId: 'found_chain',
              keys: [{ publicKey: 'EOS111', privateKey: 'enc', permissions: ['active'] }],
              seed: 'seed',
              blockchain: 'eos',
              smoothMode: false,
            },
          ];
        }
        return [];
      });
      vi.mocked(createWindow).mockResolvedValue({ approve: true, whitelist: [] });
      vi.mocked(getPassword).mockResolvedValue('pass');

      const result = await requestArbitrarySignature(payload as any);
      expect(payload.chainId).toBe('found_chain');
      expect(result.signatures).toBeDefined();
    });
  });
});
