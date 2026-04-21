import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import dayjs from 'dayjs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWalletStore } from '@/stores/walletStore';
import { TransferRecord } from '@/types/transaction';

interface RecentTransferProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (record: TransferRecord) => void;
}

const formatAccount = (account: string): string => {
  if (account.length === 42) {
    return `${account.substring(0, 10)}...${account.substring(36)}`;
  }
  return account;
};

const RecentTransfer: React.FC<RecentTransferProps> = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation();
  const recentTransfers = useWalletStore((s) => s.recentTransfers);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[90%] max-w-sm rounded-2xl bg-white p-0 gap-0 overflow-hidden"
        style={{ boxShadow: '0 4px 24px #00000012' }}
      >
        {/* Title bar */}
        <DialogHeader className="h-14 flex flex-row items-center justify-between px-4">
          <DialogTitle className="text-[17px] font-bold text-[#1A1A2E]">
            {t('wallet.recentTransfers')}
          </DialogTitle>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer"
          >
            <X className="h-5 w-5 text-[#6B7280]" />
          </button>
        </DialogHeader>

        {/* Column headers */}
        <div className="h-9 flex items-center px-4 bg-[#F9FAFB]">
          <span className="flex-1 text-[13px] font-semibold text-[#9CA3AF]">
            {t('wallet.receiverAccount')}
          </span>
          <span className="flex-1 text-right text-[13px] font-semibold text-[#9CA3AF]">
            {t('wallet.transactionTime')}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#E5E7EB]" />

        {/* List */}
        <div className="overflow-y-auto max-h-[420px]">
          {recentTransfers.map((item, index) => (
            <React.Fragment key={`${item.account}-${item.time}`}>
              {index > 0 && <div className="h-px w-full bg-[#F3F4F6]" />}
              <button
                type="button"
                className="h-[52px] flex items-center w-full px-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                onClick={() => onSelect(item)}
              >
                <span className="flex-1 text-left text-sm font-medium text-[#18181B]">
                  {formatAccount(item.account)}
                </span>
                <span className="flex-1 text-right text-[13px] text-[#9CA3AF]">
                  {dayjs(item.time).format('MM-DD HH:mm')}
                </span>
              </button>
            </React.Fragment>
          ))}

          {recentTransfers.length === 0 && (
            <div className="flex items-center justify-center py-10 text-sm text-[#9CA3AF]">
              {t('public.noData')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecentTransfer;
