import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/PageHeader';
import TransferConfirm from '@/entrypoints/popup/pages/transfer/components/TransferConfirm';
import { useSmoothModeTime } from '@/hooks/useSmoothModeTime';
import { useWalletStore } from '@/stores/walletStore';
import type { Transfer } from '@/types/transaction';

const RECHARGE_AMOUNTS = [
  { value: 0.1, ms: '30ms', times: 100 },
  { value: 0.5, ms: '150ms', times: 500 },
  { value: 1, ms: '300ms', times: 1000 },
  { value: 3, ms: '900ms', times: 3000 },
];

const RECHARGE_TOKENS = {
  EOS: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
  A: { symbol: 'A', contract: 'core.vaulta', precision: 4 },
} as const;
type RechargeTokenKey = keyof typeof RECHARGE_TOKENS;

const RechargePage: React.FC = () => {
  const { t } = useTranslation();

  const currentWallet = useWalletStore((s) => s.currentWallet());
  const wallets = useWalletStore((s) => s.wallets);
  const selectedIndex = useWalletStore((s) => s.selectedIndex);
  const setWallets = useWalletStore((s) => s.setWallets);

  const [smoothMode, setSmoothMode] = React.useState<boolean>(
    () => currentWallet?.smoothMode ?? false
  );
  const [amount, setAmount] = React.useState<number>(RECHARGE_AMOUNTS[0].value);
  const [tokenKey, setTokenKey] = React.useState<RechargeTokenKey>('EOS');
  const [radioFor, setRadioFor] = React.useState<'self' | 'other'>('self');
  const [rechargeTo, setRechargeTo] = React.useState<string>(currentWallet?.name ?? '');
  const [confirmTransfer, setConfirmTransfer] = React.useState<Transfer | null>(null);

  const { data: smoothModeTimeData } = useSmoothModeTime();
  const smoothModeCPU = React.useMemo(() => {
    const res = smoothModeTimeData as any;
    if (res?.code === 200 && res?.result != null) {
      return `${res.result / 1000} ms`;
    }
    return '~';
  }, [smoothModeTimeData]);

  const estimateText = React.useMemo(() => {
    const selected = RECHARGE_AMOUNTS.find((a) => a.value === amount);
    return selected ? `≈ ${t('resource.transfersEstimated', { count: selected.times })}` : '';
  }, [amount, t]);

  const handleSmoothModeChange = async (checked: boolean) => {
    setSmoothMode(checked);
    const updatedWallets = [...wallets];
    if (updatedWallets[selectedIndex]) {
      updatedWallets[selectedIndex] = { ...updatedWallets[selectedIndex], smoothMode: checked };
      await setWallets(updatedWallets);
    }
  };

  const handleRadioChange = (value: 'self' | 'other') => {
    setRadioFor(value);
    if (value === 'self') {
      setRechargeTo(currentWallet?.name ?? '');
    } else {
      setRechargeTo('');
    }
  };

  const handleSubmit = () => {
    const target = rechargeTo || (currentWallet?.name ?? '');
    setConfirmTransfer({
      sender: currentWallet?.name ?? '',
      receiver: 'metahubpower',
      amount,
      memo: target,
      token: { ...RECHARGE_TOKENS[tokenKey] },
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('resource.recharge')} />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-2">
          {/* Smooth mode card */}
          <div className="flex items-center justify-between rounded-[24px] bg-white/85 border border-[#E8E3F6] shadow-[0_10px_24px_rgba(46,16,101,0.06)] h-[66px] px-4">
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-[#20173C]">{t('resource.smoothMode')}</span>
              <span className="text-[12px] font-medium text-[#8A82A4] leading-tight">{t('resource.smoothModeHint')}</span>
            </div>
            <Switch checked={smoothMode} onCheckedChange={handleSmoothModeChange} />
          </div>

          {/* Remaining NET card */}
          <div className="flex items-center justify-between rounded-[24px] bg-white/80 border border-[#E8E3F6] h-[66px] px-4">
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-[#20173C]">{t('resource.remainingNET')}</span>
              <span className="text-[12px] font-medium text-[#8A82A4]">{t('resource.smoothModeHeadroom')}</span>
            </div>
            <span className="text-[18px] font-bold text-[#5B21B6]">{smoothModeCPU}</span>
          </div>

          {/* Choose amount */}
          <div className="flex flex-col gap-2.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-[#20173C]">{t('resource.chooseAmount') || 'Choose amount'}</span>
              <div className="flex items-center bg-[#F3EFFA] rounded-full p-0.5">
                {(Object.keys(RECHARGE_TOKENS) as RechargeTokenKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTokenKey(k)}
                    className={`px-3 h-7 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                      tokenKey === k
                        ? 'bg-white text-[#5B21B6] shadow-[0_1px_2px_rgba(46,16,101,0.08)]'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {RECHARGE_AMOUNTS.map(({ value, ms }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  className={`flex flex-col items-center justify-center gap-0.5 h-[70px] rounded-[20px] border cursor-pointer transition-colors ${
                    amount === value
                      ? 'border-[#8B5CF6] bg-gradient-to-b from-[#EEE7FF] to-[#F9F6FF]'
                      : 'border-[#E5E7EB] bg-white hover:bg-[#F9F6FF]'
                  }`}
                >
                  <span className={`text-[14px] font-bold ${amount === value ? 'text-[#5B21B6]' : 'text-[#3A315A]'}`}>
                    {value} {RECHARGE_TOKENS[tokenKey].symbol}
                  </span>
                  <span className={`text-[11px] font-semibold ${amount === value ? 'text-[#7C3AED]' : 'text-[#6B7280]'}`}>
                    {ms}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[12px] font-medium text-[#7C3AED] text-center">{estimateText}</p>
          </div>

          {/* Recharge account */}
          <div className="flex flex-col gap-2.5 mt-2">
            <span className="text-[15px] font-semibold text-[#20173C]">{t('resource.rechargeAccount')}</span>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => handleRadioChange('self')}
                className={`flex-1 flex items-center gap-2.5 h-[46px] rounded-[18px] border px-4 cursor-pointer transition-colors ${
                  radioFor === 'self'
                    ? 'border-[#8B5CF6] bg-gradient-to-b from-[#F1EAFF] to-[#FBF8FF]'
                    : 'border-[#E7E3F4] bg-[#F6F4FB]'
                }`}
              >
                <div className={`w-[18px] h-[18px] rounded-full ${
                  radioFor === 'self' ? 'bg-[#8B5CF6]' : 'bg-white border-2 border-[#D6D3E3]'
                }`} />
                <span className={`text-[13px] font-semibold ${
                  radioFor === 'self' ? 'text-[#4C1D95] font-bold' : 'text-[#615A78]'
                }`}>
                  {t('resource.currentAccount')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRadioChange('other')}
                className={`flex-1 flex items-center gap-2.5 h-[46px] rounded-[18px] border px-4 cursor-pointer transition-colors ${
                  radioFor === 'other'
                    ? 'border-[#8B5CF6] bg-gradient-to-b from-[#F1EAFF] to-[#FBF8FF]'
                    : 'border-[#E7E3F4] bg-[#F6F4FB]'
                }`}
              >
                <div className={`w-[18px] h-[18px] rounded-full ${
                  radioFor === 'other' ? 'bg-[#8B5CF6]' : 'bg-white border-2 border-[#D6D3E3]'
                }`} />
                <span className={`text-[13px] font-semibold ${
                  radioFor === 'other' ? 'text-[#4C1D95] font-bold' : 'text-[#615A78]'
                }`}>
                  {t('resource.otherAccount')}
                </span>
              </button>
            </div>

            {/* Target account input */}
            {radioFor === 'other' && (
              <div className="rounded-[18px] bg-[#F7F4FF] border border-[#E3DCF7] px-3.5 py-3">
                <input
                  type="text"
                  value={rechargeTo}
                  onChange={(e) => setRechargeTo(e.target.value)}
                  placeholder={t('resource.resourceReceiver') || 'Resource receiver'}
                  className="text-[15px] font-semibold text-[#20173C] bg-transparent outline-none placeholder:text-[#B8B0CE]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer button */}
      <div className="px-4 pb-4 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-[52px] rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white font-bold text-base flex items-center justify-center hover:opacity-90 cursor-pointer"
        >
          {t('wallet.transfer')}
        </button>
      </div>

      {confirmTransfer && (
        <TransferConfirm
          isOpen={true}
          title={t('resource.recharge')}
          transfer={confirmTransfer}
          onClose={() => setConfirmTransfer(null)}
        />
      )}
    </div>
  );
};

export default RechargePage;
