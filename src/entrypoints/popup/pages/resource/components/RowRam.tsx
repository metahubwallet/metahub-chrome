import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import VerticalBar from '@/entrypoints/popup/pages/resource/components/VerticalBar';
import PopupBottom from '@/components/PopupBottom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumberInput from '@/components/NumberInput';
import { getChainInstance } from '@/hooks/useChainInstance';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { ResourceBase } from '@/entrypoints/popup/pages/resource/ResourcePage';
import { useSystemContract } from '@/entrypoints/popup/pages/resource/systemContractContext';

interface RowRamProps {
  memory: ResourceBase;
  ramprice: number;
  onRefresh: () => void;
}

type RamAction = 'buyRam' | 'sellRam';
type BuyUnit = 'eos' | 'bytes';

const RowRam: React.FC<RowRamProps> = ({ memory, ramprice, onRefresh }) => {
  const { t } = useTranslation();
  const chain = getChainInstance();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentChainId = useChainStore((s) => s.currentChainId());
  const chainSymbol = useChainStore((s) => s.currentSymbol());
  const currentNetwork = useChainStore((s) => s.currentNetwork);
  const { contract: systemContract, symbol: tokenSymbol } = useSystemContract();
  const currentSymbol = chainSymbol === 'EOS' ? tokenSymbol : chainSymbol;

  const [modalVisible, setModalVisible] = React.useState(false);
  const [action, setAction] = React.useState<RamAction>('buyRam');
  const [buyUnit, setBuyUnit] = React.useState<BuyUnit>('eos');
  const [receiver, setReceiver] = React.useState<string>(currentWallet?.name ?? '');
  const [inputValue, setInputValue] = React.useState<number>(0);

  const [animatedPct, setAnimatedPct] = React.useState(0);
  React.useEffect(() => {
    const id = setTimeout(() => setAnimatedPct(memory.use_percentage), 20);
    return () => clearTimeout(id);
  }, [memory.use_percentage]);

  const precision = currentNetwork?.token?.precision ?? 4;

  const modalTitle = React.useMemo(() => {
    if (action === 'buyRam') return `${t('resource.buy')} ${t('resource.ram')}`;
    return `${t('resource.sell')} ${t('resource.ram')}`;
  }, [action, t]);

  // Linear approximation of the Bancor RAM curve. ramprice = EOS per KB,
  // so bytes-per-EOS = 1024 / ramprice.
  const bytesPerEos = ramprice > 0 ? 1024 / ramprice : 0;

  const placeholder = React.useMemo(() => {
    if (action === 'buyRam') {
      if (buyUnit === 'bytes') {
        // Approximate Bytes buyable with current liquid balance
        const eosLiquid = parseFloat(memory.core_liquid_balance) || 0;
        const bytes = Math.floor(eosLiquid * bytesPerEos);
        return `${bytes} Bytes`;
      }
      return memory.core_liquid_balance;
    }
    const availBytes = Math.max(0, memory.use_limit.max - memory.use_limit.used);
    return `${availBytes} Bytes`;
  }, [action, buyUnit, memory, bytesPerEos]);

  const suffix = React.useMemo(() => {
    if (action === 'sellRam') return 'Bytes';
    return buyUnit === 'bytes' ? 'Bytes' : currentSymbol;
  }, [action, buyUnit, currentSymbol]);

  // Live conversion preview. For buyRam: shows bytes or EOS cost. For sellRam:
  // shows the EOS the user will receive.
  const conversion = React.useMemo(() => {
    if (action === 'sellRam') {
      const eos = bytesPerEos > 0 ? inputValue / bytesPerEos : 0;
      return {
        label: t('resource.estimatedGet'),
        value: `${eos.toFixed(precision)} ${currentSymbol}`,
      };
    }
    if (buyUnit === 'eos') {
      const bytes = Math.floor(inputValue * bytesPerEos);
      return { label: t('resource.estimatedGet'), value: `${bytes} Bytes` };
    }
    const eos = bytesPerEos > 0 ? inputValue / bytesPerEos : 0;
    return {
      label: t('resource.estimatedCost'),
      value: `${eos.toFixed(precision)} ${currentSymbol}`,
    };
  }, [action, buyUnit, inputValue, bytesPerEos, precision, currentSymbol, t]);

  const openModal = (value: RamAction) => {
    setAction(value);
    setBuyUnit('eos');
    setInputValue(0);
    setReceiver(currentWallet?.name ?? '');
    setModalVisible(true);
  };

  const switchBuyUnit = (next: BuyUnit) => {
    if (next === buyUnit) return;
    // Convert current value so the user doesn't lose what they typed
    if (bytesPerEos > 0 && inputValue > 0) {
      if (next === 'bytes') {
        setInputValue(Math.floor(inputValue * bytesPerEos));
      } else {
        setInputValue(Number((inputValue / bytesPerEos).toFixed(precision)));
      }
    }
    setBuyUnit(next);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!receiver) throw new Error(t('wallet.emptyReceiver'));
      if (receiver.length !== 42 && receiver.length > 12) throw new Error(t('wallet.errorReceiver'));
      if (!inputValue || inputValue === 0) throw new Error(t('resource.valueError'));

      const api = chain.getApi(currentChainId);
      const auth = chain.getAuth();

      if (action === 'buyRam') {
        if (buyUnit === 'bytes') {
          const bytes = Math.floor(inputValue);
          if (bytes < 1) throw new Error(t('resource.valueSizeError'));
          return api.buyRamBytes(currentWallet?.name, receiver, bytes, auth, systemContract);
        }
        const value = `${inputValue.toFixed(precision)} ${currentSymbol}`;
        return api.buyRam(currentWallet?.name, receiver, value, auth, systemContract);
      } else {
        const bytes = Math.floor(inputValue);
        if (bytes < 1) throw new Error(t('resource.valueSizeError'));
        return api.sellRam(currentWallet?.name, bytes, auth, systemContract);
      }
    },
    onSuccess: () => {
      toast.success(t('resource.stakeSuccess'));
      setInputValue(0);
      setModalVisible(false);
      onRefresh();
    },
    onError: (err: any) => {
      const msg = err?.message ?? chain.getErrorMsg(err);
      toast.error(msg);
      setModalVisible(false);
    },
  });

  const formatBytes = (bytes: number): { value: string; unit: string } => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    if (gb >= 1) return { value: gb.toFixed(2), unit: 'GB' };
    if (mb >= 1) return { value: mb.toFixed(2), unit: 'MB' };
    if (kb >= 1) return { value: kb.toFixed(2), unit: 'KB' };
    return { value: bytes.toFixed(0), unit: 'B' };
  };

  const ramTotal = formatBytes(memory.use_limit.max);
  const ramUsed = formatBytes(memory.use_limit.used);
  // Use the same unit as total for consistency
  const displayUnit = ramTotal.unit;
  const divisor =
    displayUnit === 'GB' ? 1073741824 : displayUnit === 'MB' ? 1048576 : displayUnit === 'KB' ? 1024 : 1;
  const ramUsedDisplay = (memory.use_limit.used / divisor).toFixed(displayUnit === 'B' ? 0 : 2);
  const ramTotalDisplay = (memory.use_limit.max / divisor).toFixed(displayUnit === 'B' ? 0 : 2);
  const shortUnit = displayUnit.charAt(0);

  return (
    <div className="flex flex-col items-center gap-2 bg-white rounded-[22px] border border-[#E9E5F5] shadow-[0_6px_18px_rgba(46,16,101,0.03)] py-3 px-0 h-full text-[#52525B]">
      <span className="text-[16px] font-bold text-[#27272A]">{t('resource.ram')}</span>

      {/* Vertical progress bar */}
      <div className="flex-1 flex items-center justify-center">
        <VerticalBar percentage={animatedPct} thick highThreshold={90} />
      </div>

      {/* Used stats */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[12px] font-medium text-[#8A82A4]">{t('resource.used')} ({shortUnit})</span>
        <div className="flex flex-row items-center gap-1">
          <span className="text-[12px] font-medium text-[#52525B]">{ramUsedDisplay}</span>
          <span className="text-[12px] font-medium text-[#8A82A4]">/ {ramTotalDisplay}</span>
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[12px] font-medium text-[#8A82A4]">{t('resource.price')} (K)</span>
        <div className="flex flex-row items-center gap-1">
        <span className="text-[12px] font-medium text-[#52525B]">{ramprice.toFixed(4)}</span>
        <span className="text-[11px] font-medium text-[#8A82A4]">{currentSymbol}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1.5 w-full">
        <button type="button" onClick={() => openModal('buyRam')}
          className="h-8 mx-3 rounded-[12px] border border-[#E9D5FF] bg-white text-[12px] font-semibold text-[#3F3F46] flex items-center justify-center hover:bg-[#F5F0FF]">
          {t('resource.buy')}
        </button>
        <button type="button" onClick={() => openModal('sellRam')}
          className="h-8 mx-3 rounded-[12px] border border-[#E9D5FF] bg-white text-[12px] font-semibold text-[#3F3F46] flex items-center justify-center hover:bg-[#F5F0FF]">
          {t('resource.sell')}
        </button>
      </div>

      {/* Buy/Sell sheet */}
      <PopupBottom
        isOpen={modalVisible}
        title={modalTitle}
        onClose={() => setModalVisible(false)}
      >
        <div className="flex flex-col gap-3">
          {/* Receiver (only for buy) */}
          {action === 'buyRam' && (
            <div>
              <span className="block text-sm mb-1">{t('resource.stakeReceiver')}</span>
              <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} />
            </div>
          )}

          {/* Amount */}
          <div>
            <span className="block text-sm mb-1">{t('resource.amount')}</span>
            <div className="flex items-center gap-2">
              <NumberInput
                value={inputValue}
                min={0}
                step={action === 'sellRam' || buyUnit === 'bytes' ? 100 : 0.1}
                precision={action === 'sellRam' || buyUnit === 'bytes' ? 0 : 4}
                placeholder={placeholder}
                onChange={setInputValue}
                className="flex-1"
              />
              {action === 'buyRam' ? (
                <div className="inline-flex rounded-full border border-[#E9D5FF] bg-white overflow-hidden text-[12px] font-semibold shrink-0">
                  <button
                    type="button"
                    onClick={() => switchBuyUnit('eos')}
                    className={`px-3 h-9 cursor-pointer transition-colors ${
                      buyUnit === 'eos' ? 'bg-primary text-white' : 'text-[#52525B] hover:bg-[#F5F0FF]'
                    }`}
                  >
                    {currentSymbol}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchBuyUnit('bytes')}
                    className={`px-3 h-9 cursor-pointer transition-colors ${
                      buyUnit === 'bytes' ? 'bg-primary text-white' : 'text-[#52525B] hover:bg-[#F5F0FF]'
                    }`}
                  >
                    Bytes
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-400">{suffix}</span>
              )}
            </div>
            {conversion && (
              <div className="flex items-center justify-between text-sm mt-3 px-1">
                <span>{conversion.label}</span>
                <span>{conversion.value}</span>
              </div>
            )}
          </div>

          <div className="flex flex-row gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalVisible(false)}>
              {t('public.cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {t('public.ok')}
            </Button>
          </div>
        </div>
      </PopupBottom>
    </div>
  );
};

export default RowRam;
