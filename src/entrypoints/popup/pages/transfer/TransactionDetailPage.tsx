import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useWalletStore } from '@/stores/walletStore';
import dayjs from 'dayjs';

interface TrxData {
  trx_id: string;
  block_num: number | string;
  sender: string;
  receiver: string;
  quantity: string;
  memo?: string;
  time?: string | number;
  timestamp?: string | number;
}

interface TokenData {
  contract: string;
  symbol: string;
  precision: number;
}

const TransactionDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const currentWallet = useWalletStore((s) => s.currentWallet());

  const trx: TrxData = React.useMemo(() => {
    try {
      return JSON.parse(decodeURIComponent(searchParams.get('trx') ?? '{}'));
    } catch {
      return {} as TrxData;
    }
  }, [searchParams]);

  const token: TokenData = React.useMemo(() => {
    try {
      return JSON.parse(decodeURIComponent(searchParams.get('token') ?? '{}'));
    } catch {
      return {} as TokenData;
    }
  }, [searchParams]);

  const isReceive = trx.receiver === currentWallet?.name;
  const amountDisplay = isReceive ? `+${trx.quantity}` : `-${trx.quantity}`;

  const formatTime = (time?: string | number) => {
    if (!time) return '—';
    try {
      return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
    } catch {
      return String(time);
    }
  };

  const timeValue = trx.time ?? trx.timestamp;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('wallet.copied'));
    } catch {
      toast.error(t('wallet.copyFailed'));
    }
  };

  const formatHash = (hash: string) =>
    hash.length > 22 ? `${hash.slice(0, 11)}...${hash.slice(-11)}` : hash;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('wallet.transaction')} />

      <div className="flex-1 overflow-y-auto px-3.5 pb-4 flex flex-col gap-3">
        {/* Success header */}
        <div className="rounded-2xl bg-gradient-to-b from-[#F0FDF4] to-[#FAFAFE] border border-[#D1FAE5] flex flex-col items-center justify-center p-3 gap-0.5">
          <CircleCheck className="h-7 w-7 text-green-500" />
          <div
            className={`font-extrabold text-[22px] ${
              isReceive ? 'text-[#00b494]' : 'text-[#e24054]'
            }`}
          >
            {amountDisplay}
          </div>
        </div>

        {/* Group 1: sender, receiver, memo */}
        <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] py-1">
          <InfoRow label={t('wallet.paymentAccount')} value={trx.sender} copyable onCopy={() => copyToClipboard(trx.sender)} />
          <InfoRow label={t('wallet.receiverAccount')} value={trx.receiver} copyable onCopy={() => copyToClipboard(trx.receiver)} />
          <InfoRow label={t('wallet.memo')} value={trx.memo ?? ''} isLast />
        </div>

        {/* Group 2: hash, block, contract, time */}
        <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] py-1">
          <InfoRow label={t('wallet.transactionHASH')} value={trx.trx_id ? formatHash(trx.trx_id) : ''} copyable onCopy={() => copyToClipboard(trx.trx_id)} labelWidth="w-[75px]" />
          <InfoRow label={t('wallet.blockNumber')} value={String(trx.block_num ?? '')} labelWidth="w-[75px]" />
          <InfoRow label={t('wallet.contract')} value={token.contract} copyable onCopy={() => copyToClipboard(token.contract)} labelWidth="w-[75px]" />
          <InfoRow label={t('wallet.transactionTime')} value={formatTime(timeValue)} isLast labelWidth="w-[75px]" />
        </div>

        {/* Group 3: explorer links */}
        <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] px-4 py-3">
          <div className="text-xs font-semibold text-[#7C3AED] mb-2">{t('wallet.moreDetail')}</div>
          <div className="grid grid-cols-2 gap-2">
            <ExplorerLink
              href={`https://vaultascan.io/tx/${trx.trx_id}`}
              label="vaultascan"
            />
            <ExplorerLink
              href={`https://eosauthority.com/transaction/${trx.trx_id}`}
              label="eosauthority"
            />
            <ExplorerLink
              href={`https://eosflare.io/tx/${trx.trx_id}`}
              label="eosflare"
            />
            <ExplorerLink
              href={`https://eoseyes.com/tx/${trx.trx_id}`}
              label="eoseyes"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  isLast?: boolean;
  breakAll?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
  labelWidth?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, isLast, breakAll, copyable, onCopy, labelWidth = 'w-[60px]' }) => (
  <div
    className={`flex items-center gap-2 px-4 py-2${
      isLast ? '' : ' border-b border-[#F3E8FF]'
    }`}
  >
    <div className={`text-[11px] text-gray-400 shrink-0 ${labelWidth}`}>{label}</div>
    <div className="flex-1 flex items-center gap-1 min-w-0 justify-end">
      <div
        className={`text-sm font-medium text-gray-800 text-right truncate${
          breakAll ? ' break-all' : ''
        }`}
      >
        {value || '—'}
      </div>
      {copyable && value && (
        <button
          type="button"
          className="shrink-0 border-0 bg-transparent cursor-pointer p-0 flex items-center"
          onClick={onCopy}
        >
          <Copy className="w-3.5 h-3.5 text-[#C4B5FD]" />
        </button>
      )}
    </div>
  </div>
);

interface ExplorerLinkProps {
  href: string;
  label: string;
}

const ExplorerLink: React.FC<ExplorerLinkProps> = ({ href, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center h-8 bg-[#F5F0FF] border border-[#E9D8FD] rounded-xl cursor-pointer gap-1.5"
  >
    <ExternalLink className="h-3.5 w-3.5 text-[#7C3AED]" />
    <span className="text-xs text-[#7C3AED] font-semibold">{label}</span>
  </a>
);

export default TransactionDetailPage;
