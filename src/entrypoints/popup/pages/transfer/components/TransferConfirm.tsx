import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PopupBottom from '@/components/PopupBottom';
import { useWalletStore } from '@/stores/walletStore';
import { getChainInstance } from '@/hooks/useChainInstance';
import { Transfer, TransferRecord } from '@/types/transaction';

interface TransferConfirmProps {
  isOpen: boolean;
  title: string;
  transfer: Transfer;
  onClose: () => void;
}

const TransferConfirm: React.FC<TransferConfirmProps> = ({ isOpen, title, transfer, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const walletStore = useWalletStore();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const addRecentTransfer = useWalletStore((s) => s.addRecentTransfer);

  const receiverDisplay = React.useMemo(() => {
    const rsl = transfer.receiver.length;
    if (rsl === 42) {
      return `${transfer.receiver.substring(0, 14)}...${transfer.receiver.substring(rsl - 8)}`.toLowerCase();
    }
    return transfer.receiver.toLowerCase();
  }, [transfer.receiver]);

  const isShowMemo = transfer.receiver.length !== 42;

  const { mutate: handleSubmit, isPending } = useMutation({
    mutationFn: async () => {
      const chain = getChainInstance();
      const isEthAddress = transfer.receiver.length === 42;
      const receiverAccount = isEthAddress ? 'etheraccount' : transfer.receiver;
      const memo = isEthAddress ? transfer.receiver : transfer.memo;

      const amount = Number((transfer.amount ?? 0).toFixed(transfer.token.precision));
      const quantityStr = `${amount.toFixed(transfer.token.precision)} ${transfer.token.symbol}`;

      const recent: TransferRecord = {
        account: transfer.receiver,
        time: Date.now(),
        memo: isEthAddress ? '' : transfer.memo,
        token: transfer.token,
      };

      await addRecentTransfer(recent);

      const chainId = walletStore.currentWallet().chainId;
      const api = chain.getApi(chainId);
      const auth = chain.getAuth();
      await api.transfer(
        transfer.token.contract,
        currentWallet.name,
        receiverAccount,
        quantityStr,
        memo,
        auth,
      );
    },
    onSuccess: () => {
      toast.success(t('wallet.transferSuccess'));
      navigate(-1);
    },
    onError: (error: unknown) => {
      const chain = getChainInstance();
      const msg =
        typeof chain.getErrorMsg === 'function'
          ? chain.getErrorMsg(error)
          : (error instanceof Error ? error.message : String(error));
      toast.error(msg);
    },
  });

  return (
    <PopupBottom isOpen={isOpen} title={title} onClose={onClose}>
      {/* Detail Card */}
      <div className="mt-4 rounded-2xl bg-[#FAFAFE] border border-[#E9D8FD] overflow-hidden">
        {/* Sender */}
        <div className="flex items-center justify-between h-[52px] px-4 border-b border-[#F3E8FF]">
          <span className="text-[15px] text-[#27272A]">{t('wallet.sender')}</span>
          <span className="text-[15px] font-medium text-[#27272A] truncate ml-4">{transfer.sender}</span>
        </div>

        {/* Receiver */}
        <div className="flex items-center justify-between h-[52px] px-4 border-b border-[#F3E8FF]">
          <span className="text-[15px] text-[#27272A]">{t('wallet.receiver')}</span>
          <span className="text-[15px] font-medium text-[#27272A] truncate ml-4" title={transfer.receiver}>
            {receiverDisplay}
          </span>
        </div>

        {/* Amount */}
        <div className={`flex items-center justify-between h-[52px] px-4${isShowMemo ? ' border-b border-[#F3E8FF]' : ''}`}>
          <span className="text-[15px] text-[#27272A]">{t('wallet.amount')}</span>
          <span className="text-[15px] font-medium text-[#27272A] truncate ml-4">
            {(transfer.amount ?? 0).toFixed(transfer.token.precision)} {transfer.token.symbol}
          </span>
        </div>

        {/* Memo */}
        {isShowMemo && (
          <div className="flex items-center justify-between h-[52px] px-4">
            <span className="text-[15px] text-[#27272A]">{t('wallet.remark')}</span>
            <span className="text-[15px] font-medium text-[#27272A] truncate ml-4">{transfer.memo}</span>
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="pt-6">
        <button
          type="button"
          className="w-full h-14 rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white text-[16px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          disabled={isPending}
          onClick={() => handleSubmit()}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
          {t('wallet.transfer')}
        </button>
      </div>
    </PopupBottom>
  );
};

export default TransferConfirm;
