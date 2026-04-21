import { describe, it, expect, beforeEach } from 'vitest';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { supportNetworks } from '@/utils/network';
import { Wallet } from '@/types/wallet';
import { TransferRecord } from '@/types/transaction';

const mockWallet1: Wallet = {
    name: 'alice',
    chainId: supportNetworks[0].chainId,
    keys: [{ publicKey: 'EOS6Rh...', privateKey: '', permissions: ['active'] }],
    seed: '',
    blockchain: 'eos',
    smoothMode: false,
};

const mockWallet2: Wallet = {
    name: 'bob',
    chainId: supportNetworks[1].chainId,
    keys: [{ publicKey: 'EOS7Rh...', privateKey: '', permissions: ['active'] }],
    seed: '',
    blockchain: 'eos',
    smoothMode: false,
};

beforeEach(() => {
    useChainStore.setState({
        networks: supportNetworks.slice(0, 3),
        currentNetwork: supportNetworks[0],
        selectedRpcs: {},
        customRpcs: {},
    });
    useWalletStore.setState({
        wallets: [mockWallet1, mockWallet2],
        selectedIndex: 0,
        recentTransfers: [],
        allTokens: {},
        userTokens: {},
    });
});

describe('walletStore', () => {
    it('currentWallet returns the selected wallet', () => {
        const wallet = useWalletStore.getState().currentWallet();
        expect(wallet).toEqual(mockWallet1);
    });

    it('currentWallet returns second wallet when selectedIndex is 1', () => {
        useWalletStore.setState({ selectedIndex: 1 });
        const wallet = useWalletStore.getState().currentWallet();
        expect(wallet).toEqual(mockWallet2);
    });

    it('currentWalletKey returns name@chainIdPrefix', () => {
        const key = useWalletStore.getState().currentWalletKey();
        expect(key).toBe(`alice@${mockWallet1.chainId.substring(0, 16)}`);
    });

    it('currentUserTokens returns empty array when no tokens set', () => {
        const tokens = useWalletStore.getState().currentUserTokens();
        expect(tokens).toEqual([]);
    });

    it('addRecentTransfer adds a transfer to the front', async () => {
        const record: TransferRecord = {
            account: 'charlie',
            memo: 'hello',
            token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
            time: Date.now(),
        };
        await useWalletStore.getState().addRecentTransfer(record);
        const transfers = useWalletStore.getState().recentTransfers;
        expect(transfers[0]).toEqual(record);
    });

    it('addRecentTransfer caps at 100 transfers', async () => {
        // pre-fill with 99 unique transfers
        const existing: TransferRecord[] = Array.from({ length: 99 }, (_, i) => ({
            account: `user${i}`,
            memo: `memo${i}`,
            token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
            time: Date.now() + i,
        }));
        useWalletStore.setState({ recentTransfers: existing });

        // add one more
        const newRecord: TransferRecord = {
            account: 'newuser',
            memo: 'newmemo',
            token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
            time: Date.now() + 9999,
        };
        await useWalletStore.getState().addRecentTransfer(newRecord);

        const transfers = useWalletStore.getState().recentTransfers;
        expect(transfers.length).toBeLessThanOrEqual(100);
        expect(transfers[0]).toEqual(newRecord);
    });

    it('addRecentTransfer removes duplicate account+memo before inserting', async () => {
        const existing: TransferRecord = {
            account: 'alice',
            memo: 'gift',
            token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
            time: 1000,
        };
        useWalletStore.setState({ recentTransfers: [existing] });

        const updated: TransferRecord = { ...existing, time: 2000 };
        await useWalletStore.getState().addRecentTransfer(updated);

        const transfers = useWalletStore.getState().recentTransfers;
        // old one removed, new one added at front — should be exactly 1
        expect(transfers.length).toBe(1);
        expect(transfers[0].time).toBe(2000);
    });

    it('setWallet updates existing wallet by chainId+name', async () => {
        const updatedAlice: Wallet = { ...mockWallet1, smoothMode: true };
        await useWalletStore.getState().setWallet(updatedAlice);
        const wallet = useWalletStore.getState().wallets[0];
        expect(wallet.smoothMode).toBe(true);
    });

    it('setWallet appends new wallet when not found', async () => {
        const newWallet: Wallet = {
            name: 'charlie',
            chainId: supportNetworks[2].chainId,
            keys: [],
            seed: '',
            blockchain: 'eos',
            smoothMode: false,
        };
        await useWalletStore.getState().setWallet(newWallet);
        expect(useWalletStore.getState().wallets).toHaveLength(3);
    });
});
