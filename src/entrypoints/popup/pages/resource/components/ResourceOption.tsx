import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import PopupBottom from '@/components/PopupBottom';
import NumberInput from '@/components/NumberInput';
import { getChainInstance } from '@/hooks/useChainInstance';
import { usePowupState } from '@/hooks/usePowupState';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { powerup } from '@/lib/powerup';
import { ResourceData } from '@/entrypoints/popup/pages/resource/ResourcePage';
import { useSystemContract } from '@/entrypoints/popup/pages/resource/systemContractContext';

type Action = 'stake' | 'refund' | 'rent';

interface ResourceOptionProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  action: Action;
  resources: { cpu: ResourceData; net: ResourceData };
}

const ResourceOption: React.FC<ResourceOptionProps> = ({
  isOpen,
  onClose,
  onRefresh,
  action,
  resources,
}) => {
  const { t } = useTranslation();
  const chain = getChainInstance();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentChainId = useChainStore((s) => s.currentChainId());
  const chainSymbol = useChainStore((s) => s.currentSymbol());
  const currentNetwork = useChainStore((s) => s.currentNetwork);
  const { contract: systemContract, symbol: tokenSymbol } = useSystemContract();
  const currentSymbol = chainSymbol === 'EOS' ? tokenSymbol : chainSymbol;

  const { data: powupStateData } = usePowupState({ enabled: action === 'rent' && isOpen });

  const [receiver, setReceiver] = React.useState<string>(currentWallet?.name ?? '');
  const [cpuValue, setCpuValue] = React.useState<number>(0);
  const [netValue, setNetValue] = React.useState<number>(0);
  const [transfer, setTransfer] = React.useState<boolean>(false);
  const [estimatedCost, setEstimatedCost] = React.useState<string>('');

  const precision = currentNetwork?.token?.precision ?? 4;

  const formatValue = React.useCallback(
    (value: number): string => {
      return `${value.toFixed(precision)} ${currentSymbol}`;
    },
    [precision, currentSymbol]
  );

  const getEstimatedCost = React.useCallback(
    (cpu: number, net: number) => {
      if (action !== 'rent' || !powupStateData) return;
      const cpuQ = formatValue(cpu);
      const netQ = formatValue(net);
      const params = powerup('', '', cpuQ, netQ, powupStateData, currentSymbol);
      setEstimatedCost(params.max_payment);
    },
    [action, formatValue, powupStateData, currentSymbol]
  );

  React.useEffect(() => {
    if (!isOpen || action !== 'rent' || !powupStateData) return;
    getEstimatedCost(cpuValue, netValue);
  }, [isOpen, action, powupStateData, cpuValue, netValue, getEstimatedCost]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (!isOpen) return;
    setReceiver(currentWallet?.name ?? '');
    setTransfer(false);
    setEstimatedCost('');

    if (action === 'stake') {
      setCpuValue(0);
      setNetValue(0);
    } else if (action === 'refund') {
      setCpuValue(parseFloat(resources.cpu.self_delegated_bandwidth_weight) || 0);
      setNetValue(parseFloat(resources.net.self_delegated_bandwidth_weight) || 0);
    } else if (action === 'rent') {
      setCpuValue(5000);
      setNetValue(100);
      getEstimatedCost(5000, 100);
    }
  }, [isOpen, action]); // eslint-disable-line react-hooks/exhaustive-deps

  const modalTitle = React.useMemo(() => {
    if (action === 'stake') return `${t('resource.stake')} ${t('resource.resources')}`;
    if (action === 'refund') return `${t('resource.unstake')} ${t('resource.resources')}`;
    return `${t('resource.rent')} ${t('resource.resources')}`;
  }, [action, t]);

  const receiverVisible = action === 'stake' || action === 'rent';
  const transferVisible = action === 'stake';

  const cpuPlaceholder = React.useMemo(() => {
    if (action === 'stake') return `${resources.cpu.stake_max} ${currentSymbol}`;
    if (action === 'refund') return resources.cpu.self_delegated_bandwidth_weight;
    return formatValue(0);
  }, [action, resources, currentSymbol, formatValue]);

  const netPlaceholder = React.useMemo(() => {
    if (action === 'stake') return `${resources.net.stake_max} ${currentSymbol}`;
    if (action === 'refund') return resources.net.self_delegated_bandwidth_weight;
    return formatValue(0);
  }, [action, resources, currentSymbol, formatValue]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const cpuQuantity = formatValue(cpuValue);
      const netQuantity = formatValue(netValue);

      if (cpuQuantity === formatValue(0) && netQuantity === formatValue(0)) {
        throw new Error(t('resource.valueError'));
      }

      const api = chain.getApi(currentChainId);
      const auth = chain.getAuth();

      if (action === 'stake') {
        return api.delegatebw(
          currentWallet?.name,
          receiver,
          netQuantity,
          cpuQuantity,
          transfer,
          auth,
          systemContract
        );
      } else if (action === 'refund') {
        return api.undelegatebw(
          currentWallet?.name,
          currentWallet?.name,
          netQuantity,
          cpuQuantity,
          auth,
          systemContract
        );
      } else if (action === 'rent') {
        const params = powerup(
          currentWallet?.name,
          receiver,
          cpuQuantity,
          netQuantity,
          powupStateData ?? null,
          currentSymbol
        );
        return api.powerup(params, auth, systemContract);
      }
    },
    onSuccess: () => {
      toast.success(t('resource.stakeSuccess'));
      onRefresh();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.message ?? chain.getErrorMsg(err);
      toast.error(msg);
      onClose();
    },
  });

  const handleCpuChange = (value: number) => {
    setCpuValue(value);
    getEstimatedCost(value, netValue);
  };

  const handleNetChange = (value: number) => {
    setNetValue(value);
    getEstimatedCost(cpuValue, value);
  };

  return (
    <PopupBottom isOpen={isOpen} title={modalTitle} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {/* Receiver */}
        {receiverVisible && (
          <div>
            <span className="block text-sm mb-1">{t('resource.stakeReceiver')}</span>
            <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} />
          </div>
        )}

        {/* CPU amount */}
        <div>
          <span className="block text-sm mb-1">
            CPU {t('resource.amount')}
          </span>
          <div className="flex items-center gap-2">
            <NumberInput
              value={cpuValue}
              min={0}
              step={0.1}
              precision={precision}
              placeholder={cpuPlaceholder}
              onChange={handleCpuChange}
              className="flex-1"
            />
            <span className="text-sm text-gray-400">{currentSymbol}</span>
          </div>
        </div>

        {/* NET amount */}
        <div>
          <span className="block text-sm mb-1">
            NET {t('resource.amount')}
          </span>
          <div className="flex items-center gap-2">
            <NumberInput
              value={netValue}
              min={0}
              step={0.1}
              precision={precision}
              placeholder={netPlaceholder}
              onChange={handleNetChange}
              className="flex-1"
            />
            <span className="text-sm text-gray-400">{currentSymbol}</span>
          </div>
        </div>

        {/* Estimated cost (rent only) */}
        {action === 'rent' && estimatedCost && (
          <div className="text-sm text-gray-600">
            {t('resource.estimatedCost')}: {estimatedCost}
          </div>
        )}

        {/* Transfer stake checkbox (stake only) */}
        {transferVisible && (
          <Checkbox
            id="transfer-stake"
            checked={transfer}
            label={t('resource.transferStake')}
            onCheckedChange={(checked) => setTransfer(checked === true)}
          />
        )}

        <div className="flex flex-row gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('public.cancel')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || (action === 'rent' && !powupStateData)}
          >
            {submitMutation.isPending || (action === 'rent' && !powupStateData) ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('public.ok')}
              </span>
            ) : (
              t('public.ok')
            )}
          </Button>
        </div>
      </div>
    </PopupBottom>
  );
};

export default ResourceOption;
