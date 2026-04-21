import { create } from 'zustand';
import { localCache } from '@/utils/cache';
import { Balance, Coin } from '@/types/tokens';
import { Wallet } from '@/types/wallet';
import { TransferRecord } from '@/types/transaction';
import { useChainStore } from '@/stores/chainStore';
import axios from 'axios';

type AllTokens = Record<string, Coin[]>;

interface WalletState {
    wallets: Wallet[];
    selectedIndex: number;
    recentTransfers: TransferRecord[];
    allTokens: AllTokens;
    userTokens: Record<string, Balance[]>;
}

interface WalletActions {
    // Getters
    currentWallet: () => Wallet;
    currentWalletKey: () => string;
    currentUserTokens: () => Balance[];
    chainTokens: () => Coin[];
    getToken: (token: Coin) => Coin;
    // Actions
    init: () => Promise<void>;
    setWallets: (wallets: Wallet[]) => Promise<void>;
    setWallet: (wallet: Wallet) => Promise<void>;
    setSelectedIndex: (index: number) => Promise<void>;
    setAllTokens: (tokens: AllTokens) => Promise<void>;
    setUserTokens: (tokens: Record<string, Balance[]>) => Promise<void>;
    setCurrentUserTokens: (coins: Balance[]) => Promise<void>;
    setRecentTransfers: (transfers: TransferRecord[]) => Promise<void>;
    addRecentTransfer: (recent: TransferRecord) => Promise<void>;
}

export const useWalletStore = create<WalletState & WalletActions>((set, get) => ({
    wallets: [],
    selectedIndex: 0,
    recentTransfers: [],
    allTokens: {},
    userTokens: {},

    currentWallet: (): Wallet => {
        const { wallets, selectedIndex } = get();
        return wallets[selectedIndex];
    },

    currentWalletKey: (): string => {
        const account = get().currentWallet();
        return account.name + '@' + account.chainId.substring(0, 16);
    },

    currentUserTokens: (): Balance[] => {
        const key = get().currentWalletKey();
        const { userTokens } = get();
        if (!userTokens) return [];
        return userTokens[key] ? userTokens[key] : [];
    },

    chainTokens: (): Coin[] => {
        const currentChain = useChainStore.getState().currentChain();
        const { allTokens } = get();
        return allTokens[currentChain] ? allTokens[currentChain] : [];
    },

    getToken: (token: Coin): Coin => {
        const _chain = token.chain ?? useChainStore.getState().currentChain();
        const { allTokens } = get();
        const chainTokens = allTokens[_chain] ?? [];
        const result = chainTokens.find(
            (t) => t.contract === token.contract && t.symbol === token.symbol
        );
        return result ? result : ({} as Coin);
    },

    init: async () => {
        const wallets = (await localCache.get('wallets', [])) as Wallet[];
        const selectedIndex = (await localCache.get('selectedIndex', 0)) as number;
        const recentTransfers = (await localCache.get('recentTransfers', [])) as TransferRecord[];
        const userTokens = (await localCache.get('userTokens', {})) as Record<string, Balance[]>;
        const allTokens = await initTokens();
        set({ wallets, selectedIndex, recentTransfers, userTokens, allTokens });
    },

    setWallets: async (wallets: Wallet[]) => {
        set({ wallets });
        await localCache.set('wallets', wallets);
    },

    setWallet: async (wallet: Wallet) => {
        const { wallets } = get();
        const idx = wallets.findIndex(
            (x) => x.chainId === wallet.chainId && x.name === wallet.name
        );
        let updatedWallets: Wallet[];
        if (idx >= 0) {
            updatedWallets = [...wallets];
            updatedWallets[idx] = wallet;
        } else {
            updatedWallets = [...wallets, wallet];
        }
        set({ wallets: updatedWallets });
        await localCache.set('wallets', updatedWallets);
    },

    setSelectedIndex: async (index: number) => {
        const { wallets } = get();
        if (index >= 0 && index <= wallets.length) {
            set({ selectedIndex: index });
            const wallet = wallets[index];
            useChainStore.getState().setCurrentNetworkByChainId(wallet.chainId);
            await localCache.set('selectedIndex', index);
        }
    },

    setAllTokens: async (tokens: AllTokens) => {
        set({ allTokens: tokens });
        await localCache.set('allTokens', tokens);
    },

    setUserTokens: async (tokens: Record<string, Balance[]>) => {
        set({ userTokens: tokens });
        await localCache.set('userTokens', tokens);
    },

    setCurrentUserTokens: async (coins: Balance[]) => {
        const key = get().currentWalletKey();
        const userTokens = { ...get().userTokens, [key]: coins };
        set({ userTokens });
        await localCache.set('userTokens', userTokens);
    },

    setRecentTransfers: async (transfers: TransferRecord[]) => {
        set({ recentTransfers: transfers });
        await localCache.set('recentTransfers', transfers);
    },

    addRecentTransfer: async (recent: TransferRecord) => {
        let recentTransfers = get().recentTransfers.filter((oldItem) => {
            return oldItem.account !== recent.account && oldItem.memo !== recent.memo;
        });
        // max 100
        if (recentTransfers.length > 99) {
            recentTransfers.splice(99, recentTransfers.length - 99);
        }
        // add to front
        recentTransfers.unshift(recent);
        set({ recentTransfers });
        await localCache.set('recentTransfers', recentTransfers);
    },
}));

// ---- Module-level token helpers ----

const getLocalTokens = async (): Promise<Coin[]> => {
    try {
        const localTokens = await import('@/assets/json/tokens.json');
        return (localTokens.default as Coin[]).map((t) => ({ ...t, logo: '' }));
    } catch {
        return [];
    }
};

const getTokensFromJson = (tokenArray: Coin[]): AllTokens => {
    const tokenMap: AllTokens = {};
    for (const token of tokenArray) {
        if (typeof tokenMap[token.chain] === 'undefined') {
            tokenMap[token.chain] = [];
        }
        const name = `${token.chain}/${token.contract}-${token.symbol}.png`.toLowerCase();
        token.logo =
            'https://cdn.jsdelivr.net/gh/metahubwallet/eos-tokens@master/logos/' + name;
        tokenMap[token.chain].push(token);
    }
    return tokenMap;
};

const initTokens = async (): Promise<AllTokens> => {
    // Always read bundled tokens.json — it ships with every release and carries
    // the latest default tokens (e.g. Vaulta:A added in v3). This makes the
    // catalog self-heal for v2→v3 upgraders whose cache pre-dates new defaults.
    const localTokenArray = await getLocalTokens();
    const bundledTokens = getTokensFromJson(localTokenArray);

    const tokenData = (await localCache.get('allTokens', {})) as {
        tokens: AllTokens;
        updateAt: number;
    };
    const cachedTokens = tokenData?.tokens ?? {};
    const tokensUpdateAt = tokenData?.updateAt ?? 0;

    // Union cached (possibly fresher from CDN) with bundled — dedup by contract+symbol.
    // Bundled entries fill any gaps the cache is missing.
    const allTokens: AllTokens = { ...cachedTokens };
    const tokenKey = (t: Coin) => `${t.contract}:${t.symbol}`;
    for (const [chain, bundled] of Object.entries(bundledTokens)) {
        const existing = allTokens[chain] ?? [];
        const existingKeys = new Set(existing.map(tokenKey));
        const missing = bundled.filter((t) => !existingKeys.has(tokenKey(t)));
        allTokens[chain] = [...existing, ...missing];
    }

    // Persist merged catalog so subsequent reads see the union directly.
    localCache.set('allTokens', { tokens: allTokens, updateAt: tokensUpdateAt || Date.now() });

    if (Date.now() - tokensUpdateAt > 86400000) {
        setTimeout(updateTokens, 1);
    }

    return allTokens;
};

const updateTokens = () => {
    const url = 'https://cdn.jsdelivr.net/gh/metahubwallet/eos-tokens@master/tokens.json';
    axios
        .get(url)
        .then((response) => {
            const tokenArray =
                typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const tokenMap = getTokensFromJson(tokenArray);
            useWalletStore.getState().setAllTokens(tokenMap);
        })
        .catch((error) => {
            console.error('Failed to update tokens:', error);
        });
};
