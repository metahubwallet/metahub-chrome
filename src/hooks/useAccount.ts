import { useQuery } from '@tanstack/react-query';
import { useChainInstance } from '@/hooks/useChainInstance';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';

interface UseAccountOptions {
  account?: string;
  chainId?: string;
  enabled?: boolean;
}

export function useAccount(options: UseAccountOptions = {}) {
  const chain = useChainInstance();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const storeChainId = useChainStore((s) => s.currentChainId());

  const account = options.account ?? currentWallet?.name;
  const chainId = options.chainId ?? storeChainId;

  return useQuery({
    queryKey: ['account', chainId, account],
    queryFn: () => {
      const api = chain.getApi(chainId);
      return api.getAccount(account);
    },
    enabled: options.enabled !== false && !!account && !!chainId,
  });
}
