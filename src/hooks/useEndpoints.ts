import { useQuery } from '@tanstack/react-query';
import { getEndpoints } from '@/lib/remote';
import { useChainStore } from '@/stores/chainStore';

interface UseEndpointsOptions {
  chainName?: string;
  enabled?: boolean;
}

export function useEndpoints(options: UseEndpointsOptions = {}) {
  const currentChain = useChainStore((s) => s.currentChain());
  const chainName = options.chainName ?? currentChain;

  return useQuery({
    queryKey: ['endpoints', chainName],
    queryFn: () => getEndpoints(chainName),
    enabled: options.enabled !== false && !!chainName,
  });
}
