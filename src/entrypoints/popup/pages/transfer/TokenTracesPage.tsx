import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import { useWalletStore } from '@/stores/walletStore';
import { useTransactionList } from '@/hooks/useTransactionList';
import { useBalance } from '@/hooks/useBalance';
import SwapDialog, { isSwappable } from '@/entrypoints/popup/pages/transfer/components/SwapDialog';
import dayjs from 'dayjs';

const TokenTracesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token: tokenParam } = useParams<{ token: string }>();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentUserTokens = useWalletStore((s) => s.currentUserTokens());

  const [contract, symbol] = (tokenParam ?? '-').split('-');

  const token = React.useMemo(
    () => currentUserTokens.find((t) => t.contract === contract && t.symbol === symbol),
    [currentUserTokens, contract, symbol],
  );

  // Live balance
  const { data: balanceStr } = useBalance({
    contract,
    symbol,
    account: currentWallet?.name,
    enabled: !!(contract && symbol && currentWallet?.name),
  });

  const liveAmount = React.useMemo(() => {
    if (balanceStr) return Number(balanceStr.split(' ')[0]);
    return token?.amount ?? 0;
  }, [balanceStr, token]);

  // Transaction list — Hyperion `filter=<contract>:transfer` narrows server-side.
  const { data: traceList, isLoading } = useTransactionList({
    contract,
    enabled: !!(currentWallet?.name && contract),
  });

  const filteredTraces = React.useMemo(() => {
    if (!traceList) return [];
    // Server-side filter already scopes to this contract. One contract may still
    // emit multiple symbols (e.g. `eosio.token` issues EOS + others), so narrow
    // further by symbol if the mapper captured it.
    return traceList.filter((item: any) => !item.symbol || item.symbol === symbol);
  }, [traceList, symbol]);

  const [swapOpen, setSwapOpen] = React.useState(false);
  const canSwap = isSwappable(contract, symbol);

  const viewTransfer = () => {
    navigate(`/transfer?symbol=${symbol}&contract=${contract}`);
  };

  const viewTransaction = (item: any) => {
    const tokenJson = JSON.stringify(token ?? { contract, symbol, precision: 4 });
    const trxJson = JSON.stringify(item);
    navigate(`/transaction-detail?token=${encodeURIComponent(tokenJson)}&trx=${encodeURIComponent(trxJson)}`);
  };

  const formatTime = (time: string | number) => {
    try {
      return dayjs(time).format('MM-DD HH:mm');
    } catch {
      return String(time);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('wallet.detail')} />

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Token header card */}
        <div className="flex flex-row items-center justify-between px-4 py-2.5 border border-[#E5E7EB] rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-row items-center gap-2.5 min-w-0">
            {token?.logo && (
              <img
                src={token.logo}
                alt={symbol}
                className="w-[30px] h-[30px] rounded-full object-cover shrink-0"
              />
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-lg text-[#18181B] leading-tight">{symbol}</span>
              <span className="text-[12px] text-[#9CA3AF] leading-tight truncate">{contract}</span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            {canSwap && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full w-[80px] h-[32px] text-xs font-semibold border-[#E9D5FF] text-primary hover:bg-[#F5F0FF]"
                onClick={() => setSwapOpen(true)}
              >
                {t('wallet.swap')}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="rounded-full w-[80px] h-[32px] text-xs bg-gradient-to-br from-[#D500F9] to-[#8F2BFF] text-white font-semibold shadow-none hover:opacity-90"
              onClick={viewTransfer}
            >
              {t('wallet.transfer')}
            </Button>
          </div>
        </div>

        {/* Balance row */}
        <div className="flex justify-between items-center h-6 px-1 mt-2 text-[13px]">
          <span className="text-[#6B7280]">{t('wallet.balance')}</span>
          <span className="font-semibold text-[#18181B]">
            {liveAmount} {symbol}
          </span>
        </div>

        {/* Transaction history */}
        <div className="flex flex-col flex-1">
          <div className="flex items-end h-[42px] px-0.5 pb-2 border-b border-[#F3F4F6]">
            <h2 className="text-[15px] font-semibold text-[#18181B] m-0 p-0">
              {t('wallet.tradeHistory')}
            </h2>
          </div>

          <div className="flex-1">
            {isLoading ? (
              <>
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="flex flex-row px-1 h-[66px] justify-between items-center border-b border-[#F3F4F6]"
                  >
                    <div className="flex flex-row items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-3.5 w-[80px]" />
                        <Skeleton className="h-3 w-[120px]" />
                      </div>
                    </div>
                    <Skeleton className="h-3.5 w-[40px]" />
                  </div>
                ))}
              </>
            ) : filteredTraces.length > 0 ? (
              filteredTraces.map((item: any, index: number) => {
                const isReceive = item.receiver === currentWallet?.name;
                const counterparty = isReceive ? item.sender : item.receiver;
                return (
                  <button
                    key={item.trx_id ?? index}
                    type="button"
                    className={`w-full text-left cursor-pointer px-1 h-[66px] flex flex-row justify-between items-center ${index < filteredTraces.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
                    onClick={() => viewTransaction(item)}
                  >
                    <div className="flex flex-row items-center gap-3">
                      {isReceive ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      )}
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold text-[#18181B]">{counterparty}</div>
                        <div className="text-xs text-[#9CA3AF]">
                          {formatTime(item.time ?? item.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div
                      className={
                        isReceive
                          ? 'text-sm font-medium text-[#00B494]'
                          : 'text-sm font-medium text-[#4276FF]'
                      }
                    >
                      {isReceive ? '+' : '-'}
                      {item.quantity}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8 text-[#9CA3AF] text-sm">{t('public.noData')}</div>
            )}
          </div>
        </div>
      </div>

      <SwapDialog
        isOpen={swapOpen}
        onClose={() => setSwapOpen(false)}
        fromContract={contract}
      />
    </div>
  );
};

export default TokenTracesPage;
