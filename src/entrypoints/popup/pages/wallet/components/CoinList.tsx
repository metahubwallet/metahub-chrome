import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus } from 'lucide-react';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { getBalanceList, isSupportChain } from '@/lib/remote';
import { Balance, Coin } from '@/types/tokens';
import { tool } from '@/utils/tool';
import { getChainInstance } from '@/hooks/useChainInstance';
import { eosChainId } from '@/utils/network';
import TokenSelector from '@/components/TokenSelector';
import eosIcon from '@/assets/images/eos_icon.png';
import placeholderImg from '@/assets/images/placeholder.png';

interface CoinListProps {
  onSetUnit?: (unit: string) => void;
  onSetAmount?: (amount: number) => void;
  onIsLoading?: (loading: boolean) => void;
}

let hasFetchedOnce = false;

const CoinList: React.FC<CoinListProps> = ({ onSetUnit, onSetAmount, onIsLoading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentNetwork = useChainStore((s) => s.currentNetwork);
  const currentChainFn = useChainStore((s) => s.currentChain);
  const currentChainIdFn = useChainStore((s) => s.currentChainId);
  const selectedIndex = useWalletStore((s) => s.selectedIndex);
  const [showAddToken, setShowAddToken] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [tokens, setTokens] = React.useState<Balance[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const refreshTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const getCoinsLogo = (coins: Coin[]) => {
    const walletStore = useWalletStore.getState();
    return coins.map((coin) => {
      const t = walletStore.getToken(coin);
      return { ...coin, logo: t.logo || coin.logo || '' };
    });
  };

  const getUserBalance = async (currentTokens: Balance[]): Promise<Balance[]> => {
    const updatedTokens = [...currentTokens];
    const userCoins = currentTokens.map((x) => ({ contract: x.contract, symbol: x.symbol })) as Coin[];
    const walletStore = useWalletStore.getState();
    const currentWallet = walletStore.currentWallet();
    if (!currentWallet?.name) return updatedTokens;

    const chainId = useChainStore.getState().currentChainId();
    const chainApi = getChainInstance().getApi(chainId);
    await getBalanceList(currentWallet.name, userCoins, chainApi, (coin: Balance) => {
      const idx = updatedTokens.findIndex(
        (x) => x.contract === coin.contract && x.symbol === coin.symbol
      );
      if (idx >= 0) {
        updatedTokens[idx] = { ...updatedTokens[idx], amount: coin.amount };
      }
    });
    return updatedTokens;
  };

  const handleGetEosPrice = async (currentTokens: Balance[]) => {
    const nativeToken = currentTokens.find(
      (i) => i.contract === 'eosio.token'
    );
    if (!nativeToken) return;

    if (nativeToken.chain === 'eos' && nativeToken.symbol === 'EOS') {
      try {
        const eosPrice = await getChainInstance().getApi().getEosPrice();
        onSetUnit?.('usd');
        onSetAmount?.(
          parseFloat(
            tool.bignum(String(nativeToken.amount)).times(eosPrice).toFixed(4)
          )
        );
      } catch (_e) {
        // Price fetch failed — show EOS amount only if no cached USD value
        if (!hasFetchedOnce) {
          onSetUnit?.(nativeToken.symbol);
          onSetAmount?.(nativeToken.amount);
        }
      }
    } else {
      // Non-EOS chain — show native token amount
      onSetUnit?.(nativeToken.symbol);
      onSetAmount?.(nativeToken.amount);
    }
  };

  const getWalletCache = async () => {
    const currentChainId = currentChainIdFn();
    if (currentChainId !== eosChainId) return;
    try {
      const walletStore = useWalletStore.getState();
      const currentWallet = walletStore.currentWallet();
      if (!currentWallet?.name) return;
      const response: any = await getChainInstance().getApi().getREXInfo(currentWallet.name);
      const rexEOS = response?.['rows']?.[0]?.['vote_stake'] ?? 0;
      const rexCount = response?.['rows']?.[0]?.['rex_balance'] ?? 0;
    } catch (_e) {}
  };

  const loadTokens = async (silent = false) => {
    if (!silent) {
      if (isLoading) return;
      setIsLoading(true);
      onIsLoading?.(true);
    }
    setIsRefreshing(true);

    try {
      const walletStore = useWalletStore.getState();
      let currentTokens = walletStore.currentUserTokens();
      const chain = currentChainFn();

      // First-time wallet: seed with native + EOS-chain defaults.
      if (currentTokens.length === 0) {
        const defaultTokens: Balance[] = [
          { amount: 0, ...currentNetwork.token, chain, logo: '' },
        ];
        if (chain === 'eos') {
          defaultTokens.push(
            { amount: 0, contract: 'core.vaulta', symbol: 'A', precision: 4, chain, logo: '' },
            { amount: 0, contract: 'usdt.xsat', symbol: 'USDT', precision: 4, chain, logo: '' },
          );
        }
        await walletStore.setCurrentUserTokens(defaultTokens);
        currentTokens = defaultTokens;
      } else if (chain === 'eos') {
        // Returning user (e.g. wallet v2 upgrader) — backfill any EOS defaults they're missing.
        // Idempotent: skips entries already present by contract+symbol.
        const has = (contract: string, symbol: string) =>
          currentTokens.some((t) => t.contract === contract && t.symbol === symbol);
        const missing: Balance[] = [];
        if (!has('core.vaulta', 'A')) {
          missing.push({ amount: 0, contract: 'core.vaulta', symbol: 'A', precision: 4, chain, logo: '' });
        }
        if (!has('usdt.xsat', 'USDT')) {
          missing.push({ amount: 0, contract: 'usdt.xsat', symbol: 'USDT', precision: 4, chain, logo: '' });
        }
        if (missing.length > 0) {
          currentTokens = [...currentTokens, ...missing];
          await walletStore.setCurrentUserTokens(currentTokens);
        }
      }

      const tokensWithLogos = getCoinsLogo(currentTokens) as Balance[];
      if (!silent) {
        setTokens(tokensWithLogos);
      }

      const updatedTokens = await getUserBalance(tokensWithLogos);
      setTokens(updatedTokens);
      await walletStore.setCurrentUserTokens(updatedTokens);

      await handleGetEosPrice(updatedTokens);
      await getWalletCache();
      hasFetchedOnce = true;
    } finally {
      setIsRefreshing(false);
      if (!silent) {
        setIsLoading(false);
        onIsLoading?.(false);
      }
    }
  };

  const startRefreshTimer = () => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(() => {
      loadTokens(true);
    }, 10000);
  };

  const prevSelectedIndexRef = React.useRef(selectedIndex);

  // Load on mount and when selected wallet changes
  React.useEffect(() => {
    const walletChanged = prevSelectedIndexRef.current !== selectedIndex;
    prevSelectedIndexRef.current = selectedIndex;

    if (walletChanged) {
      // Wallet switched — full reload with loading state
      hasFetchedOnce = false;
      loadTokens(false);
    } else if (!hasFetchedOnce) {
      // First mount — full reload with loading state
      loadTokens(false);
    } else {
      // Returning to page with cache — show cached data, refresh silently
      const walletStore = useWalletStore.getState();
      const cached = walletStore.currentUserTokens();
      if (cached.length > 0) {
        setTokens(getCoinsLogo(cached) as Balance[]);
      }
      loadTokens(true);
    }

    startRefreshTimer();
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const handleViewCoin = (item: Coin) => {
    if (!isSupportChain(currentChainFn())) return;
    const token = `${item.contract}-${item.symbol}`;
    navigate(`/token-traces/${token}`);
  };

  const sortedTokens = React.useMemo(() => {
    const priority = (tk: Balance) => {
      const sym = tk.symbol.toUpperCase();
      if (sym === 'A' && tk.contract === 'core.vaulta') return 0;
      if (sym === 'EOS' && tk.contract === 'eosio.token') return 1;
      return 2;
    };
    return [...tokens].sort((x, y) => priority(x) - priority(y));
  }, [tokens]);

  const getTokenImgSrc = (item: Balance) => {
    if (currentChainFn() === 'eos' && item.contract === 'eosio.token') {
      return eosIcon;
    }
    return item.logo || placeholderImg;
  };

  return (
    <div className="flex flex-col w-full flex-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EEE7F7] px-4 h-12">
        <span className="font-bold text-base text-[#3F3F46]">
          {t('wallet.totalAssets')}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadTokens()}
            className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-lg transition-colors cursor-pointer"
            aria-label={t('wallet.refresh') || 'Refresh'}
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddToken(true)}
            className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-lg transition-colors cursor-pointer"
            aria-label={t('wallet.addNewTokens') || 'Add token'}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Token list */}
      <div className="overflow-y-auto flex-1">
        {sortedTokens.map((item, index) => (
          <div
            key={`${item.contract}-${item.symbol}-${index}`}
            className="flex items-center justify-between h-[60px] px-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-[#EEE7F7]"
            onClick={() => handleViewCoin(item)}
          >
            <div className="flex items-center gap-3">
              <img
                src={getTokenImgSrc(item)}
                className="w-8 h-8 rounded-full"
                alt={item.symbol}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = placeholderImg;
                }}
              />
              <span className="text-sm font-medium text-[#3F3F46]">{item.symbol}</span>
            </div>
            <span className="text-sm font-semibold text-[#3F3F46]">{item.amount}</span>
          </div>
        ))}
      </div>

      <TokenSelector isOpen={showAddToken} onClose={() => setShowAddToken(false)} />
    </div>
  );
};

export default CoinList;
