import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChainStore } from '@/stores/chainStore';
import { eosChainId, supportNetworks } from '@/utils/network';

// Reset store between tests
beforeEach(() => {
    useChainStore.setState({
        networks: supportNetworks.slice(0, 3),
        currentNetwork: supportNetworks[0],
        selectedRpcs: {},
        customRpcs: {},
    });
});

describe('chainStore', () => {
    it('currentChain returns "eos" by default', () => {
        const currentChain = useChainStore.getState().currentChain();
        expect(currentChain).toBe('eos');
    });

    it('currentChainId returns EOS chainId by default', () => {
        const currentChainId = useChainStore.getState().currentChainId();
        expect(currentChainId).toBe(eosChainId);
    });

    it('setCurrentNetworkByChainId switches to WAX network', async () => {
        const waxNetwork = supportNetworks.find((n) => n.chain === 'wax')!;

        // ensure WAX is in the networks list
        useChainStore.setState({ networks: supportNetworks.slice(0, 3) });
        await useChainStore.getState().setCurrentNetworkByChainId(waxNetwork.chainId);

        const currentChain = useChainStore.getState().currentChain();
        expect(currentChain).toBe('wax');
    });

    it('setCurrentNetworkByChainId does nothing for unknown chainId', async () => {
        const originalNetwork = useChainStore.getState().currentNetwork;
        await useChainStore.getState().setCurrentNetworkByChainId('unknown-chain-id-000');
        const currentNetwork = useChainStore.getState().currentNetwork;
        expect(currentNetwork).toEqual(originalNetwork);
    });

    it('findNetwork returns the matching network', () => {
        const waxNetwork = supportNetworks.find((n) => n.chain === 'wax')!;
        useChainStore.setState({ networks: supportNetworks.slice(0, 3) });
        const found = useChainStore.getState().findNetwork(waxNetwork.chainId);
        expect(found.chain).toBe('wax');
    });

    it('findNetwork returns first network for unknown chainId', () => {
        const networks = supportNetworks.slice(0, 3);
        useChainStore.setState({ networks });
        const found = useChainStore.getState().findNetwork('nonexistent-chain-id');
        expect(found).toEqual(networks[0]);
    });

    it('selectedRpc falls back to network endpoint when no custom rpc set', () => {
        const networks = supportNetworks.slice(0, 3);
        useChainStore.setState({ networks, selectedRpcs: {} });
        const rpc = useChainStore.getState().selectedRpc(eosChainId);
        expect(rpc).toBe(networks[0].endpoint);
    });

    it('selectedRpc returns custom rpc when set', () => {
        const networks = supportNetworks.slice(0, 3);
        const customEndpoint = 'https://custom.eos.node.com';
        useChainStore.setState({
            networks,
            selectedRpcs: { [eosChainId]: customEndpoint },
        });
        const rpc = useChainStore.getState().selectedRpc(eosChainId);
        expect(rpc).toBe(customEndpoint);
    });

    it('currentSymbol returns EOS for default network', () => {
        const symbol = useChainStore.getState().currentSymbol();
        expect(symbol).toBe('EOS');
    });
});
