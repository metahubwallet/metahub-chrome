import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Download, Cpu, Settings, Loader2 } from 'lucide-react';
import { useWalletStore } from '@/stores/walletStore';

interface WalletHeaderProps {
  type: string;
  amount: number;
  isLoading: boolean;
}

const WalletHeader: React.FC<WalletHeaderProps> = ({ type, amount, isLoading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalValue = React.useMemo(() => {
    const prefix = type === 'usd' ? '$ ' : '';
    const suffix = type === 'usd' ? '' : ` ${type.toUpperCase()}`;
    const formatted = typeof amount === 'number' ? amount.toFixed(4) : amount;
    return `${prefix}${formatted}${suffix}`;
  }, [type, amount]);

  const handleViewTransfer = () => {
    const walletStore = useWalletStore.getState();
    const currentUserTokens = walletStore.currentUserTokens();
    const eosToken = currentUserTokens.find(
      (i) => i.contract === 'eosio.token' && i.symbol === 'EOS'
    );
    navigate(`/transfer?symbol=${eosToken?.symbol || 'EOS'}&contract=${eosToken?.contract || 'eosio.token'}`);
  };

  const shortcuts = [
    {
      icon: <ArrowLeftRight className="w-6 h-6" />,
      label: t('wallet.transfer'),
      onClick: handleViewTransfer,
    },
    {
      icon: <Download className="w-6 h-6" />,
      label: t('wallet.receive'),
      onClick: () => navigate('/receive'),
    },
    {
      icon: <Cpu className="w-6 h-6" />,
      label: t('resource.resources'),
      onClick: () => navigate('/resource'),
    },
    {
      icon: <Settings className="w-6 h-6" />,
      label: t('setting.setting'),
      onClick: () => navigate('/setting'),
    },
  ];

  return (
    <div className="flex flex-col w-full px-5 gap-[18px]">
      {/* Asset card */}
      <div
        className="h-[114px] rounded-[18px] px-[18px] py-4 flex flex-col justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #D500F9 0%, #C300F4 48%, #8F2BFF 100%)',
          boxShadow: '0px 10px 24px 0px rgba(192,38,211,0.12)',
        }}
      >
        <p className="text-[13px] font-medium text-[#F8DFFF]">{t('wallet.assets')}</p>
        <div className="flex items-center h-8">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <span className="text-[22px] font-bold text-white">{totalValue}</span>
          )}
        </div>
      </div>

      {/* Shortcut buttons */}
      <div className="flex justify-between items-center gap-1">
        {shortcuts.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className="flex flex-col items-center gap-2 flex-1 cursor-pointer hover:opacity-70 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full border border-[#D4D4D8] bg-white flex items-center justify-center text-gray-700">
              {btn.icon}
            </div>
            <span className="text-xs font-medium text-[#3F3F46]">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WalletHeader;
