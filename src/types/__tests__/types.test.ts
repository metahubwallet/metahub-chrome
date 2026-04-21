import { describe, it, expect } from 'vitest';
import type { Key, Wallet } from '@/types/wallet';
import type { Auth, AuthAccount, AuthorizedData } from '@/types/account';
import type { Token, Coin, Balance } from '@/types/tokens';
import type { Transfer, TransferRecord } from '@/types/transaction';
import type { ResourceBase, ResourceData } from '@/types/resource';
import type { WhiteItem, CacheABI, Network, RPC } from '@/types/settings';

describe('types/wallet', () => {
    it('Key interface can be instantiated', () => {
        const key: Key = {
            publicKey: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV',
            privateKey: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
            permissions: ['active', 'owner'],
        };
        expect(key.publicKey).toContain('EOS');
        expect(key.permissions).toHaveLength(2);
    });

    it('Wallet interface can be instantiated', () => {
        const wallet: Wallet = {
            name: 'testaccount',
            chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
            keys: [],
            seed: 'encrypted-seed',
            blockchain: 'eos',
            smoothMode: false,
        };
        expect(wallet.name).toBe('testaccount');
        expect(wallet.smoothMode).toBe(false);
    });
});

describe('types/account', () => {
    it('Auth interface can be instantiated', () => {
        const auth: Auth = { permission: 'active', actor: 'alice' };
        expect(auth.permission).toBe('active');
    });

    it('AuthAccount interface can be instantiated', () => {
        const authAccount: AuthAccount = {
            chainId: 'aca376f...',
            name: 'alice',
            authority: 'active',
            publicKey: 'EOS6MRyAj...',
        };
        expect(authAccount.expire).toBeUndefined();
    });

    it('AuthorizedData interface can be instantiated', () => {
        const data: AuthorizedData = {
            permission: 'active',
            actor: 'alice',
            domain: 'example.com',
            accounts: [],
        };
        expect(data.accounts).toHaveLength(0);
    });
});

describe('types/tokens', () => {
    it('Token interface can be instantiated', () => {
        const token: Token = { symbol: 'EOS', contract: 'eosio.token', precision: 4 };
        expect(token.precision).toBe(4);
    });

    it('Coin extends Token with chain and optional logo', () => {
        const coin: Coin = { symbol: 'EOS', contract: 'eosio.token', precision: 4, chain: 'eos' };
        expect(coin.chain).toBe('eos');
        expect(coin.logo).toBeUndefined();
    });

    it('Balance extends Coin with amount and custom properties', () => {
        const balance: Balance = {
            symbol: 'EOS',
            contract: 'eosio.token',
            precision: 4,
            chain: 'eos',
            amount: 100.5,
            customProp: 'custom',
        };
        expect(balance.amount).toBe(100.5);
        expect(balance.customProp).toBe('custom');
    });
});

describe('types/transaction', () => {
    it('Transfer interface can be instantiated', () => {
        const token: Token = { symbol: 'EOS', contract: 'eosio.token', precision: 4 };
        const transfer: Transfer = {
            receiver: 'bob',
            sender: 'alice',
            memo: 'hello',
            token,
        };
        expect(transfer.amount).toBeUndefined();
    });

    it('TransferRecord interface can be instantiated', () => {
        const token: Token = { symbol: 'EOS', contract: 'eosio.token', precision: 4 };
        const record: TransferRecord = { account: 'alice', memo: 'test', token, time: 1234567890 };
        expect(record.time).toBe(1234567890);
    });
});

describe('types/resource', () => {
    it('ResourceBase interface can be instantiated', () => {
        const base: ResourceBase = {
            use_percentage: 50,
            use_limit: { max: 1000, used: 500 },
            core_liquid_balance: '10.0000 EOS',
        };
        expect(base.use_percentage).toBe(50);
    });

    it('ResourceData extends ResourceBase', () => {
        const data: ResourceData = {
            use_percentage: 20,
            use_limit: { max: 2000, used: 400 },
            core_liquid_balance: '5.0000 EOS',
            stake_max: 100,
            refund_request: { amount: 10, request_time: 1234567890, left_time: '2h' },
            total_resources_weight: '100.00000000 EOS',
            self_delegated_bandwidth_weight: '50.00000000 EOS',
            staked_for_user: 50,
            staked_for_others: 10,
        };
        expect(data.stake_max).toBe(100);
    });
});

describe('types/settings', () => {
    it('Network interface can be instantiated', () => {
        const network: Network = {
            name: 'EOS',
            chain: 'eos',
            chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
            endpoint: 'https://eos.greymass.com',
            token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
        };
        expect(network.chain).toBe('eos');
    });

    it('RPC interface can be instantiated', () => {
        const rpc: RPC = { name: 'Greymass', endpoint: 'https://eos.greymass.com' };
        expect(rpc.delay).toBeUndefined();
    });

    it('WhiteItem interface can be instantiated', () => {
        const item: WhiteItem = {
            chainId: 'abc',
            domain: 'app.example.com',
            contract: 'eosio.token',
            action: 'transfer',
            actor: 'alice',
            permission: 'active',
            properties: { amount: '1.0000 EOS' },
            hash: 'deadbeef',
        };
        expect(item.properties.amount).toBe('1.0000 EOS');
    });

    it('CacheABI interface can be instantiated', () => {
        const abi: CacheABI = {
            chainId: 'abc',
            contract: 'eosio.token',
            updated: Date.now(),
            expire: Date.now() + 3600000,
            abi: {},
            raw: null,
        };
        expect(abi.abi).toBeDefined();
    });
});
