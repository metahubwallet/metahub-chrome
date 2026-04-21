import { useQuery } from '@tanstack/react-query';
import { useChainInstance } from '@/hooks/useChainInstance';
import { useChainStore } from '@/stores/chainStore';

interface UsePowupStateOptions {
  chainId?: string;
  enabled?: boolean;
}

export function usePowupState(options: UsePowupStateOptions = {}) {
  const chain = useChainInstance();
  const storeChainId = useChainStore((s) => s.currentChainId());
  const chainId = options.chainId ?? storeChainId;

  return useQuery({
    queryKey: ['powupState', chainId],
    queryFn: () => {
      const api = chain.getApi(chainId);
      return api.getPowupState();
    },
    staleTime: 60 * 60 * 1000,
    enabled: options.enabled !== false && !!chainId,
  });
}
