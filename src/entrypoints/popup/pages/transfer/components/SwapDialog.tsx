import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import PopupBottom from '@/components/PopupBottom';
import { Button } from '@/components/ui/button';
import { useBalance } from '@/hooks/useBalance';
import { getChainInstance } from '@/hooks/useChainInstance';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import placeholderImg from '@/assets/images/placeholder.png';

export interface SwapToken {
  contract: string;
  symbol: string;
  precision: number;
}

const EOS: SwapToken = { contract: 'eosio.token', symbol: 'EOS', precision: 4 };
const A: SwapToken = { contract: 'core.vaulta', symbol: 'A', precision: 4 };

export function isSwappable(contract: string, symbol: string): boolean {
  return (
    (contract === EOS.contract && symbol === EOS.symbol) ||
    (contract === A.contract && symbol === A.symbol)
  );
}

interface SwapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fromContract: string;
}

const SwapDialog: React.FC<SwapDialogProps> = ({ isOpen, onClose, fromContract }) => {
  const { t } = useTranslation();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const getToken = useWalletStore((s) => s.getToken);
  const currentChainId = useChainStore((s) => s.currentChainId());
  const queryClient = useQueryClient();

  const logoFor = React.useCallback(
    (tk: SwapToken) => getToken({ ...tk, chain: 'eos' } as any)?.logo || placeholderImg,
    [getToken],
  );

  const initialFrom = fromContract === A.contract ? A : EOS;
  const [from, setFrom] = React.useState<SwapToken>(initialFrom);
  const [to, setTo] = React.useState<SwapToken>(initialFrom === EOS ? A : EOS);
  const [amountStr, setAmountStr] = React.useState<string>('');
  const amount = React.useMemo(() => {
    const n = parseFloat(amountStr);
    return isNaN(n) ? 0 : n;
  }, [amountStr]);

  React.useEffect(() => {
    if (!isOpen) return;
    const f = fromContract === A.contract ? A : EOS;
    setFrom(f);
    setTo(f === EOS ? A : EOS);
    setAmountStr('');
  }, [isOpen, fromContract]);

  const handleAmountChange = (raw: string) => {
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
    setAmountStr(raw);
  };

  const { data: fromBalanceStr } = useBalance({
    contract: from.contract,
    symbol: from.symbol,
    account: currentWallet?.name,
    enabled: isOpen,
  });

  const fromBalance = React.useMemo(
    () => (fromBalanceStr ? Number(fromBalanceStr.split(' ')[0]) : 0),
    [fromBalanceStr],
  );

  const handleFlip = () => {
    setFrom(to);
    setTo(from);
    setAmountStr('');
  };

  const swapMutation = useMutation({
    mutationFn: async () => {
      if (!amount || amount <= 0) throw new Error(t('wallet.errorAmount'));
      if (amount > fromBalance) throw new Error(t('wallet.errorAmount'));

      const chain = getChainInstance();
      const api = chain.getApi(currentChainId);
      const auth = chain.getAuth();
      const quantity = `${amount.toFixed(from.precision)} ${from.symbol}`;
      return api.transfer(from.contract, currentWallet?.name ?? '', A.contract, quantity, '', auth);
    },
    onSuccess: () => {
      toast.success(t('wallet.swapSuccess'));
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      onClose();
    },
    onError: (err: any) => {
      const chain = getChainInstance();
      const msg =
        typeof chain.getErrorMsg === 'function'
          ? chain.getErrorMsg(err)
          : err?.message || String(err);
      toast.error(msg);
    },
  });

  return (
    <PopupBottom isOpen={isOpen} title={t('wallet.swap')} onClose={onClose}>
      <div className="flex flex-col gap-2 py-2">
        {/* From */}
        <div className="rounded-2xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              placeholder="0"
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 min-w-0 px-1 bg-transparent text-[24px] font-medium text-[#27272A] placeholder:text-[#9CA3AF] outline-none"
            />
            <div className="pl-1.5 pr-4 h-11 flex items-center gap-2 rounded-full bg-muted text-[14px] font-semibold text-[#27272A]">
              <img
                src={logoFor(from)}
                alt={from.symbol}
                className="w-8 h-8 rounded-full object-cover border border-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = placeholderImg;
                }}
              />
              {from.symbol}
            </div>
          </div>
          <div className="flex justify-between items-center mt-2 text-[12px]">
            <span className="text-muted-foreground">
              {t('wallet.balance')}: {fromBalance.toFixed(from.precision)} {from.symbol}
            </span>
            <button
              type="button"
              onClick={() => setAmountStr(fromBalance > 0 ? fromBalance.toFixed(from.precision) : '')}
              className="text-primary font-semibold"
            >
              {t('wallet.max')}
            </button>
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-4 relative z-10">
          <button
            type="button"
            onClick={handleFlip}
            className="w-11 h-11 rounded-full bg-white border border-border flex items-center justify-center text-primary shadow-sm hover:bg-[#F5F0FF]"
            aria-label="flip"
          >
            <ArrowUpDown className="h-5 w-5" />
          </button>
        </div>

        {/* To */}
        <div className="rounded-2xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 px-1 text-[24px] text-[#27272A] font-medium truncate">
              {amount.toFixed(to.precision)}
            </div>
            <div className="pl-1.5 pr-4 h-11 flex items-center gap-2 rounded-full bg-muted text-[14px] font-semibold text-[#27272A]">
              <img
                src={logoFor(to)}
                alt={to.symbol}
                className="w-8 h-8 rounded-full object-cover border border-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = placeholderImg;
                }}
              />
              {to.symbol}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row gap-3 pt-8">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('public.cancel')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => swapMutation.mutate()}
            disabled={swapMutation.isPending || amount <= 0}
          >
            {swapMutation.isPending ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('wallet.swap')}
              </span>
            ) : (
              t('wallet.swap')
            )}
          </Button>
        </div>
      </div>
    </PopupBottom>
  );
};

export default SwapDialog;
