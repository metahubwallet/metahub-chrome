import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { History, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { getChainInstance } from '@/hooks/useChainInstance';
import { Balance, Token } from '@/types/tokens';
import SelectCoin from '@/entrypoints/popup/pages/transfer/components/SelectCoin';
import RecentTransfer from '@/entrypoints/popup/pages/transfer/components/RecentTransfer';
import TransferConfirm from '@/entrypoints/popup/pages/transfer/components/TransferConfirm';
import { TransferRecord } from '@/types/transaction';
import placeholderImg from '@/assets/images/placeholder.png';

type SelectedToken = Token & { logo?: string };

interface TransferFormValues {
  receiver: string;
  amount: number;
  memo: string;
}

const briefAccount = (name: string, headLen: number, tailLen: number): string => {
  if (name.length <= headLen + tailLen) return name;
  return `${name.substring(0, headLen)}...${name.substring(name.length - tailLen)}`;
};

const TransferPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const walletStore = useWalletStore();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentUserTokens = useWalletStore((s) => s.currentUserTokens());
  const chainNetwork = useChainStore((s) => s.currentNetwork);

  const [recentVisible, setRecentVisible] = React.useState(false);
  const [selectTokenVisible, setSelectTokenVisible] = React.useState(false);
  const [confirmVisible, setConfirmVisible] = React.useState(false);
  const [isShowMemo, setIsShowMemo] = React.useState(true);
  const [receiverError, setReceiverError] = React.useState('');
  const [maxAmount, setMaxAmount] = React.useState(0);
  const [amountRaw, setAmountRaw] = React.useState('');
  const [selectedToken, setSelectedToken] = React.useState<SelectedToken>({
    symbol: '',
    contract: '',
    precision: 4,
  });
  const getToken = useWalletStore((s) => s.getToken);

  const senderDisplay = React.useMemo(
    () => (currentWallet ? briefAccount(currentWallet.name, 14, 8) : ''),
    [currentWallet],
  );

  const { register, handleSubmit, watch, setValue, control, getValues } =
    useForm<TransferFormValues>({
      defaultValues: { receiver: '', amount: 0, memo: '' },
    });

  const receiverValue = watch('receiver');
  const amountValue = watch('amount');

  // Initialise token from query params or current network token
  React.useEffect(() => {
    const qSymbol = searchParams.get('symbol');
    const qContract = searchParams.get('contract');
    const qPrecision = searchParams.get('precision');
    const qAmount = searchParams.get('amount');
    const networkToken = chainNetwork?.token;

    const token: SelectedToken = {
      symbol: qSymbol || networkToken?.symbol || 'EOS',
      contract: qContract || networkToken?.contract || 'eosio.token',
      precision: Number(qPrecision) || networkToken?.precision || 4,
    };

    if (qAmount) {
      setValue('amount', Number(qAmount));
      setAmountRaw(qAmount);
    }

    // Try to find precision/balance from userTokens
    const match = currentUserTokens.find(
      (t) => t.contract === token.contract && t.symbol === token.symbol,
    );
    if (match) {
      token.precision = match.precision;
      token.logo = match.logo;
      setMaxAmount(match.amount);
    }
    if (!token.logo) {
      const catalog = getToken({ ...token, chain: '' });
      if (catalog?.logo) token.logo = catalog.logo;
    }

    setSelectedToken(token);
    fetchBalance(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBalance = async (token: Token) => {
    try {
      const chain = getChainInstance();
      const chainId = walletStore.currentWallet().chainId;
      const api = chain.getApi(chainId);
      const balance = await api.getCurrencyBalance(
        token.contract,
        walletStore.currentWallet().name,
        token.symbol,
      );
      if (balance) {
        setMaxAmount(Number(balance.split(' ')[0]));
      }
    } catch {
      // silently fail — keep current maxAmount
    }
  };

  const checkReceiver = async (value?: string): Promise<boolean> => {
    const receiver = value ?? receiverValue;
    if (!receiver) {
      setReceiverError(t('wallet.emptyReceiver'));
      return false;
    }
    if (receiver === currentWallet?.name) {
      setReceiverError(t('wallet.transferSelf'));
      return false;
    }

    if (receiver.length === 42) {
      // ETH address — hide memo
      setIsShowMemo(false);
      setReceiverError('');
      return true;
    }

    if (receiver.length !== 42 && receiver.length > 12) {
      setReceiverError(t('wallet.errorReceiver'));
      setIsShowMemo(true);
      return false;
    }

    setIsShowMemo(true);
    try {
      const chain = getChainInstance();
      const chainId = walletStore.currentWallet().chainId;
      const api = chain.getApi(chainId);
      const accountData = await api.getAccount(receiver);
      if (!accountData) {
        setReceiverError(t('wallet.accountNotExist'));
        return false;
      }
    } catch {
      setReceiverError(t('wallet.accountNotExist'));
      return false;
    }

    setReceiverError('');
    return true;
  };

  const checkQuantity = (value?: number): boolean => {
    const qty = value ?? amountValue;
    if (!qty || qty <= 0) {
      return false;
    }
    return true;
  };

  const handleSelectTransfer = (record: TransferRecord) => {
    setRecentVisible(false);
    setValue('receiver', record.account);
    setValue('memo', record.memo);
    setReceiverError('');
    checkReceiver(record.account);
  };

  const handleChangeToken = (coin: Balance) => {
    const catalog = getToken(coin);
    const token: SelectedToken = {
      symbol: coin.symbol,
      contract: coin.contract,
      precision: coin.precision,
      logo: coin.logo || catalog?.logo,
    };
    setSelectedToken(token);
    setMaxAmount(coin.amount);
    setSelectTokenVisible(false);
    setValue('amount', 0);
    setAmountRaw('');
    fetchBalance(token);
  };

  const onCheckSubmit = async () => {
    const receiverOk = await checkReceiver();
    const quantityOk = checkQuantity();
    if (!receiverOk || !quantityOk) return;
    setConfirmVisible(true);
  };

  const transferData = {
    sender: senderDisplay,
    receiver: receiverValue,
    amount: amountValue,
    memo: getValues('memo'),
    token: selectedToken,
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('wallet.transfer')} />

      <div className="flex-1 overflow-y-auto px-4">
        <form onSubmit={handleSubmit(onCheckSubmit)} className="flex flex-col gap-3.5">
          {/* Payment Account */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#18181B]">
              {t('wallet.paymentAccount')}
            </label>
            <div className="flex items-center h-[52px] rounded-2xl bg-[#F8F5FF] border border-[#E9D8FD] px-4">
              <span className="text-sm text-[#A1A1AA]">{senderDisplay}</span>
            </div>
          </div>

          {/* Receiver Account */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#18181B]">
                {t('wallet.receiverAccount')}
              </label>
              <button
                type="button"
                aria-label="Recent transfers"
                onClick={() => setRecentVisible(true)}
                className="cursor-pointer text-[#A1A1AA] hover:text-[#6B7280]"
              >
                <History className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="flex items-center justify-between h-[52px] rounded-2xl bg-[#F8F5FF] border border-[#E9D8FD] px-4">
              <input
                {...register('receiver')}
                placeholder={t('wallet.enterReceiver')}
                onBlur={() => checkReceiver()}
                className="flex-1 bg-transparent text-sm text-[#18181B] placeholder:text-[#A1A1AA] outline-none"
              />
            </div>
            {receiverError && (
              <span className="text-xs text-yellow-500">{receiverError}</span>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#18181B]">{t('wallet.amount')}</label>
              <span className="text-xs text-[#9CA3AF]">
                Balance: {maxAmount.toFixed(selectedToken.precision)} {selectedToken.symbol}
              </span>
            </div>
            <div className="flex h-[52px] rounded-2xl bg-[#F8F5FF] border border-[#E9D8FD] overflow-hidden">
              {/* Token selector */}
              <button
                type="button"
                onClick={() => setSelectTokenVisible(true)}
                className="flex items-center gap-2 px-3 h-full min-w-[110px] bg-[#F0EAFF] rounded-l-2xl shrink-0 cursor-pointer"
              >
                {selectedToken.logo ? (
                  <img
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                    src={selectedToken.logo}
                    alt={selectedToken.symbol}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImg;
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center text-[11px] font-bold text-[#7C3AED] shrink-0">
                    {selectedToken.symbol.charAt(0) || '?'}
                  </div>
                )}
                <span className="flex-1 text-[15px] font-semibold text-[#18181B] text-left truncate">
                  {selectedToken.symbol}
                </span>
                <ChevronDown className="h-4 w-4 text-[#6B7280] shrink-0" />
              </button>

              {/* Amount input */}
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountRaw}
                    placeholder="0"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setAmountRaw('');
                        field.onChange(0);
                        return;
                      }
                      // Allow digits, one decimal point, and trailing dot/zeros while typing
                      if (!/^\d*\.?\d*$/.test(raw)) return;
                      const parsed = parseFloat(raw);
                      if (!isNaN(parsed)) {
                        const clamped = Math.min(parsed, maxAmount);
                        setAmountRaw(clamped < parsed ? String(clamped) : raw);
                        field.onChange(clamped);
                        checkQuantity(clamped);
                      } else {
                        setAmountRaw(raw);
                      }
                    }}
                    className="flex-1 min-w-0 h-full px-3 bg-transparent text-sm text-[#18181B] placeholder:text-[#A1A1AA] text-left outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                )}
              />

              {/* All button */}
              <button
                type="button"
                onClick={() => {
                  setValue('amount', maxAmount);
                  setAmountRaw(maxAmount > 0 ? String(maxAmount) : '');
                  checkQuantity(maxAmount);
                }}
                className="flex items-center justify-center w-[60px] h-full bg-[#F0EAFF] rounded-r-2xl shrink-0 cursor-pointer"
              >
                <span className="text-sm font-semibold text-[#7C3AED]">{t('wallet.all')}</span>
              </button>
            </div>
          </div>

          {/* Memo */}
          {isShowMemo && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#18181B]">
                Memo
              </label>
              <div className="flex items-center h-[52px] rounded-2xl bg-[#F8F5FF] border border-[#E9D8FD] px-4">
                <input
                  {...register('memo')}
                  placeholder="Optional"
                  className="flex-1 bg-transparent text-sm text-[#18181B] placeholder:text-[#A1A1AA] outline-none"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Submit button */}
      <div className="px-4 py-4">
        <button
          type="button"
          className="h-14 w-full rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white font-bold text-base cursor-pointer hover:opacity-90"
          onClick={onCheckSubmit}
        >
          {t('wallet.transfer')}
        </button>
      </div>

      {/* Sub-panels */}
      <RecentTransfer
        isOpen={recentVisible}
        onClose={() => setRecentVisible(false)}
        onSelect={handleSelectTransfer}
      />

      <SelectCoin
        isOpen={selectTokenVisible}
        onClose={() => setSelectTokenVisible(false)}
        onChangeToken={handleChangeToken}
      />

      <TransferConfirm
        isOpen={confirmVisible}
        title={t('wallet.transferConfirm')}
        transfer={transferData}
        onClose={() => setConfirmVisible(false)}
      />
    </div>
  );
};

export default TransferPage;
