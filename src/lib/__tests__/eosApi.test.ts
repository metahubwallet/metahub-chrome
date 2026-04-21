import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @wharfkit/antelope so transact() can run without real ABIs
vi.mock('@wharfkit/antelope', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        ABI: {
            ...actual.ABI,
            from: vi.fn(() => ({ structs: [], actions: [] })),
        },
        Action: {
            ...actual.Action,
            from: vi.fn((actionData: any) => actionData),
        },
        Transaction: {
            ...actual.Transaction,
            from: vi.fn((txData: any) => txData),
        },
        Serializer: {
            ...actual.Serializer,
            encode: vi.fn(() => ({ array: new Uint8Array([1, 2, 3]) })),
            decode: vi.fn((opts: any) => ({ signatures: [] })),
        },
        SignedTransaction: {
            ...actual.SignedTransaction,
            from: vi.fn((data: any) => data),
        },
    };
});

import EOSApi from '@/lib/eosApi';
import type { Permission } from '@/types/eos';
import type { Auth } from '@/types/account';
import type { Chain } from '@/lib/chain';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_TX_OPTIONS = { blocksBehind: 3, expireSeconds: 30 };

function makeAuth(actor = 'testaccount', permission = 'active'): Auth {
    return { actor, permission };
}

function makePermissions(): Permission[] {
    return [
        {
            perm_name: 'active',
            parent: 'owner',
            required_auth: {
                threshold: 1,
                keys: [
                    { key: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV', weight: 1 },
                    { key: 'EOS8mUftJXepGzdQ2TaCduNuSPAfXJHf22uex4u41ab1EVNHYoWRy', weight: 1 },
                ],
                accounts: [],
                waits: [],
            },
        },
    ];
}

/**
 * Build a minimal mock Chain that satisfies what EOSApi.transact() needs.
 */
function makeMockChain(opts: { smoothMode?: boolean } = {}): Chain {
    return {
        currentAccount: vi.fn(() => ({
            smoothMode: opts.smoothMode ?? false,
            keys: [{ publicKey: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV' }],
        })),
        signatureProvider: vi.fn(() => ({
            getAvailableKeys: vi.fn(async () => ['EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV']),
            sign: vi.fn(async () => ({ signatures: ['SIG_K1_fake'] })),
        })),
        authorityProvider: vi.fn(() => ({
            getRequiredKeys: vi.fn(async () => ['EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV']),
        })),
        getMaxPermission: vi.fn(() => ({ actor: 'testaccount', permission: 'active' })),
    } as unknown as Chain;
}

function createApi(chainOverrides: { smoothMode?: boolean } = {}): EOSApi {
    const chain = makeMockChain(chainOverrides);
    return new EOSApi('test-chain-id', 'https://eos.example.com', chain);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EOSApi', () => {
    // -----------------------------------------------------------------------
    // makeNewPermissions (pure function tests)
    // -----------------------------------------------------------------------
    describe('makeNewPermissions', () => {
        let api: EOSApi;

        beforeEach(() => {
            api = createApi();
        });

        it('adds a key to the specified permission', () => {
            const perms = makePermissions();
            const newKey = 'EOS5JuNfuZPATy8oPz9BYyQnQfdYCN5RKrT2baMJvSiZkQ3FbKYCq';
            const result = api.makeNewPermissions(perms, 'add', 'active', undefined, newKey);
            const keys = result[0].required_auth.keys;
            expect(keys).toHaveLength(3);
            expect(keys.some((k) => k.key === newKey)).toBe(true);
        });

        it('modifies an existing key', () => {
            const perms = makePermissions();
            const oldKey = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
            const newKey = 'EOS5JuNfuZPATy8oPz9BYyQnQfdYCN5RKrT2baMJvSiZkQ3FbKYCq';
            const result = api.makeNewPermissions(perms, 'modify', 'active', oldKey, newKey);
            const keys = result[0].required_auth.keys;
            expect(keys).toHaveLength(2);
            expect(keys.some((k) => k.key === newKey)).toBe(true);
            expect(keys.some((k) => k.key === oldKey)).toBe(false);
        });

        it('removes a key', () => {
            const perms = makePermissions();
            const removeKey = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
            const result = api.makeNewPermissions(perms, 'remove', 'active', removeKey);
            const keys = result[0].required_auth.keys;
            expect(keys).toHaveLength(1);
            expect(keys.some((k) => k.key === removeKey)).toBe(false);
        });

        it('sorts keys after modification', () => {
            const perms = makePermissions();
            // Add a key that alphabetically comes before existing ones
            const earlyKey = 'EOS111111111111111111111111111111111111111111111111111';
            const result = api.makeNewPermissions(perms, 'add', 'active', undefined, earlyKey);
            const keys = result[0].required_auth.keys;
            expect(keys[0].key).toBe(earlyKey);
            // Verify entire array is sorted
            for (let i = 1; i < keys.length; i++) {
                expect(keys[i - 1].key.localeCompare(keys[i].key)).toBeLessThan(0);
            }
        });

        it('does not modify permissions with a different perm_name', () => {
            const perms = makePermissions();
            const origKeys = [...perms[0].required_auth.keys];
            api.makeNewPermissions(perms, 'add', 'owner', undefined, 'EOS5newkey');
            // active permission should be untouched
            expect(perms[0].required_auth.keys).toEqual(origKeys);
        });
    });

    // -----------------------------------------------------------------------
    // Transaction action building (spy on transact)
    // -----------------------------------------------------------------------
    describe('transaction action building', () => {
        let api: EOSApi;
        let transactSpy: ReturnType<typeof vi.spyOn>;
        const auth = makeAuth();

        beforeEach(() => {
            api = createApi();
            transactSpy = vi.spyOn(api, 'transact').mockResolvedValue({ transaction_id: 'mock' } as any);
        });

        it('transfer builds correct action', async () => {
            await api.transfer('eosio.token', 'alice', 'bob', '1.0000 EOS', 'test memo', auth);

            expect(transactSpy).toHaveBeenCalledOnce();
            const [tx, opts] = transactSpy.mock.calls[0];
            expect(opts).toEqual(DEFAULT_TX_OPTIONS);
            expect(tx.actions).toHaveLength(1);
            const action = tx.actions[0];
            expect(action.account).toBe('eosio.token');
            expect(action.name).toBe('transfer');
            expect(action.authorization).toEqual([auth]);
            expect(action.data).toEqual({
                from: 'alice',
                to: 'bob',
                quantity: '1.0000 EOS',
                memo: 'test memo',
            });
        });

        it('delegatebw builds correct action', async () => {
            await api.delegatebw('alice', 'bob', '5.0000 EOS', '10.0000 EOS', true, auth);

            const [tx, opts] = transactSpy.mock.calls[0];
            expect(opts).toEqual(DEFAULT_TX_OPTIONS);
            const action = tx.actions[0];
            expect(action.account).toBe('eosio');
            expect(action.name).toBe('delegatebw');
            expect(action.data).toEqual({
                from: 'alice',
                receiver: 'bob',
                stake_net_quantity: '5.0000 EOS',
                stake_cpu_quantity: '10.0000 EOS',
                transfer: 1,
            });
        });

        it('delegatebw with transfer=false passes 0', async () => {
            await api.delegatebw('alice', 'bob', '1.0000 EOS', '2.0000 EOS', false, auth);

            const action = transactSpy.mock.calls[0][0].actions[0];
            expect(action.data.transfer).toBe(0);
        });

        it('undelegatebw builds correct action', async () => {
            await api.undelegatebw('alice', 'bob', '3.0000 EOS', '4.0000 EOS', auth);

            const action = transactSpy.mock.calls[0][0].actions[0];
            expect(action.account).toBe('eosio');
            expect(action.name).toBe('undelegatebw');
            expect(action.data).toEqual({
                from: 'alice',
                receiver: 'bob',
                unstake_net_quantity: '3.0000 EOS',
                unstake_cpu_quantity: '4.0000 EOS',
            });
        });

        it('refund builds correct action', async () => {
            await api.refund('alice', auth);

            const [tx, opts] = transactSpy.mock.calls[0];
            expect(opts).toEqual(DEFAULT_TX_OPTIONS);
            const action = tx.actions[0];
            expect(action.account).toBe('eosio');
            expect(action.name).toBe('refund');
            expect(action.data).toEqual({ owner: 'alice' });
        });

        it('buyRam builds correct action', async () => {
            await api.buyRam('alice', 'bob', '10.0000 EOS', auth);

            const action = transactSpy.mock.calls[0][0].actions[0];
            expect(action.account).toBe('eosio');
            expect(action.name).toBe('buyram');
            expect(action.data).toEqual({ payer: 'alice', receiver: 'bob', quant: '10.0000 EOS' });
        });

        it('sellRam builds correct action', async () => {
            await api.sellRam('alice', 8192, auth);

            const action = transactSpy.mock.calls[0][0].actions[0];
            expect(action.account).toBe('eosio');
            expect(action.name).toBe('sellram');
            expect(action.data).toEqual({ account: 'alice', bytes: 8192 });
        });

        it('powerup builds correct action and passes ignoreCPUProxy', async () => {
            const params = { payer: 'alice', receiver: 'alice', days: 1, net_frac: '100', cpu_frac: '100', max_payment: '0.0001 EOS' };
            await api.powerup(params, auth);

            const [tx, opts, ignoreCPU] = transactSpy.mock.calls[0];
            expect(opts).toEqual(DEFAULT_TX_OPTIONS);
            expect(ignoreCPU).toBe(true);
            expect(tx.actions[0].name).toBe('powerup');
            expect(tx.actions[0].data).toEqual(params);
        });

        it('all transaction methods use DEFAULT_TX_OPTIONS', async () => {
            await api.transfer('eosio.token', 'a', 'b', '1.0000 EOS', '', auth);
            await api.delegatebw('a', 'b', '1.0000 EOS', '1.0000 EOS', false, auth);
            await api.undelegatebw('a', 'b', '1.0000 EOS', '1.0000 EOS', auth);
            await api.refund('a', auth);
            await api.buyRam('a', 'b', '1.0000 EOS', auth);
            await api.sellRam('a', 100, auth);

            for (const call of transactSpy.mock.calls) {
                expect(call[1]).toEqual(DEFAULT_TX_OPTIONS);
            }
        });
    });

    // -----------------------------------------------------------------------
    // transact proxy detection
    // -----------------------------------------------------------------------
    describe('transact proxy detection', () => {
        const auth = makeAuth();

        it('smoothMode=true enables proxy (calls signAndPushProxy)', async () => {
            const chain = makeMockChain({ smoothMode: true });
            const pushTx = vi.fn().mockResolvedValue({ result: { signature: 'SIG_K1_proxy' } });
            const api = new EOSApi('test-chain-id', 'https://eos.example.com', chain, pushTx);

            // We need to mock the heavy internals: getContractAbi, client calls
            // Spy on private signAndPushProxy via the prototype
            const proxySpy = vi.spyOn(api as any, 'signAndPushProxy').mockResolvedValue({ transaction_id: 'proxied' });
            vi.spyOn(api as any, 'signAndPush').mockResolvedValue({ transaction_id: 'direct' });

            // Mock getContractAbi by mocking the client calls that transact uses
            const mockAbi = {} as any;
            const mockGetContractAbi = vi.fn().mockResolvedValue({ abi: mockAbi });
            // Replace the module-level function by mocking the whole flow through transact
            // Instead, let's directly call transact with a pre-built transaction
            // and mock the ABI fetching + info fetching

            // Simplify: mock at the client level
            api.client = {
                v1: {
                    chain: {
                        get_info: vi.fn().mockResolvedValue({
                            getTransactionHeader: vi.fn(() => ({
                                expiration: '2026-01-01T00:00:30',
                                ref_block_num: 1,
                                ref_block_prefix: 2,
                            })),
                        }),
                        get_raw_abi: vi.fn().mockResolvedValue({
                            abi: { array: new Uint8Array(0) },
                        }),
                        get_account: vi.fn().mockResolvedValue({ last_code_update: '2020-01-01T00:00:00' }),
                        push_transaction: vi.fn().mockResolvedValue({ transaction_id: 'pushed' }),
                    },
                },
            } as any;

            const tx = { actions: [{ account: 'eosio', name: 'refund', authorization: [auth], data: { owner: 'alice' } }] };
            await api.transact(tx, DEFAULT_TX_OPTIONS);

            expect(proxySpy).toHaveBeenCalled();
        });

        it('transfer to 1stbillpayer forces proxy', async () => {
            const chain = makeMockChain({ smoothMode: false });
            const pushTx = vi.fn().mockResolvedValue({ result: { signature: 'SIG_K1_proxy' } });
            const api = new EOSApi('test-chain-id', 'https://eos.example.com', chain, pushTx);

            const proxySpy = vi.spyOn(api as any, 'signAndPushProxy').mockResolvedValue({ transaction_id: 'proxied' });
            vi.spyOn(api as any, 'signAndPush').mockResolvedValue({ transaction_id: 'direct' });

            api.client = {
                v1: {
                    chain: {
                        get_info: vi.fn().mockResolvedValue({
                            getTransactionHeader: vi.fn(() => ({
                                expiration: '2026-01-01T00:00:30',
                                ref_block_num: 1,
                                ref_block_prefix: 2,
                            })),
                        }),
                        get_raw_abi: vi.fn().mockResolvedValue({
                            abi: { array: new Uint8Array(0) },
                        }),
                        get_account: vi.fn().mockResolvedValue({ last_code_update: '2020-01-01T00:00:00' }),
                        push_transaction: vi.fn().mockResolvedValue({ transaction_id: 'pushed' }),
                    },
                },
            } as any;

            const tx = {
                actions: [{
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [auth],
                    data: { from: 'alice', to: '1stbillpayer', quantity: '1.0000 EOS', memo: '' },
                }],
            };

            await api.transact(tx, DEFAULT_TX_OPTIONS);
            expect(proxySpy).toHaveBeenCalled();
        });

        it('ignoreCPUProxy=true disables proxy even with smoothMode', async () => {
            const chain = makeMockChain({ smoothMode: true });
            const api = new EOSApi('test-chain-id', 'https://eos.example.com', chain);

            const directSpy = vi.spyOn(api as any, 'signAndPush').mockResolvedValue({ transaction_id: 'direct' });
            const proxySpy = vi.spyOn(api as any, 'signAndPushProxy').mockResolvedValue({ transaction_id: 'proxied' });

            api.client = {
                v1: {
                    chain: {
                        get_info: vi.fn().mockResolvedValue({
                            getTransactionHeader: vi.fn(() => ({
                                expiration: '2026-01-01T00:00:30',
                                ref_block_num: 1,
                                ref_block_prefix: 2,
                            })),
                        }),
                        get_raw_abi: vi.fn().mockResolvedValue({
                            abi: { array: new Uint8Array(0) },
                        }),
                        get_account: vi.fn().mockResolvedValue({ last_code_update: '2020-01-01T00:00:00' }),
                        push_transaction: vi.fn().mockResolvedValue({ transaction_id: 'pushed' }),
                    },
                },
            } as any;

            const tx = { actions: [{ account: 'eosio', name: 'refund', authorization: [auth], data: { owner: 'alice' } }] };
            await api.transact(tx, DEFAULT_TX_OPTIONS, true);

            expect(directSpy).toHaveBeenCalled();
            expect(proxySpy).not.toHaveBeenCalled();
        });
    });
});
