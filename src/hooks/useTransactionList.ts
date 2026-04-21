import { useQuery } from '@tanstack/react-query';
import { getTransactionList } from '@/lib/remote';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';

interface UseTransactionListOptions {
  account?: string;
  contract?: string;
  limit?: number;
  skip?: number;
  enabled?: boolean;
}

export function useTransactionList(options: UseTransactionListOptions = {}) {
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentChain = useChainStore((s) => s.currentChain());

  const account = options.account ?? currentWallet?.name;
  const contract = options.contract;
  const limit = options.limit ?? 20;
  const skip = options.skip ?? 0;

  return useQuery({
    queryKey: ['transactionList', currentChain, account, contract, limit, skip],
    queryFn: () => {
      const params: Record<string, any> = {
        account,
        limit,
        skip,
        sort: 'desc',
      };
      // Hyperion `filter=<code>:<action>` narrows server-side to a specific
      // contract's action. Use it when we only care about one token so the
      // endpoint doesn't ship back every transfer for the account.
      if (contract) {
        params.filter = `${contract}:transfer`;
      } else {
        params['act.name'] = 'transfer';
      }
      return getTransactionList(currentChain, params);
    },
    enabled: options.enabled !== false && !!account && !!currentChain,
  });
}
