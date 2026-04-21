import { useQuery } from '@tanstack/react-query';
import { useChainInstance } from '@/hooks/useChainInstance';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';

interface UseBalanceOptions {
  contract?: string;
  account?: string;
  symbol?: string;
  enabled?: boolean;
}

export function useBalance(options: UseBalanceOptions = {}) {
  const chain = useChainInstance();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const chainId = useChainStore((s) => s.currentChainId());

  const account = options.account ?? currentWallet?.name;
  const contract = options.contract ?? 'eosio.token';
  const symbol = options.symbol ?? useChainStore.getState().currentSymbol();

  return useQuery({
    queryKey: ['balance', chainId, account, contract, symbol],
    queryFn: () => {
      const api = chain.getApi(chainId);
      return api.getCurrencyBalance(contract, account, symbol);
    },
    enabled: options.enabled !== false && !!account && !!chainId,
  });
}
