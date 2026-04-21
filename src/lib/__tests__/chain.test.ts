import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chain, ChainDeps } from '@/lib/chain';
import { Wallet } from '@/types/wallet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeWallet = (overrides: Partial<Wallet> = {}): Wallet => ({
    name: 'alice',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    keys: [
        {
            publicKey: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV',
            privateKey: 'encryptedprivkey',
            permissions: ['active', 'owner'],
        },
    ],
    seed: 'testseed',
    blockchain: 'eos',
    smoothMode: false,
    ...overrides,
});

const EOS_CHAIN_ID = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
const WAX_CHAIN_ID = '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4';

const makeDeps = (overrides: Partial<ChainDeps> = {}): ChainDeps => {
    const wallet = makeWallet();
    return {
        getWallets: vi.fn(() => [wallet]),
        getCurrentWallet: vi.fn(() => wallet),
        getPassword: vi.fn(() => 'testpassword'),
        getSelectedRpc: vi.fn((chainId: string) => `https://api.${chainId}.example.com`),
        setWallet: vi.fn(),
        ...overrides,
    };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Chain', () => {
    describe('instantiation', () => {
        it('can be instantiated with mock deps', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            expect(chain).toBeInstanceOf(Chain);
        });

        it('does not call any deps during construction', () => {
            const deps = makeDeps();
            new Chain(deps);
            expect(deps.getWallets).not.toHaveBeenCalled();
            expect(deps.getCurrentWallet).not.toHaveBeenCalled();
            expect(deps.getPassword).not.toHaveBeenCalled();
        });
    });

    describe('currentAccount()', () => {
        it('delegates to deps.getCurrentWallet', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const account = chain.currentAccount();
            expect(deps.getCurrentWallet).toHaveBeenCalledOnce();
            expect(account.name).toBe('alice');
        });
    });

    describe('getApi()', () => {
        it('creates an EosApi instance for a given chainId', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const api = chain.getApi(EOS_CHAIN_ID);
            expect(api).toBeDefined();
            expect(api.chainId).toBe(EOS_CHAIN_ID);
        });

        it('returns the same instance when called twice with the same chainId', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const api1 = chain.getApi(EOS_CHAIN_ID);
            const api2 = chain.getApi(EOS_CHAIN_ID);
            expect(api1).toBe(api2);
        });

        it('returns different instances for different chainIds', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const eosApi = chain.getApi(EOS_CHAIN_ID);
            const waxApi = chain.getApi(WAX_CHAIN_ID);
            expect(eosApi).not.toBe(waxApi);
            expect(eosApi.chainId).toBe(EOS_CHAIN_ID);
            expect(waxApi.chainId).toBe(WAX_CHAIN_ID);
        });

        it('calls getSelectedRpc with the chainId', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            chain.getApi(EOS_CHAIN_ID);
            expect(deps.getSelectedRpc).toHaveBeenCalledWith(EOS_CHAIN_ID);
        });

        it('falls back to current wallet chainId when no chainId provided', () => {
            const wallet = makeWallet({ chainId: EOS_CHAIN_ID });
            const deps = makeDeps({ getCurrentWallet: vi.fn(() => wallet) });
            const chain = new Chain(deps);
            const api = chain.getApi();
            expect(api.chainId).toBe(EOS_CHAIN_ID);
        });
    });

    describe('resetApi()', () => {
        it('invalidates the cached api so next call creates a new instance', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const api1 = chain.getApi(EOS_CHAIN_ID);
            chain.resetApi(EOS_CHAIN_ID);
            const api2 = chain.getApi(EOS_CHAIN_ID);
            expect(api1).not.toBe(api2);
        });
    });

    describe('getMaxPermission()', () => {
        it('returns active when wallet has active permission', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const perm = chain.getMaxPermission('alice', EOS_CHAIN_ID);
            expect(perm.actor).toBe('alice');
            expect(perm.permission).toBe('owner'); // wallet has both owner and active, owner wins
        });

        it('returns unknown when wallet not found', () => {
            const deps = makeDeps({ getWallets: vi.fn(() => []) });
            const chain = new Chain(deps);
            const perm = chain.getMaxPermission('nobody', EOS_CHAIN_ID);
            expect(perm.permission).toBe('unknown');
        });

        it('returns active when wallet only has active', () => {
            const wallet = makeWallet({
                keys: [{ publicKey: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV', privateKey: 'enc', permissions: ['active'] }],
            });
            const deps = makeDeps({ getWallets: vi.fn(() => [wallet]) });
            const chain = new Chain(deps);
            const perm = chain.getMaxPermission('alice', EOS_CHAIN_ID);
            expect(perm.permission).toBe('active');
        });
    });

    describe('getPublicKeyByPermission()', () => {
        it('returns the public key for a matching permission', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const pub = chain.getPublicKeyByPermission(EOS_CHAIN_ID, 'alice', 'active');
            expect(pub).toBe('EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV');
        });

        it('returns null when wallet not found', () => {
            const deps = makeDeps({ getWallets: vi.fn(() => []) });
            const chain = new Chain(deps);
            expect(chain.getPublicKeyByPermission(EOS_CHAIN_ID, 'alice', 'active')).toBeNull();
        });
    });

    describe('findLocalAccount()', () => {
        it('finds a wallet by name and chainId', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const found = chain.findLocalAccount('alice', EOS_CHAIN_ID);
            expect(found).toBeDefined();
            expect(found!.name).toBe('alice');
        });

        it('returns undefined when account not found', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const found = chain.findLocalAccount('bob', EOS_CHAIN_ID);
            expect(found).toBeUndefined();
        });
    });

    describe('authorityProvider()', () => {
        it('returns an object with getRequiredKeys function', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const provider = chain.authorityProvider(EOS_CHAIN_ID);
            expect(typeof provider.getRequiredKeys).toBe('function');
        });

        it('getRequiredKeys filters keys that are in availableKeys', async () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const provider = chain.authorityProvider(EOS_CHAIN_ID);

            const pubKey = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
            const transaction = {
                actions: [
                    {
                        authorization: [{ actor: 'alice', permission: 'active' }],
                    },
                ],
            } as any;

            const keys = await provider.getRequiredKeys({
                transaction,
                availableKeys: [pubKey],
            });
            expect(keys).toContain(pubKey);
        });
    });

    describe('signatureProvider()', () => {
        it('returns an object with getAvailableKeys and sign functions', () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const provider = chain.signatureProvider(EOS_CHAIN_ID);
            expect(typeof provider.getAvailableKeys).toBe('function');
            expect(typeof provider.sign).toBe('function');
        });

        it('getAvailableKeys returns public keys from current account', async () => {
            const deps = makeDeps();
            const chain = new Chain(deps);
            const provider = chain.signatureProvider(EOS_CHAIN_ID);
            const keys = await provider.getAvailableKeys();
            expect(keys).toContain('EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV');
        });
    });
});
