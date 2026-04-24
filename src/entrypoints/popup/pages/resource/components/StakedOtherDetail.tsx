import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PopupBottom from '@/components/PopupBottom';
import { getChainInstance } from '@/hooks/useChainInstance';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { useSystemContract } from '@/entrypoints/popup/pages/resource/systemContractContext';

interface StakedOtherDetailProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  type: 'cpu' | 'net';
}

interface StakeRow {
  from: string;
  to: string;
  cpu_weight: string;
  net_weight: string;
}

const StakedOtherDetail: React.FC<StakedOtherDetailProps> = ({
  isOpen,
  onClose,
  onRefresh,
  type,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const chain = getChainInstance();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentChainId = useChainStore((s) => s.currentChainId());
  const chainSymbol = useChainStore((s) => s.currentSymbol());
  const { contract: systemContract, symbol: tokenSymbol } = useSystemContract();
  const isEosFamily = chainSymbol === 'EOS';
  const remapSymbol = React.useCallback(
    (s: string) => (isEosFamily ? s.replace(/\bEOS\b/g, tokenSymbol) : s),
    [isEosFamily, tokenSymbol]
  );

  const { data: stakeList = [] } = useQuery<StakeRow[]>({
    queryKey: ['delegatebwList', currentChainId, currentWallet?.name],
    queryFn: async () => {
      const api = chain.getApi(currentChainId);
      return api.getDelegatebwList(currentWallet?.name);
    },
    enabled: isOpen && !!currentWallet?.name,
  });

  const otherRows = React.useMemo<StakeRow[]>(() => {
    return stakeList.filter((row) => row.to !== currentWallet?.name);
  }, [stakeList, currentWallet?.name]);

  const filteredRows = React.useMemo<StakeRow[]>(() => {
    const zero = `0.0000 ${isEosFamily ? 'EOS' : chainSymbol}`;
    return otherRows.filter((row) => {
      if (type === 'cpu') return row.cpu_weight !== zero;
      return row.net_weight !== zero;
    });
  }, [otherRows, type, isEosFamily, chainSymbol]);

  const unstakeMutation = useMutation({
    mutationFn: async (item: StakeRow) => {
      const api = chain.getApi(currentChainId);
      const auth = chain.getAuth();
      return api.undelegatebw(
        item.from,
        item.to,
        remapSymbol(item.net_weight),
        remapSymbol(item.cpu_weight),
        auth,
        systemContract
      );
    },
    onSuccess: () => {
      toast.success(t('resource.stakeSuccess'));
      queryClient.invalidateQueries({ queryKey: ['delegatebwList'] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => {
      toast.error(chain.getErrorMsg(err));
    },
  });

  return (
    <PopupBottom isOpen={isOpen} title={t('resource.stakeInfo')} onClose={onClose}>
      <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
        {filteredRows.length === 0 ? (
          <div className="h-[60px] flex items-center justify-center text-sm text-gray-500">
            {t('resource.noStakeForOthers')}
          </div>
        ) : (
          filteredRows.map((item, idx) => (
            <div
              key={`${item.to}-${idx}`}
              className="flex flex-row items-center justify-between mx-4 mb-3 h-[45px] border-b border-gray-100"
            >
              <span className="text-[15px] font-semibold text-gray-800">{item.to}:</span>
              <span className="text-[15px] font-semibold text-gray-500">
                {remapSymbol(type === 'cpu' ? item.cpu_weight : item.net_weight)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={unstakeMutation.isPending}
                onClick={() => unstakeMutation.mutate(item)}
              >
                {t('resource.unstake')}
              </Button>
            </div>
          ))
        )}
      </div>
    </PopupBottom>
  );
};

export default StakedOtherDetail;
