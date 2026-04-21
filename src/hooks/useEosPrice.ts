import { useQuery } from '@tanstack/react-query';
import { useChainInstance } from '@/hooks/useChainInstance';
import { useChainStore } from '@/stores/chainStore';

export function useEosPrice() {
  const chain = useChainInstance();
  const chainId = useChainStore((s) => s.currentChainId());

  return useQuery({
    queryKey: ['eosPrice', chainId],
    queryFn: () => {
      const api = chain.getApi(chainId);
      return api.getEosPrice();
    },
    staleTime: 60_000,
    enabled: !!chainId,
  });
}
