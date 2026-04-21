import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWalletStore } from '@/stores/walletStore';

interface UseSmoothModeTimeOptions {
  account?: string;
  enabled?: boolean;
}

export function useSmoothModeTime(options: UseSmoothModeTimeOptions = {}) {
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const account = options.account ?? currentWallet?.name;

  return useQuery({
    queryKey: ['smoothModeTime', account],
    queryFn: () => api.resource.getTime(account),
    enabled: options.enabled !== false && !!account,
  });
}
