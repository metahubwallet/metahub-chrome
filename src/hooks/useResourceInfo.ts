import { useQuery } from '@tanstack/react-query';
import { useChainInstance } from '@/hooks/useChainInstance';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';

interface UseResourceInfoOptions {
  account?: string;
  chainId?: string;
  enabled?: boolean;
}

export function useResourceInfo(options: UseResourceInfoOptions = {}) {
  const chain = useChainInstance();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const storeChainId = useChainStore((s) => s.currentChainId());

  const account = options.account ?? currentWallet?.name;
  const chainId = options.chainId ?? storeChainId;

  return useQuery({
    queryKey: ['resourceInfo', chainId, account],
    queryFn: async () => {
      const api = chain.getApi(chainId);
      const [delegatebw, accountInfo, ramMarket] = await Promise.all([
        api.getDelegatebwList(account),
        api.getAccount(account),
        api.getRamMarket(),
      ]);
      return { delegatebw, accountInfo, ramMarket };
    },
    enabled: options.enabled !== false && !!account && !!chainId,
    refetchInterval: 10000,
  });
}
