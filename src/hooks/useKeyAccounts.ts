import { useQuery } from '@tanstack/react-query';
import { getKeyAccounts, type lightKey } from '@/lib/remote';
import { useChainInstance } from '@/hooks/useChainInstance';
import { useChainStore } from '@/stores/chainStore';

interface UseKeyAccountsOptions {
  publicKey: string;
  chainId?: string;
  enabled?: boolean;
}

export function useKeyAccounts(options: UseKeyAccountsOptions) {
  const chain = useChainInstance();
  const currentChain = useChainStore((s) => s.currentChain());
  const storeChainId = useChainStore((s) => s.currentChainId());

  const chainId = options.chainId ?? storeChainId;

  return useQuery({
    queryKey: ['keyAccounts', currentChain, options.publicKey],
    queryFn: async () => {
      // Try remote light-api first, fall back to chain RPC
      const remoteAccounts = await getKeyAccounts(currentChain as lightKey, options.publicKey);
      if (remoteAccounts.length > 0) {
        return remoteAccounts;
      }
      const api = chain.getApi(chainId);
      return api.getKeyAccounts(options.publicKey);
    },
    enabled: options.enabled !== false && !!options.publicKey,
  });
}
