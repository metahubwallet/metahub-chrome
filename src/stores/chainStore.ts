import { create } from 'zustand';
import { localCache } from '@/utils/cache';
import { supportNetworks, eosChainId } from '@/utils/network';
import { Network, RPC } from '@/types/settings';

interface ChainState {
    networks: Network[];
    currentNetwork: Network;
    selectedRpcs: Record<string, string>;
    customRpcs: Record<string, RPC[]>;
}

interface ChainActions {
    // Getters
    currentChain: () => string;
    currentChainId: () => string;
    findNetwork: (chainId: string) => Network;
    selectedRpc: (chainId: string) => string;
    currentSymbol: () => string;
    // Actions
    init: () => Promise<void>;
    setNetworks: (networks: Network[]) => Promise<void>;
    setCurrentNetworkByChainId: (chainId: string) => Promise<void>;
    setSelectedRpc: (chainId: string, endpoint: string) => Promise<void>;
    setCustomRpcs: (rpcs: Record<string, RPC[]>) => Promise<void>;
}

export const useChainStore = create<ChainState & ChainActions>((set, get) => ({
    networks: [],
    currentNetwork: {} as Network,
    selectedRpcs: {},
    customRpcs: {},

    currentChain: () => {
        return get().currentNetwork.chain || 'eos';
    },

    currentChainId: () => {
        return get().currentNetwork.chainId || eosChainId;
    },

    findNetwork: (chainId: string): Network => {
        const { networks } = get();
        const network = networks.find((x) => x.chainId === chainId);
        return network ?? networks[0];
    },

    selectedRpc: (chainId: string): string => {
        const { selectedRpcs, networks } = get();
        const _selectedRpc = selectedRpcs[chainId];
        if (!_selectedRpc) {
            const network = networks.find((x) => x.chainId === chainId);
            return network ? network.endpoint : '';
        }
        return _selectedRpc;
    },

    currentSymbol: (): string => {
        const { networks, currentNetwork } = get();
        const network = networks.find((x: Network) => x.chainId === currentNetwork.chainId);
        return network ? network.token.symbol : 'EOS';
    },

    init: async () => {
        const networks = (await localCache.get('networks', supportNetworks.slice(0, 3))) as Network[];
        const selectedRpcs = (await localCache.get('selectedRpcs', {})) as Record<string, string>;
        const customRpcs = (await localCache.get('customRpcs', {})) as Record<string, RPC[]>;
        set({
            networks,
            currentNetwork: networks[0],
            selectedRpcs,
            customRpcs,
        });
    },

    setNetworks: async (networks: Network[]) => {
        set({ networks });
        await localCache.set('networks', networks);
    },

    setCurrentNetworkByChainId: async (chainId: string) => {
        const { networks } = get();
        const network = networks.find((x) => x.chainId === chainId);
        if (network) {
            set({ currentNetwork: network });
        }
    },

    setSelectedRpc: async (chainId: string, endpoint: string) => {
        const selectedRpcs = { ...get().selectedRpcs, [chainId]: endpoint };
        set({ selectedRpcs });
        await localCache.set('selectedRpcs', selectedRpcs);
    },

    setCustomRpcs: async (rpcs: Record<string, RPC[]>) => {
        set({ customRpcs: rpcs });
        await localCache.set('customRpcs', rpcs);
    },
}));
